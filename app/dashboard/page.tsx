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
  DollarSign,
  ShoppingBag,
  Boxes,
  PackageCheck,
  PackageOpen,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"

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

type ProdutoRanking = {
  nome: string
  quantidade: number
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
  const [todasVendas, setTodasVendas] = useState<Venda[]>([])
  const [produtosLista, setProdutosLista] = useState<Produto[]>([])
  const [clientesLista, setClientesLista] = useState<Cliente[]>([])
  const [periodo, setPeriodo] = useState<Periodo>("7dias")

  const [faturamentoPrincipal, setFaturamentoPrincipal] = useState(0)
  const [faturamentoComparacao, setFaturamentoComparacao] = useState(0)
  const [produtosVendidosPeriodo, setProdutosVendidosPeriodo] = useState(0)
  const [estoqueBaixo, setEstoqueBaixo] = useState(0)
  const [pedidosPendentes, setPedidosPendentes] = useState(0)
  const [pedidosRecebidos, setPedidosRecebidos] = useState(0)
  const [ultimasVendas, setUltimasVendas] = useState<VendaRecente[]>([])
  const [graficoDias, setGraficoDias] = useState<GraficoDia[]>([])
  const [rankingProdutos, setRankingProdutos] = useState<ProdutoRanking[]>([])
  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarDashboard()
  }, [])

  useEffect(() => {
    if (todasVendas.length > 0 || produtosLista.length > 0) {
      recalcularDashboard()
    }
  }, [periodo, todasVendas, produtosLista, clientesLista])

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

    const { data: vendasAtivas, error: vendasError } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "Cancelada")
      .order("created_at", { ascending: false })

    if (vendasError) {
      setMensagem("Erro ao carregar vendas do dashboard.")
      setCarregando(false)
      return
    }

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

    setTodasVendas((vendasAtivas ?? []) as Venda[])
    setProdutosLista((produtos ?? []) as Produto[])
    setClientesLista((clientes ?? []) as Cliente[])

    setEstoqueBaixo(((produtos ?? []) as Produto[]).filter((p) => Number(p.estoque) < 5).length)
    setPedidosPendentes((pedidosPendentesData ?? []).length)
    setPedidosRecebidos((pedidosRecebidosData ?? []).length)

    setCarregando(false)
  }

  function obterIntervalosSelecionados() {
    const agora = new Date()

    const inicioHoje = new Date()
    inicioHoje.setHours(0, 0, 0, 0)

    const inicioOntem = new Date(inicioHoje)
    inicioOntem.setDate(inicioOntem.getDate() - 1)

    const fimOntem = new Date(inicioHoje)
    fimOntem.setMilliseconds(-1)

    if (periodo === "hoje") {
      return {
        inicioAtual: inicioHoje,
        fimAtual: agora,
        inicioComparacao: inicioOntem,
        fimComparacao: fimOntem,
        quantidadeDiasGrafico: 1,
      }
    }

    if (periodo === "7dias") {
      const inicioAtual = new Date()
      inicioAtual.setDate(agora.getDate() - 6)
      inicioAtual.setHours(0, 0, 0, 0)

      const fimAtual = agora

      const inicioComparacao = new Date(inicioAtual)
      inicioComparacao.setDate(inicioComparacao.getDate() - 7)

      const fimComparacao = new Date(inicioAtual)
      fimComparacao.setMilliseconds(-1)

      return {
        inicioAtual,
        fimAtual,
        inicioComparacao,
        fimComparacao,
        quantidadeDiasGrafico: 7,
      }
    }

    if (periodo === "30dias") {
      const inicioAtual = new Date()
      inicioAtual.setDate(agora.getDate() - 29)
      inicioAtual.setHours(0, 0, 0, 0)

      const fimAtual = agora

      const inicioComparacao = new Date(inicioAtual)
      inicioComparacao.setDate(inicioComparacao.getDate() - 30)

      const fimComparacao = new Date(inicioAtual)
      fimComparacao.setMilliseconds(-1)

      return {
        inicioAtual,
        fimAtual,
        inicioComparacao,
        fimComparacao,
        quantidadeDiasGrafico: 30,
      }
    }

    const inicioAtual = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const fimAtual = agora

    const inicioComparacao = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    const fimComparacao = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999)

    const quantidadeDiasGrafico = Math.max(
      1,
      Math.ceil((fimAtual.getTime() - inicioAtual.getTime()) / (1000 * 60 * 60 * 24)) + 1
    )

    return {
      inicioAtual,
      fimAtual,
      inicioComparacao,
      fimComparacao,
      quantidadeDiasGrafico,
    }
  }

  function recalcularDashboard() {
    const {
      inicioAtual,
      fimAtual,
      inicioComparacao,
      fimComparacao,
      quantidadeDiasGrafico,
    } = obterIntervalosSelecionados()

    const vendasPeriodo = todasVendas.filter((v) => {
      const data = new Date(v.created_at)
      return data >= inicioAtual && data <= fimAtual
    })

    const vendasComparacao = todasVendas.filter((v) => {
      const data = new Date(v.created_at)
      return data >= inicioComparacao && data <= fimComparacao
    })

    const totalAtual = vendasPeriodo.reduce((soma, v) => soma + Number(v.valor_total), 0)
    const totalComparacao = vendasComparacao.reduce(
      (soma, v) => soma + Number(v.valor_total),
      0
    )

    setFaturamentoPrincipal(totalAtual)
    setFaturamentoComparacao(totalComparacao)

    setProdutosVendidosPeriodo(
      vendasPeriodo.reduce((soma, v) => soma + Number(v.quantidade), 0)
    )

    const recentes = vendasPeriodo.slice(0, 5).map((venda) => {
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
    for (let i = 0; i < quantidadeDiasGrafico; i++) {
      const data = new Date(inicioAtual)
      data.setDate(inicioAtual.getDate() + i)

      diasBase.push({
        dia: data.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        total: 0,
      })
    }

    vendasPeriodo.forEach((venda) => {
      const chave = new Date(venda.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
      const item = diasBase.find((d) => d.dia === chave)
      if (item) item.total += Number(venda.valor_total)
    })

    setGraficoDias(diasBase)

    const mapaProdutos = new Map<number, ProdutoRanking>()

    vendasPeriodo.forEach((venda) => {
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const nome = produto?.nome || "Produto removido"

      if (!mapaProdutos.has(venda.product_id)) {
        mapaProdutos.set(venda.product_id, {
          nome,
          quantidade: 0,
        })
      }

      mapaProdutos.get(venda.product_id)!.quantidade += Number(venda.quantidade)
    })

    const ranking = Array.from(mapaProdutos.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5)

    setRankingProdutos(ranking)
  }

  function formatarData(dataIso: string) {
    return new Date(dataIso).toLocaleString("pt-BR")
  }

  function calcularTendencia(atual: number, anterior: number): TrendInfo {
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

  const tendenciaPeriodo = useMemo(
    () => calcularTendencia(faturamentoPrincipal, faturamentoComparacao),
    [faturamentoPrincipal, faturamentoComparacao]
  )

  const maiorRanking = useMemo(() => {
    return Math.max(...rankingProdutos.map((item) => item.quantidade), 1)
  }, [rankingProdutos])

  const textoComparacao =
    periodo === "hoje"
      ? "vs ontem"
      : periodo === "mes"
      ? "vs mês anterior"
      : "vs período anterior"

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">Resumo geral da operação da sua loja.</p>

      {mensagem && <p>{mensagem}</p>}

      <div className="period-filter">
        {periodos.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`period-btn ${periodo === item.value ? "active" : ""}`}
            onClick={() => setPeriodo(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Faturamento do período</p>
              <p className="metric-value">R$ {faturamentoPrincipal.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="trend-row">
            <span className={`trend-pill trend-${tendenciaPeriodo.variant}`}>
              {tendenciaPeriodo.icon}
              {tendenciaPeriodo.label}
            </span>
            <span className="metric-helper">{textoComparacao}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Itens vendidos</p>
              <p className="metric-value">{produtosVendidosPeriodo}</p>
            </div>
            <div className="metric-icon-box purple">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="metric-helper">Total no período selecionado</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Estoque baixo</p>
              <p className="metric-value">{estoqueBaixo}</p>
            </div>
            <div className="metric-icon-box orange">
              <Boxes size={20} />
            </div>
          </div>
          <div className="metric-helper">Produtos abaixo do limite</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Pedidos pendentes</p>
              <p className="metric-value">{pedidosPendentes}</p>
            </div>
            <div className="metric-icon-box red">
              <PackageOpen size={20} />
            </div>
          </div>
          <div className="metric-helper">Aguardando conclusão</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Pedidos recebidos</p>
              <p className="metric-value">{pedidosRecebidos}</p>
            </div>
            <div className="metric-icon-box gray">
              <PackageCheck size={20} />
            </div>
          </div>
          <div className="metric-helper">Reposições concluídas</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Comparação</p>
              <p className="metric-value">R$ {faturamentoComparacao.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box green">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="metric-helper">{textoComparacao}</div>
        </div>
      </div>

      <div className="dashboard-two-columns" style={{ marginBottom: 24 }}>
        <div className="chart-shell">
          <div className="chart-header-row">
            <div>
              <h3 className="dashboard-block-title">Receita por dia</h3>
              <p className="dashboard-block-subtitle">
                Evolução do período selecionado
              </p>
            </div>
            <span className="chart-badge">Filtro ativo</span>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graficoDias}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorReceita)"
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-shell">
          <div className="chart-header-row">
            <div>
              <h3 className="dashboard-block-title">Produtos mais vendidos</h3>
              <p className="dashboard-block-subtitle">Ranking do período</p>
            </div>
            <span className="chart-badge">Top 5</span>
          </div>

          <div className="bar-list">
            {rankingProdutos.map((item) => (
              <div key={item.nome} className="bar-list-item">
                <div className="bar-list-label">{item.nome}</div>

                <div className="bar-list-track">
                  <div
                    className="bar-list-fill"
                    style={{
                      width: `${(item.quantidade / maiorRanking) * 100}%`,
                    }}
                  />
                </div>

                <div className="bar-list-value">{item.quantidade} un.</div>
              </div>
            ))}

            {!carregando && rankingProdutos.length === 0 && (
              <div className="empty-state">Nenhum produto vendido ainda.</div>
            )}
          </div>
        </div>
      </div>

      <div className="section-card">
        <h3 className="dashboard-block-title">Últimas vendas</h3>
        <p className="dashboard-block-subtitle">
          As 5 movimentações mais recentes do período
        </p>

        <div className="data-table-wrap" style={{ marginTop: 16 }}>
          <table
            className="premium-table"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
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
                    Nenhuma venda encontrada.
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