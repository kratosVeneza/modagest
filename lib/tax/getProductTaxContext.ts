import { supabase } from "@/lib/supabase"
import { TaxRule } from "@/lib/tax/getTaxRules"

export type ProductTaxData = {
  id: number
  nome: string
  ncm: string | null
  tax_rule_id: number | null
  usa_imposto_manual: boolean
  cbs_aliquota_manual: number | null
  ibs_aliquota_manual: number | null
}

export async function getProductTaxContext(productId: number) {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(`
      id,
      nome,
      ncm,
      tax_rule_id,
      usa_imposto_manual,
      cbs_aliquota_manual,
      ibs_aliquota_manual
    `)
    .eq("id", productId)
    .single()

  if (productError || !product) {
    throw new Error("Não foi possível carregar o produto para cálculo tributário.")
  }

  let taxRule: TaxRule | null = null

  if (product.tax_rule_id) {
    const { data: rule, error: ruleError } = await supabase
      .from("tax_rules")
      .select("*")
      .eq("id", product.tax_rule_id)
      .single()

    if (ruleError) {
      throw new Error("Não foi possível carregar a regra tributária do produto.")
    }

    taxRule = rule as TaxRule
  }

  return {
    product: product as ProductTaxData,
    taxRule,
  }
}