"use client"

import { useEffect, useState } from "react"
import { getMyProfile } from "@/lib/getMyProfile"

type Profile = {
  plan_slug: string
  subscription_status: string
  trial_ends_at: string | null
  email: string | null
}

export default function MeuPlanoPage() {
  const [perfil, setPerfil] = useState<Profile | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    carregarPerfil()
  }, [])

  async function carregarPerfil() {
    setCarregando(true)
    setErro("")

    const result = await getMyProfile()

    if (!result.ok) {
      setErro(result.error || "Não foi possível carregar o plano.")
      setCarregando(false)
      return
    }

    setPerfil(result.profile as Profile)
    setCarregando(false)
  }

  function nomePlano(plan: string) {
    if (plan === "essencial") return "Essencial"
    if (plan === "premium") return "Premium"
    return "Profissional"
  }

  if (carregando) {
    return <div style={{ padding: 24 }}>Carregando plano...</div>
  }

  if (erro) {
    return <div style={{ padding: 24, color: "#b91c1c" }}>{erro}</div>
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Meu Plano</h1>

      <div style={card}>
        <p><strong>Plano atual:</strong> {nomePlano(perfil?.plan_slug || "profissional")}</p>
        <p><strong>Status:</strong> {perfil?.subscription_status || "-"}</p>
        <p>
          <strong>Trial até:</strong>{" "}
          {perfil?.trial_ends_at
            ? new Date(perfil.trial_ends_at).toLocaleDateString("pt-BR")
            : "-"}
        </p>
        <p><strong>Email:</strong> {perfil?.email || "-"}</p>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  maxWidth: 520,
}
