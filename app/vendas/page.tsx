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
}

type Cliente = {
  id: number
  nome: string
}

export default function Vendas() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtoId, setProdutoId] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [quantidade, setQuantidade] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [salvando, setSalvando] = useState(false)

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
  const estoqueRestante =
    produtoSelecionado && quantidadeNumero > 0
      ? produtoSelecionado.estoque - quantidadeNumero
      : produtoSelecionado?.estoque ?? 0

  async function registrarVenda() {
    setMensagem("")

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

    setSalvando(true)

    const novoEstoque = produto.estoque - qtd

    const payload: {
      product_id: number
      quantidade: number
      valor_unitario: number
      valor_total: number
      user_id: string
      customer_id?: number | null
    } = {
      product_id: produto.id,
      quantidade: qtd,
      valor_unitario: Number(produto.preco),
      valor_total: Number(produto.preco) * qtd,
      user_id: user.id,
      customer_id: clienteId ? Number(clienteId) : null,
    }

    const { error: erroVenda } = await supabase.from("sales").insert([payload])

    if (erroVenda) {
      setSalvando(false)
      setMensagem("Erro ao registrar venda.")
      return
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
    setSalvando(false)
    setMensagem("Venda registrada com sucesso.")
    carregarProdutos()
  }

  return (
    <div>
      <h2 className="page-title">Vendas</h2>
      <p className="page-subtitle">
        Registre vendas e baixe o estoque automaticamente.
      </p>

      {mensagem && <p style={{ marginTop: "16px" }}>{mensagem}</p>}

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