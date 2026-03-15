"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

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

    setProdutos(data || [])
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

    const produtoSelecionado = produtos.find((p) => p.id === Number(produtoId))

    if (!produtoSelecionado) {
      setMensagem("Produto não encontrado.")
      return
    }

    const qtd = Number(quantidade)

    if (qtd <= 0) {
      setMensagem("Informe uma quantidade válida.")
      return
    }

    if (qtd > produtoSelecionado.estoque) {
      setMensagem("Estoque insuficiente para essa venda.")
      return
    }

    const valorUnitario = Number(produtoSelecionado.preco)
    const valorTotal = valorUnitario * qtd
    const novoEstoque = produtoSelecionado.estoque - qtd

    const payload: {
      product_id: number
      quantidade: number
      valor_unitario: number
      valor_total: number
      user_id: string
      customer_id?: number | null
    } = {
      product_id: produtoSelecionado.id,
      quantidade: qtd,
      valor_unitario: valorUnitario,
      valor_total: valorTotal,
      user_id: user.id,
      customer_id: clienteId ? Number(clienteId) : null,
    }

    const { error: erroVenda } = await supabase.from("sales").insert([payload])

    if (erroVenda) {
      setMensagem("Erro ao registrar venda.")
      return
    }

    const { error: erroEstoque } = await supabase
      .from("products")
      .update({ estoque: novoEstoque })
      .eq("id", produtoSelecionado.id)
      .eq("user_id", user.id)

    if (erroEstoque) {
      setMensagem("Venda salva, mas houve erro ao atualizar o estoque.")
      return
    }

    setMensagem("Venda registrada com sucesso.")
    setProdutoId("")
    setClienteId("")
    setQuantidade("")
    carregarProdutos()
  }

  return (
    <div>
      <h2>Vendas</h2>
      <p>Registre vendas e baixe o estoque automaticamente.</p>

      <div style={formBox}>
        <h3 style={{ marginTop: 0 }}>Nova venda</h3>

        <div style={grid}>
          <select
            style={input}
            value={produtoId}
            onChange={(e) => setProdutoId(e.target.value)}
          >
            <option value="">Selecione um produto</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome} - {produto.sku} - Estoque: {produto.estoque}
              </option>
            ))}
          </select>

          <select
            style={input}
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Cliente (opcional)</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>

          <input
            style={input}
            type="number"
            placeholder="Quantidade"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>

        <button onClick={registrarVenda} style={botao}>
          Registrar venda
        </button>

        {mensagem && <p style={{ marginTop: "12px" }}>{mensagem}</p>}
      </div>
    </div>
  )
}

const formBox = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
  marginTop: "20px",
  marginBottom: "24px",
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
  marginBottom: "16px",
}

const input = {
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  width: "100%",
}

const botao = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
}