"use client"

import { useEffect, useState } from "react"
import { getMySubscription } from "@/lib/getMySubscription"

type Subscription = {
  plan_slug: string
  status: string
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
}

export default function MeuPlanoPage() {
  const [assinatura, setAssinatura] = useState<Subscription | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    carregarAssinatura()
  }, [])

  async function carregarAssinatura() {
    setCarregando(true)
    setErro("")

    const result = await getMySubscription()

    if (!result.ok) {
      setErro(result.error || "Não foi possível carregar a assinatura.")
      setCarregando(false)
      return
    }

    setAssinatura(result.subscription as Subscription)
    setCarregando(false)
  }

  function nomePlano(plan: string) {
    if (plan === "essencial") return "Essencial"
    if (plan === "premium") return "Premium"
    return "Profissional"
  }

  function nomeStatus(status: string) {
    if (status === "trialing") return "Em teste grátis"
    if (status === "active") return "Ativo"
    if (status === "past_due") return "Pagamento pendente"
    if (status === "canceled") return "Cancelado"
    if (status === "blocked") return "Bloqueado"
    if (status === "expired") return "Expirado"
    return status
  }

  if (carregando) {
    return <div style={{ padding: 24 }}>Carregando assinatura...</div>
  }

  if (erro) {
    return <div style={{ padding: 24, color: "#b91c1c" }}>{erro}</div>
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Meu Plano</h1>

      <div style={card}>
        <p><strong>Plano atual:</strong> {nomePlano(assinatura?.plan_slug || "profissional")}</p>
        <p><strong>Status:</strong> {nomeStatus(assinatura?.status || "-")}</p>
        <p>
          <strong>Fim do trial:</strong>{" "}
          {assinatura?.trial_ends_at
            ? new Date(assinatura.trial_ends_at).toLocaleDateString("pt-BR")
            : "-"}
        </p>
        <p>
          <strong>Período atual até:</strong>{" "}
          {assinatura?.current_period_end
            ? new Date(assinatura.current_period_end).toLocaleDateString("pt-BR")
            : "-"}
        </p>
        <p>
          <strong>Cancelar ao fim do período:</strong>{" "}
          {assinatura?.cancel_at_period_end ? "Sim" : "Não"}
        </p>
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
  maxWidth: 560,
}
