import { supabase } from "@/lib/supabase"

type EnsureProfileParams = {
  trialDays?: number
  selectedPlan?: string
}

const PLANOS_VALIDOS = ["essencial", "profissional", "premium"] as const

function normalizarPlano(plan?: string) {
  if (!plan) return "profissional"

  return PLANOS_VALIDOS.includes(plan as (typeof PLANOS_VALIDOS)[number])
    ? plan
    : "profissional"
}

export async function ensureProfile(params?: EnsureProfileParams) {
  const trialDays = params?.trialDays ?? 7
  const selectedPlan = normalizarPlano(params?.selectedPlan)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Usuário não autenticado." }
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id, plan_slug, subscription_status, trial_ends_at")
    .eq("id", user.id)
    .maybeSingle()

  if (selectError) {
    return { ok: false, error: selectError.message }
  }

  // Se já existe perfil, não troca plano no login
  if (existingProfile) {
    return {
      ok: true,
      created: false,
      updated: false,
      profile: existingProfile,
    }
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

  const novoPerfil = {
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    avatar_url: avatarUrl,
    plan_slug: selectedPlan,
    subscription_status: "trialing",
    trial_ends_at: trialEndsAt.toISOString(),
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert(novoPerfil)
    .select()
    .single()

  if (insertError) {
    return { ok: false, error: insertError.message }
  }

  return {
    ok: true,
    created: true,
    updated: false,
    profile: insertedProfile,
  }
}