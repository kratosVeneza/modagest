import { supabase } from "@/lib/supabase"

export type FinancialTransaction = {
  id: number
  user_id: string
  type: "entrada" | "saida"
  description: string
  category: string | null
  amount: number
  status: "pago" | "pendente"
  due_date: string | null
  paid_at: string | null
  created_at: string
}

type GetFinancialTransactionsResult =
  | {
      success: true
      transactions: FinancialTransaction[]
    }
  | {
      success: false
      message: string
      transactions: FinancialTransaction[]
    }

export async function getFinancialTransactions(
  userId: string
): Promise<GetFinancialTransactionsResult> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    return {
      success: false,
      message: error.message || "Erro ao carregar transações financeiras.",
      transactions: [],
    }
  }

  return {
  success: true,
  transactions: (data ?? []) as FinancialTransaction[],
}
}
