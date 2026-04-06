import { supabase } from "@/lib/supabase"

type Payload = {
  id: number
  userId: string
  type: "entrada" | "saida"
  description: string
  category: string | null
  amount: number
  status: "pago" | "pendente"
  due_date: string | null
  paid_at: string | null
}

export async function updateFinancialTransaction(payload: Payload) {
  const { error } = await supabase
    .from("financial_transactions")
    .update({
      type: payload.type,
      description: payload.description,
      category: payload.category,
      amount: payload.amount,
      status: payload.status,
      due_date: payload.due_date,
      paid_at: payload.paid_at,
    })
    .eq("id", payload.id)
    .eq("user_id", payload.userId)

  if (error) {
    return { success: false, message: "Erro ao atualizar movimentação." }
  }

  return { success: true, message: "" }
}