"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"
import { createSale } from "@/lib/services/sales/createSale"
import { hojeInputDate, montarDataISO } from "@/lib/utils/date"
import {
  normalizarTexto,
  normalizarCor,
  normalizarTamanho,
  gerarVariacoesPalavra,
  contemAlgumaVariacao,
  numeroPorExtensoParaNumero,
  extrairQuantidade,
  identificarFormaPagamento,
  limparInicioDeVenda,
  normalizarNomePessoa,
  similarityBasica,
} from "@/lib/utils/text"

type Produto = {
  id: number
  nome: string
  sku: string
  estoque: number
  preco: number
  preco_custo?: number | null
  cor: string | null
  tamanho: string | null
  user_id: string
}

type Cliente = {
  id: number
  nome: string
  user_id: string
}

type VendaInterpretadaItem = {
  quantidade: number
  produtoTexto: string
  clienteTexto: string
  valorRecebido: number | null
  formaPagamento: string | null
  observacao: string
  dataVenda: string
}

type CompraInterpretadaItem = {
  quantidade: number
  produtoTexto: string
  custoUnitario: number | null
  fornecedorTexto: string
  observacao: string
  dataCompra: string
}

const formasPagamento = [
  "Dinheiro",
  "Pix",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
]

function interpretarMultiplasVendas(texto: string): VendaInterpretadaItem[] {
  const textoOriginal = texto.trim()
  const textoNormalizado = normalizarTexto(textoOriginal)

  const temVerboVenda =
  textoNormalizado.includes("vendi") ||
  textoNormalizado.includes("efetuei uma venda") ||
  textoNormalizado.includes("efetuei venda") ||
  textoNormalizado.includes("fiz uma venda") ||
  textoNormalizado.includes("fiz venda") ||
  textoNormalizado.includes("realizei uma venda") ||
  textoNormalizado.includes("realizei venda") ||
  textoNormalizado.includes("registrei uma venda") ||
  textoNormalizado.includes("registrei venda")

  if (!temVerboVenda) return []

  const formaPagamentoGlobal = identificarFormaPagamento(textoOriginal)

  const recebidoGlobalMatch =
    textoOriginal.match(/recebi\s+(\d+[.,]?\d*)/i) ||
    textoOriginal.match(/recebido\s+(\d+[.,]?\d*)/i)

  const valorRecebidoGlobal = recebidoGlobalMatch
    ? Number(recebidoGlobalMatch[1].replace(",", "."))
    : null

  const textoSemInicio = limparInicioDeVenda(textoOriginal)

  const padraoMultiplos =
  /(?:uma|um|outra|outro|mais\s+uma|mais\s+um)\s+(.+?)\s+para\s+([a-zà-ú0-9\s]+?)(?=(?:,\s*(?:uma|um|outra|outro|mais\s+uma|mais\s+um)\s+)|(?:\s+e\s+(?:uma|um|outra|outro|mais\s+uma|mais\s+um)\s+)|$)/gi

  const encontrados = [...textoSemInicio.matchAll(padraoMultiplos)]

  if (encontrados.length > 1) {
    return encontrados.map((item) => ({
      quantidade: 1,
      produtoTexto: item[1].trim(),
      clienteTexto: item[2].trim(),
      valorRecebido: null,
      formaPagamento: formaPagamentoGlobal,
      observacao: "",
      dataVenda: hojeInputDate(),
    }))
  }

  const clienteMatch =
    textoSemInicio.match(/para\s+([a-zà-ú0-9\s]+?)(?:\s+e\s+recebi|\s+recebi|$)/i) ||
    null

  const clienteTexto = clienteMatch?.[1]?.trim() || ""

  let produtoTexto = textoSemInicio
    .replace(/para\s+([a-zà-ú0-9\s]+?)(?:\s+e\s+recebi|\s+recebi|$)/i, "")
    .replace(/recebi\s+\d+[.,]?\d*/i, "")
    .replace(/recebido\s+\d+[.,]?\d*/i, "")
    .replace(/dinheiro|pix|cartão de débito|cartao de debito|cartão de crédito|cartao de credito|transferência|transferencia|outro/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  const quantidade = extrairQuantidade(produtoTexto)

  produtoTexto = produtoTexto
    .replace(/\b(\d+)\b/, "")
    .replace(/\bum\b|\buma\b|\bdois\b|\bduas\b|\btres\b|\btrês\b|\bquatro\b|\bcinco\b|\bseis\b|\bsete\b|\boito\b|\bnove\b|\bdez\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  return [
    {
      quantidade,
      produtoTexto,
      clienteTexto,
      valorRecebido: valorRecebidoGlobal,
      formaPagamento: formaPagamentoGlobal,
      observacao: "",
      dataVenda: hojeInputDate(),
    },
  ]
}

function interpretarMultiplasCompras(texto: string): CompraInterpretadaItem[] {
  const textoOriginal = texto.trim()
  const textoNormalizado = normalizarTexto(textoOriginal)

  const temCompra =
    textoNormalizado.includes("comprei") ||
    textoNormalizado.includes("efetuei uma compra") ||
    textoNormalizado.includes("fiz uma compra") ||
    textoNormalizado.includes("realizei uma compra")

  if (!temCompra) return []

  const custoMatch =
    textoOriginal.match(/por\s+(\d+[.,]?\d*)\s*(reais|real)?\s*cada/i) ||
    textoOriginal.match(/custou\s+(\d+[.,]?\d*)/i)

  const custoUnitario = custoMatch
    ? Number(custoMatch[1].replace(",", "."))
    : null

  const quantidade = extrairQuantidade(textoOriginal)

  let produtoTexto = textoOriginal
    .replace(
      /^(comprei|efetuei uma compra de|efetuei uma compra|fiz uma compra de|fiz uma compra|realizei uma compra de|realizei uma compra)\s*/i,
      ""
    )
    .replace(/por\s+\d+[.,]?\d*\s*(reais|real)?\s*cada/gi, "")
    .replace(/custou\s+\d+[.,]?\d*/gi, "")
    .replace(/\b(\d+)\b/, "")
    .replace(/\bum\b|\buma\b|\bdois\b|\bduas\b|\btres\b|\btrês\b|\bquatro\b|\bcinco\b|\bseis\b|\bsete\b|\boito\b|\bnove\b|\bdez\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  return [
    {
      quantidade,
      produtoTexto,
      custoUnitario,
      fornecedorTexto: "",
      observacao: "",
      dataCompra: hojeInputDate(),
    },
  ]
} 

function interpretarRecebimentos(texto: string) {
  const textoNormalizado = normalizarTexto(texto)

  const temRecebimento =
    textoNormalizado.includes("recebi") ||
    textoNormalizado.includes("entrou") ||
    textoNormalizado.includes("recebimento")

  if (!temRecebimento) return []

  const valorMatch = texto.match(/(\d+[.,]?\d*)/)
  const valor = valorMatch ? Number(valorMatch[1].replace(",", ".")) : null

  const forma = identificarFormaPagamento(texto)

  const clienteMatch =
    texto.match(/de\s+([a-zà-ú0-9\s]+?)(?:\s+no|\s+via|$)/i) || null

  const clienteTexto = clienteMatch?.[1]?.trim() || ""

  if (!valor) return []

  return [
    {
      valor,
      formaPagamento: forma || "Pix",
      clienteTexto,
      data: hojeInputDate(),
    },
  ]
} 

function pontuarProduto(produto: Produto, textoProduto: string) {
  const texto = normalizarTexto(textoProduto)

  const nome = normalizarTexto(produto.nome)
  const cor = normalizarCor(produto.cor || "")
  const tamanho = normalizarTamanho(produto.tamanho || "")

  let pontos = 0

  if (nome && texto.includes(nome)) pontos += 10

  const palavrasNome = nome.split(" ").filter(Boolean)
  for (const palavra of palavrasNome) {
    if (palavra.length >= 3 && texto.includes(palavra)) {
      pontos += 2
    }
  }

  if (cor) {
    if (texto.includes(cor)) pontos += 6

    if (cor === "marinho" && (texto.includes("azul marinho") || texto.includes("marinho"))) {
      pontos += 6
    }

    if (cor === "preto" && (texto.includes("preto") || texto.includes("preta"))) {
      pontos += 6
    }

    if (cor === "branco" && (texto.includes("branco") || texto.includes("branca"))) {
      pontos += 6
    }
  }

  if (tamanho) {
    if (texto.includes(` ${tamanho} `) || texto.endsWith(` ${tamanho}`) || texto.startsWith(`${tamanho} `) || texto === tamanho) {
      pontos += 5
    }

    if (tamanho === "p" && (texto.includes(" pequeno") || texto.includes(" p "))) pontos += 5
    if (tamanho === "m" && (texto.includes(" medio") || texto.includes(" médio") || texto.includes(" m "))) pontos += 5
    if (tamanho === "g" && (texto.includes(" grande") || texto.includes(" g "))) pontos += 5
    if (tamanho === "gg" && (texto.includes(" gg") || texto.includes("extra grande"))) pontos += 5
  }

  return pontos
}

function encontrarProdutosOrdenados(produtos: Produto[], textoProduto: string) {
  return produtos
    .map((produto) => ({
      produto,
      pontos: pontuarProduto(produto, textoProduto),
    }))
    .filter((item) => item.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .map((item) => item.produto)
}

function encontrarCliente(clientes: Cliente[], textoCliente: string) {
  const alvo = normalizarNomePessoa(textoCliente)
  if (!alvo) return null

  const clientesOrdenados = clientes
    .map((cliente) => ({
      cliente,
      score: similarityBasica(cliente.nome, alvo),
    }))
    .filter((item) => item.score >= 0.6)
    .sort((a, b) => b.score - a.score)

  return clientesOrdenados[0]?.cliente || null
}

export default function AssistenteIAPage() {
  const [texto, setTexto] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [carregandoBase, setCarregandoBase] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  type VendaRascunho = {
  quantidade: string
  produtoIdSelecionado: string
  clienteIdSelecionado: string
  valorRecebido: string
  formaPagamento: string
  observacao: string
  dataVenda: string
  produtoTextoIA: string
  clienteTextoIA: string
 }

 const [rascunhos, setRascunhos] = useState<VendaRascunho[]>([])
 const [interpretado, setInterpretado] = useState(false)
 const [loadingIA, setLoadingIA] = useState(false)

  useEffect(() => {
    carregarBase()
  }, [])

  async function carregarBase() {
    setMensagem("")
    setCarregandoBase(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      setCarregandoBase(false)
      return
    }

    const { data: produtosData, error: erroProdutos } = await supabase
      .from("products")
      .select("id, nome, sku, estoque, preco, preco_custo, cor, tamanho, user_id")
      .eq("user_id", user.id)
      .order("nome", { ascending: true })

    const { data: clientesData, error: erroClientes } = await supabase
      .from("customers")
      .select("id, nome, user_id")
      .eq("user_id", user.id)
      .order("nome", { ascending: true })

    if (erroProdutos) {
      setMensagem("Erro ao carregar produtos para o Assistente IA.")
      setCarregandoBase(false)
      return
    }

    if (erroClientes) {
      setMensagem("Erro ao carregar clientes para o Assistente IA.")
      setCarregandoBase(false)
      return
    }

    setProdutos((produtosData ?? []) as Produto[])
    setClientes((clientesData ?? []) as Cliente[])
    setCarregandoBase(false)
  }

  function limparTudo() {
  setTexto("")
  setRascunhos([])
  setInterpretado(false)
 }

  async function interpretar() {
  setMensagem("")
  setLoadingIA(true)

  if (!texto.trim()) {
    setLoadingIA(false)
    setMensagem("Digite uma instrução para a IA interpretar.")
    return
  }

  const itens = interpretarMultiplasVendas(texto)
  const compras = interpretarMultiplasCompras(texto)
  const recebimentos = interpretarRecebimentos(texto)

  const textoNormalizado = normalizarTexto(texto)

// PERGUNTAS GERENCIAIS
if (
  textoNormalizado.includes("faturei") ||
  textoNormalizado.includes("faturamento") ||
  textoNormalizado.includes("pendente") ||
  textoNormalizado.includes("estoque") ||
  textoNormalizado.includes("mais vendido") ||
  textoNormalizado.includes("resuma meu dia") ||
  textoNormalizado.includes("resumo do dia") ||
  textoNormalizado.includes("7 dias") ||
  textoNormalizado.includes("ultimos 7 dias") ||
  textoNormalizado.includes("últimos 7 dias") ||
  textoNormalizado.includes("repor") ||
  textoNormalizado.includes("reposicao") ||
  textoNormalizado.includes("reposição") ||
  textoNormalizado.includes("estoque baixo") ||
  textoNormalizado.includes("zerado") ||
  textoNormalizado.includes("sem estoque") ||
  textoNormalizado.includes("cliente") ||
  textoNormalizado.includes("lucro") ||
  textoNormalizado.includes("mais lucrativo") ||
  textoNormalizado.includes("menos lucrativo") ||
  textoNormalizado.includes("parado") ||
  textoNormalizado.includes("risco de acabar") ||
  textoNormalizado.includes("acabando") ||
  textoNormalizado.includes("quase acabando") ||
  textoNormalizado.includes("vende pouco") ||
  textoNormalizado.includes("vendem pouco") ||
  textoNormalizado.includes("pouco giro") ||
  textoNormalizado.includes("preco ideal") ||
  textoNormalizado.includes("preço ideal") ||
  textoNormalizado.includes("sugira preco") ||
  textoNormalizado.includes("sugira preço") ||
  textoNormalizado.includes("pix") ||
  textoNormalizado.includes("dinheiro") ||
  textoNormalizado.includes("cartao") ||
  textoNormalizado.includes("cartão") ||
  textoNormalizado.includes("despesa") ||
  textoNormalizado.includes("saiu") ||
  textoNormalizado.includes("saldo") ||
  textoNormalizado.includes("caixa")
) {
  await responderPergunta(textoNormalizado)
  setLoadingIA(false)
  return
}

  if (itens.length === 0 && compras.length === 0 && recebimentos.length === 0) {
  setLoadingIA(false)
  setMensagem("A IA não identificou nenhuma venda, compra ou recebimento nesse texto.")
  return
 }

 if (compras.length > 0 && itens.length === 0) {
  setLoadingIA(false)
  processarPedidosIA(compras)
  return
}

  if (recebimentos.length > 0 && itens.length === 0 && compras.length === 0) {
  setLoadingIA(false)
  setMensagem("A IA já identificou um recebimento. No próximo passo vamos ligar isso ao histórico/financeiro.")
  return
  } 

    const novosRascunhos: VendaRascunho[] = itens.map((item) => {
    const produtosOrdenados = encontrarProdutosOrdenados(produtos, item.produtoTexto)
    const produtoPrincipal = produtosOrdenados[0] || null
    const clienteEncontrado = encontrarCliente(clientes, item.clienteTexto)

    const precoPadrao = produtoPrincipal ? Number(produtoPrincipal.preco || 0) : 0
    const quantidadeNumero = Number(item.quantidade || 1)
    const valorTotalPadrao = precoPadrao * quantidadeNumero

    return {
      quantidade: String(item.quantidade || 1),
      produtoIdSelecionado: produtoPrincipal ? String(produtoPrincipal.id) : "",
      clienteIdSelecionado: clienteEncontrado ? String(clienteEncontrado.id) : "",
      valorRecebido:
  item.valorRecebido !== null && item.valorRecebido !== undefined
    ? String(item.valorRecebido)
    : String(valorTotalPadrao),
      formaPagamento: item.formaPagamento || "Pix",
      observacao: item.observacao || "",
      dataVenda: item.dataVenda || hojeInputDate(),
      produtoTextoIA: item.produtoTexto,
      clienteTextoIA: item.clienteTexto,
    }
  })

  setRascunhos(novosRascunhos)
  setInterpretado(true)
  setLoadingIA(false)

  if (novosRascunhos.some((item) => !item.produtoIdSelecionado)) {
    setMensagem("A IA interpretou o texto, mas você precisa revisar alguns produtos antes de salvar.")
    return
  }

  setMensagem("Texto interpretado com sucesso. Revise as vendas antes de confirmar.")
}
  function atualizarRascunho(index: number, campo: keyof VendaRascunho, valor: string) {
  setRascunhos((atual) =>
    atual.map((item, i) =>
      i === index
        ? {
            ...item,
            [campo]: valor,
          }
        : item
    )
  )
 }

 const existeAlgumRascunhoValido = useMemo(() => {
  return rascunhos.some((rascunho) => {
    const produtoSelecionado =
      produtos.find((p) => String(p.id) === rascunho.produtoIdSelecionado) || null

    const quantidadeNumero = Number(rascunho.quantidade || 0)
    const estoqueDisponivel = Number(produtoSelecionado?.estoque || 0)

    if (!produtoSelecionado) return false
    if (quantidadeNumero <= 0) return false
    if (quantidadeNumero > estoqueDisponivel) return false

    return true
  })
}, [rascunhos, produtos])

  async function confirmarVenda() {
  setMensagem("")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Você precisa estar logado.")
    return
  }

  if (rascunhos.length === 0) {
    setMensagem("Nenhuma venda foi interpretada.")
    return
  }

  setSalvando(true)

  const mensagensErro: string[] = []
  const vendasSalvas: string[] = []

  for (const rascunho of rascunhos) {
    const produtoSelecionado =
      produtos.find((p) => String(p.id) === rascunho.produtoIdSelecionado) || null

    const clienteSelecionado =
      clientes.find((c) => String(c.id) === rascunho.clienteIdSelecionado) || null

    const quantidadeNumero = Number(rascunho.quantidade || 0)
    const valorRecebidoNumero = Number(rascunho.valorRecebido || 0)
    const valorUnitario = produtoSelecionado ? Number(produtoSelecionado.preco || 0) : 0
    const valorTotal = quantidadeNumero * valorUnitario

    if (!produtoSelecionado) {
      mensagensErro.push(`Produto não identificado: ${rascunho.produtoTextoIA}`)
      continue
    }

    if (quantidadeNumero <= 0) {
      mensagensErro.push(`Quantidade inválida para: ${produtoSelecionado.nome}`)
      continue
    }

    if (quantidadeNumero > Number(produtoSelecionado.estoque)) {
      mensagensErro.push(
        `O produto ${produtoSelecionado.nome}${
          produtoSelecionado.cor ? ` • ${produtoSelecionado.cor}` : ""
        }${produtoSelecionado.tamanho ? ` • ${produtoSelecionado.tamanho}` : ""} não tem estoque suficiente`
      )
      continue
    }

    if (valorRecebidoNumero < 0) {
      mensagensErro.push(`Valor recebido inválido para: ${produtoSelecionado.nome}`)
      continue
    }

    if (valorRecebidoNumero > valorTotal) {
      mensagensErro.push(
        `O valor recebido é maior que o total em: ${produtoSelecionado.nome}`
      )
      continue
    }

    let clienteIdFinal = clienteSelecionado?.id || null

    if (!clienteIdFinal && rascunho.clienteTextoIA) {
      const clienteParecido = encontrarCliente(clientes, rascunho.clienteTextoIA)

      if (clienteParecido) {
        clienteIdFinal = clienteParecido.id
      } else {
        const { data: novoCliente, error: erroCliente } = await supabase
          .from("customers")
          .insert([
            {
              user_id: user.id,
              nome: rascunho.clienteTextoIA.trim(),
            },
          ])
          .select()
          .single()

        if (!erroCliente && novoCliente) {
          clienteIdFinal = novoCliente.id
        }
      }
    }

    const resultado = await createSale({
      userId: user.id,
      productId: produtoSelecionado.id,
      customerId: clienteIdFinal,
      quantidade: quantidadeNumero,
      valorUnitario,
      valorTotal,
      dataVendaIso: montarDataISO(rascunho.dataVenda),
      valorRecebidoInicial: valorRecebidoNumero,
      formaPagamentoInicial: rascunho.formaPagamento || "Pix",
      observacaoPagamentoInicial: rascunho.observacao || null,
    })

    if (!resultado.success) {
      mensagensErro.push(
        resultado.message || `Erro ao salvar venda de: ${produtoSelecionado.nome}`
      )
      continue
    }

    vendasSalvas.push(
      `${produtoSelecionado.nome}${
        produtoSelecionado.cor ? ` • ${produtoSelecionado.cor}` : ""
      }${produtoSelecionado.tamanho ? ` • ${produtoSelecionado.tamanho}` : ""}`
    )
  }

  setSalvando(false)

  if (vendasSalvas.length === 0 && mensagensErro.length > 0) {
    setMensagem(`Nenhuma venda foi salva. ${mensagensErro.join(" | ")}`)
    return
  }

  if (vendasSalvas.length > 0 && mensagensErro.length > 0) {
    limparTudo()
    await carregarBase()
    setMensagem(
      `Vendas salvas: ${vendasSalvas.join(", ")}. Pendências: ${mensagensErro.join(" | ")}`
    )
    return
  }

  if (vendasSalvas.length > 0) {
    limparTudo()
    await carregarBase()
    setMensagem("Vendas lançadas com sucesso pelo Assistente IA.")
    return
  }

  setMensagem("Nenhuma ação foi concluída.")
}

async function buscarResumoVendasPorProduto(userId: string) {
  const { data: vendas } = await supabase
    .from("sales")
    .select("product_id, valor_total, quantidade, created_at, status")
    .eq("user_id", userId)
    .eq("status", "Ativa")

  const mapa: Record<
    number,
    {
      quantidade: number
      faturamento: number
      ultimaVenda: string | null
      lucro: number
    }
  > = {}

  for (const v of vendas || []) {
    const productId = Number(v.product_id)
    const produto = produtos.find((p) => p.id === productId)
    if (!produto) continue

    const quantidade = Number(v.quantidade || 0)
    const faturamento = Number(v.valor_total || 0)
    const custoUnitario = Number(produto.preco_custo ?? 0)
    const vendaUnitario = quantidade > 0 ? faturamento / quantidade : 0
    const lucro = (vendaUnitario - custoUnitario) * quantidade

    if (!mapa[productId]) {
      mapa[productId] = {
        quantidade: 0,
        faturamento: 0,
        ultimaVenda: null,
        lucro: 0,
      }
    }

    mapa[productId].quantidade += quantidade
    mapa[productId].faturamento += faturamento
    mapa[productId].lucro += lucro

    if (!mapa[productId].ultimaVenda || new Date(v.created_at) > new Date(mapa[productId].ultimaVenda!)) {
      mapa[productId].ultimaVenda = v.created_at
    }
  }

  return mapa
}

async function responderPergunta(texto: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Usuário não autenticado.")
    return
  }

  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()

  const data7Dias = new Date()
  data7Dias.setDate(data7Dias.getDate() - 7)
  const inicio7Dias = data7Dias.toISOString()

  // 🔹 RESUMO DO DIA
  if (texto.includes("resuma meu dia") || texto.includes("resumo do dia")) {
    const { data: vendasHoje } = await supabase
      .from("sales")
      .select("id, valor_total")
      .eq("user_id", user.id)
      .eq("status", "Ativa")
      .gte("created_at", inicioHoje)

    const { data: pagamentosHoje } = await supabase
      .from("sale_payments")
      .select("valor, created_at")
      .eq("user_id", user.id)
      .gte("created_at", inicioHoje)

    const faturadoHoje = (vendasHoje || []).reduce(
      (acc, v) => acc + Number(v.valor_total),
      0
    )

    const recebidoHoje = (pagamentosHoje || []).reduce(
      (acc, p) => acc + Number(p.valor),
      0
    )

    const pendenteHoje = faturadoHoje - recebidoHoje
    const qtdVendasHoje = (vendasHoje || []).length

    setMensagem(
      `📊 Resumo do dia: ${qtdVendasHoje} venda(s), faturamento de R$ ${faturadoHoje.toFixed(
        2
      )}, recebido de R$ ${recebidoHoje.toFixed(2)} e pendente de R$ ${pendenteHoje.toFixed(2)}.`
    )
    return
  }

  // 🔹 ÚLTIMOS 7 DIAS
  if (
    texto.includes("ultimos 7 dias") ||
    texto.includes("últimos 7 dias") ||
    texto.includes("7 dias")
  ) {
    const { data: vendas7Dias } = await supabase
      .from("sales")
      .select("id, valor_total")
      .eq("user_id", user.id)
      .eq("status", "Ativa")
      .gte("created_at", inicio7Dias)

    const { data: pagamentos7Dias } = await supabase
      .from("sale_payments")
      .select("valor, created_at")
      .eq("user_id", user.id)
      .gte("created_at", inicio7Dias)

    const faturado7Dias = (vendas7Dias || []).reduce(
      (acc, v) => acc + Number(v.valor_total),
      0
    )

    const recebido7Dias = (pagamentos7Dias || []).reduce(
      (acc, p) => acc + Number(p.valor),
      0
    )

    setMensagem(
      `📉 Nos últimos 7 dias você faturou R$ ${faturado7Dias.toFixed(
        2
      )}, recebeu R$ ${recebido7Dias.toFixed(2)} e realizou ${(vendas7Dias || []).length} venda(s).`
    )
    return
  }

  // 🔹 FATURAMENTO TOTAL
  if (texto.includes("faturei") || texto.includes("faturamento")) {
    const { data } = await supabase
      .from("sales")
      .select("valor_total")
      .eq("user_id", user.id)
      .eq("status", "Ativa")

    const total = (data || []).reduce((acc, v) => acc + Number(v.valor_total), 0)

    setMensagem(`💰 Seu faturamento total é R$ ${total.toFixed(2)}`)
    return
  }

  // 🔹 PENDENTE PARA RECEBER
  if (texto.includes("pendente")) {
    const { data: vendas } = await supabase
      .from("sales")
      .select("id, valor_total")
      .eq("user_id", user.id)
      .eq("status", "Ativa")

    const { data: pagamentos } = await supabase
      .from("sale_payments")
      .select("sale_id, valor")
      .eq("user_id", user.id)

    let pendente = 0

    for (const venda of vendas || []) {
      const pagos = (pagamentos || [])
        .filter((p) => p.sale_id === venda.id)
        .reduce((acc, p) => acc + Number(p.valor), 0)

      pendente += Number(venda.valor_total) - pagos
    }

    setMensagem(`📊 Você tem R$ ${pendente.toFixed(2)} pendentes para receber`)
    return
  }

  // 🔹 VALOR PARADO NO ESTOQUE
  if (
    texto.includes("parado no estoque") ||
    texto.includes("valor em estoque") ||
    texto.includes("quanto tenho em estoque") ||
    texto.includes("estoque")
  ) {
    const total = produtos.reduce(
      (acc, p) => acc + Number(p.estoque) * Number(p.preco),
      0
    )

    setMensagem(`📦 Você tem R$ ${total.toFixed(2)} em valor de venda parado no estoque.`)
    return
  }

  // 🔹 PRODUTO MAIS VENDIDO
  if (texto.includes("mais vendido")) {
    const mapa = await buscarResumoVendasPorProduto(user.id)

    const top = Object.entries(mapa).sort((a, b) => Number(b[1].quantidade) - Number(a[1].quantidade))[0]

    if (!top) {
      setMensagem("Nenhuma venda encontrada.")
      return
    }

    const produto = produtos.find((p) => p.id === Number(top[0]))

    setMensagem(`🔥 Produto mais vendido: ${produto?.nome || "Produto"} (${top[1].quantidade} unidades)`)
    return
  }

  // 🔹 CLIENTE QUE MAIS COMPRA
  if (texto.includes("cliente") && texto.includes("mais")) {
    const { data: vendas } = await supabase
      .from("sales")
      .select("customer_id")
      .eq("user_id", user.id)
      .eq("status", "Ativa")

    const mapa: Record<number, number> = {}

    for (const v of vendas || []) {
      if (!v.customer_id) continue
      mapa[v.customer_id] = (mapa[v.customer_id] || 0) + 1
    }

    const top = Object.entries(mapa).sort((a, b) => Number(b[1]) - Number(a[1]))[0]

    if (!top) {
      setMensagem("Nenhum cliente encontrado.")
      return
    }

    const cliente = clientes.find((c) => c.id === Number(top[0]))

    setMensagem(`👤 Cliente que mais compra: ${cliente?.nome || "Cliente"} (${top[1]} compras)`)
    return
  }

  // 🔹 LUCRO GERAL
  if (texto === "lucro" || texto.includes("qual meu lucro")) {
    const mapa = await buscarResumoVendasPorProduto(user.id)
    const lucro = Object.values(mapa).reduce((acc, item) => acc + Number(item.lucro), 0)

    setMensagem(`💰 Lucro estimado: R$ ${lucro.toFixed(2)}`)
    return
  }

  // 🔹 LUCRO POR PRODUTO / MAIS LUCRATIVO / MENOS LUCRATIVO
  if (
    texto.includes("lucro por produto") ||
    texto.includes("mais lucro") ||
    texto.includes("menos lucro") ||
    texto.includes("mais lucrativo") ||
    texto.includes("menos lucrativo")
  ) {
    const mapa = await buscarResumoVendasPorProduto(user.id)

    const lista = Object.entries(mapa)
      .map(([id, resumo]) => ({
        produto: produtos.find((p) => p.id === Number(id)),
        lucro: Number(resumo.lucro),
      }))
      .filter((i) => i.produto)

    if (lista.length === 0) {
      setMensagem("Não foi possível calcular o lucro por produto.")
      return
    }

    lista.sort((a, b) => b.lucro - a.lucro)

    if (texto.includes("mais lucro") || texto.includes("mais lucrativo")) {
      const top = lista[0]
      setMensagem(`🔥 Produto mais lucrativo: ${top.produto?.nome} (R$ ${top.lucro.toFixed(2)})`)
      return
    }

    if (texto.includes("menos lucro") || texto.includes("menos lucrativo")) {
      const pior = lista[lista.length - 1]
      setMensagem(`📉 Produto menos lucrativo: ${pior.produto?.nome} (R$ ${pior.lucro.toFixed(2)})`)
      return
    }

    const resumo = lista
      .slice(0, 5)
      .map((i) => `• ${i.produto?.nome}: R$ ${i.lucro.toFixed(2)}`)
      .join("\n")

    setMensagem(`📊 Lucro por produto:\n${resumo}`)
    return
  }

  // 🔹 REPOSIÇÃO INTELIGENTE
  if (
    texto.includes("repor") ||
    texto.includes("reposicao") ||
    texto.includes("reposição") ||
    texto.includes("estoque baixo")
  ) {
    const criticos = produtos.filter((p) => Number(p.estoque) <= 2)

    if (criticos.length === 0) {
      setMensagem("✅ Nenhum produto está em nível crítico de estoque.")
      return
    }

    const lista = criticos
      .slice(0, 5)
      .map((p) => `${p.nome}${p.cor ? ` • ${p.cor}` : ""}${p.tamanho ? ` • ${p.tamanho}` : ""} (${p.estoque})`)
      .join(", ")

    setMensagem(`🚨 Produtos para repor: ${lista}`)
    return
  }

  // 🔹 PRODUTOS SEM ESTOQUE
  if (texto.includes("zerado") || texto.includes("sem estoque")) {
    const zerados = produtos.filter((p) => Number(p.estoque) <= 0)

    if (zerados.length === 0) {
      setMensagem("✅ Nenhum produto está zerado no estoque.")
      return
    }

    const lista = zerados
      .slice(0, 5)
      .map((p) => `${p.nome}${p.cor ? ` • ${p.cor}` : ""}${p.tamanho ? ` • ${p.tamanho}` : ""}`)
      .join(", ")

    setMensagem(`📦 Produtos sem estoque: ${lista}`)
    return
  }

  // 🔹 PRODUTOS PARADOS
  if (texto.includes("parado")) {
    const mapa = await buscarResumoVendasPorProduto(user.id)

    const parados = produtos.filter((p) => !mapa[p.id] && Number(p.estoque) > 0)

    if (parados.length === 0) {
      setMensagem("✅ Nenhum produto parado.")
      return
    }

    const lista = parados
      .slice(0, 5)
      .map((p) => `${p.nome}${p.cor ? ` • ${p.cor}` : ""}${p.tamanho ? ` • ${p.tamanho}` : ""}`)
      .join(", ")

    setMensagem(`📦 Produtos parados: ${lista}`)
    return
  }

  // 🔹 PRODUTOS COM RISCO DE ACABAR
  if (
    texto.includes("risco de acabar") ||
    texto.includes("acabando") ||
    texto.includes("quase acabando")
  ) {
    const mapa = await buscarResumoVendasPorProduto(user.id)

    const risco = produtos.filter((p) => {
      const resumo = mapa[p.id]
      if (!resumo) return false
      return Number(p.estoque) > 0 && Number(p.estoque) <= 2 && Number(resumo.quantidade) >= 1
    })

    if (risco.length === 0) {
      setMensagem("✅ Nenhum produto está em risco imediato de acabar.")
      return
    }

    const lista = risco
      .slice(0, 5)
      .map((p) => `${p.nome}${p.cor ? ` • ${p.cor}` : ""}${p.tamanho ? ` • ${p.tamanho}` : ""} (${p.estoque})`)
      .join(", ")

    setMensagem(`⚠️ Produtos com risco de acabar: ${lista}`)
    return
  }

  // 🔹 PRODUTOS QUE VENDEM POUCO
  if (
    texto.includes("vende pouco") ||
    texto.includes("vendem pouco") ||
    texto.includes("pouco giro")
  ) {
    const mapa = await buscarResumoVendasPorProduto(user.id)

    const lista = Object.entries(mapa)
      .map(([id, resumo]) => ({
        produto: produtos.find((p) => p.id === Number(id)),
        quantidade: Number(resumo.quantidade),
      }))
      .filter((item) => item.produto)
      .sort((a, b) => a.quantidade - b.quantidade)
      .slice(0, 5)

    if (lista.length === 0) {
      setMensagem("Não encontrei produtos com giro suficiente para essa análise.")
      return
    }

    const resumo = lista
      .map((i) => `${i.produto?.nome}${i.produto?.cor ? ` • ${i.produto.cor}` : ""}: ${i.quantidade} un`)
      .join(", ")

    setMensagem(`📉 Produtos com pouco giro: ${resumo}`)
    return
  }

  // 🔹 SUGESTÃO SIMPLES DE PREÇO
  if (
    texto.includes("preco ideal") ||
    texto.includes("preço ideal") ||
    texto.includes("sugira preco") ||
    texto.includes("sugira preço")
  ) {
    const semCusto = produtos.filter((p) => Number(p.preco_custo ?? 0) <= 0)

    if (semCusto.length > 0) {
      setMensagem("Para sugerir preço ideal, cadastre o preço de custo dos produtos.")
      return
    }

    const sugestoes = produtos
      .slice(0, 5)
      .map((p) => {
        const custo = Number(p.preco_custo ?? 0)
        const sugerido = custo * 2
        return `${p.nome}${p.cor ? ` • ${p.cor}` : ""}: R$ ${sugerido.toFixed(2)}`
      })
      .join(", ")

    setMensagem(`💡 Sugestão simples de preço (2x custo): ${sugestoes}`)
    return
  }

  // 🔹 ENTRADA POR FORMA DE PAGAMENTO
  if (texto.includes("pix") || texto.includes("dinheiro") || texto.includes("cartao") || texto.includes("cartão")) {
    const forma = texto.includes("pix")
      ? "pix"
      : texto.includes("dinheiro")
      ? "dinheiro"
      : "cart"

    const { data } = await supabase
      .from("sale_payments")
      .select("valor, forma_pagamento")
      .eq("user_id", user.id)

    const total = (data || [])
      .filter((p) => (p.forma_pagamento || "").toLowerCase().includes(forma))
      .reduce((acc, p) => acc + Number(p.valor), 0)

    const nomeForma =
      forma === "pix" ? "Pix" : forma === "dinheiro" ? "Dinheiro" : "Cartão"

    setMensagem(`💳 Total recebido via ${nomeForma}: R$ ${total.toFixed(2)}`)
    return
  }

  // 🔹 SAÍDAS / DESPESAS
  if (texto.includes("saiu") || texto.includes("despesa")) {
    const { data } = await supabase
      .from("financial_transactions")
      .select("valor")
      .eq("user_id", user.id)
      .eq("tipo", "saida")

    const total = (data || []).reduce((acc, d) => acc + Number(d.valor), 0)

    setMensagem(`📉 Total de saídas: R$ ${total.toFixed(2)}`)
    return
  }

  // 🔹 SALDO ATUAL
  if (texto.includes("saldo") || texto.includes("caixa")) {
    const { data: entradas } = await supabase
      .from("sale_payments")
      .select("valor")
      .eq("user_id", user.id)

    const { data: saidas } = await supabase
      .from("financial_transactions")
      .select("valor")
      .eq("user_id", user.id)
      .eq("tipo", "saida")

    const totalEntradas = (entradas || []).reduce((acc, e) => acc + Number(e.valor), 0)
    const totalSaidas = (saidas || []).reduce((acc, s) => acc + Number(s.valor), 0)

    const saldo = totalEntradas - totalSaidas

    setMensagem(`💰 Seu saldo atual é R$ ${saldo.toFixed(2)}`)
    return
  }

  setMensagem("Não entendi sua pergunta ainda.")
}

async function processarPedidosIA(compras: CompraInterpretadaItem[]) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Usuário não autenticado.")
    return
  }

  for (const item of compras) {
    const produtosOrdenados = encontrarProdutosOrdenados(produtos, item.produtoTexto)
    const produto = produtosOrdenados[0]

    if (!produto) continue

    const quantidade = Number(item.quantidade)

    // cria pedido
    await supabase.from("orders").insert({
      product_id: produto.id,
      quantidade,
      fornecedor: item.fornecedorTexto || "Fornecedor IA",
      status: "Recebido",
      user_id: user.id,
    })

    // atualiza estoque
    const novoEstoque = Number(produto.estoque) + quantidade

    await supabase
      .from("products")
      .update({ estoque: novoEstoque })
      .eq("id", produto.id)

    // movimentação
    await registrarMovimentoEstoque({
      productId: produto.id,
      userId: user.id,
      tipo: "entrada",
      quantidade,
      motivo: "Pedido via IA",
    })
  }

  setMensagem("📦 Pedido registrado com sucesso via IA!")
}

  return (
    <div>
      <h2 className="page-title">Assistente IA</h2>
      <p className="page-subtitle">
  Digite vendas, pedidos ou perguntas sobre sua operação. A IA pode lançar vendas, registrar pedidos e responder indicadores do negócio.
</p>

      {mensagem && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            fontWeight: 600,
          }}
        >
          {mensagem}
        </div>
      )}

      <div className="section-card" style={{ marginTop: 20 }}>
        <div style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
  Exemplos:
  <br />
  • vendi 2 meias preta para Arlene e recebi 30 no pix
  <br />
  • comprei 10 meias pretas por 8 reais cada
  <br />
  • quanto eu faturei?
  <br />
  • quanto tenho pendente para receber?
  <br />
  • resuma meu dia
  <br />
  • qual produto mais vendido?
  <br />
  • qual produto mais lucrativo?
  <br />
  • qual cliente mais compra?
  <br />
  • o que preciso repor?
  <br />
  • quais produtos estão parados?
  <br />
  • quais produtos estão quase acabando?
  <br />
  • quanto entrou no pix?
  <br />
  • qual meu saldo atual?
</div>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite a venda em linguagem natural..."
          style={{ minHeight: 120 }}
        />

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
           onClick={interpretar}
           className="btn btn-primary"
           disabled={loadingIA || carregandoBase}
>
           {loadingIA ? "Analisando..." : "Interpretar venda com IA"}
           </button>

          <button onClick={limparTudo} className="btn btn-secondary">
            Limpar
          </button>
        </div>
      </div>

      {interpretado && (
  <div className="section-card" style={{ marginTop: 20 }}>
    <h3 style={{ marginTop: 0 }}>Revisão antes de salvar</h3>

    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {rascunhos.map((rascunho, index) => {
        const produtoSelecionado =
          produtos.find((p) => String(p.id) === rascunho.produtoIdSelecionado) || null

        const quantidadeNumero = Number(rascunho.quantidade || 0)
        const valorRecebidoNumero = Number(rascunho.valorRecebido || 0)
        const valorUnitario = produtoSelecionado ? Number(produtoSelecionado.preco || 0) : 0
        const valorTotal = quantidadeNumero * valorUnitario
        const valorEmAberto = Math.max(valorTotal - valorRecebidoNumero, 0)

        const estoqueDisponivel = Number(produtoSelecionado?.estoque || 0)
        const produtoNaoIdentificado = !produtoSelecionado
        const estoqueInsuficiente =
        !!produtoSelecionado && quantidadeNumero > estoqueDisponivel

        return (
          <div
          key={index}
          style={{
            border:
            produtoNaoIdentificado || estoqueInsuficiente
            ? "1px solid #ef4444"
        : "1px solid #e5e7eb",
           borderRadius: 14,
          padding: 16,
          background:
          produtoNaoIdentificado || estoqueInsuficiente ? "#fef2f2" : "#f8fafc",
          }}
          >

            <div style={{ fontWeight: 700, marginBottom: 12 }}>
              Venda {index + 1}
            </div>

            {produtoNaoIdentificado && (
  <div
    style={{
      marginBottom: 12,
      padding: "10px 12px",
      borderRadius: 10,
      background: "#fee2e2",
      color: "#991b1b",
      fontSize: 13,
      fontWeight: 700,
      border: "1px solid #fecaca",
    }}
  >
    Produto não identificado. Selecione o item correto antes de salvar.
  </div>
)}

{estoqueInsuficiente && (
  <div
    style={{
      marginBottom: 12,
      padding: "10px 12px",
      borderRadius: 10,
      background: "#fee2e2",
      color: "#991b1b",
      fontSize: 13,
      fontWeight: 700,
      border: "1px solid #fecaca",
    }}
  >
    Estoque insuficiente para este item. Disponível: {estoqueDisponivel} •
    Solicitado: {quantidadeNumero}
  </div>
)}


            <div className="grid-2">
              <div>
                <label style={labelStyle}>Texto do produto identificado</label>
                <input value={rascunho.produtoTextoIA} readOnly />
              </div>

              <div>
                <label style={labelStyle}>Texto do cliente identificado</label>
                <input value={rascunho.clienteTextoIA} readOnly />
              </div>

              <div>
                <label style={labelStyle}>Produto encontrado</label>
                <select
                  value={rascunho.produtoIdSelecionado}
                  onChange={(e) =>
                    atualizarRascunho(index, "produtoIdSelecionado", e.target.value)
                  }
                >
                  <option value="">Selecione o produto</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome}
                      {produto.cor ? ` • ${produto.cor}` : ""}
                      {produto.tamanho ? ` • ${produto.tamanho}` : ""}
                      {` • R$ ${Number(produto.preco).toFixed(2)}`}
                      {` • Estoque: ${produto.estoque}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Cliente encontrado</label>
                <select
                  value={rascunho.clienteIdSelecionado}
                  onChange={(e) =>
                    atualizarRascunho(index, "clienteIdSelecionado", e.target.value)
                  }
                >
                  <option value="">Sem cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={rascunho.quantidade}
                  onChange={(e) => atualizarRascunho(index, "quantidade", e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Data da venda</label>
                <input
                  type="date"
                  value={rascunho.dataVenda}
                  onChange={(e) => atualizarRascunho(index, "dataVenda", e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Valor recebido agora</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rascunho.valorRecebido}
                  onChange={(e) =>
                    atualizarRascunho(index, "valorRecebido", e.target.value)
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>Forma de pagamento</label>
                <select
                  value={rascunho.formaPagamento}
                  onChange={(e) =>
                    atualizarRascunho(index, "formaPagamento", e.target.value)
                  }
                >
                  {formasPagamento.map((forma) => (
                    <option key={forma} value={forma}>
                      {forma}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Observação</label>
                <input
                  value={rascunho.observacao}
                  onChange={(e) =>
                    atualizarRascunho(index, "observacao", e.target.value)
                  }
                  placeholder="Observação opcional"
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Resumo calculado</div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                <div style={resumoItem}>
                  <span style={resumoLabel}>Valor unitário</span>
                  <strong>R$ {valorUnitario.toFixed(2)}</strong>
                </div>

                <div style={resumoItem}>
                  <span style={resumoLabel}>Valor total</span>
                  <strong>R$ {valorTotal.toFixed(2)}</strong>
                </div>

                <div style={resumoItem}>
                  <span style={resumoLabel}>Recebido agora</span>
                  <strong>R$ {valorRecebidoNumero.toFixed(2)}</strong>
                </div>

                <div style={resumoItem}>
                  <span style={resumoLabel}>Em aberto</span>
                  <strong>R$ {valorEmAberto.toFixed(2)}</strong>
                </div>

                <div style={resumoItem}>
                  <span style={resumoLabel}>Estoque disponível</span>
                  <strong>{produtoSelecionado ? estoqueDisponivel : "-"}</strong>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>

    <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button
  onClick={confirmarVenda}
  className="btn btn-success"
  disabled={salvando || !existeAlgumRascunhoValido}
>
  {salvando ? "Salvando..." : "Confirmar e salvar vendas"}
</button>

      <button onClick={limparTudo} className="btn btn-secondary">
        Cancelar
      </button>
    </div>
  </div>
)}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 6,
}

const resumoItem: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
}

const resumoLabel: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
}