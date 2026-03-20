import { supabase } from "@/lib/supabase"
import { reactivateSubscription } from "@/lib/reactivateSubscription"

const VALORES_PLANO: Record<string, number> = {
  essencial: 39,
  profissional: 89,
  premium: 179,
}

export async function registerManualPayment() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Usuário não autenticado." }
  }

  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subError) {
    return { ok: false, error: subError.message }
  }

  if (!subscription) {
    return { ok: false, error: "Assinatura não encontrada." }
  }

  const amount = VALORES_PLANO[subscription.plan_slug] ?? 89

  const now = new Date()

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      subscription_id: subscription.id,
      amount,
      currency: "BRL",
      status: "paid",
      payment_method: "manual",
      due_date: now.toISOString(),
      paid_at: now.toISOString(),
      payment_provider: "manual",
    })
    .select()
    .single()

  if (paymentError) {
    return { ok: false, error: paymentError.message }
  }

  const reactivationResult = await reactivateSubscription()

  if (!reactivationResult.ok) {
    return { ok: false, error: reactivationResult.error }
  }

  return {
    ok: true,
    payment,
    subscription: reactivationResult.subscription,
  }
}
