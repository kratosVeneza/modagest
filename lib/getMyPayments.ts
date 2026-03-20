import { supabase } from "@/lib/supabase"

export async function getMyPayments() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Usuário não autenticado.", payments: [] }
  }

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return { ok: false, error: error.message, payments: [] }
  }

  return { ok: true, payments: data ?? [] }
}
