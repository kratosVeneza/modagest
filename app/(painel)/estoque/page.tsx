"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import AnimatedModal from "../../components/AnimatedModal"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"

type Produto = {
  id: number
  nome: string
  sku: string
  marca: string | null
  categoria: string | null
  tipo: string | null
  cor: string | null
  tamanho: string | null
  unidade: string | null
  estoque: number
}

type MovimentoBruto = {
  id: number
  product_id: number
  tipo: string
  origem: string | null
  referencia_id: number | null
  quantidade: number
  motivo: string | null
  created_at: string
  estoque_apos: number | null
  product_nome: string | null
  product_sku: string | null
  product_marca: string | null
  product_categoria: string | null
  product_tipo: string | null
  product_cor: string | null
  product_tamanho: string | null
  product_unidade: string | null
}

type Movimento = {
  id: number
  tipo: string
  origem: string | null
  referenciaId: number | null
  quantidade: number
  motivo: string
  created_at: string
  nomeProduto: string
  skuProduto: string
  marca: string
  categoria: string
  tipoProduto: string
  cor: string
  tamanho: string
  unidade: string
  estoqueApos: number | null
}

export default function Estoque() {
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [filtroOrigem, setFiltroOrigem] = useState("Todos")

  const [modalAberto, setModalAberto] = useState(false)
  const [productId, setProductId] = useState("")
  const [tipoAjuste, setTipoAjuste] = useState("entrada")
  const [quantidade, setQuantidade] = useState("")
  const [motivo, setMotivo] = useState("")
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarProdutos()
    carregarMovimentos()
  }, [])

  async function carregarProdutos() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from("products")
      .select("id, nome, sku, marca, categoria, tipo, cor, tamanho, unidade, estoque")
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

    const { data: movimentosData, error: errorMovimentos } = await supabase
      .from("stock_movements")
      .select(`
        id,
        product_id,
        tipo,
        origem,
        referencia_id,
        quantidade,
        motivo,
        created_at,
        estoque_apos,
        product_nome,
        product_sku,
        product_marca,
        product_categoria,
        product_tipo,
        product_cor,
        product_tamanho,
        product_unidade
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (errorMovimentos) {
      console.log("ERRO AO CARREGAR MOVIMENTOS:", errorMovimentos)
      setMensagem("Erro ao carregar movimentações de estoque.")
      return
    }

    const { data: produtosData, error: errorProdutos } = await supabase
      .from("products")
      .select("id, nome, sku, marca, categoria, tipo, cor, tamanho, unidade, estoque")
      .eq("user_id", user.id)

    if (errorProdutos) {
      console.log("ERRO AO CARREGAR PRODUTOS DOS MOVIMENTOS:", errorProdutos)
      setMensagem("Erro ao carregar os produtos relacionados ao estoque.")
      return
    }

    const mapaProdutos = new Map<number, Produto>()
    ;((produtosData ?? []) as Produto[]).forEach((produto) => {
      mapaProdutos.set(produto.id, produto)
    })

    const listaFormatada: Movimento[] = ((movimentosData ?? []) as MovimentoBruto[]).map(
      (item) => {
        const produtoAtual = mapaProdutos.get(item.product_id)

        return {
          id: item.id,
          tipo: item.tipo,
          origem: item.origem,
          referenciaId: item.referencia_id,
          quantidade: item.quantidade,
          motivo: item.motivo || "-",
          created_at: item.created_at,

          nomeProduto:
            item.product_nome ||
            produtoAtual?.nome ||
            "Produto removido",

          skuProduto:
            item.product_sku ||
            produtoAtual?.sku ||
            "-",

          marca:
            item.product_marca ||
            produtoAtual?.marca ||
            "-",

          categoria:
            item.product_categoria ||
            produtoAtual?.categoria ||
            "-",

          tipoProduto:
            item.product_tipo ||
            produtoAtual?.tipo ||
            "-",

          cor:
            item.product_cor ||
            produtoAtual?.cor ||
            "-",

          tamanho:
            item.product_tamanho ||
            produtoAtual?.tamanho ||
            "-",

          unidade:
            item.product_unidade ||
            produtoAtual?.unidade ||
            "un",

          estoqueApos:
  item.estoque_apos !== null && item.estoque_apos !== undefined
    ? Number(item.estoque_apos)
    : null,
        }
      }
    )

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
  motivo: `Ajuste manual (${tipoAjuste}) - ${motivo.trim()}`,
  origem: "manual",
  estoqueApos: novoEstoque,
  productSnapshot: {
    nome: produto.nome,
    sku: produto.sku,
    marca: produto.marca,
    categoria: produto.categoria,
    tipo: produto.tipo,
    cor: produto.cor,
    tamanho: produto.tamanho,
    unidade: produto.unidade,
  },
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

  function formatarOrigem(origem: string | null) {
    if (!origem) return "-"
    if (origem === "manual") return "Manual"
    if (origem === "venda") return "Venda"
    if (origem === "importacao") return "Importação"
    if (origem === "ia") return "IA 🤖"
    return origem
  }

  function classeTipo(tipo: string) {
    if (tipo === "entrada") return "status-pill status-green"
    if (tipo === "saida") return "status-pill status-red"
    if (tipo === "cancelamento") return "status-pill status-blue"
    if (tipo === "ajuste") return "status-pill status-yellow"
    return "status-pill status-gray"
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
        item.cor,
        item.tamanho,
        item.motivo,
        item.origem || "",
      ]
        .join(" ")
        .toLowerCase()

      const passouBusca = !termo || texto.includes(termo)
      const passouTipo = filtroTipo === "Todos" || item.tipo === filtroTipo
      const passouOrigem = filtroOrigem === "Todos" || item.origem === filtroOrigem

      return passouBusca && passouTipo && passouOrigem
    })
  }, [movimentos, busca, filtroTipo, filtroOrigem])

  const produtoSelecionado =
    produtos.find((p) => p.id === Number(productId)) || null

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
          placeholder="Buscar por produto, SKU, marca, categoria, tipo, cor, tamanho, origem ou motivo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ maxWidth: "460px" }}
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

        <select
          value={filtroOrigem}
          onChange={(e) => setFiltroOrigem(e.target.value)}
          style={{ maxWidth: "220px" }}
        >
          <option value="Todos">Todas as origens</option>
          <option value="manual">Manual</option>
          <option value="venda">Venda</option>
          <option value="importacao">Importação</option>
          <option value="ia">IA</option>
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
              <th style={th}>Origem</th>
              <th style={th}>Quantidade</th>
              <th style={th}>Estoque após</th>
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
                      {[m.categoria, m.tipoProduto, m.cor, m.tamanho, m.unidade]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </div>
                </td>

                <td style={td}>
                  <span className={classeTipo(m.tipo)}>
                    {formatarTipo(m.tipo)}
                  </span>
                </td>

                <td style={td}>{formatarOrigem(m.origem)}</td>

                <td style={td}>
                  {m.tipo === "entrada" || (m.tipo === "ajuste" && m.motivo.toLowerCase().includes("(entrada)"))
                    ? "+"
                    : m.tipo === "saida" || (m.tipo === "ajuste" && m.motivo.toLowerCase().includes("(saida)"))
                    ? "-"
                    : ""}
                  {m.quantidade} {m.unidade}
                </td>

                <td style={td}>
  {m.estoqueApos !== null ? `${m.estoqueApos} ${m.unidade}` : "Não registrado"}
</td>

                <td style={td}>{m.motivo}</td>

                <td style={td}>{formatarData(m.created_at)}</td>
              </tr>
            ))}

            {movimentosFiltrados.length === 0 && (
              <tr>
                <td style={tdVazio} colSpan={8}>
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
                {[produtoSelecionado.sku, produtoSelecionado.marca, produtoSelecionado.categoria, produtoSelecionado.tipo, produtoSelecionado.cor, produtoSelecionado.tamanho]
                  .filter(Boolean)
                  .join(" • ")}
              </div>

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