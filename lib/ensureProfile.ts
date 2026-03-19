import { supabase } from "@/lib/supabase"

type EnsureProfileParams = {
  trialDays?: number
  selectedPlan?: string
}

export async function ensureProfile(params?: EnsureProfileParams) {
  const trialDays = params?.trialDays ?? 7
  const selectedPlan = params?.selectedPlan ?? "profissional"

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Usuário não autenticado." }
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id, plan_slug")
    .eq("id", user.id)
    .maybeSingle()

  if (selectError) {
    return { ok: false, error: selectError.message }
  }

  if (existingProfile) {
    return { ok: true, created: false }
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.nome ||
    null

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    avatar_url: avatarUrl,
    plan_slug: selectedPlan,
    subscription_status: "trialing",
    trial_ends_at: trialEndsAt.toISOString(),
  })

  if (insertError) {
    return { ok: false, error: insertError.message }
  }

  return { ok: true, created: true }
}
