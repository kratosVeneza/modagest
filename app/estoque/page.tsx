"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"
import AnimatedModal from "../components/AnimatedModal"

type Produto = {
  id: number
  nome: string
  sku: string
  marca: string | null
  categoria: string | null
  tipo: string | null
  unidade: string | null
  estoque: number
}

type MovimentoBruto = {
  id: number
  tipo: string
  quantidade: number
  motivo: string | null
  created_at: string
  products:
    | {
        nome: string
        sku: string
        marca: string | null
        categoria: string | null
        tipo: string | null
        unidade: string | null
      }
    | {
        nome: string
        sku: string
        marca: string | null
        categoria: string | null
        tipo: string | null
        unidade: string | null
      }[]
    | null
}

type Movimento = {
  id: number
  tipo: string
  quantidade: number
  motivo: string
  created_at: string
  nomeProduto: string
  skuProduto: string
  marca: string
  categoria: string
  tipoProduto: string
  unidade: string
}

export default function Estoque() {
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")

  const [modalAberto, setModalAberto] = useState(false)
  const [productId, setProductId] = useState("")
  const [tipoAjuste, setTipoAjuste] = useState("entrada")
  const [quantidade, setQuantidade] = useState("")
  const [motivo, setMotivo] = useState("")
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarMovimentos()
    carregarProdutos()
  }, [])

  async function carregarProdutos() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from("products")
      .select("id, nome, sku, marca, categoria, tipo, unidade, estoque")
      .eq("user_id", user.id)
      .order("nome", { ascending: true })

    if (!error) {
      setProdutos((data ?? []) as Produto[])
    }
  }

  async function carregarMovimentos() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        id,
        tipo,
        quantidade,
        motivo,
        created_at,
        products (
          nome,
          sku,
          marca,
          categoria,
          tipo,
          unidade
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      setMensagem("Erro ao carregar movimentações de estoque.")
      return
    }

    const listaFormatada: Movimento[] = ((data ?? []) as MovimentoBruto[]).map((item) => {
      let produto = item.products

      if (Array.isArray(produto)) {
        produto = produto[0] ?? null
      }

      return {
        id: item.id,
        tipo: item.tipo,
        quantidade: item.quantidade,
        motivo: item.motivo || "-",
        created_at: item.created_at,
        nomeProduto: produto?.nome || "Produto removido",
        skuProduto: produto?.sku || "-",
        marca: produto?.marca || "-",
        categoria: produto?.categoria || "-",
        tipoProduto: produto?.tipo || "-",
        unidade: produto?.unidade || "un",
      }
    })

    setMovimentos(listaFormatada)
  }

  function abrirModalAjuste() {
    setProductId("")
    setTipoAjuste("entrada")
    setQuantidade("")
    setMotivo("")
    setMensagem("")
    setModalAberto(true)
  }

  function fecharModalAjuste() {
    setProductId("")
    setTipoAjuste("entrada")
    setQuantidade("")
    setMotivo("")
    setModalAberto(false)
  }

  async function salvarAjuste() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!productId || !quantidade || !motivo.trim()) {
      setMensagem("Selecione o produto, informe a quantidade e o motivo.")
      return
    }

    const qtd = Number(quantidade)

    if (qtd <= 0) {
      setMensagem("Informe uma quantidade válida.")
      return
    }

    const produto = produtos.find((p) => p.id === Number(productId))

    if (!produto) {
      setMensagem("Produto não encontrado.")
      return
    }

    const novoEstoque =
      tipoAjuste === "entrada"
        ? Number(produto.estoque) + qtd
        : Number(produto.estoque) - qtd

    if (novoEstoque < 0) {
      setMensagem("O ajuste deixaria o estoque negativo.")
      return
    }

    setSalvando(true)

    const { error: erroEstoque } = await supabase
      .from("products")
      .update({ estoque: novoEstoque })
      .eq("id", produto.id)
      .eq("user_id", user.id)

    if (erroEstoque) {
      setSalvando(false)
      setMensagem("Erro ao atualizar o estoque.")
      return
    }

    await registrarMovimentoEstoque({
      productId: produto.id,
      userId: user.id,
      tipo: "ajuste",
      quantidade: qtd,
      motivo: `${tipoAjuste === "entrada" ? "Ajuste de entrada" : "Ajuste de saída"} - ${motivo.trim()}`,
    })

    setSalvando(false)
    fecharModalAjuste()
    await carregarProdutos()
    await carregarMovimentos()
    setMensagem("Ajuste de estoque realizado com sucesso.")
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleString("pt-BR")
  }

  function formatarTipo(tipo: string) {
    if (tipo === "entrada") return "Entrada"
    if (tipo === "saida") return "Saída"
    if (tipo === "cancelamento") return "Cancelamento"
    if (tipo === "ajuste") return "Ajuste"
    return tipo
  }

  const movimentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return movimentos.filter((item) => {
      const texto = [
        item.nomeProduto,
        item.skuProduto,
        item.marca,
        item.categoria,
        item.tipoProduto,
        item.motivo,
      ]
        .join(" ")
        .toLowerCase()

      const passouBusca = !termo || texto.includes(termo)
      const passouTipo = filtroTipo === "Todos" || item.tipo === filtroTipo

      return passouBusca && passouTipo
    })
  }, [movimentos, busca, filtroTipo])

  const produtoSelecionado = produtos.find((p) => p.id === Number(productId)) || null

  return (
    <div>
      <h2 className="page-title">Movimentação de Estoque</h2>
      <p className="page-subtitle">
        Histórico de entradas, saídas, cancelamentos e ajustes.
      </p>

      {mensagem && !modalAberto && <p>{mensagem}</p>}

      <div className="page-actions">
        <button onClick={abrirModalAjuste} className="btn btn-primary">
          + Ajuste manual
        </button>
      </div>

      <div className="table-toolbar" style={{ marginTop: 20 }}>
        <input
          placeholder="Buscar por produto, SKU, marca, categoria, tipo ou motivo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ maxWidth: "420px" }}
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{ maxWidth: "220px" }}
        >
          <option value="Todos">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
          <option value="cancelamento">Cancelamento</option>
          <option value="ajuste">Ajuste</option>
        </select>

        <span className="info-muted">{movimentosFiltrados.length} movimentação(ões)</span>
      </div>

      <div className="data-table-wrap">
        <table style={tabela}>
          <thead>
            <tr>
              <th style={th}>Produto</th>
              <th style={th}>Detalhes</th>
              <th style={th}>Tipo</th>
              <th style={th}>Quantidade</th>
              <th style={th}>Motivo</th>
              <th style={th}>Data</th>
            </tr>
          </thead>

          <tbody>
            {movimentosFiltrados.map((m) => (
              <tr key={m.id}>
                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <strong>{m.nomeProduto}</strong>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{m.skuProduto}</span>
                  </div>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span>{m.marca}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {[m.categoria, m.tipoProduto, m.unidade].filter(Boolean).join(" • ")}
                    </span>
                  </div>
                </td>
                <td style={td}>
                  <span
                    className={
                      m.tipo === "entrada"
                        ? "status-pill status-green"
                        : m.tipo === "saida"
                        ? "status-pill status-red"
                        : m.tipo === "cancelamento"
                        ? "status-pill status-blue"
                        : "status-pill status-yellow"
                    }
                  >
                    {formatarTipo(m.tipo)}
                  </span>
                </td>
                <td style={td}>
                  {m.quantidade} {m.unidade}
                </td>
                <td style={td}>{m.motivo}</td>
                <td style={td}>{formatarData(m.created_at)}</td>
              </tr>
            ))}

            {movimentosFiltrados.length === 0 && (
              <tr>
                <td style={tdVazio} colSpan={6}>
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatedModal
        open={modalAberto}
        onClose={fecharModalAjuste}
        title="Ajuste manual de estoque"
        footer={
          <>
            <button onClick={fecharModalAjuste} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={salvarAjuste} className="btn btn-primary" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar ajuste"}
            </button>
          </>
        }
      >
        <>
          {mensagem && <p style={{ marginTop: 0 }}>{mensagem}</p>}

          <div className="grid-2">
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Selecione um produto</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} - {produto.sku}
                </option>
              ))}
            </select>

            <select value={tipoAjuste} onChange={(e) => setTipoAjuste(e.target.value)}>
              <option value="entrada">Ajuste de entrada</option>
              <option value="saida">Ajuste de saída</option>
            </select>

            <input
              type="number"
              placeholder="Quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />

            <input
              placeholder="Motivo do ajuste"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          {produtoSelecionado && (
            <div
              style={{
                marginTop: 16,
                padding: "12px",
                borderRadius: 10,
                background: "#f8fafc",
                fontSize: 14,
              }}
            >
              <strong>{produtoSelecionado.nome}</strong>
              <div style={{ marginTop: 6, color: "#6b7280" }}>
                Estoque atual: {produtoSelecionado.estoque} {produtoSelecionado.unidade || "un"}
              </div>
            </div>
          )}
        </>
      </AnimatedModal>
    </div>
  )
}

const tabela = {
  width: "100%",
  borderCollapse: "collapse" as const,
  marginTop: 20,
}

const th = {
  borderBottom: "1px solid #ddd",
  padding: "10px",
  textAlign: "left" as const,
}

const td = {
  borderBottom: "1px solid #eee",
  padding: "10px",
  verticalAlign: "top" as const,
}

const tdVazio = {
  borderBottom: "1px solid #eee",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
}
