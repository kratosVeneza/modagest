"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

type Venda = {
  id: number
  product_id: number
  customer_id: number | null
  quantidade: number
  valor_total: number
  created_at: string
  status?: string
}

type Produto = {
  id: number
  nome: string
  sku: string
  estoque: number
}

type Cliente = {
  id: number
  nome: string
}

type VendaRecente = {
  id: number
  nomeProduto: string
  nomeCliente: string
  quantidade: number
  valorTotal: number
  created_at: string
}

type GraficoDia = {
  dia: string
  total: number
}

type ProdutoGrafico = {
  name: string
  value: number
}

const CORES = ["#2563eb", "#059669", "#dc2626", "#d97706", "#7c3aed"]

export default function Dashboard() {
  const [faturamentoHoje, setFaturamentoHoje] = useState(0)
  const [faturamentoMes, setFaturamentoMes] = useState(0)
  const [produtosVendidosHoje, setProdutosVendidosHoje] = useState(0)
  const [estoqueBaixo, setEstoqueBaixo] = useState(0)
  const [pedidosPendentes, setPedidosPendentes] = useState(0)
  const [pedidosRecebidos, setPedidosRecebidos] = useState(0)
  const [ultimasVendas, setUltimasVendas] = useState<VendaRecente[]>([])
  const [graficoDias, setGraficoDias] = useState<GraficoDia[]>([])
  const [graficoProdutos, setGraficoProdutos] = useState<ProdutoGrafico[]>([])
  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarDashboard()
  }, [])

  async function carregarDashboard() {
    setCarregando(true)
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      setCarregando(false)
      return
    }

    const hoje = new Date()
    const inicioHoje = new Date()
    inicioHoje.setHours(0, 0, 0, 0)

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(hoje.getDate() - 6)
    seteDiasAtras.setHours(0, 0, 0, 0)

    const { data: vendasAtivas } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "Cancelada")
      .order("created_at", { ascending: false })

    const { data: produtos } = await supabase
      .from("products")
      .select("id, nome, sku, estoque")
      .eq("user_id", user.id)

    const { data: clientes } = await supabase
      .from("customers")
      .select("id, nome")
      .eq("user_id", user.id)

    const { data: pedidosPendentesData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["Pendente", "Encomendado", "Enviado"])

    const { data: pedidosRecebidosData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "Recebido")

    const vendas = (vendasAtivas ?? []) as Venda[]
    const produtosLista = (produtos ?? []) as Produto[]
    const clientesLista = (clientes ?? []) as Cliente[]

    const vendasHoje = vendas.filter((v) => new Date(v.created_at) >= inicioHoje)
    const vendasMes = vendas.filter((v) => new Date(v.created_at) >= inicioMes)

    setFaturamentoHoje(
      vendasHoje.reduce((soma, v) => soma + Number(v.valor_total), 0)
    )

    setProdutosVendidosHoje(
      vendasHoje.reduce((soma, v) => soma + Number(v.quantidade), 0)
    )

    setFaturamentoMes(
      vendasMes.reduce((soma, v) => soma + Number(v.valor_total), 0)
    )

    setEstoqueBaixo(produtosLista.filter((p) => Number(p.estoque) < 5).length)
    setPedidosPendentes((pedidosPendentesData ?? []).length)
    setPedidosRecebidos((pedidosRecebidosData ?? []).length)

    const recentes = vendas.slice(0, 5).map((venda) => {
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const cliente = clientesLista.find((c) => c.id === venda.customer_id)

      return {
        id: venda.id,
        nomeProduto: produto?.nome || "Produto removido",
        nomeCliente: cliente?.nome || "Sem cliente",
        quantidade: venda.quantidade,
        valorTotal: Number(venda.valor_total),
        created_at: venda.created_at,
      }
    })

    setUltimasVendas(recentes)

    const diasBase: GraficoDia[] = []
    for (let i = 0; i < 7; i++) {
      const data = new Date()
      data.setDate(hoje.getDate() - (6 - i))
      diasBase.push({
        dia: data.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        total: 0,
      })
    }

    vendas
      .filter((v) => new Date(v.created_at) >= seteDiasAtras)
      .forEach((venda) => {
        const chave = new Date(venda.created_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        })
        const item = diasBase.find((d) => d.dia === chave)
        if (item) item.total += Number(venda.valor_total)
      })

    setGraficoDias(diasBase)

    const mapaProdutos = new Map<number, ProdutoGrafico>()

    vendas.forEach((venda) => {
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const nome = produto?.nome || "Produto removido"

      if (!mapaProdutos.has(venda.product_id)) {
        mapaProdutos.set(venda.product_id, {
          name: nome,
          value: 0,
        })
      }

      mapaProdutos.get(venda.product_id)!.value += Number(venda.quantidade)
    })

    const ranking = Array.from(mapaProdutos.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    setGraficoProdutos(ranking)
    setCarregando(false)
  }

  function formatarData(dataIso: string) {
    return new Date(dataIso).toLocaleString("pt-BR")
  }

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">Resumo geral da operação da sua loja.</p>

      {mensagem && <p>{mensagem}</p>}

      <div className="grid-3" style={{ marginTop: 24, marginBottom: 24 }}>
        <div className="metric-card">
          <p className="metric-label">Faturamento hoje</p>
          <p className="metric-value">R$ {faturamentoHoje.toFixed(2)}</p>
          <div className="metric-helper">Resultado do dia atual</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Faturamento do mês</p>
          <p className="metric-value">R$ {faturamentoMes.toFixed(2)}</p>
          <div className="metric-helper">Acumulado mensal</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Produtos vendidos hoje</p>
          <p className="metric-value">{produtosVendidosHoje}</p>
          <div className="metric-helper">Itens vendidos no dia</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Estoque baixo</p>
          <p className="metric-value">{estoqueBaixo}</p>
          <div className="metric-helper">Abaixo do limite</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Pedidos pendentes</p>
          <p className="metric-value">{pedidosPendentes}</p>
          <div className="metric-helper">Aguardando conclusão</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Pedidos recebidos</p>
          <p className="metric-value">{pedidosRecebidos}</p>
          <div className="metric-helper">Reposições concluídas</div>
        </div>
      </div>

      <div className="dashboard-two-columns" style={{ marginBottom: 24 }}>
        <div className="chart-shell">
          <h3 className="dashboard-block-title">Faturamento por dia</h3>
          <p className="dashboard-block-subtitle">Últimos 7 dias</p>

          <div style={{ width: "100%", height: 300, marginTop: 16 }}>
            <ResponsiveContainer>
              <BarChart data={graficoDias}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
               <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-shell">
          <h3 className="dashboard-block-title">Produtos mais vendidos</h3>
          <p className="dashboard-block-subtitle">Top 5 por quantidade</p>

          <div style={{ width: "100%", height: 300, marginTop: 16 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={graficoProdutos}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {graficoProdutos.map((_, index) => (
                    <Cell key={index} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="section-card">
        <h3 className="dashboard-block-title">Últimas vendas</h3>
        <p className="dashboard-block-subtitle">As 5 movimentações mais recentes</p>

        <div className="data-table-wrap" style={{ marginTop: 16 }}>
          <table className="premium-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Cliente</th>
                <th style={th}>Produto</th>
                <th style={th}>Qtd.</th>
                <th style={th}>Valor</th>
                <th style={th}>Data</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={5} style={{ padding: 20 }}>
                    Carregando...
                  </td>
                </tr>
              ) : ultimasVendas.length > 0 ? (
                ultimasVendas.map((venda) => (
                  <tr key={venda.id}>
                    <td style={td}>{venda.nomeCliente}</td>
                    <td style={td}>{venda.nomeProduto}</td>
                    <td style={td}>{venda.quantidade}</td>
                    <td style={td}>R$ {venda.valorTotal.toFixed(2)}</td>
                    <td style={td}>{formatarData(venda.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={tdVazio} colSpan={5}>
                    Nenhuma venda recente encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const th = {
  textAlign: "left" as const,
  borderBottom: "1px solid #d1d5db",
  padding: "12px",
}

const td = {
  borderBottom: "1px solid #e5e7eb",
  padding: "12px",
}

const tdVazio = {
  borderBottom: "1px solid #e5e7eb",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
}