"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import AnimatedModal from "../components/AnimatedModal"
import TableSkeleton from "../components/TableSkeleton"

type Produto = {
  id: number
  sku: string
  nome: string
  marca: string | null
  categoria: string | null
  tipo: string | null
  unidade: string | null
  cor: string | null
  tamanho: string | null
  estoque: number
  custo: number
  preco: number
  user_id: string
}

const categorias = [
  "Roupas",
  "Calçados",
  "Acessórios",
  "Suplementos",
  "Equipamentos",
]

const unidades = ["un", "par", "caixa", "sachê", "kit"]

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [nome, setNome] = useState("")
  const [marca, setMarca] = useState("")
  const [categoria, setCategoria] = useState("")
  const [tipo, setTipo] = useState("")
  const [unidade, setUnidade] = useState("un")
  const [cor, setCor] = useState("")
  const [tamanho, setTamanho] = useState("")
  const [estoque, setEstoque] = useState("")
  const [custo, setCusto] = useState("")
  const [preco, setPreco] = useState("")
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null)
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarProdutos()
  }, [])

  async function carregarProdutos() {
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

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false })

    if (error) {
      setMensagem("Erro ao carregar produtos.")
      setCarregando(false)
      return
    }

    setProdutos((data ?? []) as Produto[])
    setCarregando(false)
  }

  function gerarSku(
    nomeProduto: string,
    categoriaProduto: string,
    tipoProduto: string
  ) {
    const nomeParte = nomeProduto.trim().slice(0, 3).toUpperCase() || "PRO"
    const categoriaParte =
      categoriaProduto.trim().slice(0, 2).toUpperCase() || "CT"
    const tipoParte = tipoProduto.trim().slice(0, 2).toUpperCase() || "TP"
    const numero = String(produtos.length + 1).padStart(3, "0")

    return `${nomeParte}-${categoriaParte}-${tipoParte}-${numero}`
  }

  function limparFormulario() {
    setNome("")
    setMarca("")
    setCategoria("")
    setTipo("")
    setUnidade("un")
    setCor("")
    setTamanho("")
    setEstoque("")
    setCusto("")
    setPreco("")
    setIdEmEdicao(null)
  }

  function abrirNovoModal() {
    limparFormulario()
    setMensagem("")
    setModalAberto(true)
  }

  function fecharModal() {
    limparFormulario()
    setMensagem("")
    setModalAberto(false)
  }

  async function salvarProduto() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!nome || !categoria || !tipo || !estoque || !preco || !custo) {
      setMensagem("Preencha nome, categoria, tipo, estoque, custo e preço.")
      return
    }

    if (Number(preco) < Number(custo)) {
      setMensagem("O preço de venda não deve ser menor que o custo.")
      return
    }

    if (idEmEdicao) {
      const { error } = await supabase
        .from("products")
        .update({
          nome,
          marca: marca || null,
          categoria,
          tipo,
          unidade,
          cor: cor || null,
          tamanho: tamanho || null,
          estoque: Number(estoque),
          custo: Number(custo),
          preco: Number(preco),
        })
        .eq("id", idEmEdicao)
        .eq("user_id", user.id)

      if (error) {
        setMensagem("Erro ao atualizar produto.")
        return
      }

      fecharModal()
      await carregarProdutos()
      return
    }

    const { error } = await supabase.from("products").insert([
      {
        sku: gerarSku(nome, categoria, tipo),
        nome,
        marca: marca || null,
        categoria,
        tipo,
        unidade,
        cor: cor || null,
        tamanho: tamanho || null,
        estoque: Number(estoque),
        custo: Number(custo),
        preco: Number(preco),
        user_id: user.id,
      },
    ])

    if (error) {
      setMensagem("Erro ao cadastrar produto.")
      return
    }

    fecharModal()
    await carregarProdutos()
  }

  function editarProduto(produto: Produto) {
    setIdEmEdicao(produto.id)
    setNome(produto.nome)
    setMarca(produto.marca || "")
    setCategoria(produto.categoria || "")
    setTipo(produto.tipo || "")
    setUnidade(produto.unidade || "un")
    setCor(produto.cor || "")
    setTamanho(produto.tamanho || "")
    setEstoque(String(produto.estoque))
    setCusto(String(produto.custo ?? 0))
    setPreco(String(produto.preco))
    setModalAberto(true)
  }

  async function excluirProduto(id: number) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      setMensagem("Erro ao excluir produto.")
      return
    }

    await carregarProdutos()
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    if (!termo) return produtos

    return produtos.filter((p) => {
      return (
        p.nome.toLowerCase().includes(termo) ||
        p.sku.toLowerCase().includes(termo) ||
        (p.marca || "").toLowerCase().includes(termo) ||
        (p.categoria || "").toLowerCase().includes(termo) ||
        (p.tipo || "").toLowerCase().includes(termo) ||
        (p.cor || "").toLowerCase().includes(termo) ||
        (p.tamanho || "").toLowerCase().includes(termo)
      )
    })
  }, [produtos, busca])

  return (
    <div>
      <h2 className="page-title">Produtos</h2>
      <p className="page-subtitle">
        Cadastro e controle de produtos, marcas, categorias, custo e estoque.
      </p>

      {mensagem && !modalAberto && <p style={{ marginTop: 16 }}>{mensagem}</p>}

      <div className="page-actions">
        <button onClick={abrirNovoModal} className="btn btn-primary">
          + Novo produto
        </button>
      </div>

      <div className="table-toolbar">
        <input
          placeholder="Buscar por nome, SKU, marca, categoria ou tipo"
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
              <th style={th}>Marca</th>
              <th style={th}>Categoria</th>
              <th style={th}>Tipo</th>
              <th style={th}>Unidade</th>
              <th style={th}>Estoque</th>
              <th style={th}>Custo</th>
              <th style={th}>Preço</th>
              <th style={th}>Lucro</th>
              <th style={th}>Margem</th>
              <th style={th}>Markup</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {carregando ? (
              <TableSkeleton rows={6} cols={13} />
            ) : produtosFiltrados.length > 0 ? (
              produtosFiltrados.map((p) => {
                const preco = Number(p.preco)
                const custo = Number(p.custo || 0)
                const lucro = preco - custo
                const margem = preco > 0 ? (lucro / preco) * 100 : 0
                const markup = custo > 0 ? (lucro / custo) * 100 : 0

                return (
                  <tr key={p.id}>
                    <td style={td}>{p.sku}</td>
                    <td style={td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <strong>{p.nome}</strong>
                        {(p.cor || p.tamanho) && (
                          <span style={{ fontSize: 12, color: "#6b7280" }}>
                            {[p.cor, p.tamanho].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={td}>{p.marca || "-"}</td>
                    <td style={td}>{p.categoria || "-"}</td>
                    <td style={td}>{p.tipo || "-"}</td>
                    <td style={td}>{p.unidade || "-"}</td>
                    <td style={td}>{p.estoque}</td>
                    <td style={td}>R$ {custo.toFixed(2)}</td>
                    <td style={td}>R$ {preco.toFixed(2)}</td>
                    <td style={td}>R$ {lucro.toFixed(2)}</td>
                    <td style={td}>{margem.toFixed(1)}%</td>
                    <td style={td}>{markup.toFixed(1)}%</td>
                    <td style={td}>
                      <div style={acoesTabela}>
                        <button
                          onClick={() => editarProduto(p)}
                          className="btn btn-success btn-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => excluirProduto(p.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td style={tdVazio} colSpan={13}>
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatedModal
        open={modalAberto}
        onClose={fecharModal}
        title={idEmEdicao ? "Editar produto" : "Novo produto"}
        footer={
          <>
            <button onClick={fecharModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={salvarProduto} className="btn btn-primary">
              {idEmEdicao ? "Salvar alterações" : "Cadastrar produto"}
            </button>
          </>
        }
      >
        <>
          {mensagem && <p style={{ marginTop: 0 }}>{mensagem}</p>}

          <div className="grid-2">
            <input
              placeholder="Nome do produto"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              placeholder="Marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
            />

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">Selecione a categoria</option>
              {categorias.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              placeholder="Tipo do produto"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            />

            <select value={unidade} onChange={(e) => setUnidade(e.target.value)}>
              {unidades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              placeholder="Estoque"
              type="number"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
            />

            <input
              placeholder="Custo"
              type="number"
              step="0.01"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
            />

            <input
              placeholder="Preço de venda"
              type="number"
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
            />

            <input
              placeholder="Cor (opcional)"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
            />

            <input
              placeholder="Tamanho (opcional)"
              value={tamanho}
              onChange={(e) => setTamanho(e.target.value)}
            />
          </div>
        </>
      </AnimatedModal>
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
