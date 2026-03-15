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
  const [modalAberto, setModalAberto] = useState(false)

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

  function abrirNovoModal() {
    limparFormulario()
    setModalAberto(true)
  }

  function fecharModal() {
    limparFormulario()
    setModalAberto(false)
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

      fecharModal()
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

    fecharModal()
    carregarProdutos()
  }

  function editarProduto(produto: Produto) {
    setIdEmEdicao(produto.id)
    setNome(produto.nome)
    setCor(produto.cor)
    setTamanho(produto.tamanho)
    setEstoque(String(produto.estoque))
    setPreco(String(produto.preco))
    setModalAberto(true)
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
      <h2 className="page-title">Produtos</h2>
      <p className="page-subtitle">Cadastro e controle de estoque da loja.</p>

      <div className="page-actions">
        <button onClick={abrirNovoModal} className="btn btn-primary">
          + Novo produto
        </button>
      </div>

      <div className="table-toolbar">
        <input
          className="inputBusca"
          placeholder="Buscar por nome, SKU, cor ou tamanho"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ maxWidth: "420px" }}
        />
        <span className="info-muted">{produtosFiltrados.length} produto(s)</span>
      </div>

      <div className="data-table-wrap">
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
                    <button onClick={() => editarProduto(p)} className="btn btn-success btn-sm">
                      Editar
                    </button>
                    <button onClick={() => excluirProduto(p.id)} className="btn btn-danger btn-sm">
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

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">
                {idEmEdicao ? "Editar produto" : "Novo produto"}
              </h3>

              <button onClick={fecharModal} className="icon-btn">
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="grid-2">
                <input
                  placeholder="Nome do produto"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <input
                  placeholder="Cor"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                />
                <input
                  placeholder="Tamanho"
                  value={tamanho}
                  onChange={(e) => setTamanho(e.target.value)}
                />
                <input
                  placeholder="Estoque"
                  type="number"
                  value={estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                />
                <input
                  placeholder="Preço"
                  type="number"
                  step="0.01"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={fecharModal} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={salvarProduto} className="btn btn-primary">
                {idEmEdicao ? "Salvar alterações" : "Cadastrar produto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const acoesTabela = {
  display: "flex",
  gap: "8px",
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