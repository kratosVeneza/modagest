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

export default function Dashboard() {
  const [faturamentoHoje, setFaturamentoHoje] = useState(0)
  const [faturamentoMes, setFaturamentoMes] = useState(0)
  const [produtosVendidosHoje, setProdutosVendidosHoje] = useState(0)
  const [estoqueBaixo, setEstoqueBaixo] = useState(0)
  const [pedidosPendentes, setPedidosPendentes] = useState(0)
  const [pedidosRecebidos, setPedidosRecebidos] = useState(0)
  const [ultimasVendas, setUltimasVendas] = useState<VendaRecente[]>([])
  const [graficoDias, setGraficoDias] = useState<GraficoDia[]>([])
  const [rankingProdutos, setRankingProdutos] = useState<ProdutoRanking[]>([])
  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)

  const [faturamentoOntem, setFaturamentoOntem] = useState(0)
  const [faturamentoMesAnterior, setFaturamentoMesAnterior] = useState(0)

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

    const agora = new Date()

    const inicioHoje = new Date()
    inicioHoje.setHours(0, 0, 0, 0)

    const inicioOntem = new Date(inicioHoje)
    inicioOntem.setDate(inicioOntem.getDate() - 1)

    const fimOntem = new Date(inicioHoje)
    fimOntem.setMilliseconds(-1)

    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999)

    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(agora.getDate() - 6)
    seteDiasAtras.setHours(0, 0, 0, 0)

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

    const vendas = (vendasAtivas ?? []) as Venda[]
    const produtosLista = (produtos ?? []) as Produto[]
    const clientesLista = (clientes ?? []) as Cliente[]

    const vendasHoje = vendas.filter((v) => new Date(v.created_at) >= inicioHoje)

    const vendasOntem = vendas.filter((v) => {
      const data = new Date(v.created_at)
      return data >= inicioOntem && data <= fimOntem
    })

    const vendasMes = vendas.filter((v) => new Date(v.created_at) >= inicioMes)

    const vendasMesAnterior = vendas.filter((v) => {
      const data = new Date(v.created_at)
      return data >= inicioMesAnterior && data <= fimMesAnterior
    })

    const totalHoje = vendasHoje.reduce((soma, v) => soma + Number(v.valor_total), 0)
    const totalOntem = vendasOntem.reduce((soma, v) => soma + Number(v.valor_total), 0)
    const totalMes = vendasMes.reduce((soma, v) => soma + Number(v.valor_total), 0)
    const totalMesAnterior = vendasMesAnterior.reduce(
      (soma, v) => soma + Number(v.valor_total),
      0
    )

    setFaturamentoHoje(totalHoje)
    setFaturamentoOntem(totalOntem)
    setFaturamentoMes(totalMes)
    setFaturamentoMesAnterior(totalMesAnterior)

    setProdutosVendidosHoje(
      vendasHoje.reduce((soma, v) => soma + Number(v.quantidade), 0)
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
      data.setDate(agora.getDate() - (6 - i))
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

    const mapaProdutos = new Map<number, ProdutoRanking>()

    vendas.forEach((venda) => {
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
    setCarregando(false)
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

    if (atual > anterior) {
      const percentual = ((atual - anterior) / anterior) * 100
      return {
        variant: "up",
        label: `+${percentual.toFixed(0)}%`,
        icon: <TrendingUp size={14} />,
      }
    }

    if (atual < anterior) {
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

  const tendenciaHoje = useMemo(
    () => calcularTendencia(faturamentoHoje, faturamentoOntem),
    [faturamentoHoje, faturamentoOntem]
  )

  const tendenciaMes = useMemo(
    () => calcularTendencia(faturamentoMes, faturamentoMesAnterior),
    [faturamentoMes, faturamentoMesAnterior]
  )

  const maiorRanking = useMemo(() => {
    return Math.max(...rankingProdutos.map((item) => item.quantidade), 1)
  }, [rankingProdutos])

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">Resumo geral da operação da sua loja.</p>

      {mensagem && <p>{mensagem}</p>}

      <div className="grid-3" style={{ marginTop: 24, marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Faturamento hoje</p>
              <p className="metric-value">R$ {faturamentoHoje.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="trend-row">
            <span className={`trend-pill trend-${tendenciaHoje.variant}`}>
              {tendenciaHoje.icon}
              {tendenciaHoje.label}
            </span>
            <span className="metric-helper">vs ontem</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Faturamento do mês</p>
              <p className="metric-value">R$ {faturamentoMes.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box green">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="trend-row">
            <span className={`trend-pill trend-${tendenciaMes.variant}`}>
              {tendenciaMes.icon}
              {tendenciaMes.label}
            </span>
            <span className="metric-helper">vs mês anterior</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Produtos vendidos hoje</p>
              <p className="metric-value">{produtosVendidosHoje}</p>
            </div>
            <div className="metric-icon-box purple">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="metric-helper">Itens vendidos no dia atual</div>
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
      </div>

      <div className="dashboard-two-columns" style={{ marginBottom: 24 }}>
        <div className="chart-shell">
          <div className="chart-header-row">
            <div>
              <h3 className="dashboard-block-title">Receita dos últimos 7 dias</h3>
              <p className="dashboard-block-subtitle">
                Evolução recente do faturamento
              </p>
            </div>
            <span className="chart-badge">Atualizado em tempo real</span>
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
              <p className="dashboard-block-subtitle">Top 5 por quantidade</p>
            </div>
            <span className="chart-badge">Ranking</span>
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
        <p className="dashboard-block-subtitle">As 5 movimentações mais recentes</p>

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