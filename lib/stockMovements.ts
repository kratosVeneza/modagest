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
  motivo: string
}) {
  await supabase.from("stock_movements").insert({
    product_id: productId,
    user_id: userId,
    tipo,
    quantidade,
    motivo,
  })
}