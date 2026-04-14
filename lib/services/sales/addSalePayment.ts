import { supabase } from "@/lib/supabase"

type AddPaymentInput = {
  saleId: number
  userId: string
  valor: number
  formaPagamento: string
  observacao?: string | null
  dataPagamentoIso: string
  descontoPercentual?: number
  descontoValor?: number
  valorTotalComDesconto?: number
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
    descontoPercentual = 0,
    descontoValor = 0,
    valorTotalComDesconto,
  } = input

  const { data, error } = await supabase.rpc("add_sale_payment_safe", {
    p_user_id: userId,
    p_sale_id: saleId,
    p_valor: valor,
    p_forma_pagamento: formaPagamento,
    p_observacao: observacao,
    p_data_pagamento: dataPagamentoIso,
    p_desconto_percentual: descontoPercentual,
    p_desconto_valor: descontoValor,
    p_valor_total_com_desconto: valorTotalComDesconto ?? null,
  })

  if (error) {
    return {
      success: false,
      message: error.message || "Erro ao registrar pagamento.",
    }
  }

  const resultado = Array.isArray(data) ? data[0] : data

  if (!resultado?.success) {
    return {
      success: false,
      message: resultado?.message || "Não foi possível registrar o pagamento.",
    }
  }

  return { success: true }
}