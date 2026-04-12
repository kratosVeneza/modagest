import { supabase } from "@/lib/supabase"

export type TaxRule = {
  id: number
  nome: string
  tipo: "normal" | "aliquota_zero" | "reducao_percentual" | "manual"
  cst: string | null
  cclasstrib: string | null
  cbs_aliquota: number
  ibs_aliquota: number
  percentual_reducao: number
  ativo: boolean
}

export async function getTaxRules() {
  const { data, error } = await supabase
    .from("tax_rules")
    .select("*")
    .eq("ativo", true)
    .order("id", { ascending: true })

  if (error) {
    throw new Error("Não foi possível carregar as regras tributárias.")
  }

  return (data || []) as TaxRule[]
}