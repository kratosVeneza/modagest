"use client"

import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Wallet,
  BadgeDollarSign,
  BarChart3,
} from "lucide-react"

type Venda = {
  id: number
  product_id: number
  quantidade: number
  valor_total: number
  created_at: string
  status?: string
}

type Pagamento = {
  id: number
  sale_id: number
  valor: number
  created_at: string
}

type Produto = {
  id: number
  nome: string
  custo: number | null
}

type GraficoDia = {
  dia: string
  total: number
}

type TrendInfo = {
  variant: "up" | "down" | "neutral"
  label: string
  icon: React.ReactNode
}

type Periodo = "hoje" | "7dias" | "30dias" | "mes"

const periodos: { value: Periodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "7 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "mes", label: "Mês atual" },
]

export default function Dashboard() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])

  const [periodo, setPeriodo] = useState<Periodo>("7dias")

  const [faturamento, setFaturamento] = useState(0)
  const [recebido, setRecebido] = useState(0)
  const [lucro, setLucro] = useState(0)
  const [emAberto, setEmAberto] = useState(0)

  const [faturamentoComparacao, setFaturamentoComparacao] = useState(0)
  const [recebidoComparacao, setRecebidoComparacao] = useState(0)
  const [lucroComparacao, setLucroComparacao] = useState(0)

  const [graficoVendas, setGraficoVendas] = useState<GraficoDia[]>([])
  const [graficoRecebido, setGraficoRecebido] = useState<GraficoDia[]>([])

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (vendas.length || pagamentos.length || produtos.length) {
      calcular(vendas, pagamentos, produtos)
    }
  }, [periodo])

  async function carregarDados() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: vendasData } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)

    const { data: pagamentosData } = await supabase
      .from("sale_payments")
      .select("*")
      .eq("user_id", user.id)

    const { data: produtosData } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)

    const vendasLista = (vendasData || []) as Venda[]
    const pagamentosLista = (pagamentosData || []) as Pagamento[]
    const produtosLista = (produtosData || []) as Produto[]

    setVendas(vendasLista)
    setPagamentos(pagamentosLista)
    setProdutos(produtosLista)

    calcular(vendasLista, pagamentosLista, produtosLista)
  }

  function obterIntervalos() {
    const agora = new Date()

    if (periodo === "hoje") {
      const inicioAtual = new Date()
      inicioAtual.setHours(0, 0, 0, 0)

      const fimAtual = new Date()

      const inicioAnterior = new Date(inicioAtual)
      inicioAnterior.setDate(inicioAnterior.getDate() - 1)

      const fimAnterior = new Date(inicioAtual)
      fimAnterior.setMilliseconds(-1)

      return {
        inicioAtual,
        fimAtual,
        inicioAnterior,
        fimAnterior,
        quantidadeDias: 1,
      }
    }

    if (periodo === "7dias") {
      const inicioAtual = new Date()
      inicioAtual.setDate(agora.getDate() - 6)
      inicioAtual.setHours(0, 0, 0, 0)

      const fimAtual = new Date()

      const inicioAnterior = new Date(inicioAtual)
      inicioAnterior.setDate(inicioAnterior.getDate() - 7)

      const fimAnterior = new Date(inicioAtual)
      fimAnterior.setMilliseconds(-1)

      return {
        inicioAtual,
        fimAtual,
        inicioAnterior,
        fimAnterior,
        quantidadeDias: 7,
      }
    }

    if (periodo === "30dias") {
      const inicioAtual = new Date()
      inicioAtual.setDate(agora.getDate() - 29)
      inicioAtual.setHours(0, 0, 0, 0)

      const fimAtual = new Date()

      const inicioAnterior = new Date(inicioAtual)
      inicioAnterior.setDate(inicioAnterior.getDate() - 30)

      const fimAnterior = new Date(inicioAtual)
      fimAnterior.setMilliseconds(-1)

      return {
        inicioAtual,
        fimAtual,
        inicioAnterior,
        fimAnterior,
        quantidadeDias: 30,
      }
    }

    const inicioAtual = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const fimAtual = new Date()

    const inicioAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    const fimAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999)

    const quantidadeDias =
      Math.ceil((fimAtual.getTime() - inicioAtual.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return {
      inicioAtual,
      fimAtual,
      inicioAnterior,
      fimAnterior,
      quantidadeDias,
    }
  }

  function calcular(
    vendasLista: Venda[],
    pagamentosLista: Pagamento[],
    produtosLista: Produto[]
  ) {
    const vendasAtivas = vendasLista.filter((v) => v.status !== "Cancelada")

    const {
      inicioAtual,
      fimAtual,
      inicioAnterior,
      fimAnterior,
      quantidadeDias,
    } = obterIntervalos()

    const vendasPeriodoAtual = vendasAtivas.filter((v) => {
      const data = new Date(v.created_at)
      return data >= inicioAtual && data <= fimAtual
    })

    const vendasPeriodoAnterior = vendasAtivas.filter((v) => {
      const data = new Date(v.created_at)
      return data >= inicioAnterior && data <= fimAnterior
    })

    const idsAtual = new Set(vendasPeriodoAtual.map((v) => v.id))
    const idsAnterior = new Set(vendasPeriodoAnterior.map((v) => v.id))

    const pagamentosAtual = pagamentosLista.filter((p) => {
      const data = new Date(p.created_at)
      return data >= inicioAtual && data <= fimAtual && idsAtual.has(p.sale_id)
    })

    const pagamentosAnterior = pagamentosLista.filter((p) => {
      const data = new Date(p.created_at)
      return data >= inicioAnterior && data <= fimAnterior && idsAnterior.has(p.sale_id)
    })

    const faturamentoAtual = vendasPeriodoAtual.reduce(
      (soma, venda) => soma + Number(venda.valor_total),
      0
    )

    const faturamentoAnterior = vendasPeriodoAnterior.reduce(
      (soma, venda) => soma + Number(venda.valor_total),
      0
    )

    const recebidoAtual = pagamentosAtual.reduce(
      (soma, pagamento) => soma + Number(pagamento.valor),
      0
    )

    const recebidoAnterior = pagamentosAnterior.reduce(
      (soma, pagamento) => soma + Number(pagamento.valor),
      0
    )

    const recebidoPorVendaPeriodo = vendasPeriodoAtual.reduce((soma, venda) => {
      const totalRecebidoDaVenda = pagamentosLista
        .filter((pagamento) => pagamento.sale_id === venda.id)
        .reduce((acc, item) => acc + Number(item.valor), 0)

      return soma + totalRecebidoDaVenda
    }, 0)

    const emAbertoAtual = Math.max(faturamentoAtual - recebidoPorVendaPeriodo, 0)

    let lucroAtual = 0
    let lucroAnterior = 0

    pagamentosAtual.forEach((pagamento) => {
      const venda = vendasPeriodoAtual.find((v) => v.id === pagamento.sale_id)
      if (!venda) return

      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const custo = Number(produto?.custo || 0)

      const proporcao =
        Number(venda.valor_total) > 0
          ? Number(pagamento.valor) / Number(venda.valor_total)
          : 0

      const custoProporcional = custo * Number(venda.quantidade) * proporcao
      lucroAtual += Number(pagamento.valor) - custoProporcional
    })

    pagamentosAnterior.forEach((pagamento) => {
      const venda = vendasPeriodoAnterior.find((v) => v.id === pagamento.sale_id)
      if (!venda) return

      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const custo = Number(produto?.custo || 0)

      const proporcao =
        Number(venda.valor_total) > 0
          ? Number(pagamento.valor) / Number(venda.valor_total)
          : 0

      const custoProporcional = custo * Number(venda.quantidade) * proporcao
      lucroAnterior += Number(pagamento.valor) - custoProporcional
    })

    setFaturamento(faturamentoAtual)
    setRecebido(recebidoAtual)
    setLucro(lucroAtual)
    setEmAberto(emAbertoAtual)

    setFaturamentoComparacao(faturamentoAnterior)
    setRecebidoComparacao(recebidoAnterior)
    setLucroComparacao(lucroAnterior)

    gerarGraficoVendas(vendasPeriodoAtual, inicioAtual, quantidadeDias)
    gerarGraficoRecebido(pagamentosAtual, inicioAtual, quantidadeDias)
  }

  function gerarGraficoVendas(
    vendasPeriodo: Venda[],
    inicioAtual: Date,
    quantidadeDias: number
  ) {
    const mapa = new Map<string, number>()

    for (let i = 0; i < quantidadeDias; i++) {
      const data = new Date(inicioAtual)
      data.setDate(inicioAtual.getDate() + i)

      const chave = data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })

      mapa.set(chave, 0)
    }

    vendasPeriodo.forEach((venda) => {
      const dia = new Date(venda.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })

      mapa.set(dia, (mapa.get(dia) || 0) + Number(venda.valor_total))
    })

    const dados = Array.from(mapa.entries()).map(([dia, total]) => ({
      dia,
      total,
    }))

    setGraficoVendas(dados)
  }

  function gerarGraficoRecebido(
    pagamentosPeriodo: Pagamento[],
    inicioAtual: Date,
    quantidadeDias: number
  ) {
    const mapa = new Map<string, number>()

    for (let i = 0; i < quantidadeDias; i++) {
      const data = new Date(inicioAtual)
      data.setDate(inicioAtual.getDate() + i)

      const chave = data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })

      mapa.set(chave, 0)
    }

    pagamentosPeriodo.forEach((pagamento) => {
      const dia = new Date(pagamento.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })

      mapa.set(dia, (mapa.get(dia) || 0) + Number(pagamento.valor))
    })

    const dados = Array.from(mapa.entries()).map(([dia, total]) => ({
      dia,
      total,
    }))

    setGraficoRecebido(dados)
  }

  function tendencia(atual: number, anterior: number): TrendInfo {
    if (anterior === 0 && atual > 0) {
      return {
        variant: "up",
        icon: <TrendingUp size={16} color="#16a34a" />,
        label: "Novo crescimento",
      }
    }

    if (anterior === 0) {
      return {
        variant: "neutral",
        icon: <Minus size={16} color="#64748b" />,
        label: "Sem base anterior",
      }
    }

    if (atual > anterior) {
      const percentual = ((atual - anterior) / anterior) * 100
      return {
        variant: "up",
        icon: <TrendingUp size={16} color="#16a34a" />,
        label: `+${percentual.toFixed(0)}%`,
      }
    }

    if (atual < anterior) {
      const percentual = ((anterior - atual) / anterior) * 100
      return {
        variant: "down",
        icon: <TrendingDown size={16} color="#dc2626" />,
        label: `-${percentual.toFixed(0)}%`,
      }
    }

    return {
      variant: "neutral",
      icon: <Minus size={16} color="#64748b" />,
      label: "Sem variação",
    }
  }

  const tendenciaFaturamento = useMemo(
    () => tendencia(faturamento, faturamentoComparacao),
    [faturamento, faturamentoComparacao]
  )

  const tendenciaRecebido = useMemo(
    () => tendencia(recebido, recebidoComparacao),
    [recebido, recebidoComparacao]
  )

  const tendenciaLucro = useMemo(
    () => tendencia(lucro, lucroComparacao),
    [lucro, lucroComparacao]
  )

  const textoComparacao =
    periodo === "hoje"
      ? "vs ontem"
      : periodo === "mes"
      ? "vs mês anterior"
      : "vs período anterior"

  return (
    <div style={{ padding: 24 }}>
      <div style={headerWrap}>
        <div>
          <p style={eyebrow}>Dashboard</p>
          <h1 style={pageTitle}>Visão geral da sua operação</h1>
          <p style={pageSubtitle}>
            Acompanhe faturamento, recebimentos, valores em aberto e lucro conforme o período selecionado.
          </p>
        </div>
      </div>

      <div style={periodWrap}>
        {periodos.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setPeriodo(item.value)}
            style={{
              ...periodButton,
              ...(periodo === item.value ? periodButtonActive : {}),
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={grid}>
        <div style={card}>
          <div style={cardTop}>
            <div>
              <p style={cardLabel}>Total vendido</p>
              <h3 style={cardValue}>R$ {faturamento.toFixed(2)}</h3>
            </div>
            <div style={iconBox}>
              <DollarSign size={20} />
            </div>
          </div>

          <div style={trendRow}>
            <span
              style={{
                ...trendBadge,
                ...(tendenciaFaturamento.variant === "up"
                  ? trendUp
                  : tendenciaFaturamento.variant === "down"
                  ? trendDown
                  : trendNeutral),
              }}
            >
              {tendenciaFaturamento.icon}
              {tendenciaFaturamento.label}
            </span>
            <span style={helperText}>{textoComparacao}</span>
          </div>
        </div>

        <div style={card}>
          <div style={cardTop}>
            <div>
              <p style={cardLabel}>Total recebido</p>
              <h3 style={cardValue}>R$ {recebido.toFixed(2)}</h3>
            </div>
            <div style={{ ...iconBox, background: "#ecfdf5", color: "#065f46" }}>
              <Wallet size={20} />
            </div>
          </div>

          <div style={trendRow}>
            <span
              style={{
                ...trendBadge,
                ...(tendenciaRecebido.variant === "up"
                  ? trendUp
                  : tendenciaRecebido.variant === "down"
                  ? trendDown
                  : trendNeutral),
              }}
            >
              {tendenciaRecebido.icon}
              {tendenciaRecebido.label}
            </span>
            <span style={helperText}>{textoComparacao}</span>
          </div>
        </div>

        <div style={card}>
          <div style={cardTop}>
            <div>
              <p style={cardLabel}>Em aberto</p>
              <h3 style={cardValue}>R$ {emAberto.toFixed(2)}</h3>
            </div>
            <div style={{ ...iconBox, background: "#fef2f2", color: "#991b1b" }}>
              <BadgeDollarSign size={20} />
            </div>
          </div>
          <p style={helperText}>Valor ainda pendente das vendas do período.</p>
        </div>

        <div style={card}>
          <div style={cardTop}>
            <div>
              <p style={cardLabel}>Lucro recebido</p>
              <h3 style={cardValue}>R$ {lucro.toFixed(2)}</h3>
            </div>
            <div style={{ ...iconBox, background: "#eff6ff", color: "#1d4ed8" }}>
              <BarChart3 size={20} />
            </div>
          </div>

          <div style={trendRow}>
            <span
              style={{
                ...trendBadge,
                ...(tendenciaLucro.variant === "up"
                  ? trendUp
                  : tendenciaLucro.variant === "down"
                  ? trendDown
                  : trendNeutral),
              }}
            >
              {tendenciaLucro.icon}
              {tendenciaLucro.label}
            </span>
            <span style={helperText}>{textoComparacao}</span>
          </div>
        </div>
      </div>

      <div style={chartsGrid}>
        <div style={chartCard}>
          <div style={chartHeader}>
            <div>
              <h2 style={chartTitle}>Vendas por dia</h2>
              <p style={chartSubtitle}>Distribuição do faturamento no período</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={graficoVendas}>
              <defs>
                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dia" stroke="#64748b" />
              <YAxis stroke="#64748b" />

              <Tooltip
                formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                }}
              />

              <Area
                type="monotone"
                dataKey="total"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#colorVendas)"
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={chartCard}>
          <div style={chartHeader}>
            <div>
              <h2 style={chartTitle}>Recebido por dia</h2>
              <p style={chartSubtitle}>Entradas reais de caixa no período</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={graficoRecebido}>
              <defs>
                <linearGradient id="colorRecebido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dia" stroke="#64748b" />
              <YAxis stroke="#64748b" />

              <Tooltip
                formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                }}
              />

              <Area
                type="monotone"
                dataKey="total"
                stroke="#059669"
                strokeWidth={3}
                fill="url(#colorRecebido)"
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

const headerWrap: React.CSSProperties = {
  marginBottom: 24,
}

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  color: "#2563eb",
  textTransform: "uppercase",
  letterSpacing: 0.6,
}

const pageTitle: React.CSSProperties = {
  margin: "8px 0 6px 0",
  fontSize: 30,
  fontWeight: 800,
  color: "#0f172a",
}

const pageSubtitle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  color: "#64748b",
}

const periodWrap: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 20,
}

const periodButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#334155",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
}

const periodButtonActive: React.CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 16,
  marginTop: 20,
  marginBottom: 24,
}

const chartsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
}

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
}

const cardTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
}

const cardLabel: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 600,
  color: "#64748b",
}

const cardValue: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 28,
  fontWeight: 800,
  color: "#0f172a",
}

const iconBox: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#eff6ff",
  color: "#1d4ed8",
  flexShrink: 0,
}

const trendRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
}

const trendBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
}

const trendUp: React.CSSProperties = {
  background: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #a7f3d0",
}

const trendDown: React.CSSProperties = {
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
}

const trendNeutral: React.CSSProperties = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #cbd5e1",
}

const helperText: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#64748b",
}

const chartCard: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
}

const chartHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  gap: 12,
  flexWrap: "wrap",
}

const chartTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
}

const chartSubtitle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: 14,
  color: "#64748b",
}