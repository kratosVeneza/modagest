"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Produto = {
  id: number
  nome: string
  sku: string
  estoque: number
  preco: number
  cor: string | null
  tamanho: string | null
  user_id: string
}

type Cliente = {
  id: number
  nome: string
  user_id: string
}

type VendaInterpretada = {
  quantidade: number
  produtoTexto: string
  clienteTexto: string
  valorRecebido: number
  formaPagamento: string
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

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function montarDataISO(dataInput: string) {
  if (!dataInput) return new Date().toISOString()
  return new Date(`${dataInput}T12:00:00-03:00`).toISOString()
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizarCor(valor: string) {
  const v = normalizarTexto(valor)

  if (v === "preto" || v === "preta" || v === "pretos" || v === "pretas") return "preto"
  if (v === "branco" || v === "branca" || v === "brancos" || v === "brancas") return "branco"
  if (v === "rosa" || v === "rosinha") return "rosa"
  if (v === "azul marinho" || v === "marinho") return "marinho"
  if (v === "cinza" || v === "chumbo" || v === "grafite") return "cinza"

  return v
}

function normalizarTamanho(valor: string) {
  const v = normalizarTexto(valor)

  if (v === "pp") return "pp"
  if (v === "p" || v === "pequeno") return "p"
  if (v === "m" || v === "medio" || v === "médio") return "m"
  if (v === "g" || v === "grande") return "g"
  if (v === "gg" || v === "extra grande" || v === "xg" || v === "xgg") return "gg"

  return v
}

function gerarVariacoesPalavra(valor: string) {
  const base = normalizarTexto(valor)
  if (!base) return []

  const variacoes = new Set<string>()
  variacoes.add(base)

  // singular/plural simples
  if (base.endsWith("s")) {
    variacoes.add(base.slice(0, -1))
  } else {
    variacoes.add(`${base}s`)
  }

  // masculino/feminino simples
  if (base.endsWith("o")) {
    variacoes.add(base.slice(0, -1) + "a")
    variacoes.add(base.slice(0, -1) + "os")
    variacoes.add(base.slice(0, -1) + "as")
  }

  if (base.endsWith("a")) {
    variacoes.add(base.slice(0, -1) + "o")
    variacoes.add(base.slice(0, -1) + "os")
    variacoes.add(base.slice(0, -1) + "as")
  }

  return [...variacoes]
}

function contemAlgumaVariacao(texto: string, valor: string) {
  const textoNormalizado = normalizarTexto(texto)
  const variacoes = gerarVariacoesPalavra(valor)

  return variacoes.some((item) => textoNormalizado.includes(item))
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

function numeroPorExtensoParaNumero(texto: string) {
  const mapa: Record<string, number> = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
  }

  return mapa[normalizarTexto(texto)] || null
}

function extrairQuantidade(texto: string) {
  const numeroDireto = texto.match(/\b(\d+)\b/)
  if (numeroDireto) return Number(numeroDireto[1])

  const palavras = texto.split(" ")
  for (const palavra of palavras) {
    const convertido = numeroPorExtensoParaNumero(palavra)
    if (convertido) return convertido
  }

  return 1
}

function identificarFormaPagamento(texto: string) {
  const textoNormalizado = normalizarTexto(texto)

  const formaEncontrada = formasPagamento.find((forma) =>
    textoNormalizado.includes(normalizarTexto(forma))
  )

  return formaEncontrada || null
}

function limparInicioDeVenda(texto: string) {
  return texto
    .replace(
      /^(vendi|efetuei uma venda de|efetuei uma venda|fiz uma venda de|fiz uma venda|realizei uma venda de|realizei uma venda|registrei uma venda de|registrei uma venda)\s*/i,
      ""
    )
    .trim()
}

function interpretarMultiplasVendas(texto: string): VendaInterpretadaItem[] {
  const textoOriginal = texto.trim()
  const textoNormalizado = normalizarTexto(textoOriginal)

  const temVerboVenda =
    textoNormalizado.includes("vendi") ||
    textoNormalizado.includes("efetuei uma venda") ||
    textoNormalizado.includes("fiz uma venda") ||
    textoNormalizado.includes("realizei uma venda") ||
    textoNormalizado.includes("registrei uma venda") ||
    textoNormalizado.includes("registrei uma venda")

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
    /(?:uma|um|outra|outro)\s+(.+?)\s+para\s+([a-zà-ú0-9\s]+?)(?=(?:,\s*(?:uma|um|outra|outro)\s+)|(?:\s+e\s+(?:uma|um|outra|outro)\s+)|$)/gi

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

function normalizarNomePessoa(valor: string) {
  return normalizarTexto(valor)
    .replace(/\b(sr|sra|senhor|senhora|dona|seu)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function similarityBasica(a: string, b: string) {
  const aa = normalizarNomePessoa(a)
  const bb = normalizarNomePessoa(b)

  if (!aa || !bb) return 0
  if (aa === bb) return 1
  if (aa.includes(bb) || bb.includes(aa)) return 0.9

  const palavrasA = aa.split(" ").filter(Boolean)
  const palavrasB = bb.split(" ").filter(Boolean)

  const emComum = palavrasA.filter((p) => palavrasB.includes(p)).length
  const base = Math.max(palavrasA.length, palavrasB.length)

  return base > 0 ? emComum / base : 0
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
      .select("id, nome, sku, estoque, preco, cor, tamanho, user_id")
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
  setMensagem("")
  setRascunhos([])
  setInterpretado(false)
}

  function interpretar() {
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

  if (itens.length === 0 && compras.length === 0 && recebimentos.length === 0) {
  setLoadingIA(false)
  setMensagem("A IA não identificou nenhuma venda ou compra nesse texto.")
  return
}

if (compras.length > 0 && itens.length === 0) {
  setLoadingIA(false)
  setMensagem("A IA já identificou uma compra. No próximo passo vamos ligar isso à página de pedidos/compras.")
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
          : "0",
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
      setSalvando(false)
      setMensagem(`Selecione um produto válido para: ${rascunho.produtoTextoIA}`)
      return
    }

    if (quantidadeNumero <= 0) {
      setSalvando(false)
      setMensagem(`Informe uma quantidade válida para: ${rascunho.produtoTextoIA}`)
      return
    }

    if (quantidadeNumero > Number(produtoSelecionado.estoque)) {
      setSalvando(false)
      setMensagem(`Estoque insuficiente para: ${produtoSelecionado.nome}`)
      return
    }

    if (valorRecebidoNumero < 0) {
      setSalvando(false)
      setMensagem(`O valor recebido não pode ser negativo em: ${produtoSelecionado.nome}`)
      return
    }

    if (valorRecebidoNumero > valorTotal) {
      setSalvando(false)
      setMensagem(`O valor recebido não pode ser maior que o total em: ${produtoSelecionado.nome}`)
      return
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

    const createdAtIso = montarDataISO(rascunho.dataVenda)

    const vendaPayload = {
      product_id: produtoSelecionado.id,
      customer_id: clienteIdFinal,
      quantidade: quantidadeNumero,
      valor_unitario: valorUnitario,
      valor_total: valorTotal,
      created_at: createdAtIso,
      user_id: user.id,
      status: "Ativa",
      estoque_devolvido: false,
    }

    const { data: vendaInserida, error: erroVenda } = await supabase
      .from("sales")
      .insert([vendaPayload])
      .select()
      .single()

    if (erroVenda || !vendaInserida) {
      setSalvando(false)
      setMensagem(erroVenda?.message || "Erro ao salvar uma das vendas.")
      return
    }

    const novoEstoque = Number(produtoSelecionado.estoque) - quantidadeNumero

    const { error: erroEstoque } = await supabase
      .from("products")
      .update({ estoque: novoEstoque })
      .eq("id", produtoSelecionado.id)
      .eq("user_id", user.id)

    if (erroEstoque) {
      setSalvando(false)
      setMensagem(erroEstoque.message || "Erro ao baixar estoque.")
      return
    }

    if (valorRecebidoNumero > 0) {
      const pagamentoPayload = {
        sale_id: vendaInserida.id,
        user_id: user.id,
        valor: valorRecebidoNumero,
        forma_pagamento: rascunho.formaPagamento,
        observacao: rascunho.observacao || null,
        created_at: createdAtIso,
      }

      const { error: erroPagamento } = await supabase
        .from("sale_payments")
        .insert([pagamentoPayload])

      if (erroPagamento) {
        setSalvando(false)
        setMensagem(erroPagamento.message || "Erro ao registrar pagamento.")
        return
      }
    }
  }

  setSalvando(false)
  setMensagem("Vendas lançadas com sucesso pelo Assistente IA.")
  limparTudo()
  await carregarBase()
}

  return (
    <div>
      <h2 className="page-title">Assistente IA</h2>
      <p className="page-subtitle">
        Digite uma venda em texto. A IA interpreta, encontra produto e cliente, e você confirma antes de salvar.
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
          • vendi 1 conjunto camila azul m para Maria e recebi 100 no dinheiro
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

        return (
          <div
            key={index}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 16,
              background: "#f8fafc",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>
              Venda {index + 1}
            </div>

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
        disabled={salvando}
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
