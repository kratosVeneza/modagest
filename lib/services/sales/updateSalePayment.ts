import { supabase } from "@/lib/supabase"

type UpdateSalePaymentInput = {
  paymentId: number
  saleId: number
  userId: string
  valor: number
  formaPagamento: string
  observacao?: string | null
  dataPagamentoIso: string
}

type UpdateSalePaymentResult =
  | { success: true }
  | { success: false; message: string }

export async function updateSalePayment(
  input: UpdateSalePaymentInput
): Promise<UpdateSalePaymentResult> {
  const {
    paymentId,
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
    return { success: false, message: "Não é possível editar pagamento de venda cancelada." }
  }

  const { data: pagamentos, error: erroPagamentos } = await supabase
    .from("sale_payments")
    .select("id, valor")
    .eq("sale_id", saleId)
    .eq("user_id", userId)

  if (erroPagamentos) {
    return { success: false, message: "Erro ao validar pagamentos da venda." }
  }

  const pagamentoAtual = (pagamentos ?? []).find((p) => p.id === paymentId)

  if (!pagamentoAtual) {
    return { success: false, message: "Pagamento não encontrado." }
  }

  const totalOutrosPagamentos = (pagamentos ?? [])
    .filter((p) => p.id !== paymentId)
    .reduce((soma, p) => soma + Number(p.valor), 0)

  if (totalOutrosPagamentos + valor > Number(venda.valor_total)) {
    return {
      success: false,
      message: "A soma dos pagamentos não pode ultrapassar o valor total da venda.",
    }
  }

  const { error } = await supabase
    .from("sale_payments")
    .update({
      valor,
      forma_pagamento: formaPagamento,
      observacao,
      created_at: dataPagamentoIso,
    })
    .eq("id", paymentId)
    .eq("sale_id", saleId)
    .eq("user_id", userId)

  if (error) {
    return { success: false, message: "Erro ao atualizar pagamento." }
  }

  return { success: true }
}