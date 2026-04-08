import { supabase } from "@/lib/supabase"

export async function registrarMovimentoEstoque({
  productId,
  userId,
  tipo,
  quantidade,
  motivo,
}: {
  productId: number
  userId: string
  tipo: "entrada" | "saida" | "cancelamento" | "ajuste"
  quantidade: number
  motivo?: string
}) {
  const { data, error } = await supabase.from("stock_movements").insert({
    product_id: productId,
    user_id: userId,
    tipo,
    quantidade,
    motivo: motivo || null,
  })

  if (error) {
    console.log("ERRO AO REGISTRAR MOVIMENTO DE ESTOQUE:", error)
    throw new Error(error.message || "Erro ao registrar movimento de estoque.")
  }

  return data
}