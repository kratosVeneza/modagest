import { supabase } from "@/lib/supabase"

type AddPaymentInput = {
  saleId: number
  userId: string
  valor: number
  formaPagamento: string
  observacao?: string | null
  dataPagamentoIso: string
}

type AddPaymentResult =
  | { success: true; warning?: string }
  | { success: false; message: string }

export async function addSalePayment(input: AddPaymentInput): Promise<AddPaymentResult> {
  const {
    saleId,
    userId,
    valor,
    formaPagamento,
    observacao = null,
    dataPagamentoIso,
  } = input

  const { data: venda, error: erroVenda } = await supabase
    .from("sales")
    .select("id, valor_total, status")
    .eq("id", saleId)
    .eq("user_id", userId)
    .maybeSingle()

  if (erroVenda || !venda) {
    return { success: false, message: "Venda não encontrada." }
  }

  if (venda.status === "Cancelada") {
    return { success: false, message: "Não é possível adicionar pagamento em venda cancelada." }
  }

  const { data: pagamentos, error: erroPagamentos } = await supabase
    .from("sale_payments")
    .select("valor")
    .eq("sale_id", saleId)
    .eq("user_id", userId)

  if (erroPagamentos) {
    return { success: false, message: "Erro ao validar pagamentos da venda." }
  }

  const totalRecebido = (pagamentos ?? []).reduce(
    (soma, p) => soma + Number(p.valor),
    0
  )

  if (totalRecebido + valor > Number(venda.valor_total)) {
    return {
      success: false,
      message: "Pagamento ultrapassa o valor total da venda.",
    }
  }

  const { error: erroPagamento } = await supabase
    .from("sale_payments")
    .insert([
      {
        sale_id: saleId,
        user_id: userId,
        valor,
        forma_pagamento: formaPagamento,
        observacao,
        created_at: dataPagamentoIso,
      },
    ])

  if (erroPagamento) {
    return { success: false, message: "Erro ao registrar pagamento." }
  }

  const { error: erroFinanceiro } = await supabase
    .from("financial_transactions")
.insert([
  {
    user_id: userId,
    type: "entrada",
    amount: valor,
    status: "pago",
    description: "Recebimento de venda",
    reference_type: "venda",
    reference_id: saleId,
    created_at: dataPagamentoIso,
  },
])

  if (erroFinanceiro) {
    return {
      success: true,
      warning: "Pagamento registrado, mas houve erro ao lançar no financeiro.",
    }
  }

  return { success: true }
}

