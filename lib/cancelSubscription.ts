import { supabase } from "@/lib/supabase"

export async function cancelSubscription() {
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

  const { data: updatedSubscription, error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
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