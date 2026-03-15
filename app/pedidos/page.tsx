"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import AnimatedModal from "../components/AnimatedModal"

type Pedido = {
  id: number
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
  estoque: number
  user_id: string
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [produto, setProduto] = useState("")
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

  function limparFormulario() {
    setProduto("")
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

    if (!produto || !quantidade) {
      setMensagem("Preencha produto e quantidade.")
      return
    }

    if (Number(quantidade) <= 0) {
      setMensagem("Informe uma quantidade válida.")
      return
    }

    if (idEmEdicao) {
      const pedidoAtual = pedidos.find((p) => p.id === idEmEdicao)

      const { error } = await supabase
        .from("orders")
        .update({
          produto,
          fornecedor,
          quantidade: Number(quantidade),
          status,
        })
        .eq("id", idEmEdicao)
        .eq("user_id", user.id)

      if (error) {
        setMensagem("Erro ao atualizar pedido.")
        return
      }

      if (
        pedidoAtual &&
        pedidoAtual.status !== "Recebido" &&
        status === "Recebido" &&
        !pedidoAtual.estoque_lancado
      ) {
        const { data: produtoBanco, error: erroProduto } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", user.id)
          .ilike("nome", produto)
          .maybeSingle()

        if (erroProduto) {
          setMensagem("Pedido atualizado, mas houve erro ao buscar o produto.")
          carregarPedidos()
          return
        }

        if (!produtoBanco) {
          setMensagem("Pedido atualizado, mas nenhum produto com esse nome foi encontrado.")
          carregarPedidos()
          return
        }

        const produtoTipado = produtoBanco as Produto
        const novoEstoque = Number(produtoTipado.estoque) + Number(quantidade)

        const { error: erroAtualizarEstoque } = await supabase
          .from("products")
          .update({ estoque: novoEstoque })
          .eq("id", produtoTipado.id)
          .eq("user_id", user.id)

        if (erroAtualizarEstoque) {
          setMensagem("Pedido atualizado, mas houve erro ao lançar no estoque.")
          carregarPedidos()
          return
        }

        const { error: erroMarcarLancado } = await supabase
          .from("orders")
          .update({ estoque_lancado: true })
          .eq("id", idEmEdicao)
          .eq("user_id", user.id)

        if (erroMarcarLancado) {
          setMensagem("Estoque atualizado, mas houve erro ao marcar o pedido.")
          carregarPedidos()
          return
        }

        fecharModal()
        carregarPedidos()
        return
      }

      fecharModal()
      carregarPedidos()
      return
    }

    const { error } = await supabase.from("orders").insert([
      {
        user_id: user.id,
        produto,
        fornecedor,
        quantidade: Number(quantidade),
        status,
      },
    ])

    if (error) {
      setMensagem("Erro ao cadastrar pedido.")
      return
    }

    fecharModal()
    carregarPedidos()
  }

  function editarPedido(pedido: Pedido) {
    setIdEmEdicao(pedido.id)
    setProduto(pedido.produto)
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
    carregarPedidos()
  }

  function formatarData(dataIso: string) {
    const data = new Date(dataIso)
    return data.toLocaleString("pt-BR")
  }

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return pedidos.filter((pedido) => {
      const passouBusca =
        !termo ||
        pedido.produto.toLowerCase().includes(termo) ||
        (pedido.fornecedor || "").toLowerCase().includes(termo)

      const passouStatus =
        filtroStatus === "Todos" || pedido.status === filtroStatus

      return passouBusca && passouStatus
    })
  }, [pedidos, busca, filtroStatus])

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
                <td style={td}>{pedido.produto}</td>
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
      <input
        placeholder="Produto"
        value={produto}
        onChange={(e) => setProduto(e.target.value)}
      />

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