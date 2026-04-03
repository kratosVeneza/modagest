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
    .trim()
}

function interpretarVendaTexto(texto: string): VendaInterpretada | null {
  const textoOriginal = texto.trim()
  const textoLower = normalizarTexto(textoOriginal)

  if (!textoLower.includes("vendi")) return null

  const quantidadeMatch = textoLower.match(/vendi\s+(\d+)/i)
  const quantidade = Number(quantidadeMatch?.[1] || 1)

  const recebidoMatch =
    textoLower.match(/recebi\s+(\d+[.,]?\d*)/i) ||
    textoLower.match(/recebido\s+(\d+[.,]?\d*)/i)

  const valorRecebido = recebidoMatch
    ? Number(recebidoMatch[1].replace(",", "."))
    : 0

  let formaPagamento = "Pix"
  const formaEncontrada = formasPagamento.find((forma) =>
    textoLower.includes(normalizarTexto(forma))
  )
  if (formaEncontrada) {
    formaPagamento = formaEncontrada
  }

  const clienteMatch =
    textoOriginal.match(/para\s+(.+?)(?:\s+e\s+recebi|\s+recebi|$)/i) || null

  const clienteTexto = clienteMatch?.[1]?.trim() || ""

  let produtoTexto = textoOriginal
    .replace(/vendi\s+\d+/i, "")
    .replace(/para\s+(.+?)(?:\s+e\s+recebi|\s+recebi|$)/i, "")
    .replace(/recebi\s+\d+[.,]?\d*/i, "")
    .replace(/dinheiro|pix|cartão de débito|cartao de debito|cartão de crédito|cartao de credito|transferência|transferencia|outro/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  return {
    quantidade,
    produtoTexto,
    clienteTexto,
    valorRecebido,
    formaPagamento,
    observacao: "",
    dataVenda: hojeInputDate(),
  }
}

function pontuarProduto(produto: Produto, textoProduto: string) {
  const texto = normalizarTexto(textoProduto)

  const nome = normalizarTexto(produto.nome)
  const cor = normalizarTexto(produto.cor || "")
  const tamanho = normalizarTexto(produto.tamanho || "")

  let pontos = 0

  if (nome && texto.includes(nome)) pontos += 10

  const palavrasNome = nome.split(" ").filter(Boolean)
  for (const palavra of palavrasNome) {
    if (palavra.length >= 3 && texto.includes(palavra)) pontos += 2
  }

  if (cor && texto.includes(cor)) pontos += 4
  if (tamanho && texto.includes(tamanho)) pontos += 4

  return pontos
}

function encontrarMelhorProduto(produtos: Produto[], textoProduto: string) {
  const candidatos = produtos
    .map((produto) => ({
      produto,
      pontos: pontuarProduto(produto, textoProduto),
    }))
    .filter((item) => item.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)

  return candidatos[0]?.produto || null
}

function encontrarCliente(clientes: Cliente[], textoCliente: string) {
  const alvo = normalizarTexto(textoCliente)
  if (!alvo) return null

  return (
    clientes.find((cliente) => normalizarTexto(cliente.nome) === alvo) ||
    clientes.find((cliente) =>
      normalizarTexto(cliente.nome).includes(alvo) ||
      alvo.includes(normalizarTexto(cliente.nome))
    ) ||
    null
  )
}

export default function AssistenteIAPage() {
  const [texto, setTexto] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [carregandoBase, setCarregandoBase] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [quantidade, setQuantidade] = useState("1")
  const [produtoIdSelecionado, setProdutoIdSelecionado] = useState("")
  const [clienteIdSelecionado, setClienteIdSelecionado] = useState("")
  const [valorRecebido, setValorRecebido] = useState("0")
  const [formaPagamento, setFormaPagamento] = useState("Pix")
  const [observacao, setObservacao] = useState("")
  const [dataVenda, setDataVenda] = useState(hojeInputDate())

  const [produtoTextoIA, setProdutoTextoIA] = useState("")
  const [clienteTextoIA, setClienteTextoIA] = useState("")
  const [interpretado, setInterpretado] = useState(false)

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
    setQuantidade("1")
    setProdutoIdSelecionado("")
    setClienteIdSelecionado("")
    setValorRecebido("0")
    setFormaPagamento("Pix")
    setObservacao("")
    setDataVenda(hojeInputDate())
    setProdutoTextoIA("")
    setClienteTextoIA("")
    setInterpretado(false)
  }

  function interpretar() {
    setMensagem("")

    if (!texto.trim()) {
      setMensagem("Digite uma instrução para a IA interpretar.")
      return
    }

    const resultado = interpretarVendaTexto(texto)

    if (!resultado) {
      setMensagem("A IA não identificou uma venda nesse texto.")
      return
    }

    setQuantidade(String(resultado.quantidade))
    setValorRecebido(String(resultado.valorRecebido))
    setFormaPagamento(resultado.formaPagamento)
    setObservacao(resultado.observacao)
    setDataVenda(resultado.dataVenda)
    setProdutoTextoIA(resultado.produtoTexto)
    setClienteTextoIA(resultado.clienteTexto)

    const produtoEncontrado = encontrarMelhorProduto(produtos, resultado.produtoTexto)
    const clienteEncontrado = encontrarCliente(clientes, resultado.clienteTexto)

    setProdutoIdSelecionado(produtoEncontrado ? String(produtoEncontrado.id) : "")
    setClienteIdSelecionado(clienteEncontrado ? String(clienteEncontrado.id) : "")
    setInterpretado(true)

    if (!produtoEncontrado) {
      setMensagem("A IA interpretou a venda, mas você precisa escolher o produto correto.")
      return
    }

    setMensagem("Venda interpretada. Revise os dados antes de confirmar.")
  }

  const produtoSelecionado = useMemo(() => {
    return produtos.find((p) => String(p.id) === produtoIdSelecionado) || null
  }, [produtos, produtoIdSelecionado])

  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => String(c.id) === clienteIdSelecionado) || null
  }, [clientes, clienteIdSelecionado])

  const quantidadeNumero = Number(quantidade || 0)
  const valorRecebidoNumero = Number(valorRecebido || 0)
  const valorUnitario = produtoSelecionado ? Number(produtoSelecionado.preco || 0) : 0
  const valorTotal = quantidadeNumero > 0 ? valorUnitario * quantidadeNumero : 0
  const valorEmAberto = Math.max(valorTotal - valorRecebidoNumero, 0)

  async function confirmarVenda() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!produtoSelecionado) {
      setMensagem("Selecione um produto para concluir a venda.")
      return
    }

    if (quantidadeNumero <= 0) {
      setMensagem("Informe uma quantidade válida.")
      return
    }

    if (quantidadeNumero > Number(produtoSelecionado.estoque)) {
      setMensagem("A quantidade informada é maior que o estoque disponível.")
      return
    }

    if (valorRecebidoNumero < 0) {
      setMensagem("O valor recebido não pode ser negativo.")
      return
    }

    if (valorRecebidoNumero > valorTotal) {
      setMensagem("O valor recebido não pode ser maior que o valor total da venda.")
      return
    }

    if (!dataVenda) {
      setMensagem("Informe a data da venda.")
      return
    }

    setSalvando(true)

    const createdAtIso = montarDataISO(dataVenda)

    let clienteIdFinal = clienteSelecionado?.id || null

// 👉 cria cliente automaticamente se não existir
if (!clienteIdFinal && clienteTextoIA) {
  const { data: novoCliente, error: erroCliente } = await supabase
    .from("customers")
    .insert([
      {
        user_id: user.id,
        nome: clienteTextoIA,
      },
    ])
    .select()
    .single()

  if (!erroCliente && novoCliente) {
    clienteIdFinal = novoCliente.id
  }
}

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
      setMensagem(erroVenda?.message || "Erro ao salvar a venda.")
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
      setMensagem(erroEstoque.message || "A venda foi criada, mas houve erro ao baixar o estoque.")
      return
    }

    if (valorRecebidoNumero > 0) {
      const pagamentoPayload = {
        sale_id: vendaInserida.id,
        user_id: user.id,
        valor: valorRecebidoNumero,
        forma_pagamento: formaPagamento,
        observacao: observacao || null,
        created_at: createdAtIso,
      }

      const { error: erroPagamento } = await supabase
        .from("sale_payments")
        .insert([pagamentoPayload])

      if (erroPagamento) {
        setSalvando(false)
        setMensagem(erroPagamento.message || "A venda foi salva, mas houve erro ao registrar o pagamento.")
        return
      }
    }

    setSalvando(false)
    setMensagem("Venda lançada com sucesso pelo Assistente IA.")
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
            disabled={carregandoBase}
          >
            Interpretar venda com IA
          </button>

          <button onClick={limparTudo} className="btn btn-secondary">
            Limpar
          </button>
        </div>
      </div>

      {interpretado && (
        <div className="section-card" style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>Revisão antes de salvar</h3>

          <div className="grid-2">
            <div>
              <label style={labelStyle}>Texto do produto identificado</label>
              <input value={produtoTextoIA} readOnly />
            </div>

            <div>
              <label style={labelStyle}>Texto do cliente identificado</label>
              <input value={clienteTextoIA} readOnly />
            </div>

            <div>
              <label style={labelStyle}>Produto encontrado</label>
              <select
                value={produtoIdSelecionado}
                onChange={(e) => setProdutoIdSelecionado(e.target.value)}
              >
                <option value="">Selecione o produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome}
                    {produto.cor ? ` • ${produto.cor}` : ""}
                    {produto.tamanho ? ` • ${produto.tamanho}` : ""}
                    {` • Estoque: ${produto.estoque}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Cliente encontrado</label>
              <select
                value={clienteIdSelecionado}
                onChange={(e) => setClienteIdSelecionado(e.target.value)}
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
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Data da venda</label>
              <input
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Valor recebido agora</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Forma de pagamento</label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
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
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observação opcional"
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Resumo calculado</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
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

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={confirmarVenda}
              className="btn btn-success"
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Confirmar e salvar venda"}
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
