"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Produto = {
  id: number
  sku: string
  nome: string
  cor: string
  tamanho: string
  estoque: number
  preco: number
  user_id: string
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [nome, setNome] = useState("")
  const [cor, setCor] = useState("")
  const [tamanho, setTamanho] = useState("")
  const [estoque, setEstoque] = useState("")
  const [preco, setPreco] = useState("")
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null)
  const [busca, setBusca] = useState("")

  useEffect(() => {
    carregarProdutos()
  }, [])

  async function carregarProdutos() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("Você precisa estar logado.")
      return
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false })

    if (error) {
      alert("Erro ao carregar produtos.")
      return
    }

    setProdutos(data || [])
  }

  function gerarSku(nomeProduto: string, corProduto: string, tamanhoProduto: string) {
    const nomeParte = nomeProduto.trim().slice(0, 3).toUpperCase() || "PRO"
    const corParte = corProduto.trim().slice(0, 2).toUpperCase() || "CO"
    const tamanhoParte = tamanhoProduto.trim().toUpperCase() || "U"
    const numero = String(produtos.length + 1).padStart(3, "0")

    return `${nomeParte}-${corParte}-${tamanhoParte}-${numero}`
  }

  function limparFormulario() {
    setNome("")
    setCor("")
    setTamanho("")
    setEstoque("")
    setPreco("")
    setIdEmEdicao(null)
  }

  async function salvarProduto() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("Você precisa estar logado.")
      return
    }

    if (!nome || !cor || !tamanho || !estoque || !preco) {
      alert("Preencha todos os campos.")
      return
    }

    if (idEmEdicao) {
      const { error } = await supabase
        .from("products")
        .update({
          nome,
          cor,
          tamanho,
          estoque: Number(estoque),
          preco: Number(preco),
        })
        .eq("id", idEmEdicao)
        .eq("user_id", user.id)

      if (error) {
        alert("Erro ao atualizar produto.")
        return
      }

      limparFormulario()
      carregarProdutos()
      return
    }

    const { error } = await supabase.from("products").insert([
      {
        sku: gerarSku(nome, cor, tamanho),
        nome,
        cor,
        tamanho,
        estoque: Number(estoque),
        preco: Number(preco),
        user_id: user.id,
      },
    ])

    if (error) {
      alert("Erro ao cadastrar produto.")
      return
    }

    limparFormulario()
    carregarProdutos()
  }

  function editarProduto(produto: Produto) {
    setIdEmEdicao(produto.id)
    setNome(produto.nome)
    setCor(produto.cor)
    setTamanho(produto.tamanho)
    setEstoque(String(produto.estoque))
    setPreco(String(produto.preco))
  }

  async function excluirProduto(id: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("Você precisa estar logado.")
      return
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      alert("Erro ao excluir produto.")
      return
    }

    if (idEmEdicao === id) {
      limparFormulario()
    }

    carregarProdutos()
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    if (!termo) return produtos

    return produtos.filter((p) => {
      return (
        p.nome.toLowerCase().includes(termo) ||
        p.sku.toLowerCase().includes(termo) ||
        p.cor.toLowerCase().includes(termo) ||
        p.tamanho.toLowerCase().includes(termo)
      )
    })
  }, [produtos, busca])

  return (
    <div>
      <h2>Produtos</h2>
      <p>Cadastro e controle de estoque da loja.</p>

      <div style={formBox}>
        <h3 style={{ marginTop: 0 }}>
          {idEmEdicao ? "Editar produto" : "Cadastrar produto"}
        </h3>

        <div style={grid}>
          <input
            style={input}
            placeholder="Nome do produto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            style={input}
            placeholder="Cor"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
          />
          <input
            style={input}
            placeholder="Tamanho"
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
          />
          <input
            style={input}
            placeholder="Estoque"
            type="number"
            value={estoque}
            onChange={(e) => setEstoque(e.target.value)}
          />
          <input
            style={input}
            placeholder="Preço"
            type="number"
            step="0.01"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />
        </div>

        <div style={acoesFormulario}>
          <button onClick={salvarProduto} style={botao}>
            {idEmEdicao ? "Salvar alterações" : "+ Salvar produto"}
          </button>

          {idEmEdicao && (
            <button onClick={limparFormulario} style={botaoCancelar}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div style={buscaBox}>
        <input
          style={inputBusca}
          placeholder="Buscar por nome, SKU, cor ou tamanho"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <span style={contadorResultados}>
          {produtosFiltrados.length} produto(s)
        </span>
      </div>

      <table style={tabela}>
        <thead>
          <tr>
            <th style={th}>SKU</th>
            <th style={th}>Produto</th>
            <th style={th}>Cor</th>
            <th style={th}>Tamanho</th>
            <th style={th}>Estoque</th>
            <th style={th}>Preço</th>
            <th style={th}>Ações</th>
          </tr>
        </thead>

        <tbody>
          {produtosFiltrados.map((p) => (
            <tr key={p.id}>
              <td style={td}>{p.sku}</td>
              <td style={td}>{p.nome}</td>
              <td style={td}>{p.cor}</td>
              <td style={td}>{p.tamanho}</td>
              <td style={td}>{p.estoque}</td>
              <td style={td}>R$ {Number(p.preco).toFixed(2)}</td>
              <td style={td}>
                <div style={acoesTabela}>
                  <button onClick={() => editarProduto(p)} style={botaoEditar}>
                    Editar
                  </button>
                  <button onClick={() => excluirProduto(p.id)} style={botaoExcluir}>
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {produtosFiltrados.length === 0 && (
            <tr>
              <td style={tdVazio} colSpan={7}>
                Nenhum produto encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
}

const acoesFormulario = {
  display: "flex",
  gap: "10px",
}

const acoesTabela = {
  display: "flex",
  gap: "8px",
}

const botao = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
}

const botaoCancelar = {
  padding: "10px 16px",
  background: "#6b7280",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
}

const botaoEditar = {
  background: "#059669",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  cursor: "pointer",
}

const botaoExcluir = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  cursor: "pointer",
}

const buscaBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "16px",
}

const inputBusca = {
  flex: 1,
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
}

const contadorResultados = {
  fontSize: "14px",
  color: "#6b7280",
  whiteSpace: "nowrap" as const,
}

const tabela = {
  width: "100%",
  borderCollapse: "collapse" as const,
}

const th = {
  textAlign: "left" as const,
  borderBottom: "1px solid #d1d5db",
  padding: "12px",
}

const td = {
  borderBottom: "1px solid #e5e7eb",
  padding: "12px",
}

const tdVazio = {
  borderBottom: "1px solid #e5e7eb",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
}