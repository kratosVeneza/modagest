import { supabase } from "@/lib/supabase"
import { applyPendingPlanIfDue } from "@/lib/applyPendingPlanIfDue"

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

  let assinaturaAtual = subscription

  const pendingPlanResult = await applyPendingPlanIfDue(assinaturaAtual)
  if (
    pendingPlanResult.ok &&
    pendingPlanResult.updated &&
    pendingPlanResult.subscription
  ) {
    assinaturaAtual = pendingPlanResult.subscription
  }

  const now = new Date()
  const trialEndsAt = assinaturaAtual.trial_ends_at
    ? new Date(assinaturaAtual.trial_ends_at)
    : null
  const currentPeriodEnd = assinaturaAtual.current_period_end
    ? new Date(assinaturaAtual.current_period_end)
    : null

  // ACTIVE:
  // Se ainda está dentro do período, acessa normalmente.
  // Se venceu, vira past_due e perde acesso até pagamento/reativação.
  if (assinaturaAtual.status === "active") {
    if (currentPeriodEnd && now <= currentPeriodEnd) {
      return {
        ok: true,
        hasAccess: true,
        subscription: assinaturaAtual,
      }
    }

    const { data: updatedSubscription } = await supabase
      .from("subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)
      .select("*")
      .single()

    return {
      ok: true,
      hasAccess: false,
      reason: "Assinatura vencida aguardando pagamento.",
      subscription: updatedSubscription || {
        ...assinaturaAtual,
        status: "past_due",
      },
    }
  }

  // TRIALING:
  // Acesso até trial_ends_at. Depois bloqueia.
  if (assinaturaAtual.status === "trialing") {
    if (trialEndsAt && now <= trialEndsAt) {
      return {
        ok: true,
        hasAccess: true,
        subscription: assinaturaAtual,
      }
    }

    const { data: updatedSubscription } = await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)
      .select("*")
      .single()

    return {
      ok: true,
      hasAccess: false,
      reason: "Período de teste expirado.",
      subscription: updatedSubscription || {
        ...assinaturaAtual,
        status: "blocked",
      },
    }
  }

  // CANCELED:
  // Continua ativo até o fim do período pago. Depois bloqueia.
  if (assinaturaAtual.status === "canceled") {
    if (currentPeriodEnd && now <= currentPeriodEnd) {
      return {
        ok: true,
        hasAccess: true,
        subscription: assinaturaAtual,
      }
    }

    const { data: updatedSubscription } = await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)
      .select("*")
      .single()

    return {
      ok: true,
      hasAccess: false,
      reason: "Assinatura encerrada.",
      subscription: updatedSubscription || {
        ...assinaturaAtual,
        status: "blocked",
      },
    }
  }

  // PAST_DUE:
  // Se ainda está no período, você pode optar por tolerância.
  // Como seu sistema hoje usa current_period_end como limite, mantemos assim.
  if (assinaturaAtual.status === "past_due") {
    if (currentPeriodEnd && now <= currentPeriodEnd) {
      return {
        ok: true,
        hasAccess: true,
        subscription: assinaturaAtual,
      }
    }

    const { data: updatedSubscription } = await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)
      .select("*")
      .single()

    return {
      ok: true,
      hasAccess: false,
      reason: "Pagamento pendente e prazo expirado.",
      subscription: updatedSubscription || {
        ...assinaturaAtual,
        status: "blocked",
      },
    }
  }

  if (
    assinaturaAtual.status === "blocked" ||
    assinaturaAtual.status === "expired"
  ) {
    return {
      ok: true,
      hasAccess: false,
      reason: "Acesso bloqueado.",
      subscription: assinaturaAtual,
    }
  }

  return {
    ok: true,
    hasAccess: false,
    reason: "Status de assinatura inválido.",
    subscription: assinaturaAtual,
  }
}