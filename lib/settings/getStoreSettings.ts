import { ensureStoreSettings } from "@/lib/settings/ensureStoreSettings"
import { StoreSettings } from "@/lib/settings/types"

export async function getStoreSettings(userId: string): Promise<StoreSettings> {
  const ensured = await ensureStoreSettings(userId)

  return {
    id: ensured.id,
    user_id: ensured.user_id,
    usar_modulo_tributario: ensured.usar_modulo_tributario,
    modo_tributario: ensured.modo_tributario,
    exigir_config_fiscal_produto: ensured.exigir_config_fiscal_produto,
    calcular_imposto_na_venda: ensured.calcular_imposto_na_venda,
    created_at: ensured.created_at,
    updated_at: ensured.updated_at,
  }
}