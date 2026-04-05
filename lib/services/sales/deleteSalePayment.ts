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

  const { data: venda, error: erroVenda } = await supabase
    .from("sales")
    .select("id, status")
    .eq("id", saleId)
    .eq("user_id", userId)
    .maybeSingle()

  if (erroVenda || !venda) {
    return { success: false, message: "Venda não encontrada." }
  }

  if (venda.status === "Cancelada") {
    return { success: false, message: "Não é possível excluir pagamento de uma venda cancelada." }
  }

  const { error } = await supabase
    .from("sale_payments")
    .delete()
    .eq("id", paymentId)
    .eq("sale_id", saleId)
    .eq("user_id", userId)

  if (error) {
    return { success: false, message: "Erro ao excluir pagamento." }
  }

  return { success: true }
}
