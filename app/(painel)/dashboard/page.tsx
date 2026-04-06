"use client"


import React from "react" 
import { useEffect, useMemo, useState } from "react"
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

export default function Dashboard() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])

  const [faturamento, setFaturamento] = useState(0)
const [recebido, setRecebido] = useState(0)
const [lucro, setLucro] = useState(0)

const [faturamentoComparacao, setFaturamentoComparacao] = useState(0)
const [recebidoComparacao, setRecebidoComparacao] = useState(0)
const [emAberto, setEmAberto] = useState(0)

  const [grafico, setGrafico] = useState<GraficoDia[]>([])

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser()
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

    setVendas(vendasData || [])
    setPagamentos(pagamentosData || [])
    setProdutos(produtosData || [])

    calcular(vendasData || [], pagamentosData || [], produtosData || [])
  }

  function calcular(vendas: Venda[], pagamentos: Pagamento[], produtos: Produto[]) {
  const vendasAtivas = vendas.filter((v) => v.status !== "Cancelada")

  const agora = new Date()
  const inicioAtual = new Date()
  inicioAtual.setDate(agora.getDate() - 6)
  inicioAtual.setHours(0, 0, 0, 0)

  const fimAtual = agora

  const inicioComparacao = new Date(inicioAtual)
  inicioComparacao.setDate(inicioComparacao.getDate() - 7)

  const fimComparacao = new Date(inicioAtual)
  fimComparacao.setMilliseconds(-1)

  const vendasPeriodo = vendasAtivas.filter((v) => {
    const data = new Date(v.created_at)
    return data >= inicioAtual && data <= fimAtual
  })

  const vendasPeriodoComparacao = vendasAtivas.filter((v) => {
    const data = new Date(v.created_at)
    return data >= inicioComparacao && data <= fimComparacao
  })

  const idsPeriodo = new Set(vendasPeriodo.map((v) => v.id))
  const idsComparacao = new Set(vendasPeriodoComparacao.map((v) => v.id))

  const pagamentosPeriodo = pagamentos.filter((p) => {
    const data = new Date(p.created_at)
    return data >= inicioAtual && data <= fimAtual && idsPeriodo.has(p.sale_id)
  })

  const pagamentosPeriodoComparacao = pagamentos.filter((p) => {
    const data = new Date(p.created_at)
    return data >= inicioComparacao && data <= fimComparacao && idsComparacao.has(p.sale_id)
  })

  const totalFaturamento = vendasPeriodo.reduce((s, v) => s + Number(v.valor_total), 0)
  const totalFaturamentoComparacao = vendasPeriodoComparacao.reduce(
    (s, v) => s + Number(v.valor_total),
    0
  )

  const recebidoTotal = pagamentosPeriodo.reduce((s, p) => s + Number(p.valor), 0)
  const recebidoComparado = pagamentosPeriodoComparacao.reduce((s, p) => s + Number(p.valor), 0)

  const recebidoPorVenda = vendasPeriodo.reduce((soma, venda) => {
    const totalRecebidoDaVenda = pagamentos
      .filter((p) => p.sale_id === venda.id)
      .reduce((acc, item) => acc + Number(item.valor), 0)

    return soma + totalRecebidoDaVenda
  }, 0)

  let lucroTotal = 0

  pagamentosPeriodo.forEach((pagamento) => {
    const venda = vendasAtivas.find((v) => v.id === pagamento.sale_id)
    if (!venda) return

    const produto = produtos.find((p) => p.id === venda.product_id)
    const custo = Number(produto?.custo || 0)

    const proporcao =
      Number(venda.valor_total) > 0 ? Number(pagamento.valor) / Number(venda.valor_total) : 0

    const custoProporcional = custo * Number(venda.quantidade) * proporcao

    lucroTotal += Number(pagamento.valor) - custoProporcional
  })

  setFaturamento(totalFaturamento)
  setFaturamentoComparacao(totalFaturamentoComparacao)
  setRecebido(recebidoTotal)
  setRecebidoComparacao(recebidoComparado)
  setLucro(lucroTotal)
  setEmAberto(Math.max(totalFaturamento - recebidoPorVenda, 0))

  gerarGrafico(vendasPeriodo)
}

  function gerarGrafico(vendas: Venda[]) {
    const mapa = new Map<string, number>()

    vendas.forEach(v => {
      const dia = new Date(v.created_at).toLocaleDateString("pt-BR")
      mapa.set(dia, (mapa.get(dia) || 0) + Number(v.valor_total))
    })

    const dados = Array.from(mapa.entries()).map(([dia, total]) => ({
      dia,
      total,
    }))

    setGrafico(dados)
  }

  function tendencia(atual: number, anterior: number): TrendInfo {
  if (anterior === 0 && atual > 0) {
    return {
      variant: "up",
      label: "Novo crescimento",
      icon: <TrendingUp size={14} />,
    }
  }

  if (atual > anterior && anterior > 0) {
    const percentual = ((atual - anterior) / anterior) * 100
    return {
      variant: "up",
      label: `+${percentual.toFixed(0)}%`,
      icon: <TrendingUp size={14} />,
    }
  }

  if (atual < anterior && anterior > 0) {
    const percentual = ((anterior - atual) / anterior) * 100
    return {
      variant: "down",
      label: `-${percentual.toFixed(0)}%`,
      icon: <TrendingDown size={14} />,
    }
  }

  return {
    variant: "neutral",
    label: "Sem variação",
    icon: <Minus size={14} />,
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

  return (
  <div style={{ padding: 24 }}>
    <div style={headerWrap}>
      <div>
        <p style={eyebrow}>Dashboard</p>
        <h1 style={pageTitle}>Visão geral da sua operação</h1>
        <p style={pageSubtitle}>
          Acompanhe faturamento, recebimentos, valores em aberto e lucro dos últimos 7 dias.
        </p>
      </div>
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
          <span style={helperText}>vs 7 dias anteriores</span>
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
          <span style={helperText}>vs 7 dias anteriores</span>
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
        <p style={helperText}>Recebimentos menos custo proporcional dos produtos.</p>
      </div>
    </div>

    <div style={chartCard}>
      <div style={chartHeader}>
        <div>
          <h2 style={chartTitle}>Vendas por dia</h2>
          <p style={chartSubtitle}>Distribuição do faturamento nos últimos 7 dias</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={grafico}>
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

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 16,
  marginTop: 20,
  marginBottom: 24,
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