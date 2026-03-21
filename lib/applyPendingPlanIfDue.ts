import { supabase } from "@/lib/supabase"

export async function applyPendingPlanIfDue(subscription: any) {
  try {
    if (!subscription?.pending_plan_slug) {
      return {
        ok: true,
        updated: false,
        subscription,
      }
    }

    if (!subscription.current_period_end) {
      return {
        ok: true,
        updated: false,
        subscription,
      }
    }

    const now = new Date()
    const currentPeriodEnd = new Date(subscription.current_period_end)

    if (now <= currentPeriodEnd) {
      return {
        ok: true,
        updated: false,
        subscription,
      }
    }

    const nextPeriodStart = new Date(currentPeriodEnd)
    const nextPeriodEnd = new Date(currentPeriodEnd)
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1)

    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        plan_slug: subscription.pending_plan_slug,
        pending_plan_slug: null,
        current_period_start: nextPeriodStart.toISOString(),
        current_period_end: nextPeriodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)
      .select("*")
      .single()

    if (error) {
      return {
        ok: false,
        updated: false,
        error: error.message,
        subscription,
      }
    }

    return {
      ok: true,
      updated: true,
      subscription: data,
    }
  } catch (error) {
    console.error("Erro em applyPendingPlanIfDue:", error)
    return {
      ok: false,
      updated: false,
      error: "Erro inesperado ao aplicar plano agendado.",
      subscription,
    }
  }
}
