import { supabase } from "@/lib/supabase"

export async function deleteFinancialTransaction(id: number, userId: string) {
  const { error } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    return { success: false, message: "Erro ao excluir movimentação." }
  }

  return { success: true, message: "" }
}