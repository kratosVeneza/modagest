import { supabase } from "@/lib/supabase"

type RestoreSaleInput = {
  saleId: number
  userId: string
}

type RestoreSaleResult =
  | { success: true; message: string }
  | { success: false; message: string }

export async function restoreSale(input: RestoreSaleInput): Promise<RestoreSaleResult> {
  const { saleId, userId } = input

  const { data, error } = await supabase.rpc("restore_sale_safe", {
    p_user_id: userId,
    p_sale_id: saleId,
  })

  if (error) {
    return {
      success: false,
      message: error.message || "Erro ao restaurar a venda.",
    }
  }

  const resultado = Array.isArray(data) ? data[0] : data

  if (!resultado?.success) {
    return {
      success: false,
      message: resultado?.message || "Não foi possível restaurar a venda.",
    }
  }

  return {
    success: true,
    message: resultado.message || "Venda restaurada com sucesso.",
  }
}