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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { montarCabecalhoPDF } from "@/lib/pdfHeader"
import { imageUrlToDataUrl } from "@/lib/imageToDataUrl"
import {
  DollarSign,
  ShoppingBag,
  Boxes,
  PackageOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  BadgeDollarSign,
  Percent,
  AlertTriangle,
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
  estoque_minimo: number | null
  marca: string | null
  categoria: string | null
  tipo: string | null
  unidade: string | null
  custo: number | null
  preco: number
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
  lucroTotal: number
  created_at: string
  categoria: string
  marca: string
}

type GraficoDia = {
  dia: string
  total: number
}

type ProdutoRanking = {
  nome: string
  quantidade: number
  marca: string
  categoria: string
}

type CategoriaGrafico = {
  name: string
  value: number
}

type TrendInfo = {
  variant: "up" | "down" | "neutral"
  label: string
  icon: React.ReactNode
}

type Periodo = "hoje" | "7dias" | "30dias" | "mes"

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

const CORES = ["#2563eb", "#059669", "#dc2626", "#d97706", "#7c3aed", "#0891b2"]

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
  const [lucroPrincipal, setLucroPrincipal] = useState(0)
  const [lucroComparacao, setLucroComparacao] = useState(0)
  const [faturamentoComparacao, setFaturamentoComparacao] = useState(0)
  const [margemMediaPeriodo, setMargemMediaPeriodo] = useState(0)
  const [produtosVendidosPeriodo, setProdutosVendidosPeriodo] = useState(0)
  const [estoqueBaixo, setEstoqueBaixo] = useState(0)
  const [pedidosPendentes, setPedidosPendentes] = useState(0)
  const [ultimasVendas, setUltimasVendas] = useState<VendaRecente[]>([])
  const [graficoDias, setGraficoDias] = useState<GraficoDia[]>([])
  const [rankingProdutos, setRankingProdutos] = useState<ProdutoRanking[]>([])
  const [graficoCategorias, setGraficoCategorias] = useState<CategoriaGrafico[]>([])
  const [produtosAbaixoDoMinimo, setProdutosAbaixoDoMinimo] = useState<Produto[]>([])
  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)

  const [nomeLoja, setNomeLoja] = useState("ModaGest")
  const [logoUrl, setLogoUrl] = useState("")

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

    const { data: lojaData } = await supabase
      .from("stores")
      .select("nome_loja, logo_url")
      .eq("user_id", user.id)
      .maybeSingle()

    const loja = (lojaData ?? null) as Loja | null

    if (loja?.nome_loja) setNomeLoja(loja.nome_loja)
    if (loja?.logo_url) setLogoUrl(loja.logo_url)

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
      .select("id, nome, sku, estoque, estoque_minimo, marca, categoria, tipo, unidade, custo, preco")
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

    const produtosTipados = (produtos ?? []) as Produto[]

    setTodasVendas((vendasAtivas ?? []) as Venda[])
    setProdutosLista(produtosTipados)
    setClientesLista((clientes ?? []) as Cliente[])

    const abaixoDoMinimo = produtosTipados.filter(
      (p) => Number(p.estoque) <= Number(p.estoque_minimo || 0)
    )

    setProdutosAbaixoDoMinimo(abaixoDoMinimo)
    setEstoqueBaixo(abaixoDoMinimo.length)
    setPedidosPendentes((pedidosPendentesData ?? []).length)

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
    const totalComparacao = vendasComparacao.reduce((soma, v) => soma + Number(v.valor_total), 0)

    const lucroAtual = vendasPeriodo.reduce((soma, venda) => {
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const custoUnitario = Number(produto?.custo || 0)
      return soma + (Number(venda.valor_total) - custoUnitario * Number(venda.quantidade))
    }, 0)

    const lucroAnterior = vendasComparacao.reduce((soma, venda) => {
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const custoUnitario = Number(produto?.custo || 0)
      return soma + (Number(venda.valor_total) - custoUnitario * Number(venda.quantidade))
    }, 0)

    const margemMedia = totalAtual > 0 ? (lucroAtual / totalAtual) * 100 : 0

    setFaturamentoPrincipal(totalAtual)
    setFaturamentoComparacao(totalComparacao)
    setLucroPrincipal(lucroAtual)
    setLucroComparacao(lucroAnterior)
    setMargemMediaPeriodo(margemMedia)

    setProdutosVendidosPeriodo(
      vendasPeriodo.reduce((soma, v) => soma + Number(v.quantidade), 0)
    )

    const recentes = vendasPeriodo.slice(0, 5).map((venda) => {
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const cliente = clientesLista.find((c) => c.id === venda.customer_id)
      const custoUnitario = Number(produto?.custo || 0)

      return {
        id: venda.id,
        nomeProduto: produto?.nome || "Produto removido",
        nomeCliente: cliente?.nome || "Sem cliente",
        quantidade: venda.quantidade,
        valorTotal: Number(venda.valor_total),
        lucroTotal: Number(venda.valor_total) - custoUnitario * Number(venda.quantidade),
        created_at: venda.created_at,
        categoria: produto?.categoria || "-",
        marca: produto?.marca || "-",
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
    const mapaCategorias = new Map<string, number>()

    vendasPeriodo.forEach((venda) => {
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const nome = produto?.nome || "Produto removido"
      const marca = produto?.marca || "-"
      const categoria = produto?.categoria || "Sem categoria"

      if (!mapaProdutos.has(venda.product_id)) {
        mapaProdutos.set(venda.product_id, {
          nome,
          quantidade: 0,
          marca,
          categoria,
        })
      }

      mapaProdutos.get(venda.product_id)!.quantidade += Number(venda.quantidade)
      mapaCategorias.set(
        categoria,
        (mapaCategorias.get(categoria) || 0) + Number(venda.valor_total)
      )
    })

    setRankingProdutos(
      Array.from(mapaProdutos.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)
    )

    setGraficoCategorias(
      Array.from(mapaCategorias.entries()).map(([name, value]) => ({ name, value }))
    )
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

  const tendenciaFaturamento = useMemo(
    () => calcularTendencia(faturamentoPrincipal, faturamentoComparacao),
    [faturamentoPrincipal, faturamentoComparacao]
  )

  const tendenciaLucro = useMemo(
    () => calcularTendencia(lucroPrincipal, lucroComparacao),
    [lucroPrincipal, lucroComparacao]
  )

  const maiorRanking = useMemo(
    () => Math.max(...rankingProdutos.map((item) => item.quantidade), 1),
    [rankingProdutos]
  )

  const textoComparacao =
    periodo === "hoje"
      ? "vs ontem"
      : periodo === "mes"
      ? "vs mês anterior"
      : "vs período anterior"

  function exportarDashboardCSV() {
    const linhas: string[] = []

    linhas.push(`"ModaGest Dashboard"`)
    linhas.push(`"Período";"${periodo}"`)
    linhas.push("")

    linhas.push(`"RESUMO"`)
    linhas.push(`"Faturamento do período";"${faturamentoPrincipal.toFixed(2)}"`)
    linhas.push(`"Lucro do período";"${lucroPrincipal.toFixed(2)}"`)
    linhas.push(`"Margem média";"${margemMediaPeriodo.toFixed(1)}%"`)
    linhas.push(`"Comparação faturamento";"${faturamentoComparacao.toFixed(2)}"`)
    linhas.push(`"Comparação lucro";"${lucroComparacao.toFixed(2)}"`)
    linhas.push(`"Itens vendidos";"${produtosVendidosPeriodo}"`)
    linhas.push(`"Produtos com estoque baixo";"${estoqueBaixo}"`)
    linhas.push(`"Pedidos pendentes";"${pedidosPendentes}"`)
    linhas.push("")

    linhas.push(`"RECEITA POR DIA"`)
    linhas.push(`"Dia";"Total"`)
    graficoDias.forEach((item) => {
      linhas.push(`"${item.dia}";"${item.total.toFixed(2)}"`)
    })
    linhas.push("")

    linhas.push(`"PRODUTOS MAIS VENDIDOS"`)
    linhas.push(`"Produto";"Marca";"Categoria";"Quantidade"`)
    rankingProdutos.forEach((item) => {
      linhas.push(
        `"${item.nome.replace(/"/g, '""')}";"${item.marca.replace(/"/g, '""')}";"${item.categoria.replace(/"/g, '""')}";"${item.quantidade}"`
      )
    })
    linhas.push("")

    linhas.push(`"RECEITA POR CATEGORIA"`)
    linhas.push(`"Categoria";"Receita"`)
    graficoCategorias.forEach((item) => {
      linhas.push(`"${item.name.replace(/"/g, '""')}";"${item.value.toFixed(2)}"`)
    })
    linhas.push("")

    linhas.push(`"PRODUTOS ABAIXO DO MÍNIMO"`)
    linhas.push(`"Produto";"SKU";"Estoque";"Mínimo"`)
    produtosAbaixoDoMinimo.forEach((item) => {
      linhas.push(
        `"${item.nome.replace(/"/g, '""')}";"${item.sku.replace(/"/g, '""')}";"${item.estoque}";"${item.estoque_minimo || 0}"`
      )
    })
    linhas.push("")

    linhas.push(`"ÚLTIMAS VENDAS"`)
    linhas.push(`"Cliente";"Produto";"Marca";"Categoria";"Quantidade";"Valor";"Lucro";"Data"`)
    ultimasVendas.forEach((item) => {
      linhas.push(
        `"${item.nomeCliente.replace(/"/g, '""')}";"${item.nomeProduto.replace(/"/g, '""')}";"${item.marca.replace(/"/g, '""')}";"${item.categoria.replace(/"/g, '""')}";"${item.quantidade}";"${item.valorTotal.toFixed(2)}";"${item.lucroTotal.toFixed(2)}";"${formatarData(item.created_at)}"`
      )
    })

    const conteudo = linhas.join("\n")
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `dashboard_${periodo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function exportarDashboardPDF() {
    const doc = new jsPDF()
    const tituloPeriodo =
      periodo === "hoje"
        ? "Hoje"
        : periodo === "7dias"
        ? "7 dias"
        : periodo === "30dias"
        ? "30 dias"
        : "Mês atual"

    const logoDataUrl = await imageUrlToDataUrl(logoUrl)

    const startY = await montarCabecalhoPDF({
      doc,
      titulo: "Relatório do Dashboard",
      nomeLoja,
      logoDataUrl,
    })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Período: ${tituloPeriodo}`, 14, startY)

    autoTable(doc, {
      startY: startY + 8,
      head: [["Resumo", "Valor"]],
      body: [
        ["Faturamento do período", `R$ ${faturamentoPrincipal.toFixed(2)}`],
        ["Lucro do período", `R$ ${lucroPrincipal.toFixed(2)}`],
        ["Margem média", `${margemMediaPeriodo.toFixed(1)}%`],
        ["Produtos com estoque baixo", String(estoqueBaixo)],
        ["Pedidos pendentes", String(pedidosPendentes)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [37, 99, 235] },
    })

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Produto", "SKU", "Estoque", "Mínimo"]],
      body: produtosAbaixoDoMinimo.map((item) => [
        item.nome,
        item.sku,
        String(item.estoque),
        String(item.estoque_minimo || 0),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 38, 38] },
    })

    doc.save(`dashboard_${periodo}.pdf`)
  }

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">Resumo geral da operação da sua loja.</p>

      {mensagem && <p>{mensagem}</p>}

      <div className="dashboard-actions">
        <button onClick={exportarDashboardCSV} className="btn btn-secondary">
          Exportar CSV
        </button>
        <button onClick={exportarDashboardPDF} className="btn btn-primary">
          Exportar PDF
        </button>
      </div>

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

      {produtosAbaixoDoMinimo.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: "14px 16px",
            borderRadius: 14,
            background: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#9a3412",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <AlertTriangle size={18} />
            <strong>{produtosAbaixoDoMinimo.length} produto(s) com estoque baixo</strong>
          </div>

          <div style={{ fontSize: 14 }}>
            {produtosAbaixoDoMinimo
              .slice(0, 5)
              .map((p) => `${p.nome} (${p.estoque}/${p.estoque_minimo || 0})`)
              .join(" • ")}
          </div>
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Faturamento</p>
              <p className="metric-value">R$ {faturamentoPrincipal.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="trend-row">
            <span className={`trend-pill trend-${tendenciaFaturamento.variant}`}>
              {tendenciaFaturamento.icon}
              {tendenciaFaturamento.label}
            </span>
            <span className="metric-helper">{textoComparacao}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Lucro</p>
              <p className="metric-value">R$ {lucroPrincipal.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box green">
              <BadgeDollarSign size={20} />
            </div>
          </div>
          <div className="trend-row">
            <span className={`trend-pill trend-${tendenciaLucro.variant}`}>
              {tendenciaLucro.icon}
              {tendenciaLucro.label}
            </span>
            <span className="metric-helper">{textoComparacao}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Margem média</p>
              <p className="metric-value">{margemMediaPeriodo.toFixed(1)}%</p>
            </div>
            <div className="metric-icon-box purple">
              <Percent size={20} />
            </div>
          </div>
          <div className="metric-helper">Lucro médio sobre vendas</div>
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
          <div className="metric-helper">Produtos no limite mínimo</div>
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
      </div>

      <div className="dashboard-two-columns" style={{ marginBottom: 24 }}>
        <div className="chart-shell">
          <div className="chart-header-row">
            <div>
              <h3 className="dashboard-block-title">Receita por dia</h3>
              <p className="dashboard-block-subtitle">Evolução do período selecionado</p>
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
              <h3 className="dashboard-block-title">Receita por categoria</h3>
              <p className="dashboard-block-subtitle">Distribuição por categoria</p>
            </div>
            <span className="chart-badge">Categorias</span>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={graficoCategorias} dataKey="value" nameKey="name" outerRadius={100} label>
                  {graficoCategorias.map((_, index) => (
                    <Cell key={index} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-two-columns" style={{ marginBottom: 24 }}>
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
              <div key={`${item.nome}-${item.marca}`} className="bar-list-item">
                <div className="bar-list-label">
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span>{item.nome}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {[item.marca, item.categoria].filter(Boolean).join(" • ")}
                    </span>
                  </div>
                </div>
                <div className="bar-list-track">
                  <div
                    className="bar-list-fill"
                    style={{ width: `${(item.quantidade / maiorRanking) * 100}%` }}
                  />
                </div>
                <div className="bar-list-value">{item.quantidade}</div>
              </div>
            ))}

            {!carregando && rankingProdutos.length === 0 && (
              <div className="empty-state">Nenhum produto vendido ainda.</div>
            )}
          </div>
        </div>

        <div className="section-card">
          <h3 className="dashboard-block-title">Últimas vendas</h3>
          <p className="dashboard-block-subtitle">As 5 movimentações mais recentes do período</p>

          <div className="data-table-wrap" style={{ marginTop: 16 }}>
            <table className="premium-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Cliente</th>
                  <th style={th}>Produto</th>
                  <th style={th}>Detalhes</th>
                  <th style={th}>Qtd.</th>
                  <th style={th}>Valor</th>
                  <th style={th}>Lucro</th>
                  <th style={th}>Data</th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 20 }}>
                      Carregando...
                    </td>
                  </tr>
                ) : ultimasVendas.length > 0 ? (
                  ultimasVendas.map((venda) => (
                    <tr key={venda.id}>
                      <td style={td}>{venda.nomeCliente}</td>
                      <td style={td}>{venda.nomeProduto}</td>
                      <td style={td}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span>{venda.marca}</span>
                          <span style={{ fontSize: 12, color: "#6b7280" }}>
                            {venda.categoria}
                          </span>
                        </div>
                      </td>
                      <td style={td}>{venda.quantidade}</td>
                      <td style={td}>R$ {venda.valorTotal.toFixed(2)}</td>
                      <td style={td}>R$ {venda.lucroTotal.toFixed(2)}</td>
                      <td style={td}>{formatarData(venda.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={tdVazio} colSpan={7}>
                      Nenhuma venda encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
  verticalAlign: "top" as const,
}

const tdVazio = {
  borderBottom: "1px solid #e5e7eb",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
} 
