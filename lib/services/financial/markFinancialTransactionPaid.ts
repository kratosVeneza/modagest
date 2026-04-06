import { supabase } from "@/lib/supabase"

export async function markFinancialTransactionPaid(id: number, userId: string) {
  const { error } = await supabase
    .from("financial_transactions")
    .update({
      status: "pago",
      paid_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    return { success: false, message: "Erro ao marcar como pago." }
  }

  return { success: true, message: "" }
}