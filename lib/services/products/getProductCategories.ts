import { supabase } from "@/lib/supabase"

export type ProductCategory = {
  id: number
  nome: string
}

export async function getProductCategories() {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true })

  if (error) {
    throw new Error("Não foi possível carregar as categorias.")
  }

  return (data || []) as ProductCategory[]
}