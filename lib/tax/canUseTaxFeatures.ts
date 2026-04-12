import { StoreSettings } from "@/lib/settings/types"

export function canUseTaxFeatures(settings: StoreSettings) {
  return (
    settings.usar_modulo_tributario &&
    settings.modo_tributario === "reforma_2026"
  )
}

export function shouldRequireFiscalFields(settings: StoreSettings) {
  return (
    canUseTaxFeatures(settings) &&
    settings.exigir_config_fiscal_produto
  )
}

export function shouldCalculateTaxesOnSale(settings: StoreSettings) {
  return (
    canUseTaxFeatures(settings) &&
    settings.calcular_imposto_na_venda
  )
}