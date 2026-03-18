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
  Wallet,
  Landmark,
  CircleDollarSign,
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

type Pagamento = {
  id: number
  sale_id: number
  valor: number
  forma_pagamento: string
  created_at: string
}

type FinancialTransaction = {
  id: number
  user_id: string
  type: "entrada" | "saida"
  description: string
  category: string | null
  amount: number
  status: "pago" | "pendente"
  due_date: string | null
  paid_at: string | null
  created_at: string
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
  valorRecebido: number
  valorEmAberto: number
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

type FormaPagamentoGrafico = {
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
  const [todosPagamentos, setTodosPagamentos] = useState<Pagamento[]>([])
  const [movimentacoesFinanceiras, setMovimentacoesFinanceiras] = useState<FinancialTransaction[]>([])
  const [produtosLista, setProdutosLista] = useState<Produto[]>([])
  const [clientesLista, setClientesLista] = useState<Cliente[]>([])
  const [periodo, setPeriodo] = useState<Periodo>("7dias")

  const [faturamentoPrincipal, setFaturamentoPrincipal] = useState(0)
  const [recebidoPrincipal, setRecebidoPrincipal] = useState(0)
  const [emAbertoPrincipal, setEmAbertoPrincipal] = useState(0)
  const [recebidoComparacao, setRecebidoComparacao] = useState(0)
  const [faturamentoComparacao, setFaturamentoComparacao] = useState(0)
  const [margemMediaPeriodo, setMargemMediaPeriodo] = useState(0)

  const [saldoAtual, setSaldoAtual] = useState(0)
  const [saldoPrevisto, setSaldoPrevisto] = useState(0)
  const [despesasPendentes, setDespesasPendentes] = useState(0)
  const [entradasPendentes, setEntradasPendentes] = useState(0)
  const [entradasPagas, setEntradasPagas] = useState(0)
  const [saidasPagas, setSaidasPagas] = useState(0)

  const [produtosVendidosPeriodo, setProdutosVendidosPeriodo] = useState(0)
  const [estoqueBaixo, setEstoqueBaixo] = useState(0)
  const [pedidosPendentes, setPedidosPendentes] = useState(0)
  const [ultimasVendas, setUltimasVendas] = useState<VendaRecente[]>([])
  const [graficoDias, setGraficoDias] = useState<GraficoDia[]>([])
  const [rankingProdutos, setRankingProdutos] = useState<ProdutoRanking[]>([])
  const [graficoCategorias, setGraficoCategorias] = useState<CategoriaGrafico[]>([])
  const [graficoFormasPagamento, setGraficoFormasPagamento] = useState<FormaPagamentoGrafico[]>([])
  const [produtosAbaixoDoMinimo, setProdutosAbaixoDoMinimo] = useState<Produto[]>([])
  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)

  const [nomeLoja, setNomeLoja] = useState("ModaGest")
  const [logoUrl, setLogoUrl] = useState("")

  useEffect(() => {
    carregarDashboard()
  }, [])

  useEffect(() => {
    recalcularDashboard()
  }, [periodo, todasVendas, todosPagamentos, movimentacoesFinanceiras, produtosLista, clientesLista])

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

    const { data: vendasData, error: vendasError } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (vendasError) {
      setMensagem("Erro ao carregar vendas do dashboard.")
      setCarregando(false)
      return
    }

    const { data: pagamentosData, error: pagamentosError } = await supabase
      .from("sale_payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (pagamentosError) {
      setMensagem("Erro ao carregar pagamentos do dashboard.")
      setCarregando(false)
      return
    }

    const { data: movsData, error: movsError } = await supabase
      .from("financial_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (movsError) {
      setMensagem("Erro ao carregar movimentações financeiras do dashboard.")
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
    const vendasTipadas = (vendasData ?? []) as Venda[]
    const pagamentosTipados = (pagamentosData ?? []) as Pagamento[]
    const movsTipadas = (movsData ?? []) as FinancialTransaction[]

    setTodasVendas(vendasTipadas)
    setTodosPagamentos(pagamentosTipados)
    setMovimentacoesFinanceiras(movsTipadas)
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

    const vendasAtivas = todasVendas.filter((v) => v.status !== "Cancelada")
    const idsVendasAtivas = new Set(vendasAtivas.map((v) => v.id))
    const pagamentosValidos = todosPagamentos.filter((p) => idsVendasAtivas.has(p.sale_id))

    const vendasPeriodo = vendasAtivas.filter((v) => {
      const data = new Date(v.created_at)
      return data >= inicioAtual && data <= fimAtual
    })

    const vendasComparacao = vendasAtivas.filter((v) => {
      const data = new Date(v.created_at)
      return data >= inicioComparacao && data <= fimComparacao
    })

    const idsPeriodo = new Set(vendasPeriodo.map((v) => v.id))
    const idsComparacao = new Set(vendasComparacao.map((v) => v.id))

    const pagamentosPeriodo = pagamentosValidos.filter((p) => {
      const data = new Date(p.created_at)
      return data >= inicioAtual && data <= fimAtual && idsPeriodo.has(p.sale_id)
    })

    const pagamentosComparacao = pagamentosValidos.filter((p) => {
      const data = new Date(p.created_at)
      return data >= inicioComparacao && data <= fimComparacao && idsComparacao.has(p.sale_id)
    })

    const totalAtual = vendasPeriodo.reduce((soma, v) => soma + Number(v.valor_total), 0)
    const totalComparacao = vendasComparacao.reduce((soma, v) => soma + Number(v.valor_total), 0)

    const recebidoAtual = pagamentosPeriodo.reduce((soma, p) => soma + Number(p.valor), 0)
    const recebidoAnterior = pagamentosComparacao.reduce((soma, p) => soma + Number(p.valor), 0)

    const recebidoPorVendaPeriodo = vendasPeriodo.reduce((soma, venda) => {
      const recebidoVenda = pagamentosValidos
        .filter((p) => p.sale_id === venda.id)
        .reduce((acc, item) => acc + Number(item.valor), 0)
      return soma + recebidoVenda
    }, 0)

    const emAberto = Math.max(totalAtual - recebidoPorVendaPeriodo, 0)

    const lucroRecebidoAtual = pagamentosPeriodo.reduce((soma, pagamento) => {
      const venda = vendasAtivas.find((v) => v.id === pagamento.sale_id)
      if (!venda) return soma
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const custoUnitario = Number(produto?.custo || 0)
      const proporcao =
        Number(venda.valor_total) > 0
          ? Number(pagamento.valor) / Number(venda.valor_total)
          : 0
      const custoProporcional = custoUnitario * Number(venda.quantidade) * proporcao
      return soma + (Number(pagamento.valor) - custoProporcional)
    }, 0)

    const margemMedia = recebidoAtual > 0 ? (lucroRecebidoAtual / recebidoAtual) * 100 : 0

    setFaturamentoPrincipal(totalAtual)
    setFaturamentoComparacao(totalComparacao)
    setRecebidoPrincipal(recebidoAtual)
    setRecebidoComparacao(recebidoAnterior)
    setEmAbertoPrincipal(emAberto)
    setMargemMediaPeriodo(margemMedia)

    const entradasManuaisPagas = movimentacoesFinanceiras
      .filter((m) => m.type === "entrada" && m.status === "pago")
      .reduce((soma, m) => soma + Number(m.amount), 0)

    const saidasManuaisPagas = movimentacoesFinanceiras
      .filter((m) => m.type === "saida" && m.status === "pago")
      .reduce((soma, m) => soma + Number(m.amount), 0)

    const entradasManuaisPendentes = movimentacoesFinanceiras
      .filter((m) => m.type === "entrada" && m.status === "pendente")
      .reduce((soma, m) => soma + Number(m.amount), 0)

    const saidasManuaisPendentes = movimentacoesFinanceiras
      .filter((m) => m.type === "saida" && m.status === "pendente")
      .reduce((soma, m) => soma + Number(m.amount), 0)

    const entradasPagasTotal = pagamentosValidos.reduce((soma, p) => soma + Number(p.valor), 0) + entradasManuaisPagas
    const saidasPagasTotal = saidasManuaisPagas
    const saldoAtualCalculado = entradasPagasTotal - saidasPagasTotal
    const saldoPrevistoCalculado = saldoAtualCalculado + entradasManuaisPendentes - saidasManuaisPendentes

    setEntradasPagas(entradasPagasTotal)
    setSaidasPagas(saidasPagasTotal)
    setEntradasPendentes(entradasManuaisPendentes)
    setDespesasPendentes(saidasManuaisPendentes)
    setSaldoAtual(saldoAtualCalculado)
    setSaldoPrevisto(saldoPrevistoCalculado)

    setProdutosVendidosPeriodo(
      vendasPeriodo.reduce((soma, v) => soma + Number(v.quantidade), 0)
    )

    const recentes = vendasPeriodo.slice(0, 5).map((venda) => {
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const cliente = clientesLista.find((c) => c.id === venda.customer_id)
      const pagamentosDaVenda = pagamentosValidos.filter((p) => p.sale_id === venda.id)
      const valorRecebido = pagamentosDaVenda.reduce((s, p) => s + Number(p.valor), 0)

      return {
        id: venda.id,
        nomeProduto: produto?.nome || "Produto removido",
        nomeCliente: cliente?.nome || "Sem cliente",
        quantidade: venda.quantidade,
        valorTotal: Number(venda.valor_total),
        valorRecebido,
        valorEmAberto: Math.max(Number(venda.valor_total) - valorRecebido, 0),
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

    pagamentosPeriodo.forEach((pagamento) => {
      const chave = new Date(pagamento.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
      const item = diasBase.find((d) => d.dia === chave)
      if (item) item.total += Number(pagamento.valor)
    })

    setGraficoDias(diasBase)

    const mapaProdutos = new Map<number, ProdutoRanking>()
    const mapaCategorias = new Map<string, number>()
    const mapaFormas = new Map<string, number>()

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

    pagamentosPeriodo.forEach((pagamento) => {
      mapaFormas.set(
        pagamento.forma_pagamento,
        (mapaFormas.get(pagamento.forma_pagamento) || 0) + Number(pagamento.valor)
      )
    })

    setRankingProdutos(
      Array.from(mapaProdutos.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)
    )

    setGraficoCategorias(
      Array.from(mapaCategorias.entries()).map(([name, value]) => ({ name, value }))
    )

    setGraficoFormasPagamento(
      Array.from(mapaFormas.entries()).map(([name, value]) => ({ name, value }))
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

  const tendenciaVendido = useMemo(
    () => calcularTendencia(faturamentoPrincipal, faturamentoComparacao),
    [faturamentoPrincipal, faturamentoComparacao]
  )

  const tendenciaRecebido = useMemo(
    () => calcularTendencia(recebidoPrincipal, recebidoComparacao),
    [recebidoPrincipal, recebidoComparacao]
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
    linhas.push(`"RESUMO COMERCIAL"`)
    linhas.push(`"Total vendido";"${faturamentoPrincipal.toFixed(2)}"`)
    linhas.push(`"Total recebido";"${recebidoPrincipal.toFixed(2)}"`)
    linhas.push(`"Total em aberto";"${emAbertoPrincipal.toFixed(2)}"`)
    linhas.push(`"Margem média recebida";"${margemMediaPeriodo.toFixed(1)}%"`)
    linhas.push(`"Itens vendidos";"${produtosVendidosPeriodo}"`)
    linhas.push("")
    linhas.push(`"RESUMO FINANCEIRO"`)
    linhas.push(`"Entradas pagas";"${entradasPagas.toFixed(2)}"`)
    linhas.push(`"Saídas pagas";"${saidasPagas.toFixed(2)}"`)
    linhas.push(`"Saldo atual";"${saldoAtual.toFixed(2)}"`)
    linhas.push(`"Entradas pendentes";"${entradasPendentes.toFixed(2)}"`)
    linhas.push(`"Despesas pendentes";"${despesasPendentes.toFixed(2)}"`)
    linhas.push(`"Saldo previsto";"${saldoPrevisto.toFixed(2)}"`)
    linhas.push("")
    linhas.push(`"ALERTAS"`)
    linhas.push(`"Produtos com estoque baixo";"${estoqueBaixo}"`)
    linhas.push(`"Pedidos pendentes";"${pedidosPendentes}"`)
    linhas.push("")

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
      head: [["Resumo comercial", "Valor"]],
      body: [
        ["Total vendido", `R$ ${faturamentoPrincipal.toFixed(2)}`],
        ["Total recebido", `R$ ${recebidoPrincipal.toFixed(2)}`],
        ["Total em aberto", `R$ ${emAbertoPrincipal.toFixed(2)}`],
        ["Margem média recebida", `${margemMediaPeriodo.toFixed(1)}%`],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [37, 99, 235] },
    })

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Resumo financeiro", "Valor"]],
      body: [
        ["Entradas pagas", `R$ ${entradasPagas.toFixed(2)}`],
        ["Saídas pagas", `R$ ${saidasPagas.toFixed(2)}`],
        ["Saldo atual", `R$ ${saldoAtual.toFixed(2)}`],
        ["Entradas pendentes", `R$ ${entradasPendentes.toFixed(2)}`],
        ["Despesas pendentes", `R$ ${despesasPendentes.toFixed(2)}`],
        ["Saldo previsto", `R$ ${saldoPrevisto.toFixed(2)}`],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [5, 150, 105] },
    })

    doc.save(`dashboard_${periodo}.pdf`)
  }

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">Resumo comercial e financeiro da operação.</p>

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
            marginBottom: 16,
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

      {saldoAtual < 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 14,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
          }}
        >
          <strong>Alerta:</strong> o caixa atual está negativo em R$ {Math.abs(saldoAtual).toFixed(2)}.
        </div>
      )}

      {saldoPrevisto < 0 && (
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
          <strong>Atenção:</strong> o saldo previsto ficará negativo em R$ {Math.abs(saldoPrevisto).toFixed(2)} se todas as pendências acontecerem.
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Total vendido</p>
              <p className="metric-value">R$ {faturamentoPrincipal.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="trend-row">
            <span className={`trend-pill trend-${tendenciaVendido.variant}`}>
              {tendenciaVendido.icon}
              {tendenciaVendido.label}
            </span>
            <span className="metric-helper">{textoComparacao}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Total recebido</p>
              <p className="metric-value">R$ {recebidoPrincipal.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box green">
              <Wallet size={20} />
            </div>
          </div>
          <div className="trend-row">
            <span className={`trend-pill trend-${tendenciaRecebido.variant}`}>
              {tendenciaRecebido.icon}
              {tendenciaRecebido.label}
            </span>
            <span className="metric-helper">{textoComparacao}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Em aberto</p>
              <p className="metric-value">R$ {emAbertoPrincipal.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box red">
              <BadgeDollarSign size={20} />
            </div>
          </div>
          <div className="metric-helper">Saldo a receber das vendas ativas</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Saldo atual</p>
              <p className="metric-value">R$ {saldoAtual.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box green">
              <Landmark size={20} />
            </div>
          </div>
          <div className="metric-helper">Entradas pagas menos saídas pagas</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Saldo previsto</p>
              <p className="metric-value">R$ {saldoPrevisto.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box purple">
              <CircleDollarSign size={20} />
            </div>
          </div>
          <div className="metric-helper">Considerando pendências</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Despesas pendentes</p>
              <p className="metric-value">R$ {despesasPendentes.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box orange">
              <PackageOpen size={20} />
            </div>
          </div>
          <div className="metric-helper">Saídas ainda não pagas</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label">Margem média recebida</p>
              <p className="metric-value">{margemMediaPeriodo.toFixed(1)}%</p>
            </div>
            <div className="metric-icon-box purple">
              <Percent size={20} />
            </div>
          </div>
          <div className="metric-helper">Sobre os valores recebidos</div>
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
      </div>

      <div className="dashboard-two-columns" style={{ marginBottom: 24 }}>
        <div className="chart-shell">
          <div className="chart-header-row">
            <div>
              <h3 className="dashboard-block-title">Recebido por dia</h3>
              <p className="dashboard-block-subtitle">Entradas reais de caixa das vendas</p>
            </div>
            <span className="chart-badge">Pagamentos</span>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graficoDias}>
                <defs>
                  <linearGradient id="colorRecebido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#059669"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRecebido)"
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-shell">
          <div className="chart-header-row">
            <div>
              <h3 className="dashboard-block-title">Recebido por forma</h3>
              <p className="dashboard-block-subtitle">Distribuição dos pagamentos</p>
            </div>
            <span className="chart-badge">Financeiro</span>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={graficoFormasPagamento} dataKey="value" nameKey="name" outerRadius={100} label>
                  {graficoFormasPagamento.map((_, index) => (
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
          <p className="dashboard-block-subtitle">Vendido, recebido e em aberto</p>

          <div className="data-table-wrap" style={{ marginTop: 16 }}>
            <table className="premium-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Cliente</th>
                  <th style={th}>Produto</th>
                  <th style={th}>Vendido</th>
                  <th style={th}>Recebido</th>
                  <th style={th}>Em aberto</th>
                  <th style={th}>Data</th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 20 }}>
                      Carregando...
                    </td>
                  </tr>
                ) : ultimasVendas.length > 0 ? (
                  ultimasVendas.map((venda) => (
                    <tr key={venda.id}>
                      <td style={td}>{venda.nomeCliente}</td>
                      <td style={td}>{venda.nomeProduto}</td>
                      <td style={td}>R$ {venda.valorTotal.toFixed(2)}</td>
                      <td style={td}>R$ {venda.valorRecebido.toFixed(2)}</td>
                      <td style={td}>R$ {venda.valorEmAberto.toFixed(2)}</td>
                      <td style={td}>{formatarData(venda.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={tdVazio} colSpan={6}>
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
