import { supabase } from "@/lib/supabase"

type UpdateStoreSettingsInput = {
  userId: string
  usar_modulo_tributario: boolean
  modo_tributario: "controle_simples" | "reforma_2026"
  exigir_config_fiscal_produto: boolean
  calcular_imposto_na_venda: boolean
}

export async function updateStoreSettings(input: UpdateStoreSettingsInput) {
  const {
    userId,
    usar_modulo_tributario,
    modo_tributario,
    exigir_config_fiscal_produto,
    calcular_imposto_na_venda,
  } = input

  const { data, error } = await supabase
    .from("store_settings")
    .upsert(
      {
        user_id: userId,
        usar_modulo_tributario,
        modo_tributario,
        exigir_config_fiscal_produto,
        calcular_imposto_na_venda,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single()

  if (error) {
    throw new Error("Não foi possível salvar as configurações tributárias.")
  }

  return data
}