import { supabase } from "@/lib/supabase"

const PLAN_ORDER: Record<string, number> = {
  essencial: 1,
  profissional: 2,
  premium: 3,
}

export async function changeSubscriptionPlan(newPlanSlug: string) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        ok: false,
        error: "Usuário não autenticado.",
      }
    }

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError || !subscription) {
      return {
        ok: false,
        error: "Assinatura não encontrada.",
      }
    }

    const currentPlan = subscription.plan_slug

    if (currentPlan === newPlanSlug) {
      return {
        ok: false,
        error: "Você já está nesse plano.",
      }
    }

    const currentOrder = PLAN_ORDER[currentPlan] || 0
    const newOrder = PLAN_ORDER[newPlanSlug] || 0

    const isUpgrade = newOrder > currentOrder
    const agora = new Date().toISOString()

    if (isUpgrade) {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          plan_slug: newPlanSlug,
          pending_plan_slug: null,
          cancel_at_period_end: false,
          canceled_at: null,
          status: "active",
          updated_at: agora,
        })
        .eq("id", subscription.id)
        .select("*")
        .single()

      if (error) {
        return {
          ok: false,
          error: error.message,
        }
      }

      return {
        ok: true,
        type: "upgrade",
        subscription: data,
      }
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        pending_plan_slug: newPlanSlug,
        updated_at: agora,
      })
      .eq("id", subscription.id)
      .select("*")
      .single()

    if (error) {
      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: true,
      type: "downgrade_scheduled",
      subscription: data,
    }
  } catch (error) {
    console.error("Erro em changeSubscriptionPlan:", error)
    return {
      ok: false,
      error: "Erro inesperado ao trocar de plano.",
    }
  }
}
