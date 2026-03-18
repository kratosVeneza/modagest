"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"

type Produto = {
  id: number
  nome: string
  sku: string
  estoque: number
  preco: number
  user_id: string
  unidade?: string | null
  marca?: string | null
  categoria?: string | null
}

type Cliente = {
  id: number
  nome: string
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
  if (!dataInput) {
    return new Date().toISOString()
  }

  return new Date(`${dataInput}T12:00:00-03:00`).toISOString()
}

export default function Vendas() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtoId, setProdutoId] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [quantidade, setQuantidade] = useState("")
  const [dataVenda, setDataVenda] = useState(hojeInputDate())
  const [mensagem, setMensagem] = useState("")
  const [mensagemSucesso, setMensagemSucesso] = useState("")
  const [salvando, setSalvando] = useState(false)

  const [valorRecebidoInicial, setValorRecebidoInicial] = useState("")
  const [formaPagamentoInicial, setFormaPagamentoInicial] = useState("Pix")
  const [observacaoPagamentoInicial, setObservacaoPagamentoInicial] = useState("")

  useEffect(() => {
    carregarProdutos()
    carregarClientes()
  }, [])

  async function carregarProdutos() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("nome", { ascending: true })

    if (error) {
      setMensagem("Erro ao carregar produtos.")
      return
    }

    setProdutos((data ?? []) as Produto[])
  }

  async function carregarClientes() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from("customers")
      .select("id, nome")
      .eq("user_id", user.id)
      .order("nome", { ascending: true })

    if (!error) {
      setClientes((data ?? []) as Cliente[])
    }
  }

  const produtoSelecionado = useMemo(() => {
    return produtos.find((p) => p.id === Number(produtoId)) || null
  }, [produtos, produtoId])

  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => c.id === Number(clienteId)) || null
  }, [clientes, clienteId])

  const quantidadeNumero = Number(quantidade || 0)
  const valorUnitario = produtoSelecionado ? Number(produtoSelecionado.preco) : 0
  const valorTotal = valorUnitario * (quantidadeNumero > 0 ? quantidadeNumero : 0)
  const recebidoInicial = Number(valorRecebidoInicial || 0)
  const saldoRestante = valorTotal - recebidoInicial

  const estoqueRestante =
    produtoSelecionado && quantidadeNumero > 0
      ? produtoSelecionado.estoque - quantidadeNumero
      : produtoSelecionado?.estoque ?? 0

  async function registrarVenda() {
    setMensagem("")
    setMensagemSucesso("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!produtoId || !quantidade) {
      setMensagem("Selecione um produto e informe a quantidade.")
      return
    }

    if (!dataVenda) {
      setMensagem("Informe a data da venda.")
      return
    }

    const produto = produtos.find((p) => p.id === Number(produtoId))

    if (!produto) {
      setMensagem("Produto não encontrado.")
      return
    }

    const qtd = Number(quantidade)

    if (qtd <= 0) {
      setMensagem("Informe uma quantidade válida.")
      return
    }

    if (qtd > produto.estoque) {
      setMensagem("Estoque insuficiente para essa venda.")
      return
    }

    if (recebidoInicial < 0) {
      setMensagem("O valor recebido inicial não pode ser negativo.")
      return
    }

    if (recebidoInicial > valorTotal) {
      setMensagem("O valor recebido inicial não pode ser maior que o valor total.")
      return
    }

    setSalvando(true)

    const novoEstoque = produto.estoque - qtd
    const dataVendaISO = montarDataISO(dataVenda)

    const payload: {
      product_id: number
      quantidade: number
      valor_unitario: number
      valor_total: number
      user_id: string
      customer_id?: number | null
      status?: string
      created_at: string
    } = {
      product_id: produto.id,
      quantidade: qtd,
      valor_unitario: Number(produto.preco),
      valor_total: Number(produto.preco) * qtd,
      user_id: user.id,
      customer_id: clienteId ? Number(clienteId) : null,
      status: "Ativa",
      created_at: dataVendaISO,
    }

    const { data: vendaCriada, error: erroVenda } = await supabase
      .from("sales")
      .insert([payload])
      .select("id")
      .single()

    if (erroVenda || !vendaCriada) {
      setSalvando(false)
      setMensagem("Erro ao registrar venda.")
      return
    }

    if (recebidoInicial > 0) {
      const { error: erroPagamento } = await supabase.from("sale_payments").insert([
        {
          sale_id: vendaCriada.id,
          user_id: user.id,
          valor: recebidoInicial,
          forma_pagamento: formaPagamentoInicial,
          observacao: observacaoPagamentoInicial || null,
          created_at: dataVendaISO,
        },
      ])

      if (erroPagamento) {
        setSalvando(false)
        setMensagem("Venda criada, mas houve erro ao registrar o pagamento inicial.")
        return
      }
    }

    await registrarMovimentoEstoque({
      productId: produto.id,
      userId: user.id,
      tipo: "saida",
      quantidade: qtd,
      motivo: "Venda",
    })

    const { error: erroEstoque } = await supabase
      .from("products")
      .update({ estoque: novoEstoque })
      .eq("id", produto.id)
      .eq("user_id", user.id)

    if (erroEstoque) {
      setSalvando(false)
      setMensagem("Venda salva, mas houve erro ao atualizar o estoque.")
      return
    }

    setProdutoId("")
    setClienteId("")
    setQuantidade("")
    setDataVenda(hojeInputDate())
    setValorRecebidoInicial("")
    setFormaPagamentoInicial("Pix")
    setObservacaoPagamentoInicial("")
    setSalvando(false)
    setMensagem("")
    setMensagemSucesso("Venda cadastrada")

    setTimeout(() => {
      setMensagemSucesso("")
    }, 2500)

    await carregarProdutos()
  }

  return (
    <div>
      <h2 className="page-title">Vendas</h2>
      <p className="page-subtitle">
        Registre vendas, pagamentos iniciais e baixe o estoque automaticamente.
      </p>

      {mensagem && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            fontWeight: 600,
          }}
        >
          {mensagem}
        </div>
      )}

      {mensagemSucesso && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            fontWeight: 600,
          }}
        >
          {mensagemSucesso}
        </div>
      )}

      <div className="grid-2" style={{ marginTop: "20px", alignItems: "start" }}>
        <div className="section-card">
          <h3 style={{ marginTop: 0 }}>Nova venda</h3>

          <div className="grid-2">
            <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
              <option value="">Selecione um produto</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} - {produto.sku}
                </option>
              ))}
            </select>

            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Cliente (opcional)</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />

            <input
              type="date"
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
            />

            <input
              type="number"
              step="0.01"
              placeholder="Valor recebido agora (opcional)"
              value={valorRecebidoInicial}
              onChange={(e) => setValorRecebidoInicial(e.target.value)}
            />

            <select
              value={formaPagamentoInicial}
              onChange={(e) => setFormaPagamentoInicial(e.target.value)}
            >
              {formasPagamento.map((forma) => (
                <option key={forma} value={forma}>
                  {forma}
                </option>
              ))}
            </select>

            <input
              placeholder="Observação do pagamento (opcional)"
              value={observacaoPagamentoInicial}
              onChange={(e) => setObservacaoPagamentoInicial(e.target.value)}
            />
          </div>

          <div style={{ marginTop: "18px" }}>
            <button
              onClick={registrarVenda}
              className="btn btn-primary"
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Registrar venda"}
            </button>
          </div>
        </div>

        <div className="section-card">
          <h3 style={{ marginTop: 0 }}>Resumo da venda</h3>

          <div style={resumoLinha}>
            <span className="info-muted">Produto</span>
            <strong>{produtoSelecionado?.nome || "-"}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">SKU</span>
            <strong>{produtoSelecionado?.sku || "-"}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Cliente</span>
            <strong>{clienteSelecionado?.nome || "Sem cliente"}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Data da venda</span>
            <strong>{dataVenda || "-"}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Preço unitário</span>
            <strong>R$ {valorUnitario.toFixed(2)}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Quantidade</span>
            <strong>{quantidadeNumero > 0 ? quantidadeNumero : 0}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Estoque atual</span>
            <strong>{produtoSelecionado?.estoque ?? 0}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Estoque após venda</span>
            <strong
              style={{
                color:
                  produtoSelecionado && estoqueRestante < 0 ? "#991b1b" : undefined,
              }}
            >
              {produtoSelecionado ? estoqueRestante : 0}
            </strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Recebido agora</span>
            <strong>R$ {recebidoInicial.toFixed(2)}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Saldo em aberto</span>
            <strong>R$ {Math.max(saldoRestante, 0).toFixed(2)}</strong>
          </div>

          <div className="summary-box" style={totalBox}>
            <span>Total da venda</span>
            <strong style={{ fontSize: "22px" }}>
              R$ {valorTotal.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}

const resumoLinha = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
}

const totalBox = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}