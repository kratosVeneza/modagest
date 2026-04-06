"use client"

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

export default function Dashboard() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])

  const [faturamento, setFaturamento] = useState(0)
  const [recebido, setRecebido] = useState(0)
  const [lucro, setLucro] = useState(0)

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
    const vendasAtivas = vendas.filter(v => v.status !== "Cancelada")

    const total = vendasAtivas.reduce((s, v) => s + Number(v.valor_total), 0)

    const recebidoTotal = pagamentos.reduce((s, p) => s + Number(p.valor), 0)

    let lucroTotal = 0

    pagamentos.forEach(p => {
      const venda = vendasAtivas.find(v => v.id === p.sale_id)
      if (!venda) return

      const produto = produtos.find(p2 => p2.id === venda.product_id)
      const custo = Number(produto?.custo || 0)

      const proporcao = venda.valor_total > 0
        ? p.valor / venda.valor_total
        : 0

      const custoProporcional = custo * venda.quantidade * proporcao

      lucroTotal += (p.valor - custoProporcional)
    })

    setFaturamento(total)
    setRecebido(recebidoTotal)
    setLucro(lucroTotal)

    gerarGrafico(vendasAtivas)
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

  function tendencia(atual: number, anterior: number) {
    if (anterior === 0) return <Minus size={16} />
    if (atual > anterior) return <TrendingUp size={16} color="green" />
    if (atual < anterior) return <TrendingDown size={16} color="red" />
    return <Minus size={16} />
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold" }}>Dashboard</h1>

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>

        <div style={{ background: "#fff", padding: 20, borderRadius: 12 }}>
          <h3>Faturamento</h3>
          <p>R$ {faturamento.toFixed(2)}</p>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 12 }}>
          <h3>Recebido</h3>
          <p>R$ {recebido.toFixed(2)}</p>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 12 }}>
          <h3>Lucro</h3>
          <p>R$ {lucro.toFixed(2)}</p>
        </div>

      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Vendas por dia</h2>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={grafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#2563eb"
              fill="#93c5fd"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}