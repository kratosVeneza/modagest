import { supabase } from "@/lib/supabase"

type EnsureSubscriptionParams = {
  selectedPlan?: string
  trialDays?: number
}

const PLANOS_VALIDOS = ["essencial", "profissional", "premium"] as const

function normalizarPlano(plan?: string) {
  if (!plan) return "profissional"
  return PLANOS_VALIDOS.includes(plan as (typeof PLANOS_VALIDOS)[number])
    ? plan
    : "profissional"
}

export async function ensureSubscription(params?: EnsureSubscriptionParams) {
  const trialDays = params?.trialDays ?? 7
  const selectedPlan = normalizarPlano(params?.selectedPlan)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Usuário não autenticado." }
  }

  const { data: existingSubscription, error: selectError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selectError) {
    return { ok: false, error: selectError.message }
  }

  if (existingSubscription) {
    return { ok: true, created: false, subscription: existingSubscription }
  }

  const now = new Date()
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

  const { data: insertedSubscription, error: insertError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: user.id,
      plan_slug: selectedPlan,
      status: "trialing",
      started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEndsAt.toISOString(),
      cancel_at_period_end: false,
    })
    .select()
    .single()

  if (insertError) {
    return { ok: false, error: insertError.message }
  }

  return { ok: true, created: true, subscription: insertedSubscription }
}
