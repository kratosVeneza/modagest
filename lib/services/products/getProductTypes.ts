import { supabase } from "@/lib/supabase"

export type ProductTypeItem = {
  id: number
  category_id: number
  nome: string
}

export async function getProductTypes() {
  const { data, error } = await supabase
    .from("product_types")
    .select("id, category_id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true })

  if (error) {
    throw new Error("Não foi possível carregar os tipos de produto.")
  }

  return (data || []) as ProductTypeItem[]
}