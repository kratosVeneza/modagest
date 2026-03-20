import { PLAN_FEATURES, PlanSlug, FeatureKey } from "@/lib/planFeatures"

export function hasFeatureAccess(
  planSlug: string | null | undefined,
  feature: FeatureKey
) {
  const normalizedPlan: PlanSlug =
    planSlug === "essencial" || planSlug === "premium"
      ? planSlug
      : "profissional"

  return PLAN_FEATURES[normalizedPlan].includes(feature)
}