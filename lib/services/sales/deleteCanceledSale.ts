import { supabase } from "@/lib/supabase"

type DeleteCanceledSaleInput = {
  saleId: number
  userId: string
}

type DeleteCanceledSaleResult =
  | { success: true; message: string }
  | { success: false; message: string }

export async function deleteCanceledSale(
  input: DeleteCanceledSaleInput
): Promise<DeleteCanceledSaleResult> {
  const { saleId, userId } = input

  const { data: venda, error: erroVendaBusca } = await supabase
    .from("sales")
    .select("id, status")
    .eq("id", saleId)
    .eq("user_id", userId)
    .maybeSingle()

  if (erroVendaBusca || !venda) {
    return { success: false, message: "Venda não encontrada." }
  }

  if ((venda.status || "").toLowerCase() !== "cancelada") {
    return {
      success: false,
      message: "Somente vendas canceladas podem ser excluídas do histórico.",
    }
  }

  const { error: erroPagamentos } = await supabase
    .from("sale_payments")
    .delete()
    .eq("sale_id", saleId)
    .eq("user_id", userId)

  if (erroPagamentos) {
    return {
      success: false,
      message: erroPagamentos.message || "Erro ao excluir pagamentos da venda.",
    }
  }

  const { error: erroVenda } = await supabase
    .from("sales")
    .delete()
    .eq("id", saleId)
    .eq("user_id", userId)

  if (erroVenda) {
    return {
      success: false,
      message: erroVenda.message || "Erro ao excluir venda cancelada.",
    }
  }

  return {
    success: true,
    message: "Venda cancelada excluída do histórico com sucesso.",
  }
}