import { supabase } from "@/lib/supabase"

type DeleteSalePaymentInput = {
  paymentId: number
  saleId: number
  userId: string
}

type DeleteSalePaymentResult =
  | { success: true }
  | { success: false; message: string }

export async function deleteSalePayment(
  input: DeleteSalePaymentInput
): Promise<DeleteSalePaymentResult> {
  const { paymentId, saleId, userId } = input

  const { data, error } = await supabase.rpc("delete_sale_payment_safe", {
    p_user_id: userId,
    p_sale_id: saleId,
    p_payment_id: paymentId,
  })

  if (error) {
    return {
      success: false,
      message: error.message || "Erro ao excluir pagamento.",
    }
  }

  const resultado = Array.isArray(data) ? data[0] : data

  if (!resultado?.success) {
    return {
      success: false,
      message: resultado?.message || "Não foi possível excluir o pagamento.",
    }
  }

  return { success: true }
}