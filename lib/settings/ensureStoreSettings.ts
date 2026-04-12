import { supabase } from "@/lib/supabase"

export async function ensureStoreSettings(userId: string) {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error("Erro ao verificar configurações da loja.")
  }

  if (data) return data

  const { data: created, error: insertError } = await supabase
    .from("store_settings")
    .insert({
      user_id: userId,
      usar_modulo_tributario: false,
      modo_tributario: "controle_simples",
      exigir_config_fiscal_produto: false,
      calcular_imposto_na_venda: false,
    })
    .select()
    .single()

  if (insertError || !created) {
    throw new Error("Erro ao criar configurações iniciais da loja.")
  }

  return created
}