import { getMySubscription } from "@/lib/getMySubscription"
import { hasFeatureAccess } from "@/lib/hasFeatureAccess"
import { FeatureKey } from "@/lib/planFeatures"

export async function getMyPlanAccess(feature: FeatureKey) {
  const result = await getMySubscription()

  if (!result.ok || !result.subscription) {
    return {
      ok: false,
      hasAccess: false,
      planSlug: null,
      error: result.error || "Assinatura não encontrada.",
    }
  }

  const planSlug = result.subscription.plan_slug
  const access = hasFeatureAccess(planSlug, feature)

  return {
    ok: true,
    hasAccess: access,
    planSlug,
    subscription: result.subscription,
  }
}
