"use client"

import { useEffect, useState } from "react"
import { getMySubscription } from "@/lib/getMySubscription"
import { cancelSubscription } from "@/lib/cancelSubscription"
import { reactivateSubscription } from "@/lib/reactivateSubscription"
import { registerManualPayment } from "@/lib/registerManualPayment"

type Subscription = {
  id: string
  plan_slug: string
  status: string
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  blocked_at?: string | null
}

export default function MeuPlanoPage() {
  const [assinatura, setAssinatura] = useState<Subscription | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [cancelando, setCancelando] = useState(false)
  const [reativando, setReativando] = useState(false)
  const [pagando, setPagando] = useState(false)
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarAssinatura()
  }, [])

  async function carregarAssinatura() {
    setCarregando(true)
    setErro("")
    setMensagem("")

    const result = await getMySubscription()

    if (!result.ok) {
      setErro(result.error || "Não foi possível carregar a assinatura.")
      setCarregando(false)
      return
    }

    setAssinatura(result.subscription as Subscription)
    setCarregando(false)
  }

  async function cancelarPlano() {
    const confirmado = window.confirm(
      "Tem certeza que deseja cancelar? Você continuará com acesso até o fim do período atual."
    )

    if (!confirmado) return

    setCancelando(true)
    setErro("")
    setMensagem("")

    const result = await cancelSubscription()

    if (!result.ok) {
      setErro(result.error || "Não foi possível cancelar a assinatura.")
      setCancelando(false)
      return
    }

    setMensagem("Assinatura cancelada com sucesso. O acesso continuará até o fim do período atual.")
    setAssinatura(result.subscription as Subscription)
    setCancelando(false)
  }

  async function reativarPlano() {
    setReativando(true)
    setErro("")
    setMensagem("")

    const result = await reactivateSubscription()

    if (!result.ok) {
      setErro(result.error || "Não foi possível reativar a assinatura.")
      setReativando(false)
      return
    }

    setMensagem("Assinatura reativada com sucesso.")
    setAssinatura(result.subscription as Subscription)
    setReativando(false)
  }

  async function pagarManual() {
    setPagando(true)
    setErro("")
    setMensagem("")

    const result = await registerManualPayment()

    if (!result.ok) {
      setErro(result.error || "Não foi possível registrar o pagamento.")
      setPagando(false)
      return
    }

    setMensagem("Pagamento registrado com sucesso. Assinatura desbloqueada/reativada.")
    setAssinatura(result.subscription as Subscription)
    setPagando(false)
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

  if (erro && !assinatura) {
    return <div style={{ padding: 24, color: "#b91c1c" }}>{erro}</div>
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Meu Plano</h1>

      <div style={card}>
        {mensagem && <div style={sucessoBox}>{mensagem}</div>}
        {erro && <div style={erroBox}>{erro}</div>}

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

        <div style={acoesWrap}>
          {!assinatura?.cancel_at_period_end && (
            <button
              type="button"
              onClick={cancelarPlano}
              disabled={cancelando}
              style={botaoCancelar}
            >
              {cancelando ? "Cancelando..." : "Cancelar assinatura"}
            </button>
          )}

          {assinatura?.cancel_at_period_end && (
            <button
              type="button"
              onClick={reativarPlano}
              disabled={reativando}
              style={botaoReativar}
            >
              {reativando ? "Reativando..." : "Reativar assinatura"}
            </button>
          )}

          {(assinatura?.status === "blocked" ||
            assinatura?.status === "past_due" ||
            assinatura?.status === "canceled") && (
            <button
              type="button"
              onClick={pagarManual}
              disabled={pagando}
              style={botaoPagar}
            >
              {pagando ? "Processando..." : "Registrar pagamento manual"}
            </button>
          )}
        </div>
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
  maxWidth: 640,
}

const acoesWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 20,
}

const botaoCancelar: React.CSSProperties = {
  border: "none",
  background: "#dc2626",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
}

const botaoReativar: React.CSSProperties = {
  border: "none",
  background: "#2563eb",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
}

const botaoPagar: React.CSSProperties = {
  border: "none",
  background: "#059669",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
}

const sucessoBox: React.CSSProperties = {
  background: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #a7f3d0",
  padding: "12px 14px",
  borderRadius: 12,
  marginBottom: 14,
  fontSize: 14,
  fontWeight: 600,
}

const erroBox: React.CSSProperties = {
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px 14px",
  borderRadius: 12,
  marginBottom: 14,
  fontSize: 14,
  fontWeight: 600,
}
