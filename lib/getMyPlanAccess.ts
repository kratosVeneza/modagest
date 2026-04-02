import { supabase } from "@/lib/supabase"
import { getMySubscription } from "@/lib/getMySubscription"
import { hasFeatureAccess } from "@/lib/hasFeatureAccess"
import { FeatureKey } from "@/lib/planFeatures"

export async function getMyPlanAccess(feature: FeatureKey) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      hasAccess: false,
      planSlug: null,
      error: "Usuário não autenticado.",
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()

  if (!profileError && profile?.is_admin) {
    return {
      ok: true,
      hasAccess: true,
      planSlug: "admin",
      subscription: null,
    }
  }

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
