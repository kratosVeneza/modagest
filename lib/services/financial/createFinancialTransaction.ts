import { supabase } from "@/lib/supabase"

type Payload = {
  userId: string
  type: "entrada" | "saida"
  description: string
  category: string | null
  amount: number
  status: "pago" | "pendente"
  due_date: string | null
  paid_at: string | null
}

export async function createFinancialTransaction(payload: Payload) {
  const { error } = await supabase
    .from("financial_transactions")
    .insert([
      {
        user_id: payload.userId,
        type: payload.type,
        description: payload.description,
        category: payload.category,
        amount: payload.amount,
        status: payload.status,
        due_date: payload.due_date,
        paid_at: payload.paid_at,
      },
    ])

  if (error) {
    return { success: false, message: "Erro ao cadastrar movimentação." }
  }

  return { success: true, message: "" }
}
