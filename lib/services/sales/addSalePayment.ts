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
  | { success: true }
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

  // 1. Buscar venda
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

  // 2. Somar pagamentos já existentes
  const { data: pagamentos } = await supabase
    .from("sale_payments")
    .select("valor")
    .eq("sale_id", saleId)
    .eq("user_id", userId)

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

  // 3. Inserir pagamento
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

  // 4. 🔥 Lançar no financeiro
  const { error: erroFinanceiro } = await supabase
    .from("financial_entries")
    .insert([
      {
        user_id: userId,
        tipo: "entrada",
        valor,
        descricao: "Pagamento de venda",
        referencia_id: saleId,
        created_at: dataPagamentoIso,
      },
    ])

  if (erroFinanceiro) {
    return {
      success: false,
      message: "Pagamento registrado, mas erro no financeiro.",
    }
  }

  return { success: true }
}
