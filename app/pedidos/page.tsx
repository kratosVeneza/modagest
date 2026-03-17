"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import AnimatedModal from "../components/AnimatedModal"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"

type Pedido = {
  id: number
  product_id: number | null
  produto: string
  fornecedor: string
  quantidade: number
  status: string
  estoque_lancado: boolean
  created_at: string
}

type Produto = {
  id: number
  nome: string
  sku: string
  estoque: number
  user_id: string
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [productId, setProductId] = useState("")
  const [fornecedor, setFornecedor] = useState("")
  const [quantidade, setQuantidade] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null)
  const [status, setStatus] = useState("Pendente")

  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("Todos")
  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    carregarPedidos()
    carregarProdutos()
  }, [])

  async function carregarPedidos() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      setMensagem("Erro ao carregar pedidos.")
      return
    }

    setPedidos((data ?? []) as Pedido[])
  }

  async function carregarProdutos() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from("products")
      .select("id, nome, sku, estoque, user_id")
      .eq("user_id", user.id)
      .order("nome", { ascending: true })

    if (!error) {
      setProdutos((data ?? []) as Produto[])
    }
  }

  function limparFormulario() {
    setProductId("")
    setFornecedor("")
    setQuantidade("")
    setStatus("Pendente")
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

  async function salvarPedido() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!productId || !quantidade) {
      setMensagem("Selecione um produto e informe a quantidade.")
      return
    }

    if (Number(quantidade) <= 0) {
      setMensagem("Informe uma quantidade válida.")
      return
    }

    const produtoSelecionado = produtos.find((p) => p.id === Number(productId))

    if (!produtoSelecionado) {
      setMensagem("Produto não encontrado.")
      return
    }

    const nomeProduto = produtoSelecionado.nome
    const quantidadeNumerica = Number(quantidade)

    if (idEmEdicao) {
      const pedidoAtual = pedidos.find((p) => p.id === idEmEdicao)

      const { error } = await supabase
        .from("orders")
        .update({
          product_id: produtoSelecionado.id,
          produto: nomeProduto,
          fornecedor,
          quantidade: quantidadeNumerica,
          status,
        })
        .eq("id", idEmEdicao)
        .eq("user_id", user.id)

      if (error) {
        setMensagem("Erro ao atualizar pedido.")
        return
      }

      const podeLancarEstoque =
        pedidoAtual &&
        pedidoAtual.status !== "Recebido" &&
        status === "Recebido" &&
        !pedidoAtual.estoque_lancado

      if (podeLancarEstoque) {
        const novoEstoque = Number(produtoSelecionado.estoque) + quantidadeNumerica

        const { error: erroAtualizarEstoque } = await supabase
          .from("products")
          .update({ estoque: novoEstoque })
          .eq("id", produtoSelecionado.id)
          .eq("user_id", user.id)

        if (erroAtualizarEstoque) {
          setMensagem("Pedido atualizado, mas houve erro ao lançar no estoque.")
          await carregarPedidos()
          await carregarProdutos()
          return
        }

        await registrarMovimentoEstoque({
          productId: produtoSelecionado.id,
          userId: user.id,
          tipo: "entrada",
          quantidade: quantidadeNumerica,
          motivo: "Reposição fornecedor",
        })

        const { error: erroMarcarLancado } = await supabase
          .from("orders")
          .update({ estoque_lancado: true })
          .eq("id", idEmEdicao)
          .eq("user_id", user.id)

        if (erroMarcarLancado) {
          setMensagem("Estoque atualizado, mas houve erro ao marcar o pedido.")
          await carregarPedidos()
          await carregarProdutos()
          return
        }

        fecharModal()
        await carregarPedidos()
        await carregarProdutos()
        return
      }

      fecharModal()
      await carregarPedidos()
      await carregarProdutos()
      return
    }

    const { error } = await supabase.from("orders").insert([
      {
        user_id: user.id,
        product_id: produtoSelecionado.id,
        produto: nomeProduto,
        fornecedor,
        quantidade: quantidadeNumerica,
        status,
      },
    ])

    if (error) {
      setMensagem("Erro ao cadastrar pedido.")
      return
    }

    fecharModal()
    await carregarPedidos()
    await carregarProdutos()
  }

  function editarPedido(pedido: Pedido) {
    setIdEmEdicao(pedido.id)
    setProductId(pedido.product_id ? String(pedido.product_id) : "")
    setFornecedor(pedido.fornecedor || "")
    setQuantidade(String(pedido.quantidade))
    setStatus(pedido.status)
    setMensagem("")
    setModalAberto(true)
  }

  async function excluirPedido(id: number) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      setMensagem("Erro ao excluir pedido.")
      return
    }

    if (idEmEdicao === id) {
      limparFormulario()
    }

    setMensagem("Pedido excluído com sucesso.")
    await carregarPedidos()
  }

  function formatarData(dataIso: string) {
    const data = new Date(dataIso)
    return data.toLocaleString("pt-BR")
  }

  function nomeProdutoDoPedido(pedido: Pedido) {
    if (pedido.product_id) {
      const produtoRelacionado = produtos.find((p) => p.id === pedido.product_id)
      if (produtoRelacionado) return produtoRelacionado.nome
    }
    return pedido.produto || "Produto não encontrado"
  }

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return pedidos.filter((pedido) => {
      const nomeProduto = nomeProdutoDoPedido(pedido).toLowerCase()

      const passouBusca =
        !termo ||
        nomeProduto.includes(termo) ||
        (pedido.fornecedor || "").toLowerCase().includes(termo)

      const passouStatus =
        filtroStatus === "Todos" || pedido.status === filtroStatus

      return passouBusca && passouStatus
    })
  }, [pedidos, busca, filtroStatus, produtos])

  return (
    <div>
      <h2 className="page-title">Pedidos</h2>
      <p className="page-subtitle">Controle de reposição e pedidos ao fornecedor.</p>

      {mensagem && !modalAberto && <p>{mensagem}</p>}

      <div className="page-actions">
        <button onClick={abrirNovoModal} className="btn btn-primary">
          + Novo pedido
        </button>
      </div>

      <div className="table-toolbar">
        <input
          placeholder="Buscar por produto ou fornecedor"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ maxWidth: "420px" }}
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          style={{ maxWidth: "220px" }}
        >
          <option value="Todos">Todos os status</option>
          <option value="Pendente">Pendente</option>
          <option value="Encomendado">Encomendado</option>
          <option value="Enviado">Enviado</option>
          <option value="Recebido">Recebido</option>
          <option value="Cancelado">Cancelado</option>
        </select>

        <span className="info-muted">{pedidosFiltrados.length} pedido(s)</span>
      </div>

      <div className="data-table-wrap">
        <table style={tabela}>
          <thead>
            <tr>
              <th style={th}>Produto</th>
              <th style={th}>Fornecedor</th>
              <th style={th}>Quantidade</th>
              <th style={th}>Status</th>
              <th style={th}>Estoque lançado</th>
              <th style={th}>Data</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {pedidosFiltrados.map((pedido) => (
              <tr key={pedido.id}>
                <td style={td}>{nomeProdutoDoPedido(pedido)}</td>
                <td style={td}>{pedido.fornecedor || "-"}</td>
                <td style={td}>{pedido.quantidade}</td>
                <td style={td}>
                  <span
                    className={
                      pedido.status === "Recebido"
                        ? "status-pill status-green"
                        : pedido.status === "Cancelado"
                        ? "status-pill status-red"
                        : pedido.status === "Enviado"
                        ? "status-pill status-blue"
                        : pedido.status === "Encomendado"
                        ? "status-pill status-yellow"
                        : "status-pill status-gray"
                    }
                  >
                    {pedido.status}
                  </span>
                </td>
                <td style={td}>
                  <span
                    className={
                      pedido.estoque_lancado
                        ? "status-pill status-green"
                        : "status-pill status-gray"
                    }
                  >
                    {pedido.estoque_lancado ? "Sim" : "Não"}
                  </span>
                </td>
                <td style={td}>{formatarData(pedido.created_at)}</td>
                <td style={td}>
                  <div style={acoesTabela}>
                    <button
                      onClick={() => editarPedido(pedido)}
                      className="btn btn-success btn-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluirPedido(pedido.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {pedidosFiltrados.length === 0 && (
              <tr>
                <td style={tdVazio} colSpan={7}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatedModal
        open={modalAberto}
        onClose={fecharModal}
        title={idEmEdicao ? "Editar pedido" : "Novo pedido"}
        footer={
          <>
            <button onClick={fecharModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={salvarPedido} className="btn btn-primary">
              {idEmEdicao ? "Salvar alterações" : "Cadastrar pedido"}
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

            <input
              placeholder="Fornecedor"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
            />

            <input
              type="number"
              placeholder="Quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />

            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Pendente">Pendente</option>
              <option value="Encomendado">Encomendado</option>
              <option value="Enviado">Enviado</option>
              <option value="Recebido">Recebido</option>
              <option value="Cancelado">Cancelado</option>
            </select>
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
