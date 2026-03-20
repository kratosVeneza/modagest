export type PlanSlug = "essencial" | "profissional" | "premium"

export type FeatureKey =
  | "dashboard"
  | "produtos"
  | "estoque"
  | "pedidos"
  | "vendas"
  | "clientes"
  | "financeiro"
  | "historico_vendas"
  | "relatorios_basicos"
  | "relatorios_avancados"
  | "exportar_relatorios"
  | "meu_plano"
  | "suporte_prioritario"
  | "recursos_premium"

type PlanFeaturesMap = Record<PlanSlug, FeatureKey[]>

export const PLAN_FEATURES: PlanFeaturesMap = {
  essencial: [
    "dashboard",
    "produtos",
    "estoque",
    "pedidos",
    "vendas",
    "clientes",
    "meu_plano",
    "relatorios_basicos",
  ],
  profissional: [
    "dashboard",
    "produtos",
    "estoque",
    "pedidos",
    "vendas",
    "clientes",
    "financeiro",
    "historico_vendas",
    "relatorios_basicos",
    "relatorios_avancados",
    "exportar_relatorios",
    "meu_plano",
  ],
  premium: [
    "dashboard",
    "produtos",
    "estoque",
    "pedidos",
    "vendas",
    "clientes",
    "financeiro",
    "historico_vendas",
    "relatorios_basicos",
    "relatorios_avancados",
    "exportar_relatorios",
    "meu_plano",
    "suporte_prioritario",
    "recursos_premium",
  ],
}
