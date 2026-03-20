import { supabase } from "@/lib/supabase"

type AccessResult = {
  ok: boolean
  hasAccess: boolean
  reason?: string
  subscription?: any
}

export async function checkSubscriptionAccess(): Promise<AccessResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      hasAccess: false,
      reason: "Usuário não autenticado.",
    }
  }

  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subError) {
    return {
      ok: false,
      hasAccess: false,
      reason: subError.message,
    }
  }

  if (!subscription) {
    return {
      ok: true,
      hasAccess: false,
      reason: "Assinatura não encontrada.",
    }
  }

  const now = new Date()
  const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null

  if (subscription.status === "active") {
    return { ok: true, hasAccess: true, subscription }
  }

  if (subscription.status === "trialing") {
    if (trialEndsAt && now <= trialEndsAt) {
      return { ok: true, hasAccess: true, subscription }
    }

    await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    return {
      ok: true,
      hasAccess: false,
      reason: "Período de teste expirado.",
      subscription: {
        ...subscription,
        status: "blocked",
      },
    }
  }

  if (subscription.status === "canceled") {
    if (currentPeriodEnd && now <= currentPeriodEnd) {
      return { ok: true, hasAccess: true, subscription }
    }

    await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    return {
      ok: true,
      hasAccess: false,
      reason: "Assinatura encerrada.",
      subscription: {
        ...subscription,
        status: "blocked",
      },
    }
  }

  if (subscription.status === "past_due") {
    if (currentPeriodEnd && now <= currentPeriodEnd) {
      return { ok: true, hasAccess: true, subscription }
    }

    await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    return {
      ok: true,
      hasAccess: false,
      reason: "Pagamento pendente e prazo expirado.",
      subscription: {
        ...subscription,
        status: "blocked",
      },
    }
  }

  if (subscription.status === "blocked" || subscription.status === "expired") {
    return {
      ok: true,
      hasAccess: false,
      reason: "Acesso bloqueado.",
      subscription,
    }
  }

  return {
    ok: true,
    hasAccess: false,
    reason: "Status de assinatura inválido.",
    subscription,
  }
}