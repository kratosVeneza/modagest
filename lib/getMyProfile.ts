import { supabase } from "@/lib/supabase"

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Usuário não autenticado.", profile: null }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message, profile: null }
  }

  return { ok: true, profile: data }
}
