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
import Link from "next/link"
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
import HelpTooltip from "../../components/HelpTooltip"
import HelpBanner from "../../components/InfoBanner"

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

type Periodo = "hoje" | "7dias" | "30dias" | "mes" | "tudo"

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
  meta_faturamento?: number | null
}

const CORES = ["#2563eb", "#059669", "#dc2626", "#d97706", "#7c3aed", "#0891b2"]

const periodos: { value: Periodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "7 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "tudo", label: "Todo o período" },
]


export default function Dashboard() {
  const [todasVendas, setTodasVendas] = useState<Venda[]>([])
  const [todosPagamentos, setTodosPagamentos] = useState<Pagamento[]>([])
  const [movimentacoesFinanceiras, setMovimentacoesFinanceiras] = useState<FinancialTransaction[]>([])
  const [produtosLista, setProdutosLista] = useState<Produto[]>([])
  const [clientesLista, setClientesLista] = useState<Cliente[]>([])
  const [periodo, setPeriodo] = useState<Periodo>("7dias")
  const [metaFaturamento, setMetaFaturamento] = useState(10000)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [novaMeta, setNovaMeta] = useState("")

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

  const [custoProdutosPeriodo, setCustoProdutosPeriodo] = useState(0)
  const [lucroBrutoPeriodo, setLucroBrutoPeriodo] = useState(0)
  const [despesasPagasPeriodo, setDespesasPagasPeriodo] = useState(0)
  const [resultadoLiquidoPeriodo, setResultadoLiquidoPeriodo] = useState(0)

  const [produtosVendidosPeriodo, setProdutosVendidosPeriodo] = useState(0)
  const [estoqueBaixo, setEstoqueBaixo] = useState(0)
  const [pedidosPendentes, setPedidosPendentes] = useState(0)
  const [ultimasVendas, setUltimasVendas] = useState<VendaRecente[]>([])
  const [graficoDias, setGraficoDias] = useState<GraficoDia[]>([])
  const [graficoVendidoDias, setGraficoVendidoDias] = useState<GraficoDia[]>([])
  const [graficoLucroDias, setGraficoLucroDias] = useState<GraficoDia[]>([])
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
  .select("*")
  .eq("user_id", user.id)
  .maybeSingle()

// 👇 SE NÃO EXISTIR, CRIA AUTOMATICAMENTE
if (!lojaData) {
  const { error } = await supabase.from("stores").insert([{
    user_id: user.id,
    nome_loja: "Minha Loja",
  },
])

  if (error) {
    console.error("Erro ao criar loja:", error)
  }
}

    const { data: lojaAtualizada} = await supabase
  .from("stores")
  .select("nome_loja, logo_url, meta_faturamento")
      .eq("user_id", user.id)
      .maybeSingle()

    const loja = (lojaAtualizada ?? null) as Loja | null
    if (loja?.nome_loja) setNomeLoja(loja.nome_loja)
    if (loja?.logo_url) setLogoUrl(loja.logo_url)
    if (loja?.meta_faturamento !== null && loja?.meta_faturamento !== undefined) {
  setMetaFaturamento(Number(loja.meta_faturamento))
}
  
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

    if (periodo === "tudo") {
  const datasVendas = todasVendas.map((v) => new Date(v.created_at).getTime())
  const datasPagamentos = todosPagamentos.map((p) => new Date(p.created_at).getTime())
  const datasMovs = movimentacoesFinanceiras.map((m) =>
    new Date((m.paid_at || m.created_at) as string).getTime()
  )

  const todasDatas = [...datasVendas, ...datasPagamentos, ...datasMovs].filter(
    (item) => !Number.isNaN(item)
  )

  const menorData = todasDatas.length > 0 ? Math.min(...todasDatas) : agora.getTime()
  const inicioAtual = new Date(menorData)
  inicioAtual.setHours(0, 0, 0, 0)

  const fimAtual = agora

  const inicioComparacao = new Date(inicioAtual)
  const fimComparacao = new Date(inicioAtual)
  fimComparacao.setMilliseconds(-1)

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

    let custoRecebidoAtual = 0

    const lucroRecebidoAtual = pagamentosPeriodo.reduce((soma, pagamento) => {
      const venda = vendasAtivas.find((v) => v.id === pagamento.sale_id)
      if (!venda) return soma

      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const custoUnitario = Number(produto?.custo || 0)

      const proporcao =
        Number(venda.valor_total) > 0
          ? Number(pagamento.valor) / Number(venda.valor_total)
          : 0

      const custoProporcional =
        custoUnitario * Number(venda.quantidade) * proporcao

      custoRecebidoAtual += custoProporcional

      return soma + (Number(pagamento.valor) - custoProporcional)
    }, 0)

    const margemMedia = recebidoAtual > 0 ? (lucroRecebidoAtual / recebidoAtual) * 100 : 0

    const despesasPagasNoPeriodo = movimentacoesFinanceiras
      .filter((m) => m.type === "saida" && m.status === "pago" && m.paid_at)
      .filter((m) => {
        const data = new Date(m.paid_at as string)
        return data >= inicioAtual && data <= fimAtual
      })
      .reduce((soma, m) => soma + Number(m.amount), 0)

    const resultadoLiquidoNoPeriodo = lucroRecebidoAtual - despesasPagasNoPeriodo

    setFaturamentoPrincipal(totalAtual)
    setFaturamentoComparacao(totalComparacao)
    setRecebidoPrincipal(recebidoAtual)
    setRecebidoComparacao(recebidoAnterior)
    setEmAbertoPrincipal(emAberto)
    setMargemMediaPeriodo(margemMedia)
    setCustoProdutosPeriodo(custoRecebidoAtual)
    setLucroBrutoPeriodo(lucroRecebidoAtual)
    setDespesasPagasPeriodo(despesasPagasNoPeriodo)
    setResultadoLiquidoPeriodo(resultadoLiquidoNoPeriodo)

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

    const entradasPagasTotal =
      pagamentosValidos.reduce((soma, p) => soma + Number(p.valor), 0) + entradasManuaisPagas
    const saidasPagasTotal = saidasManuaisPagas
    const saldoAtualCalculado = entradasPagasTotal - saidasPagasTotal
    const saldoPrevistoCalculado =
      saldoAtualCalculado + entradasManuaisPendentes - saidasManuaisPendentes

    setEntradasPagas(entradasPagasTotal)
    setSaidasPagas(saidasPagasTotal)
    setEntradasPendentes(entradasManuaisPendentes)
    setDespesasPendentes(saidasManuaisPendentes)
    setSaldoAtual(saldoAtualCalculado)
    setSaldoPrevisto(saldoPrevistoCalculado)

    setProdutosVendidosPeriodo(
      vendasPeriodo.reduce((soma, v) => soma + Number(v.quantidade), 0)
    )

    const recentes = [...vendasPeriodo]
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  .slice(0, 5)
  .map((venda) => {
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

    const vendidoDiasBase: GraficoDia[] = diasBase.map((item) => ({
  dia: item.dia,
  total: 0,
}))

vendasPeriodo.forEach((venda) => {
  const chave = new Date(venda.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })
  const item = vendidoDiasBase.find((d) => d.dia === chave)
  if (item) item.total += Number(venda.valor_total)
})

setGraficoVendidoDias(vendidoDiasBase)

    pagamentosPeriodo.forEach((pagamento) => {
      const chave = new Date(pagamento.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
      const item = diasBase.find((d) => d.dia === chave)
      if (item) item.total += Number(pagamento.valor)
    })

    setGraficoDias(diasBase)

    const lucroPorDiaMap = new Map<string, number>()

    pagamentosPeriodo.forEach((pagamento) => {
      const venda = vendasAtivas.find((v) => v.id === pagamento.sale_id)
      if (!venda) return

      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const custoUnitario = Number(produto?.custo || 0)

      const proporcao =
        Number(venda.valor_total) > 0
          ? Number(pagamento.valor) / Number(venda.valor_total)
          : 0

      const custoProporcional =
        custoUnitario * Number(venda.quantidade) * proporcao

      const lucroDoPagamento = Number(pagamento.valor) - custoProporcional

      const chave = new Date(pagamento.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })

      lucroPorDiaMap.set(chave, (lucroPorDiaMap.get(chave) || 0) + lucroDoPagamento)
    })

    movimentacoesFinanceiras
      .filter((m) => m.type === "saida" && m.status === "pago" && m.paid_at)
      .filter((m) => {
        const data = new Date(m.paid_at as string)
        return data >= inicioAtual && data <= fimAtual
      })
      .forEach((m) => {
        const chave = new Date(m.paid_at as string).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        })

        lucroPorDiaMap.set(chave, (lucroPorDiaMap.get(chave) || 0) - Number(m.amount))
      })

    const lucroDiasBase: GraficoDia[] = []
    for (let i = 0; i < quantidadeDiasGrafico; i++) {
      const data = new Date(inicioAtual)
      data.setDate(inicioAtual.getDate() + i)

      const chave = data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })

      lucroDiasBase.push({
        dia: chave,
        total: lucroPorDiaMap.get(chave) || 0,
      })
    }

    setGraficoLucroDias(lucroDiasBase)

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

  const cardLucroPrincipal = useMemo(() => {
  const positivo = resultadoLiquidoPeriodo >= 0
  return {
    titulo: "Resultado líquido",
    valor: `R$ ${resultadoLiquidoPeriodo.toFixed(2)}`,
    descricao: positivo
      ? "Resultado final do período após custos e despesas."
      : "Atenção: o período está fechando no negativo.",
    cor: positivo ? "#065f46" : "#991b1b",
    fundo: positivo ? "#ecfdf5" : "#fef2f2",
    borda: positivo ? "#a7f3d0" : "#fecaca",
    icone: positivo ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
  }
}, [resultadoLiquidoPeriodo])

const alertasDashboard = useMemo(() => {
  const alertas: { tipo: "warning" | "danger" | "info"; texto: string }[] = []

  if (produtosAbaixoDoMinimo.length > 0) {
    alertas.push({
      tipo: "warning",
      texto: `${produtosAbaixoDoMinimo.length} produto(s) com estoque baixo.`,
    })
  }

  if (saldoAtual < 0) {
    alertas.push({
      tipo: "danger",
      texto: `Caixa atual negativo em R$ ${Math.abs(saldoAtual).toFixed(2)}.`,
    })
  }

  if (saldoPrevisto < 0) {
    alertas.push({
      tipo: "warning",
      texto: `Saldo previsto negativo em R$ ${Math.abs(saldoPrevisto).toFixed(2)}.`,
    })
  }

  if (emAbertoPrincipal > 0) {
    alertas.push({
      tipo: "info",
      texto: `Há R$ ${emAbertoPrincipal.toFixed(2)} em aberto para receber.`,
    })
  }

  return alertas
}, [produtosAbaixoDoMinimo.length, saldoAtual, saldoPrevisto, emAbertoPrincipal])

const insightPrincipal = useMemo(() => {
  if (resultadoLiquidoPeriodo > 0 && faturamentoPrincipal > 0) {
    return {
      titulo: "Sua operação está positiva",
      texto: `Você fechou o período com resultado líquido de R$ ${resultadoLiquidoPeriodo.toFixed(
        2
      )}.`,
      tipo: "success" as const,
    }
  }

  if (resultadoLiquidoPeriodo < 0) {
    return {
      titulo: "Sua operação precisa de atenção",
      texto: `O resultado líquido está negativo em R$ ${Math.abs(
        resultadoLiquidoPeriodo
      ).toFixed(2)} no período.`,
      tipo: "danger" as const,
    }
  }

  if (faturamentoPrincipal <= 0) {
    return {
      titulo: "Ainda sem movimento no período",
      texto: "Registre vendas, recebimentos ou despesas para começar a acompanhar seus indicadores.",
      tipo: "neutral" as const,
    }
  }

  return {
    titulo: "Período equilibrado",
    texto: "Seu resultado líquido está zerado neste período.",
    tipo: "neutral" as const,
  }
}, [resultadoLiquidoPeriodo, faturamentoPrincipal])

const produtoMaisVendido = useMemo(() => {
  if (rankingProdutos.length === 0) return null
  return rankingProdutos[0]
}, [rankingProdutos])

const produtoMaisLucrativo = useMemo(() => {
  const { inicioAtual, fimAtual } = obterIntervalosSelecionados()

  const mapa = new Map<
    number,
    { nome: string; marca: string; categoria: string; lucro: number }
  >()

  todasVendas
    .filter((v) => v.status !== "Cancelada")
    .filter((v) => {
      const data = new Date(v.created_at)
      return data >= inicioAtual && data <= fimAtual
    })
    .forEach((venda) => {

      const produto = produtosLista.find((p) => p.id === venda.product_id)
      if (!produto) return

      const custoUnitario = Number(produto.custo || 0)
      const lucroVenda =
        Number(venda.valor_total) - custoUnitario * Number(venda.quantidade)

      if (!mapa.has(venda.product_id)) {
        mapa.set(venda.product_id, {
          nome: produto.nome,
          marca: produto.marca || "-",
          categoria: produto.categoria || "-",
          lucro: 0,
        })
      }

      mapa.get(venda.product_id)!.lucro += lucroVenda
    })

  const lista = Array.from(mapa.values()).sort((a, b) => b.lucro - a.lucro)
  return lista.length > 0 ? lista[0] : null
}, [todasVendas, produtosLista])

const acoesSugeridas = useMemo(() => {
  const acoes: {
    titulo: string
    descricao: string
    href: string
    prioridade: number
  }[] = []

  if (saldoAtual < 0) {
    acoes.push({
      titulo: "Corrigir caixa negativo",
      descricao: "Seu caixa está negativo. Revise despesas e entradas.",
      href: "/financeiro",
      prioridade: 1,
    })
  }

  if (emAbertoPrincipal > 0) {
    acoes.push({
      titulo: "Cobrar clientes",
      descricao: `Você tem R$ ${emAbertoPrincipal.toFixed(2)} em aberto.`,
      href: "/historico-vendas",
      prioridade: 2,
    })
  }

  if (produtosAbaixoDoMinimo.length > 0) {
    acoes.push({
      titulo: "Repor estoque",
      descricao: `${produtosAbaixoDoMinimo.length} produto(s) com estoque baixo.`,
      href: "/estoque",
      prioridade: 3,
    })
  }

  if (despesasPendentes > 0) {
    acoes.push({
      titulo: "Pagar despesas",
      descricao: "Existem despesas pendentes no financeiro.",
      href: "/financeiro",
      prioridade: 4,
    })
  }

  if (acoes.length === 0) {
    acoes.push({
      titulo: "Acompanhar crescimento",
      descricao: "Seu sistema está organizado. Analise os relatórios.",
      href: "/relatorios",
      prioridade: 5,
    })
  }

  return acoes.sort((a, b) => a.prioridade - b.prioridade).slice(0, 3)
}, [saldoAtual, emAbertoPrincipal, produtosAbaixoDoMinimo.length, despesasPendentes])

const melhorDiaRecebimento = useMemo(() => {
  if (!graficoDias.length) return null

  const melhor = [...graficoDias].sort((a, b) => b.total - a.total)[0]
  if (!melhor || melhor.total <= 0) return null

  return melhor
}, [graficoDias])

const formaPagamentoPrincipal = useMemo(() => {
  if (!graficoFormasPagamento.length) return null

  const principal = [...graficoFormasPagamento].sort((a, b) => b.value - a.value)[0]
  if (!principal || principal.value <= 0) return null

  return principal
}, [graficoFormasPagamento])

const categoriaPrincipal = useMemo(() => {
  if (!graficoCategorias.length) return null

  const principal = [...graficoCategorias].sort((a, b) => b.value - a.value)[0]
  if (!principal || principal.value <= 0) return null

  return principal
}, [graficoCategorias])

const resumoExecutivo = useMemo<{ texto: string; href?: string }[]>(() => {
  const linhas: { texto: string; href?: string }[] = []

  if (faturamentoPrincipal > faturamentoComparacao) {
    linhas.push({
      texto: `Seu faturamento cresceu em relação ao período anterior.`,
    })
  } else if (faturamentoPrincipal < faturamentoComparacao) {
    linhas.push({
      texto: `Seu faturamento caiu em relação ao período anterior.`,
    })
  }

  if (lucroBrutoPeriodo < faturamentoPrincipal * 0.2 && faturamentoPrincipal > 0) {
    linhas.push({
      texto: `Sua margem está baixa. Revise preços ou custos.`,
      href: "/produtos",
    })
  }

  if (saldoAtual < 0) {
    linhas.push({
      texto: `Seu caixa está negativo. Atenção urgente.`,
      href: "/financeiro",
    })
  }

  if (despesasPendentes > recebidoPrincipal * 0.5 && despesasPendentes > 0) {
    linhas.push({
      texto: `Você tem muitas despesas pendentes.`,
      href: "/financeiro",
    })
  }

  if (estoqueBaixo > 0) {
    linhas.push({
      texto: `${estoqueBaixo} produto(s) com estoque baixo.`,
      href: "/produtos",
    })
  }

  if (emAbertoPrincipal > 0) {
    linhas.push({
      texto: `Há R$ ${emAbertoPrincipal.toFixed(2)} em aberto para receber.`,
      href: "/historico-vendas",
    })
  }

  if (linhas.length === 0) {
    linhas.push({
      texto: "Tudo sob controle. Sua operação está saudável.",
    })
  }

  return linhas
}, [
  faturamentoPrincipal,
  faturamentoComparacao,
  lucroBrutoPeriodo,
  saldoAtual,
  despesasPendentes,
  recebidoPrincipal,
  estoqueBaixo,
  emAbertoPrincipal,
])

  const textoComparacao =
  periodo === "hoje"
    ? "vs ontem"
    : periodo === "mes"
    ? "vs mês anterior"
    : periodo === "tudo"
    ? "vs início da operação"
    : "vs período anterior"
   const progressoFaturamento = Math.min(
  (faturamentoPrincipal / (metaFaturamento || 1)) * 100, 100
   )
   async function salvarMetaFaturamento() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log("USER:", user)
  console.log("USER ERROR:", userError)

  if (!user) {
    alert("Usuário não autenticado.")
    return
  }

  const valor = Number(novaMeta)
  console.log("VALOR META:", valor)

  if (!valor || valor <= 0) {
    alert("Digite um valor válido.")
    return
  }

  const { data: lojaAtual, error: lojaError } = await supabase
    .from("stores")
    .select("id, user_id, nome_loja, meta_faturamento")
    .eq("user_id", user.id)
    .maybeSingle()

  console.log("LOJA ATUAL:", lojaAtual)
  console.log("LOJA ERROR:", lojaError)

  const { data, error } = await supabase
    .from("stores")
    .update({ meta_faturamento: valor })
    .eq("user_id", user.id)
    .select()

  console.log("UPDATE DATA:", data)
  console.log("UPDATE ERROR:", error)

  if (error) {
    alert(`Erro ao salvar meta: ${error.message}`)
    return
  }

  setMetaFaturamento(valor)
  setNovaMeta("")
  setEditandoMeta(false)
  alert("Meta salva com sucesso.")
}

  function exportarDashboardCSV() {
    const linhas: string[] = []

    linhas.push(`"ModaGest Dashboard"`)
    const tituloPeriodoCsv =
  periodo === "hoje"
    ? "Hoje"
    : periodo === "7dias"
    ? "7 dias"
    : periodo === "30dias"
    ? "30 dias"
    : periodo === "mes"
    ? "Mês atual"
    : "Todo o período"
linhas.push(`"Período";"${tituloPeriodoCsv}"`)
    linhas.push("")
    linhas.push(`"RESUMO COMERCIAL"`)
    linhas.push(`"Total vendido";"${faturamentoPrincipal.toFixed(2)}"`)
    linhas.push(`"Total recebido";"${recebidoPrincipal.toFixed(2)}"`)
    linhas.push(`"Total em aberto";"${emAbertoPrincipal.toFixed(2)}"`)
    linhas.push(`"Margem média recebida";"${margemMediaPeriodo.toFixed(1)}%"`)
    linhas.push(`"Itens vendidos";"${produtosVendidosPeriodo}"`)
    linhas.push("")
    linhas.push(`"RESUMO GERENCIAL"`)
    linhas.push(`"Custo recebido";"${custoProdutosPeriodo.toFixed(2)}"`)
    linhas.push(`"Lucro bruto";"${lucroBrutoPeriodo.toFixed(2)}"`)
    linhas.push(`"Despesas pagas no período";"${despesasPagasPeriodo.toFixed(2)}"`)
    linhas.push(`"Resultado líquido";"${resultadoLiquidoPeriodo.toFixed(2)}"`)
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
    : periodo === "mes"
    ? "Mês atual"
    : "Todo o período"

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
      head: [["Resumo gerencial", "Valor"]],
      body: [
        ["Custo recebido", `R$ ${custoProdutosPeriodo.toFixed(2)}`],
        ["Lucro bruto", `R$ ${lucroBrutoPeriodo.toFixed(2)}`],
        ["Despesas pagas no período", `R$ ${despesasPagasPeriodo.toFixed(2)}`],
        ["Resultado líquido", `R$ ${resultadoLiquidoPeriodo.toFixed(2)}`],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [124, 58, 237] },
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

    <HelpBanner
      title="Como ler o Dashboard"
      text="Aqui você acompanha vendas, recebimentos, caixa, saldo previsto, produtos em baixa e desempenho geral da operação. Os filtros por período alteram todos os indicadores."
    />

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

    <div style={heroDashboard}>
      <div style={heroPrincipal}>
        <div style={heroHeader}>
          <div>
            <p style={heroLabel}>Visão principal</p>
            <h3 style={heroTitle}>O que sua operação gerou neste período</h3>
          </div>

          <div
            style={{
              ...heroBadge,
              background: cardLucroPrincipal.fundo,
              color: cardLucroPrincipal.cor,
              border: `1px solid ${cardLucroPrincipal.borda}`,
            }}
          >
            {cardLucroPrincipal.icone}
            {cardLucroPrincipal.titulo}
          </div>
        </div>

        <div style={heroValorWrap}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={heroValor}>{cardLucroPrincipal.valor}</span>
            <span style={{ color: "#475569", fontSize: 14 }}>
              {cardLucroPrincipal.descricao}
            </span>
          </div>

          <div style={heroMiniGrid}>
            <div style={heroMiniCard}>
              <span style={heroMiniLabel}>Total vendido</span>
              <strong style={heroMiniValue}>R$ {faturamentoPrincipal.toFixed(2)}</strong>
              <span style={heroMiniTrend}>
                {tendenciaVendido.icon} {tendenciaVendido.label} {textoComparacao}
              </span>
            </div>

            <div style={heroMiniCard}>
              <span style={heroMiniLabel}>Total recebido</span>
              <strong style={heroMiniValue}>R$ {recebidoPrincipal.toFixed(2)}</strong>
              <span style={heroMiniTrend}>
                {tendenciaRecebido.icon} {tendenciaRecebido.label} {textoComparacao}
              </span>
            </div>

            <div style={heroMiniCard}>
              <span style={heroMiniLabel}>Despesas pagas</span>
              <strong style={heroMiniValue}>R$ {despesasPagasPeriodo.toFixed(2)}</strong>
              <span style={heroMiniTrend}>Saídas realizadas no período</span>
            </div>
          </div>
        </div>
      </div>

      {alertasDashboard.length > 0 && (
        <div style={alertasGrid}>
          {alertasDashboard.map((alerta, index) => (
            <div
              key={`${alerta.texto}-${index}`}
              style={{
                ...alertaCard,
                ...(alerta.tipo === "danger"
                  ? alertaDanger
                  : alerta.tipo === "warning"
                  ? alertaWarning
                  : alertaInfo),
              }}
            >
              <AlertTriangle size={18} />
              <span>{alerta.texto}</span>
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="dashboard-two-columns" style={{ marginBottom: 24 }}>
  <div className="section-card">
    <div className="chart-header-row">
      <div>
        <h3 className="dashboard-block-title">Leitura rápida da operação</h3>
        <p className="dashboard-block-subtitle">
          Interpretação automática do seu momento atual
        </p>
      </div>
      <span
        style={{
          ...insightTag,
          ...(insightPrincipal.tipo === "success"
            ? insightSuccess
            : insightPrincipal.tipo === "danger"
            ? insightDanger
            : insightNeutral),
        }}
      >
        {insightPrincipal.titulo}
      </span>
    </div>

    <div style={{ marginTop: 14 }}>
      <p style={{ margin: 0, fontSize: 15, color: "#334155", lineHeight: 1.7 }}>
        {insightPrincipal.texto}
      </p>
    </div>

    <div style={atalhosGrid}>
      <Link href="/vendas" style={atalhoCard}>
        <strong>Registrar venda</strong>
        <span>Adicionar nova venda e atualizar a operação.</span>
      </Link>

      <Link href="/financeiro" style={atalhoCard}>
        <strong>Ir para financeiro</strong>
        <span>Controlar entradas, saídas e pendências.</span>
      </Link>

      <Link href="/relatorios" style={atalhoCard}>
        <strong>Ver relatórios</strong>
        <span>Aprofundar a análise do seu negócio.</span>
      </Link>
    </div>
  </div>

  <div className="section-card">
    <div className="chart-header-row">
      <div>
        <h3 className="dashboard-block-title">Produtos destaque</h3>
        <p className="dashboard-block-subtitle">
          O que mais performou na sua operação
        </p>
      </div>
      <span className="chart-badge">Insights</span>
    </div>

    <div style={destaquesProdutosGrid}>
      <div style={produtoInsightCard}>
        <span style={produtoInsightLabel}>Mais vendido</span>
        <strong style={produtoInsightTitle}>
          {produtoMaisVendido ? produtoMaisVendido.nome : "Sem dados ainda"}
        </strong>
        <span style={produtoInsightMeta}>
          {produtoMaisVendido
            ? `${produtoMaisVendido.quantidade} unidade(s) • ${[
                produtoMaisVendido.marca,
                produtoMaisVendido.categoria,
              ]
                .filter(Boolean)
                .join(" • ")}`
            : "Registre vendas para ver este insight."}
        </span>
      </div>

      <div style={produtoInsightCard}>
        <span style={produtoInsightLabel}>Mais lucrativo</span>
        <strong style={produtoInsightTitle}>
          {produtoMaisLucrativo ? produtoMaisLucrativo.nome : "Sem dados ainda"}
        </strong>
        <span style={produtoInsightMeta}>
          {produtoMaisLucrativo
            ? `R$ ${produtoMaisLucrativo.lucro.toFixed(2)} de lucro • ${[
                produtoMaisLucrativo.marca,
                produtoMaisLucrativo.categoria,
              ]
                .filter(Boolean)
                .join(" • ")}`
            : "Cadastre custo e vendas para ver este insight."}
        </span>
      </div>
    </div>
  </div>
</div>

<div className="section-card" style={{ marginBottom: 24 }}>
  <div className="chart-header-row">
    <div>
      <h3 className="dashboard-block-title">O que fazer agora</h3>
      <div className="section-card" style={{ marginBottom: 24 }}>
  <div className="chart-header-row">
    <div>
      <h3 className="dashboard-block-title">Resumo executivo automático</h3>
      <p className="dashboard-block-subtitle">
        Leitura rápida do período com base nos seus dados
      </p>
    </div>
    <span className="chart-badge">Insights</span>
  </div>

</div>
      <p className="dashboard-block-subtitle">
        Sugestões automáticas com base nos seus indicadores
      </p>
    </div>
    <span className="chart-badge">Ações</span>
  </div>

  <div style={acoesGrid}>
    {acoesSugeridas.map((acao) => (
      <Link key={acao.titulo} href={acao.href} style={acaoCard}>
        <strong>{acao.titulo}</strong>
        <span>{acao.descricao}</span>
      </Link>
    ))}
  </div>
</div>


<div className="section-card" style={{ marginBottom: 24 }}>
  <div className="chart-header-row">
    <div>
      <h3 className="dashboard-block-title">Meta de faturamento</h3>
      <p className="dashboard-block-subtitle">
        Acompanhe o quanto falta para atingir sua meta no período
      </p>
    </div>
    <span className="chart-badge">Meta</span>
  </div>

  <div style={{ marginTop: 18 }}>
  {editandoMeta ? (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <input
        type="number"
        placeholder="Digite a meta"
        value={novaMeta}
        onChange={(e) => setNovaMeta(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      <button className="btn btn-primary" onClick={salvarMetaFaturamento}>
        Salvar
      </button>

      <button className="btn btn-secondary" onClick={() => setEditandoMeta(false)}>
        Cancelar
      </button>
    </div>
  ) : (
    <>
      <div style={metaHeader}>
        <strong style={metaValorAtual}>
          R$ {faturamentoPrincipal.toFixed(2)}
        </strong>

        <span style={metaValorMeta}>
          de R$ {metaFaturamento.toFixed(2)}
        </span>
      </div>

      <div style={metaBarra}>
        <div
          style={{
            ...metaBarraProgresso,
            width: `${progressoFaturamento}%`,
          }}
        />
      </div>

      <div style={metaRodape}>
        <span>{progressoFaturamento.toFixed(0)}%</span>

        <span>
          Falta R${" "}
          {Math.max(metaFaturamento - faturamentoPrincipal, 0).toFixed(2)}
        </span>
      </div>

      <button
        className="btn btn-secondary"
        style={{ marginTop: 12 }}
        onClick={() => setEditandoMeta(true)}
      >
        Definir meta
      </button>
    </>
  )}
</div>

</div>
    <div className="grid-3" style={{ marginBottom: 24 }}>
      <div className="metric-card">
        <div className="metric-top-row">
          <div>
            <p className="metric-label" style={tituloComAjuda}>
              Total vendido
              <HelpTooltip text="Soma do valor total das vendas ativas no período selecionado, independentemente de terem sido pagas ou não." />
            </p>
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
            <p className="metric-label" style={tituloComAjuda}>
              Total recebido
              <HelpTooltip text="Soma dos pagamentos realmente recebidos das vendas ativas no período." />
            </p>
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
            <p className="metric-label" style={tituloComAjuda}>
              Em aberto
              <HelpTooltip text="Valor que ainda falta receber das vendas ativas do período." />
            </p>
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
            <p className="metric-label" style={tituloComAjuda}>
              Saldo atual
              <HelpTooltip text="Resultado das entradas já pagas menos as saídas já pagas. Representa o caixa real." />
            </p>
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
            <p className="metric-label" style={tituloComAjuda}>
              Saldo previsto
              <HelpTooltip text="Mostra como o caixa ficará se todas as entradas e saídas pendentes forem realizadas." />
            </p>
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
            <p className="metric-label" style={tituloComAjuda}>
              Despesas pendentes
              <HelpTooltip text="Saídas financeiras ainda não pagas, como fornecedor, aluguel, frete ou marketing." />
            </p>
            <p className="metric-value">R$ {despesasPendentes.toFixed(2)}</p>
          </div>
          <div className="metric-icon-box orange">
            <PackageOpen size={20} />
          </div>
        </div>
        <div className="metric-helper">Saídas ainda não pagas</div>
      </div>
    </div>

    <div className="dashboard-two-columns" style={{ marginBottom: 24 }}>
      <div className="chart-shell">
        <div className="chart-header-row">
          <div>
            <h3 className="dashboard-block-title" style={tituloComAjuda}>
              Lucro líquido por dia
              <HelpTooltip text="Mostra o resultado líquido diário considerando recebimentos, custo proporcional dos produtos e despesas pagas." />
            </h3>
            <p className="dashboard-block-subtitle">
              Resultado diário após custos e despesas
            </p>
          </div>
          <span className="chart-badge">Resultado</span>
        </div>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graficoLucroDias}>
              <defs>
                <linearGradient id="colorLucroLiquido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#7c3aed"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorLucroLiquido)"
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-shell">
        <div className="chart-header-row">
          <div>
            <h3 className="dashboard-block-title" style={tituloComAjuda}>
              Recebido por dia
              <HelpTooltip text="Mostra quanto foi efetivamente recebido em cada dia do período selecionado." />
            </h3>
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
    </div>

    <div className="dashboard-two-columns" style={{ marginBottom: 24 }}>
      <div className="chart-shell">
        <div className="chart-header-row">
          <div>
            <h3 className="dashboard-block-title" style={tituloComAjuda}>
              Produtos mais vendidos
              <HelpTooltip text="Ranking dos produtos com maior quantidade vendida no período selecionado." />
            </h3>
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

      <div className="chart-shell">
        <div className="chart-header-row">
          <div>
            <h3 className="dashboard-block-title" style={tituloComAjuda}>
              Recebido por forma
              <HelpTooltip text="Distribui os recebimentos por forma de pagamento, como Pix, dinheiro ou cartão." />
            </h3>
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

    <div className="section-card" style={{ marginBottom: 24 }}>
      <div className="chart-header-row">
        <div>
          <h3 className="dashboard-block-title">Indicadores complementares</h3>
          <p className="dashboard-block-subtitle">
            Informações adicionais para análise mais detalhada da operação
          </p>
        </div>
        <span className="chart-badge">Apoio gerencial</span>
      </div>

      <div className="grid-3" style={{ marginTop: 18, marginBottom: 0 }}>
        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label" style={tituloComAjuda}>
                Itens vendidos
                <HelpTooltip text="Quantidade total de itens vendidos no período selecionado." />
              </p>
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
              <p className="metric-label" style={tituloComAjuda}>
                Estoque baixo
                <HelpTooltip text="Quantidade de produtos com estoque igual ou abaixo do estoque mínimo definido." />
              </p>
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
              <p className="metric-label" style={tituloComAjuda}>
                Pedidos pendentes
                <HelpTooltip text="Quantidade de pedidos ao fornecedor ainda pendentes, encomendados ou enviados." />
              </p>
              <p className="metric-value">{pedidosPendentes}</p>
            </div>
            <div className="metric-icon-box">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="metric-helper">Reposições em andamento</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label" style={tituloComAjuda}>
                Custo recebido
                <HelpTooltip text="Custo proporcional dos produtos referente ao que foi efetivamente recebido no período." />
              </p>
              <p className="metric-value">R$ {custoProdutosPeriodo.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box orange">
              <PackageOpen size={20} />
            </div>
          </div>
          <div className="metric-helper">Custo dos recebimentos do período</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label" style={tituloComAjuda}>
                Lucro bruto
                <HelpTooltip text="Recebimentos menos custo proporcional dos produtos recebidos no período." />
              </p>
              <p className="metric-value">R$ {lucroBrutoPeriodo.toFixed(2)}</p>
            </div>
            <div className="metric-icon-box green">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="metric-helper">Antes das despesas operacionais</div>
        </div>

        <div className="metric-card">
          <div className="metric-top-row">
            <div>
              <p className="metric-label" style={tituloComAjuda}>
                Margem média recebida
                <HelpTooltip text="Percentual médio de lucro sobre os valores que foram efetivamente recebidos." />
              </p>
              <p className="metric-value">{margemMediaPeriodo.toFixed(1)}%</p>
            </div>
            <div className="metric-icon-box purple">
              <Percent size={20} />
            </div>
          </div>
          <div className="metric-helper">Sobre os valores recebidos</div>
        </div>
      </div>
    </div>

    <div className="section-card">
      <h3 className="dashboard-block-title" style={tituloComAjuda}>
        Últimas vendas
        <HelpTooltip text="Mostra as vendas mais recentes do período com total vendido, recebido e saldo em aberto." />
      </h3>
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

const tituloComAjuda = {
  display: "inline-flex",
  alignItems: "center",
}
const heroDashboard: React.CSSProperties = {
  display: "grid",
  gap: 16,
  marginBottom: 24,
}

const heroPrincipal: React.CSSProperties = {
  background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
  borderRadius: 22,
  padding: 24,
  color: "#fff",
  boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
}

const heroHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
}

const heroLabel: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  color: "rgba(255,255,255,0.75)",
  textTransform: "uppercase",
  letterSpacing: 0.6,
}

const heroTitle: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1.15,
}

const heroBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 800,
}

const heroValorWrap: React.CSSProperties = {
  display: "grid",
  gap: 18,
}

const heroValor: React.CSSProperties = {
  fontSize: 44,
  fontWeight: 900,
  lineHeight: 1,
}

const heroMiniGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
}

const heroMiniCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const heroMiniLabel: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.72)",
}

const heroMiniValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: "#fff",
}

const heroMiniTrend: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.72)",
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
}

const alertasGrid: React.CSSProperties = {
  display: "grid",
  gap: 10,
}

const alertaCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "14px 16px",
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 700,
}

const alertaWarning: React.CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
}

const alertaDanger: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
}

const alertaInfo: React.CSSProperties = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
}

const insightTag: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid transparent",
}

const insightSuccess: React.CSSProperties = {
  background: "#ecfdf5",
  color: "#065f46",
  borderColor: "#a7f3d0",
}

const insightDanger: React.CSSProperties = {
  background: "#fef2f2",
  color: "#991b1b",
  borderColor: "#fecaca",
}

const insightNeutral: React.CSSProperties = {
  background: "#f8fafc",
  color: "#334155",
  borderColor: "#cbd5e1",
}

const atalhosGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 18,
}

const atalhoCard: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  textDecoration: "none",
  color: "#0f172a",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
}

const destaquesProdutosGrid: React.CSSProperties = {
  display: "grid",
  gap: 14,
  marginTop: 16,
}

const produtoInsightCard: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
}

const produtoInsightLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "#64748b",
}

const produtoInsightTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: "#0f172a",
}

const produtoInsightMeta: React.CSSProperties = {
  fontSize: 14,
  color: "#475569",
  lineHeight: 1.6,
}

const acoesGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginTop: 16,
}

const acaoCard: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  textDecoration: "none",
  color: "#0f172a",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
  transition: "all 0.2s ease",
}

const resumoExecutivoBox: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 16,
}

const resumoExecutivoLinha: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "14px 16px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  color: "#334155",
  lineHeight: 1.6,
  fontSize: 14,
}

const resumoExecutivoPonto: React.CSSProperties = {
  fontWeight: 900,
  color: "#2563eb",
  lineHeight: 1.2,
}

const metaHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
}

const metaValorAtual: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  color: "#0f172a",
}

const metaValorMeta: React.CSSProperties = {
  fontSize: 14,
  color: "#64748b",
  fontWeight: 700,
}

const metaBarra: React.CSSProperties = {
  width: "100%",
  height: 14,
  background: "#e5e7eb",
  borderRadius: 999,
  overflow: "hidden",
}

const metaBarraProgresso: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  borderRadius: 999,
  transition: "width 0.3s ease",
}

const metaRodape: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 10,
  fontSize: 14,
  color: "#475569",
}