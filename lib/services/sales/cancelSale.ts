import { supabase } from "@/lib/supabase"

type CancelSaleInput = {
  saleId: number
  userId: string
}

type CancelSaleResult =
  | { success: true; message: string }
  | { success: false; message: string }

export async function cancelSale(input: CancelSaleInput): Promise<CancelSaleResult> {
  const { saleId, userId } = input

  const { data, error } = await supabase.rpc("cancel_sale_safe", {
    p_user_id: userId,
    p_sale_id: saleId,
  })

  if (error) {
    return {
      success: false,
      message: error.message || "Erro ao cancelar a venda.",
    }
  }

  const resultado = Array.isArray(data) ? data[0] : data

  if (!resultado?.success) {
    return {
      success: false,
      message: resultado?.message || "Não foi possível cancelar a venda.",
    }
  }

  return {
    success: true,
    message: resultado.message || "Venda cancelada e estoque devolvido com sucesso.",
  }
}