"use client"

import { useEffect, useState } from "react"
import { getMySubscription } from "@/lib/getMySubscription"
import { cancelSubscription } from "@/lib/cancelSubscription"
import { reactivateSubscription } from "@/lib/reactivateSubscription"
import { registerManualPayment } from "@/lib/registerManualPayment"
import { getMyPayments } from "@/lib/getMyPayments"

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

type Payment = {
  id: string
  amount: number
  currency: string
  status: string
  payment_method: string | null
  due_date: string | null
  paid_at: string | null
  payment_provider: string | null
  created_at: string
}

export default function MeuPlanoPage() {
  const [assinatura, setAssinatura] = useState<Subscription | null>(null)
  const [pagamentos, setPagamentos] = useState<Payment[]>([])
  const [carregando, setCarregando] = useState(true)
  const [cancelando, setCancelando] = useState(false)
  const [reativando, setReativando] = useState(false)
  const [pagando, setPagando] = useState(false)
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    setCarregando(true)
    setErro("")
    setMensagem("")

    const [subscriptionResult, paymentsResult] = await Promise.all([
      getMySubscription(),
      getMyPayments(),
    ])

    if (!subscriptionResult.ok) {
      setErro(subscriptionResult.error || "Não foi possível carregar a assinatura.")
      setCarregando(false)
      return
    }

    if (!paymentsResult.ok) {
      setErro(paymentsResult.error || "Não foi possível carregar os pagamentos.")
      setCarregando(false)
      return
    }

    setAssinatura(subscriptionResult.subscription as Subscription)
    setPagamentos((paymentsResult.payments ?? []) as Payment[])
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
    await carregarTudo()
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
    setPagando(false)
    await carregarTudo()
  }

  function nomePlano(plan: string) {
    if (plan === "essencial") return "Essencial"
    if (plan === "premium") return "Premium"
    return "Profissional"
  }

  function nomeStatusAssinatura(status: string) {
    if (status === "trialing") return "Em teste grátis"
    if (status === "active") return "Ativo"
    if (status === "past_due") return "Pagamento pendente"
    if (status === "canceled") return "Cancelado"
    if (status === "blocked") return "Bloqueado"
    if (status === "expired") return "Expirado"
    return status
  }

  function nomeStatusPagamento(status: string) {
    if (status === "paid") return "Pago"
    if (status === "pending") return "Pendente"
    if (status === "failed") return "Falhou"
    if (status === "refunded") return "Reembolsado"
    return status
  }

  function formatarValor(valor: number, moeda = "BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: moeda || "BRL",
    }).format(Number(valor || 0))
  }

  function corStatusPagamento(status: string) {
    if (status === "paid") return "#065f46"
    if (status === "pending") return "#92400e"
    if (status === "failed") return "#991b1b"
    if (status === "refunded") return "#1d4ed8"
    return "#334155"
  }

  function fundoStatusPagamento(status: string) {
    if (status === "paid") return "#ecfdf5"
    if (status === "pending") return "#fffbeb"
    if (status === "failed") return "#fef2f2"
    if (status === "refunded") return "#eff6ff"
    return "#f8fafc"
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
        <p><strong>Status:</strong> {nomeStatusAssinatura(assinatura?.status || "-")}</p>
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

      <div style={{ height: 20 }} />

      <div style={card}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Histórico de pagamentos</h2>

        {pagamentos.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>
            Nenhum pagamento encontrado até o momento.
          </p>
        ) : (
          <div style={listaPagamentos}>
            {pagamentos.map((pagamento) => (
              <div key={pagamento.id} style={itemPagamento}>
                <div style={itemPagamentoTopo}>
                  <div>
                    <div style={valorPagamento}>
                      {formatarValor(pagamento.amount, pagamento.currency)}
                    </div>
                    <div style={metaPagamento}>
                      Método: {pagamento.payment_method || "-"} • Provedor:{" "}
                      {pagamento.payment_provider || "-"}
                    </div>
                  </div>

                  <span
                    style={{
                      ...tagStatus,
                      color: corStatusPagamento(pagamento.status),
                      background: fundoStatusPagamento(pagamento.status),
                    }}
                  >
                    {nomeStatusPagamento(pagamento.status)}
                  </span>
                </div>

                <div style={datasPagamento}>
                  <span>
                    <strong>Vencimento:</strong>{" "}
                    {pagamento.due_date
                      ? new Date(pagamento.due_date).toLocaleDateString("pt-BR")
                      : "-"}
                  </span>

                  <span>
                    <strong>Pago em:</strong>{" "}
                    {pagamento.paid_at
                      ? new Date(pagamento.paid_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </span>

                  <span>
                    <strong>Criado em:</strong>{" "}
                    {pagamento.created_at
                      ? new Date(pagamento.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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
  maxWidth: 760,
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

const listaPagamentos: React.CSSProperties = {
  display: "grid",
  gap: 14,
}

const itemPagamento: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "#fafafa",
}

const itemPagamentoTopo: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
}

const valorPagamento: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
}

const metaPagamento: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: "#64748b",
}

const datasPagamento: React.CSSProperties = {
  marginTop: 14,
  display: "grid",
  gap: 6,
  fontSize: 14,
  color: "#334155",
}

const tagStatus: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
}

