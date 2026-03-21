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

  if (assinaturaAtual.status === "active") {
    if (currentPeriodEnd && now > currentPeriodEnd) {
      const novoFim = new Date(currentPeriodEnd)
      novoFim.setMonth(novoFim.getMonth() + 1)

      const { data: renewedSubscription } = await supabase
        .from("subscriptions")
        .update({
          current_period_start: currentPeriodEnd.toISOString(),
          current_period_end: novoFim.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", assinaturaAtual.id)
        .select("*")
        .single()

      return {
        ok: true,
        hasAccess: true,
        subscription: renewedSubscription || assinaturaAtual,
      }
    }

    return {
      ok: true,
      hasAccess: true,
      subscription: assinaturaAtual,
    }
  }

  if (assinaturaAtual.status === "trialing") {
    if (trialEndsAt && now <= trialEndsAt) {
      return {
        ok: true,
        hasAccess: true,
        subscription: assinaturaAtual,
      }
    }

    await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)

    return {
      ok: true,
      hasAccess: false,
      reason: "Período de teste expirado.",
      subscription: {
        ...assinaturaAtual,
        status: "blocked",
      },
    }
  }

  if (assinaturaAtual.status === "canceled") {
    if (currentPeriodEnd && now <= currentPeriodEnd) {
      return {
        ok: true,
        hasAccess: true,
        subscription: assinaturaAtual,
      }
    }

    await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)

    return {
      ok: true,
      hasAccess: false,
      reason: "Assinatura encerrada.",
      subscription: {
        ...assinaturaAtual,
        status: "blocked",
      },
    }
  }

  if (assinaturaAtual.status === "past_due") {
    if (currentPeriodEnd && now <= currentPeriodEnd) {
      return {
        ok: true,
        hasAccess: true,
        subscription: assinaturaAtual,
      }
    }

    await supabase
      .from("subscriptions")
      .update({
        status: "blocked",
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinaturaAtual.id)

    return {
      ok: true,
      hasAccess: false,
      reason: "Pagamento pendente e prazo expirado.",
      subscription: {
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