import { supabase } from "@/lib/supabase"

export async function reactivateSubscription() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Usuário não autenticado." }
  }

  const { data: subscription, error: selectError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selectError) {
    return { ok: false, error: selectError.message }
  }

  if (!subscription) {
    return { ok: false, error: "Assinatura não encontrada." }
  }

  const now = new Date()
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null

  const nextPeriodStart =
    currentPeriodEnd && currentPeriodEnd > now ? currentPeriodEnd : now

  const nextPeriodEnd = new Date(nextPeriodStart)
  nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1)

  const { data: updatedSubscription, error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      cancel_at_period_end: false,
      canceled_at: null,
      blocked_at: null,
      current_period_start: nextPeriodStart.toISOString(),
      current_period_end: nextPeriodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id)
    .select()
    .single()

  if (updateError) {
    return { ok: false, error: updateError.message }
  }

  return { ok: true, subscription: updatedSubscription }
}
