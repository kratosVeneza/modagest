"use client"

import { useEffect, useMemo, useState } from "react"
import { getMySubscription } from "@/lib/getMySubscription"
import { cancelSubscription } from "@/lib/cancelSubscription"
import { reactivateSubscription } from "@/lib/reactivateSubscription"
import { registerManualPayment } from "@/lib/registerManualPayment"
import { getMyPayments } from "@/lib/getMyPayments"
import { changeSubscriptionPlan } from "@/lib/changeSubscriptionPlan"
import {
  BadgeCheck,
  AlertTriangle,
  CreditCard,
  ArrowUpRight,
  Crown,
  ShieldCheck,
} from "lucide-react"

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
  pending_plan_slug?: string | null
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
  const [trocandoPlano, setTrocandoPlano] = useState(false)
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    setCarregando(true)
    setErro("")
    setMensagem("")

    try {
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
    } catch (error) {
      console.error("Erro ao carregar Meu Plano:", error)
      setErro("Erro inesperado ao carregar a página.")
      setCarregando(false)
    }
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

    setMensagem(
      "Assinatura cancelada com sucesso. O acesso continuará até o fim do período atual."
    )
    setAssinatura(result.subscription as Subscription)
    setCancelando(false)
    await carregarTudo()
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

  async function trocarPlano(novoPlano: string) {
    setTrocandoPlano(true)
    setErro("")
    setMensagem("")

    const result = await changeSubscriptionPlan(novoPlano)

    if (!result.ok) {
      setErro(result.error || "Não foi possível trocar o plano.")
      setTrocandoPlano(false)
      return
    }

    if (result.type === "upgrade") {
      setMensagem(`Plano alterado com sucesso para ${nomePlano(novoPlano)}.`)
    } else {
      setMensagem(`Mudança para ${nomePlano(novoPlano)} agendada para o próximo ciclo.`)
    }

    setTrocandoPlano(false)
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

  function isPlanoAtual(plano: string) {
    return assinatura?.plan_slug === plano
  }

  const statusVisual = useMemo(() => {
    const status = assinatura?.status || ""

    if (status === "active") {
      return {
        titulo: "Assinatura ativa",
        descricao: "Seu acesso está liberado normalmente.",
        fundo: "#ecfdf5",
        borda: "#a7f3d0",
        cor: "#065f46",
        icon: <BadgeCheck size={18} />,
      }
    }

    if (status === "trialing") {
      return {
        titulo: "Teste grátis em andamento",
        descricao: "Seu acesso está liberado durante o período de teste.",
        fundo: "#eff6ff",
        borda: "#bfdbfe",
        cor: "#1d4ed8",
        icon: <ShieldCheck size={18} />,
      }
    }

    if (status === "past_due") {
      return {
        titulo: "Pagamento pendente",
        descricao: "Seu período venceu e é necessário regularizar para continuar usando o sistema.",
        fundo: "#fffbeb",
        borda: "#fde68a",
        cor: "#92400e",
        icon: <AlertTriangle size={18} />,
      }
    }

    if (status === "blocked") {
      return {
        titulo: "Acesso bloqueado",
        descricao: "Seu acesso foi bloqueado. Regularize o pagamento ou reative a assinatura.",
        fundo: "#fef2f2",
        borda: "#fecaca",
        cor: "#991b1b",
        icon: <AlertTriangle size={18} />,
      }
    }

    if (status === "canceled") {
      return {
        titulo: "Assinatura cancelada",
        descricao: "A renovação automática foi desativada, mas seu acesso continua até o fim do período atual.",
        fundo: "#fff7ed",
        borda: "#fdba74",
        cor: "#9a3412",
        icon: <AlertTriangle size={18} />,
      }
    }

    return {
      titulo: "Status da assinatura",
      descricao: "Consulte abaixo os detalhes do seu plano.",
      fundo: "#f8fafc",
      borda: "#e5e7eb",
      cor: "#334155",
      icon: <CreditCard size={18} />,
    }
  }, [assinatura])

  if (carregando) {
    return <div style={{ padding: 24 }}>Carregando assinatura...</div>
  }

  if (erro && !assinatura) {
    return <div style={{ padding: 24, color: "#b91c1c" }}>{erro}</div>
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={heroCard}>
        <div style={heroTop}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>Meu Plano</h1>
            <p style={heroSub}>
              Gerencie sua assinatura, acompanhe o status e escolha o melhor plano para a sua loja.
            </p>
          </div>

          <div style={planoBadge}>
            <Crown size={16} />
            {nomePlano(assinatura?.plan_slug || "profissional")}
          </div>
        </div>

        <div
          style={{
            ...statusBox,
            background: statusVisual.fundo,
            borderColor: statusVisual.borda,
            color: statusVisual.cor,
          }}
        >
          <div style={statusIcon}>{statusVisual.icon}</div>
          <div>
            <div style={statusTitulo}>{statusVisual.titulo}</div>
            <div style={statusDesc}>{statusVisual.descricao}</div>
          </div>
        </div>

        {mensagem && <div style={sucessoBox}>{mensagem}</div>}
        {erro && <div style={erroBox}>{erro}</div>}
      </div>

      <div style={gridResumo}>
        <div style={miniCard}>
          <span style={miniLabel}>Plano atual</span>
          <strong style={miniValue}>{nomePlano(assinatura?.plan_slug || "profissional")}</strong>
        </div>

        <div style={miniCard}>
          <span style={miniLabel}>Status</span>
          <strong style={miniValue}>{nomeStatusAssinatura(assinatura?.status || "-")}</strong>
        </div>

        <div style={miniCard}>
          <span style={miniLabel}>Fim do trial</span>
          <strong style={miniValue}>
            {assinatura?.trial_ends_at
              ? new Date(assinatura.trial_ends_at).toLocaleDateString("pt-BR")
              : "-"}
          </strong>
        </div>

        <div style={miniCard}>
          <span style={miniLabel}>Período atual até</span>
          <strong style={miniValue}>
            {assinatura?.current_period_end
              ? new Date(assinatura.current_period_end).toLocaleDateString("pt-BR")
              : "-"}
          </strong>
        </div>
      </div>

      <div style={{ height: 20 }} />

      <div style={card}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Status da assinatura</h2>

        <p><strong>Cancelar ao fim do período:</strong> {assinatura?.cancel_at_period_end ? "Sim" : "Não"}</p>

        {assinatura?.pending_plan_slug && (
          <div style={alertaAgendamento}>
            Mudança agendada para o próximo ciclo:{" "}
            <strong>{nomePlano(assinatura.pending_plan_slug)}</strong>
          </div>
        )}

        {assinatura?.cancel_at_period_end && assinatura?.current_period_end && (
          <div style={alertaInfo}>
            Sua assinatura foi cancelada, mas continua ativa até{" "}
            <strong>
              {new Date(assinatura.current_period_end).toLocaleDateString("pt-BR")}
            </strong>
            .
          </div>
        )}

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
              {pagando ? "Processando..." : "Regularizar pagamento"}
            </button>
          )}
        </div>
      </div>

      <div style={{ height: 20 }} />

      <div style={card}>
        <div style={tituloPlanoHeader}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Upgrade ou troca de plano</h2>
            <p style={subtleText}>
              Upgrades são aplicados imediatamente. Downgrades ficam agendados para o próximo ciclo.
            </p>
          </div>

          <div style={ctaUpgrade}>
            <ArrowUpRight size={16} />
            Mais recursos
          </div>
        </div>

        <div style={planosGrid}>
          <div style={{ ...planoCard, ...(isPlanoAtual("essencial") ? planoAtualCard : {}) }}>
            <div style={planoHeader}>
              <h3 style={planoNome}>Essencial</h3>
              <span style={planoPreco}>R$ 39/mês</span>
            </div>

            <ul style={listaBeneficios}>
              <li>Produtos</li>
              <li>Estoque</li>
              <li>Pedidos</li>
              <li>Vendas</li>
              <li>Clientes</li>
            </ul>

            <button
              type="button"
              onClick={() => trocarPlano("essencial")}
              disabled={trocandoPlano || isPlanoAtual("essencial")}
              style={{
                ...botaoSecundario,
                ...(isPlanoAtual("essencial") ? botaoDesabilitado : {}),
              }}
            >
              {isPlanoAtual("essencial")
                ? "Plano atual"
                : trocandoPlano
                ? "Processando..."
                : "Mudar para Essencial"}
            </button>
          </div>

          <div style={{ ...planoCard, ...planoDestaque, ...(isPlanoAtual("profissional") ? planoAtualCard : {}) }}>
            <div style={tagMaisVendido}>Mais vendido</div>

            <div style={planoHeader}>
              <h3 style={planoNome}>Profissional</h3>
              <span style={planoPreco}>R$ 89/mês</span>
            </div>

            <ul style={listaBeneficios}>
              <li>Tudo do Essencial</li>
              <li>Financeiro</li>
              <li>Histórico de vendas</li>
              <li>Relatórios avançados</li>
              <li>Exportações</li>
            </ul>

            <button
              type="button"
              onClick={() => trocarPlano("profissional")}
              disabled={trocandoPlano || isPlanoAtual("profissional")}
              style={{
                ...botaoPrimario,
                ...(isPlanoAtual("profissional") ? botaoDesabilitado : {}),
              }}
            >
              {isPlanoAtual("profissional")
                ? "Plano atual"
                : trocandoPlano
                ? "Processando..."
                : "Fazer upgrade para Profissional"}
            </button>
          </div>

          <div style={{ ...planoCard, ...(isPlanoAtual("premium") ? planoAtualCard : {}) }}>
            <div style={planoHeader}>
              <h3 style={planoNome}>Premium</h3>
              <span style={planoPreco}>R$ 179/mês</span>
            </div>

            <ul style={listaBeneficios}>
              <li>Tudo do Profissional</li>
              <li>Suporte prioritário</li>
              <li>Recursos premium futuros</li>
              <li>Expansões exclusivas</li>
            </ul>

            <button
              type="button"
              onClick={() => trocarPlano("premium")}
              disabled={trocandoPlano || isPlanoAtual("premium")}
              style={{
                ...botaoPremium,
                ...(isPlanoAtual("premium") ? botaoDesabilitado : {}),
              }}
            >
              {isPlanoAtual("premium")
                ? "Plano atual"
                : trocandoPlano
                ? "Processando..."
                : "Fazer upgrade para Premium"}
            </button>
          </div>
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

const heroCard: React.CSSProperties = {
  background: "linear-gradient(135deg, #0f172a, #1e293b)",
  color: "#fff",
  borderRadius: 20,
  padding: 24,
  maxWidth: 980,
  boxShadow: "0 16px 40px rgba(15,23,42,0.15)",
}

const heroTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
}

const heroSub: React.CSSProperties = {
  margin: "8px 0 0 0",
  color: "rgba(255,255,255,0.8)",
  lineHeight: 1.6,
}

const planoBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 800,
}

const statusBox: React.CSSProperties = {
  marginTop: 18,
  border: "1px solid",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
}

const statusIcon: React.CSSProperties = {
  marginTop: 2,
}

const statusTitulo: React.CSSProperties = {
  fontWeight: 800,
  marginBottom: 4,
}

const statusDesc: React.CSSProperties = {
  lineHeight: 1.5,
}

const gridResumo: React.CSSProperties = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  maxWidth: 980,
}

const miniCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
}

const miniLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#64748b",
  marginBottom: 8,
}

const miniValue: React.CSSProperties = {
  fontSize: 18,
  color: "#0f172a",
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  maxWidth: 980,
}

const acoesWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 20,
}

const tituloPlanoHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 16,
}

const subtleText: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
}

const ctaUpgrade: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "#eff6ff",
  color: "#2563eb",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 800,
}

const planosGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
}

const planoCard: React.CSSProperties = {
  position: "relative",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#fff",
}

const planoAtualCard: React.CSSProperties = {
  border: "2px solid #2563eb",
  boxShadow: "0 10px 26px rgba(37,99,235,0.10)",
}

const planoDestaque: React.CSSProperties = {
  background: "#f8fbff",
}

const tagMaisVendido: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  background: "#2563eb",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
}

const planoHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 14,
}

const planoNome: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: "#0f172a",
}

const planoPreco: React.CSSProperties = {
  fontWeight: 800,
  color: "#2563eb",
}

const listaBeneficios: React.CSSProperties = {
  margin: "0 0 18px 18px",
  padding: 0,
  color: "#334155",
  lineHeight: 1.8,
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

const botaoPrimario: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
}

const botaoSecundario: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
}

const botaoPremium: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "#7c3aed",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
}

const botaoDesabilitado: React.CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
}

const alertaInfo: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  padding: "12px 14px",
  borderRadius: 12,
  marginTop: 14,
  fontSize: 14,
  fontWeight: 600,
}

const alertaAgendamento: React.CSSProperties = {
  background: "#fffbeb",
  color: "#92400e",
  border: "1px solid #fde68a",
  padding: "12px 14px",
  borderRadius: 12,
  marginTop: 14,
  fontSize: 14,
  fontWeight: 600,
}

const sucessoBox: React.CSSProperties = {
  background: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #a7f3d0",
  padding: "12px 14px",
  borderRadius: 12,
  marginTop: 14,
  fontSize: 14,
  fontWeight: 600,
}

const erroBox: React.CSSProperties = {
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px 14px",
  borderRadius: 12,
  marginTop: 14,
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
