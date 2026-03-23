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
  if (pendingPlanResult.ok && pendingPlanResult.updated && pendingPlanResult.subscription) {
    assinaturaAtual = pendingPlanResult.subscription
  }

  const now = new Date()
  const trialEndsAt = assinaturaAtual.trial_ends_at
    ? new Date(assinaturaAtual.trial_ends_at)
    : null
  const currentPeriodEnd = assinaturaAtual.current_period_end
    ? new Date(assinaturaAtual.current_period_end)
    : null

  // Trial ativo
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

  // Assinatura ativa
  if (assinaturaAtual.status === "active") {
    return {
      ok: true,
      hasAccess: true,
      subscription: assinaturaAtual,
    }
  }

  // Cancelada: mantém acesso até o fim do período
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

  // Pagamento pendente: mantém acesso até o fim do período
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

  if (assinaturaAtual.status === "blocked" || assinaturaAtual.status === "expired") {
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
