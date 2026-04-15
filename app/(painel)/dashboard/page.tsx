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
  Landmark,
  CircleDollarSign,
  Receipt,
  AlertTriangle,
  ShoppingBag,
  Boxes,
} from "lucide-react"

type Pagamento = {
  id: number
  sale_id: number
  valor: number
  created_at: string
}

type ServicePayment = {
  id: number
  patient_id: number
  valor: number
  forma_pagamento: string | null
  observacao: string | null
  data_pagamento: string
  competencia_inicio: string | null
  competencia_fim: string | null
  created_at: string
}

type Venda = {
  id: number
  product_id: number
  customer_id?: number | null
  quantidade: number
  valor_total: number
  created_at: string
  status?: string
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
  reference_type: string | null
  reference_id: number | null
  sale_payment_id: number | null
}

type Produto = {
  id: number
  nome: string
  custo: number | null
  estoque?: number | null
  estoque_minimo?: number | null
}

type Cliente = {
  id: number
  nome: string
}

type GraficoDia = {
  dia: string
  total: number
}

type EntradaCaixaDia = {
  created_at: string
  valor: number
}

type TrendInfo = {
  variant: "up" | "down" | "neutral"
  label: string
  icon: React.ReactNode
}

type Periodo = "hoje" | "7dias" | "30dias" | "mes" | "tudo"

type UltimaVenda = {
  id: number
  nomeProduto: string
  nomeCliente: string
  valorTotal: number
  valorRecebido: number
  valorEmAberto: number
  created_at: string
}

type ProdutoRanking = {
  id: number
  nome: string
  quantidade: number
}

const periodos: { value: Periodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "7 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "tudo", label: "Todo o período" },
]

export default function Dashboard() {
    const [vendas, setVendas] = useState<Venda[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [pagamentosServicos, setPagamentosServicos] = useState<ServicePayment[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [movimentacoesFinanceiras, setMovimentacoesFinanceiras] = useState<FinancialTransaction[]>([])

  const [periodo, setPeriodo] = useState<Periodo>("30dias")

  const [faturamento, setFaturamento] = useState(0)
const [recebido, setRecebido] = useState(0)
const [lucro, setLucro] = useState(0)
const [emAberto, setEmAberto] = useState(0)

const [saldoAtual, setSaldoAtual] = useState(0)
const [saldoPrevisto, setSaldoPrevisto] = useState(0)
const [despesasPendentes, setDespesasPendentes] = useState(0)
const [entradasPendentes, setEntradasPendentes] = useState(0)

const [faturamentoComparacao, setFaturamentoComparacao] = useState(0)
const [recebidoComparacao, setRecebidoComparacao] = useState(0)
const [lucroComparacao, setLucroComparacao] = useState(0)

const [servicosRecebidos, setServicosRecebidos] = useState(0)
const [servicosRecebidosComparacao, setServicosRecebidosComparacao] = useState(0)

  const [graficoVendas, setGraficoVendas] = useState<GraficoDia[]>([])
  const [graficoRecebido, setGraficoRecebido] = useState<GraficoDia[]>([])

  const [ultimasVendas, setUltimasVendas] = useState<UltimaVenda[]>([])
  const [produtoMaisVendido, setProdutoMaisVendido] = useState<ProdutoRanking | null>(null)
  const [estoqueBaixo, setEstoqueBaixo] = useState<Produto[]>([])

 useEffect(() => {
  carregarDados()

  function atualizarDashboard() {
    carregarDados()
  }

  function aoVoltarParaPagina() {
    if (document.visibilityState === "visible") {
      carregarDados()
    }
  }

  window.addEventListener("focus", atualizarDashboard)
  document.addEventListener("visibilitychange", aoVoltarParaPagina)

  return () => {
    window.removeEventListener("focus", atualizarDashboard)
    document.removeEventListener("visibilitychange", aoVoltarParaPagina)
  }
}, [])

  useEffect(() => {
  calcular(vendas, pagamentos, pagamentosServicos, produtos, clientes, movimentacoesFinanceiras)
}, [periodo, vendas, pagamentos, pagamentosServicos, produtos, clientes, movimentacoesFinanceiras])

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

          const { data: pagamentosServicosData } = await supabase
      .from("service_payments")
      .select("*")
      .eq("user_id", user.id)

    const { data: produtosData } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)

            const { data: movimentacoesData } = await supabase
      .from("financial_transactions")
      .select("*")
      .eq("user_id", user.id)

    const { data: clientesData } = await supabase
      .from("customers")
      .select("id, nome")
      .eq("user_id", user.id)

    const vendasLista = (vendasData || []) as Venda[]
const pagamentosLista = (pagamentosData || []) as Pagamento[]
const pagamentosServicosLista = (pagamentosServicosData || []) as ServicePayment[]
const produtosLista = (produtosData || []) as Produto[]
const clientesLista = (clientesData || []) as Cliente[]
const movimentacoesLista = (movimentacoesData || []) as FinancialTransaction[]

const movimentacoesManuais = movimentacoesLista.filter(
  (m) => m.reference_type !== "venda" && m.reference_type !== "servico"
)

setVendas(vendasLista)
setPagamentos(pagamentosLista)
setPagamentosServicos(pagamentosServicosLista)
setProdutos(produtosLista)
setClientes(clientesLista)
setMovimentacoesFinanceiras(movimentacoesManuais) 
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

    if (periodo === "tudo") {
            const datasVendas = vendas.map((v) => new Date(v.created_at).getTime())
      const datasPagamentos = pagamentos.map((p) => new Date(p.created_at).getTime())
      const datasPagamentosServicos = pagamentosServicos.map((p) =>
        new Date(`${p.data_pagamento}T12:00:00`).getTime()
      )
      const datasMovimentacoes = movimentacoesFinanceiras.map((m) =>
        new Date((m.paid_at || m.created_at) as string).getTime()
      )

      const todasDatas = [
        ...datasVendas,
        ...datasPagamentos,
        ...datasPagamentosServicos,
        ...datasMovimentacoes,
      ].filter((item) => !Number.isNaN(item))

      const menorData = todasDatas.length > 0 ? Math.min(...todasDatas) : agora.getTime()

      const inicioAtual = new Date(menorData)
      inicioAtual.setHours(0, 0, 0, 0)

      const fimAtual = new Date()

      const inicioAnterior = new Date(inicioAtual)
      const fimAnterior = new Date(inicioAtual)
      fimAnterior.setMilliseconds(-1)

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

    const calcular = (
  vendasLista: Venda[],
  pagamentosLista: Pagamento[],
  pagamentosServicosLista: ServicePayment[],
  produtosLista: Produto[],
  clientesLista: Cliente[],
  movimentacoesLista: FinancialTransaction[]
) => {
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

  const recebidoVendasAtual = pagamentosAtual.reduce(
    (soma, pagamento) => soma + Number(pagamento.valor),
    0
  )

  const recebidoVendasAnterior = pagamentosAnterior.reduce(
    (soma, pagamento) => soma + Number(pagamento.valor),
    0
  )

    const pagamentosServicosAtual = pagamentosServicosLista.filter((p) => {
    const data = new Date(`${p.data_pagamento}T12:00:00`)
    return data >= inicioAtual && data <= fimAtual
  })

  const pagamentosServicosAnterior = pagamentosServicosLista.filter((p) => {
    const data = new Date(`${p.data_pagamento}T12:00:00`)
    return data >= inicioAnterior && data <= fimAnterior
  })

  const servicosRecebidosAtual = pagamentosServicosAtual.reduce(
    (soma, pagamento) => soma + Number(pagamento.valor),
    0
  )

  const servicosRecebidosTotal = pagamentosServicosLista.reduce(
    (soma, pagamento) => soma + Number(pagamento.valor),
    0
  )

  const servicosRecebidosAnterior = pagamentosServicosAnterior.reduce(
    (soma, pagamento) => soma + Number(pagamento.valor),
    0
  )

  const recebidoAtual = recebidoVendasAtual + servicosRecebidosAtual
  const recebidoAnterior = recebidoVendasAnterior + servicosRecebidosAnterior

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

    const entradasManuaisPagas = movimentacoesLista
    .filter((m) => m.type === "entrada" && m.status === "pago")
    .reduce((soma, m) => soma + Number(m.amount), 0)

  const saidasManuaisPagas = movimentacoesLista
    .filter((m) => m.type === "saida" && m.status === "pago")
    .reduce((soma, m) => soma + Number(m.amount), 0)

    const entradasManuaisPendentes = movimentacoesLista
    .filter((m) => m.type === "entrada" && m.status === "pendente")
    .reduce((soma, m) => soma + Number(m.amount), 0)

  const saidasManuaisPendentes = movimentacoesLista
    .filter((m) => m.type === "saida" && m.status === "pendente")
    .reduce((soma, m) => soma + Number(m.amount), 0)

    const entradasPagasTotal =
    pagamentosLista.reduce((soma, p) => soma + Number(p.valor), 0) +
    servicosRecebidosTotal +
    entradasManuaisPagas

  const saldoAtualCalculado = entradasPagasTotal - saidasManuaisPagas
  const saldoPrevistoCalculado =
    saldoAtualCalculado + entradasManuaisPendentes + emAbertoAtual - saidasManuaisPendentes

  setFaturamento(faturamentoAtual)
  setRecebido(recebidoAtual)
  setLucro(lucroAtual)
  setEmAberto(emAbertoAtual)

  setSaldoAtual(saldoAtualCalculado)
  setSaldoPrevisto(saldoPrevistoCalculado)
  setDespesasPendentes(saidasManuaisPendentes)
  setEntradasPendentes(entradasManuaisPendentes + emAbertoAtual)

  setFaturamentoComparacao(faturamentoAnterior)
  setRecebidoComparacao(recebidoAnterior)
  setLucroComparacao(lucroAnterior)

  setServicosRecebidos(servicosRecebidosAtual)
  setServicosRecebidosComparacao(servicosRecebidosAnterior)

  gerarGraficoVendas(vendasPeriodoAtual, inicioAtual, quantidadeDias)
        const entradasRecebidasPeriodo = [
    ...pagamentosAtual.map((p) => ({
      created_at: p.created_at,
      valor: Number(p.valor),
    })),
    ...pagamentosServicosAtual.map((p) => ({
      created_at: new Date(`${p.data_pagamento}T12:00:00-03:00`).toISOString(),
      valor: Number(p.valor),
    })),
  ]

  gerarGraficoRecebido(entradasRecebidasPeriodo, inicioAtual, quantidadeDias)
  gerarUltimasVendas(vendasPeriodoAtual, pagamentosLista, produtosLista, clientesLista)
  gerarProdutoMaisVendido(vendasPeriodoAtual, produtosLista)
  gerarEstoqueBaixo(produtosLista)
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
    entradasPeriodo: EntradaCaixaDia[],
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

    entradasPeriodo.forEach((entrada) => {
      const dia = new Date(entrada.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })

      mapa.set(dia, (mapa.get(dia) || 0) + Number(entrada.valor))
    })

    const dados = Array.from(mapa.entries()).map(([dia, total]) => ({
      dia,
      total,
    }))

    setGraficoRecebido(dados)
  }

  function gerarUltimasVendas(
    vendasPeriodo: Venda[],
    pagamentosLista: Pagamento[],
    produtosLista: Produto[],
    clientesLista: Cliente[]
  ) {
    const lista = [...vendasPeriodo]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((venda) => {
        const produto = produtosLista.find((p) => p.id === venda.product_id)
        const cliente = clientesLista.find((c) => c.id === venda.customer_id)

        const pagamentosDaVenda = pagamentosLista.filter((p) => p.sale_id === venda.id)
        const valorRecebido = pagamentosDaVenda.reduce((soma, p) => soma + Number(p.valor), 0)

        return {
          id: venda.id,
          nomeProduto: produto?.nome || "Produto removido",
          nomeCliente: cliente?.nome || "Sem cliente",
          valorTotal: Number(venda.valor_total),
          valorRecebido,
          valorEmAberto: Math.max(Number(venda.valor_total) - valorRecebido, 0),
          created_at: venda.created_at,
        }
      })

    setUltimasVendas(lista)
  }

  function gerarProdutoMaisVendido(vendasPeriodo: Venda[], produtosLista: Produto[]) {
    const mapa = new Map<number, ProdutoRanking>()

    vendasPeriodo.forEach((venda) => {
      const produto = produtosLista.find((p) => p.id === venda.product_id)
      const nome = produto?.nome || "Produto removido"

      if (!mapa.has(venda.product_id)) {
        mapa.set(venda.product_id, {
          id: venda.product_id,
          nome,
          quantidade: 0,
        })
      }

      mapa.get(venda.product_id)!.quantidade += Number(venda.quantidade)
    })

    const ranking = Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade)
    setProdutoMaisVendido(ranking[0] || null)
  }

  function gerarEstoqueBaixo(produtosLista: Produto[]) {
    const lista = produtosLista.filter((produto) => {
      const estoqueAtual = Number(produto.estoque || 0)
      const estoqueMinimo = Number(produto.estoque_minimo || 0)

      return estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo
    })

    setEstoqueBaixo(lista)
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
      : periodo === "tudo"
      ? "vs início da operação"
      : "vs período anterior"

  const leituraRapida = useMemo(() => {
    if (lucro > 0 && recebido > 0) {
      return {
        titulo: "Operação positiva",
        texto: `Seu lucro recebido com produtos no período está em R$ ${lucro.toFixed(2)}.`,
        cor: "#065f46",
        fundo: "#ecfdf5",
        borda: "#a7f3d0",
      }
    }

    if (faturamento > 0 && recebido === 0) {
      return {
        titulo: "Atenção aos recebimentos",
        texto: "Você vendeu no período, mas ainda não houve entradas registradas no caixa.",
        cor: "#92400e",
        fundo: "#fffbeb",
        borda: "#fde68a",
      }
    }

        if (faturamento <= 0 && servicosRecebidos > 0) {
      return {
        titulo: "Serviços em andamento",
        texto: `Você recebeu R$ ${servicosRecebidos.toFixed(2)} em serviços no período selecionado.`,
        cor: "#166534",
        fundo: "#ecfdf5",
        borda: "#a7f3d0",
      }
    }

    if (faturamento <= 0 && servicosRecebidos <= 0) {
      return {
        titulo: "Sem movimento no período",
        texto: "Ainda não há vendas ou serviços recebidos no período selecionado.",
        cor: "#334155",
        fundo: "#f8fafc",
        borda: "#cbd5e1",
      }
    }

    return {
      titulo: "Período em acompanhamento",
      texto: "Continue acompanhando as vendas, recebimentos e lucro da operação.",
      cor: "#1d4ed8",
      fundo: "#eff6ff",
      borda: "#bfdbfe",
    }
  }, [faturamento, recebido, lucro])

  const alertas = useMemo(() => {
    const lista: { texto: string; tipo: "warning" | "danger" | "info" }[] = []

    if (emAberto > 0) {
      lista.push({
        texto: `Você ainda tem R$ ${emAberto.toFixed(2)} em aberto para receber.`,
        tipo: "info",
      })
    }

    if (despesasPendentes > 0) {
      lista.push({
        texto: `Existem R$ ${despesasPendentes.toFixed(2)} em despesas pendentes.`,
        tipo: "warning",
      })
    }

    if (saldoPrevisto < 0) {
      lista.push({
        texto: `Seu saldo previsto ficará negativo em R$ ${Math.abs(saldoPrevisto).toFixed(2)}.`,
        tipo: "danger",
      })
    }

    if (estoqueBaixo.length > 0) {
      lista.push({
        texto: `${estoqueBaixo.length} produto(s) estão com estoque baixo.`,
        tipo: "warning",
      })
    }

    return lista
  }, [emAberto, despesasPendentes, saldoPrevisto, estoqueBaixo])

  const resumoExecutivo = useMemo(() => {
    const linhas: string[] = []

    if (faturamento > faturamentoComparacao) {
      linhas.push("Seu faturamento cresceu em relação ao período anterior.")
    } else if (faturamento < faturamentoComparacao) {
      linhas.push("Seu faturamento caiu em relação ao período anterior.")
    }

    if (recebido < faturamento && faturamento > 0) {
      linhas.push("Nem tudo que foi vendido já entrou no caixa.")
    }

    if (lucro > 0) {
      linhas.push("Sua operação está gerando resultado positivo no período.")
    } else if (lucro < 0) {
      linhas.push("Seu lucro recebido está negativo e merece atenção.")
    }

    if (estoqueBaixo.length > 0) {
      linhas.push("Há produtos com estoque baixo que podem afetar futuras vendas.")
    }

    if (linhas.length === 0) {
      linhas.push("Seus indicadores estão estáveis no período selecionado.")
    }

    return linhas
  }, [faturamento, faturamentoComparacao, recebido, lucro, estoqueBaixo, servicosRecebidos])

  return (
    <div style={{ padding: 24 }}>
      <div style={heroWrap}>
        <div style={heroLeft}>
          <p style={eyebrow}>Dashboard</p>
          <h1 style={heroTitle}>Visão geral da sua operação</h1>
          <p style={heroSubtitle}>
            Acompanhe produtos, serviços, recebimentos, caixa, valores em aberto e lucro conforme o período selecionado.
          </p>

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
        </div>

        <div style={heroRight}>
          <div style={heroBadge}>
            <span style={heroBadgeLabel}>Lucro de produtos no período</span>
            <strong style={heroBadgeValue}>R$ {lucro.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <div
        style={{
          ...leituraCard,
          background: leituraRapida.fundo,
          borderColor: leituraRapida.borda,
          color: leituraRapida.cor,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={18} />
          <strong>{leituraRapida.titulo}</strong>
        </div>
        <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>{leituraRapida.texto}</p>
      </div>

      {alertas.length > 0 && (
        <div style={alertasGrid}>
          {alertas.map((alerta, index) => (
            <div
              key={`${alerta.texto}-${index}`}
              style={{
                ...alertaItem,
                ...(alerta.tipo === "danger"
                  ? alertaDanger
                  : alerta.tipo === "warning"
                  ? alertaWarning
                  : alertaInfo),
              }}
            >
              <AlertTriangle size={16} />
              <span>{alerta.texto}</span>
            </div>
          ))}
        </div>
      )}

      <div style={grid}>
        <div style={cardDestaque}>
          <div style={cardTop}>
            <div>
              <p style={cardLabelLight}>Total vendido</p>
              <h3 style={cardValueLight}>R$ {faturamento.toFixed(2)}</h3>
            </div>
            <div style={iconBoxHero}>
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
            <span style={helperTextLight}>{textoComparacao}</span>
          </div>
        </div>

        <div style={card}>
  <div style={cardTop}>
    <div>
      <p style={cardLabel}>Serviços recebidos</p>
      <h3 style={cardValue}>R$ {servicosRecebidos.toFixed(2)}</h3>
    </div>
    <div style={{ ...iconBox, background: "#dcfce7", color: "#166534" }}>
      <Wallet size={20} />
    </div>
  </div>
  <p style={helperText}>
    Base anterior: R$ {servicosRecebidosComparacao.toFixed(2)}
  </p>
</div>

        <div style={cardDestaque}>
          <div style={cardTop}>
            <div>
              <p style={cardLabelLight}>Entradas no caixa</p>
              <h3 style={cardValueLight}>R$ {recebido.toFixed(2)}</h3>
            </div>
            <div style={{ ...iconBoxHero, background: "rgba(16,185,129,0.18)" }}>
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
            <span style={helperTextLight}>{textoComparacao}</span>
          </div>
        </div>

        <div style={cardDestaque}>
          <div style={cardTop}>
            <div>
              <p style={cardLabelLight}>Lucro de produtos</p>
              <h3 style={cardValueLight}>R$ {lucro.toFixed(2)}</h3>
            </div>
            <div style={{ ...iconBoxHero, background: "rgba(59,130,246,0.18)" }}>
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
            <span style={helperTextLight}>{textoComparacao}</span>
          </div>
        </div>

        <div style={card}>
          <div style={cardTop}>
            <div>
              <p style={cardLabel}>Saldo atual</p>
              <h3 style={cardValue}>R$ {saldoAtual.toFixed(2)}</h3>
            </div>
            <div style={{ ...iconBox, background: "#f3e8ff", color: "#6b21a8" }}>
              <Landmark size={20} />
            </div>
          </div>
          <p style={helperText}>Entradas pagas menos saídas pagas.</p>
        </div>

        <div style={card}>
          <div style={cardTop}>
            <div>
              <p style={cardLabel}>Saldo previsto</p>
              <h3 style={cardValue}>R$ {saldoPrevisto.toFixed(2)}</h3>
            </div>
            <div style={{ ...iconBox, background: "#ede9fe", color: "#5b21b6" }}>
              <CircleDollarSign size={20} />
            </div>
          </div>
          <p style={helperText}>Considerando entradas e saídas pendentes.</p>
        </div>

        <div style={card}>
          <div style={cardTop}>
            <div>
              <p style={cardLabel}>Despesas pendentes</p>
              <h3 style={cardValue}>R$ {despesasPendentes.toFixed(2)}</h3>
            </div>
            <div style={{ ...iconBox, background: "#fff7ed", color: "#9a3412" }}>
              <Receipt size={20} />
            </div>
          </div>
          <p style={helperText}>Saídas ainda não pagas no financeiro.</p>
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
          <p style={helperText}>Valor ainda pendente das vendas de produtos no período.</p>
        </div>
      </div>

      <div style={infoGrid}>
        <div style={miniCard}>
          <div style={miniCardTop}>
            <ShoppingBag size={18} />
            <strong>Produto mais vendido</strong>
          </div>
          <p style={miniCardTitle}>
            {produtoMaisVendido ? produtoMaisVendido.nome : "Sem dados ainda"}
          </p>
          <p style={miniCardText}>
            {produtoMaisVendido
              ? `${produtoMaisVendido.quantidade} unidade(s) vendida(s) no período`
              : "Registre vendas para visualizar este indicador."}
          </p>
        </div>

        <div style={miniCard}>
          <div style={miniCardTop}>
            <Boxes size={18} />
            <strong>Estoque baixo</strong>
          </div>
          <p style={miniCardTitle}>{estoqueBaixo.length} produto(s)</p>
          <p style={miniCardText}>
            {estoqueBaixo.length > 0
              ? "Existem produtos no limite mínimo de estoque."
              : "Nenhum produto com estoque baixo no momento."}
          </p>
        </div>

        <div style={miniCard}>
          <div style={miniCardTop}>
            <Wallet size={18} />
            <strong>Entradas pendentes</strong>
          </div>
          <p style={miniCardTitle}>R$ {entradasPendentes.toFixed(2)}</p>
          <p style={miniCardText}>
            Valores que ainda devem entrar no caixa e ainda não foram marcados como pagos.
          </p>
        </div>

        <div style={miniCard}>
          <div style={miniCardTop}>
            <Wallet size={18} />
            <strong>Serviços recebidos</strong>
          </div>
          <p style={miniCardTitle}>R$ {servicosRecebidos.toFixed(2)}</p>
          <p style={miniCardText}>
            {servicosRecebidos > 0
              ? `Recebimentos de serviços no período. Base anterior: R$ ${servicosRecebidosComparacao.toFixed(2)}.`
              : "Ainda não houve recebimentos de serviços neste período."}
          </p>
        </div>
      </div>

      <div style={resumoBox}>
        <h2 style={chartTitle}>Resumo executivo automático</h2>
        <div style={resumoLista}>
          {resumoExecutivo.map((linha, index) => (
            <div key={`${linha}-${index}`} style={resumoItem}>
              <span style={resumoPonto}>•</span>
              <span>{linha}</span>
            </div>
          ))}
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
              <h2 style={chartTitle}>Entradas de caixa por dia</h2>
              <p style={chartSubtitle}>Vendas recebidas e serviços recebidos no período</p>
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

      <div style={tableCard}>
        <div style={chartHeader}>
          <div>
            <h2 style={chartTitle}>Últimas vendas</h2>
            <p style={chartSubtitle}>Resumo das vendas mais recentes do período</p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={table}>
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
              {ultimasVendas.length > 0 ? (
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
                  <td colSpan={6} style={tdVazio}>
                    Nenhuma venda encontrada no período.
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

function formatarData(dataIso: string) {
  return new Date(dataIso).toLocaleString("pt-BR")
}

const heroWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
  marginBottom: 24,
}

const heroLeft: React.CSSProperties = {
  flex: 1,
  minWidth: 280,
}

const heroRight: React.CSSProperties = {
  minWidth: 220,
}

const heroBadge: React.CSSProperties = {
  background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
  color: "#fff",
  borderRadius: 20,
  padding: 20,
  minWidth: 220,
  boxShadow: "0 14px 30px rgba(37,99,235,0.18)",
}

const heroBadgeLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  opacity: 0.85,
  marginBottom: 8,
}

const heroBadgeValue: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 800,
}

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  color: "#2563eb",
  textTransform: "uppercase",
  letterSpacing: 0.6,
}

const heroTitle: React.CSSProperties = {
  margin: "8px 0 6px 0",
  fontSize: 34,
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.1,
}

const heroSubtitle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  color: "#64748b",
}

const periodWrap: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 18,
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

const leituraCard: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 18,
  padding: 18,
  marginBottom: 20,
}

const alertasGrid: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 20,
}

const alertaItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid",
  fontSize: 14,
  fontWeight: 600,
}

const alertaDanger: React.CSSProperties = {
  background: "#fef2f2",
  borderColor: "#fecaca",
  color: "#991b1b",
}

const alertaWarning: React.CSSProperties = {
  background: "#fffbeb",
  borderColor: "#fde68a",
  color: "#92400e",
}

const alertaInfo: React.CSSProperties = {
  background: "#eff6ff",
  borderColor: "#bfdbfe",
  color: "#1d4ed8",
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
  marginTop: 20,
  marginBottom: 24,
}

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
  marginBottom: 24,
}

const chartsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
  marginBottom: 24,
}

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
}

const cardDestaque: React.CSSProperties = {
  background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 14px 30px rgba(15,23,42,0.15)",
  color: "#fff",
}

const miniCard: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
}

const miniCardTop: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#334155",
  marginBottom: 12,
}

const miniCardTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: "#0f172a",
}

const miniCardText: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 14,
  color: "#64748b",
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

const cardLabelLight: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 600,
  color: "rgba(255,255,255,0.8)",
}

const cardValue: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 28,
  fontWeight: 800,
  color: "#0f172a",
}

const cardValueLight: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 30,
  fontWeight: 800,
  color: "#ffffff",
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

const iconBoxHero: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.14)",
  color: "#ffffff",
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

const helperTextLight: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "rgba(255,255,255,0.72)",
}

const resumoBox: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 20,
  marginBottom: 24,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
}

const resumoLista: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 14,
}

const resumoItem: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e2e8f0",
  fontSize: 14,
}

const resumoPonto: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 800,
  lineHeight: 1.2,
}

const chartCard: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
}

const tableCard: React.CSSProperties = {
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

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13,
  color: "#64748b",
}

const td: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
  color: "#0f172a",
}

const tdVazio: React.CSSProperties = {
  padding: "20px",
  textAlign: "center",
  color: "#64748b",
}