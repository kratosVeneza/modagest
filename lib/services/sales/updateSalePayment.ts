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

  const { data, error } = await supabase.rpc("update_sale_payment_safe", {
    p_user_id: userId,
    p_sale_id: saleId,
    p_payment_id: paymentId,
    p_valor: valor,
    p_forma_pagamento: formaPagamento,
    p_observacao: observacao,
    p_data_pagamento: dataPagamentoIso,
  })

  if (error) {
    return {
      success: false,
      message: error.message || "Erro ao atualizar pagamento.",
    }
  }

  const resultado = Array.isArray(data) ? data[0] : data

  if (!resultado?.success) {
    return {
      success: false,
      message: resultado?.message || "Não foi possível atualizar o pagamento.",
    }
  }

  return { success: true }
}