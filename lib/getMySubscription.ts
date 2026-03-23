import { supabase } from "@/lib/supabase"

export async function getMySubscription() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Usuário não autenticado.", subscription: null }
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message, subscription: null }
  }

  if (!data) {
    return { ok: true, subscription: null }
  }

  let assinaturaAtual = data
  const now = new Date()

  const trialEndsAt = assinaturaAtual.trial_ends_at
    ? new Date(assinaturaAtual.trial_ends_at)
    : null

  const currentPeriodEnd = assinaturaAtual.current_period_end
    ? new Date(assinaturaAtual.current_period_end)
    : null

  if (assinaturaAtual.status === "trialing" && trialEndsAt && now > trialEndsAt) {
    const { data: updatedSubscription, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)
      .select("*")
      .single()

    if (updateError) {
      return {
        ok: false,
        error: updateError.message,
        subscription: assinaturaAtual,
      }
    }

    assinaturaAtual = updatedSubscription
  }

  if (
    assinaturaAtual.status === "canceled" &&
    currentPeriodEnd &&
    now > currentPeriodEnd
  ) {
    const { data: updatedSubscription, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)
      .select("*")
      .single()

    if (updateError) {
      return {
        ok: false,
        error: updateError.message,
        subscription: assinaturaAtual,
      }
    }

    assinaturaAtual = updatedSubscription
  }

  if (
    assinaturaAtual.status === "past_due" &&
    currentPeriodEnd &&
    now > currentPeriodEnd
  ) {
    const { data: updatedSubscription, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)
      .select("*")
      .single()

    if (updateError) {
      return {
        ok: false,
        error: updateError.message,
        subscription: assinaturaAtual,
      }
    }

    assinaturaAtual = updatedSubscription
  }

  return { ok: true, subscription: assinaturaAtual }
}