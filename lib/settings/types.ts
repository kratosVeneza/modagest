export type StoreSettings = {
  id?: number
  user_id: string
  usar_modulo_tributario: boolean
  modo_tributario: "controle_simples" | "reforma_2026"
  exigir_config_fiscal_produto: boolean
  calcular_imposto_na_venda: boolean
  created_at?: string
  updated_at?: string
}