"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import AnimatedModal from "../../components/AnimatedModal"
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
  marca: string | null
  categoria: string | null
  tipo: string | null
  unidade: string | null
  estoque: number
  user_id: string
  cor: string | null
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
      .select("id, nome, sku, marca, categoria, tipo, unidade, estoque, user_id")
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

  function produtoSelecionadoAtual() {
    return produtos.find((p) => p.id === Number(productId)) || null
  }

  const pedidoEmEdicao = useMemo(() => {
    return pedidos.find((p) => p.id === idEmEdicao) || null
  }, [pedidos, idEmEdicao])

  const bloqueiaCamposEstruturais = Boolean(pedidoEmEdicao?.estoque_lancado)

  async function lancarEstoqueDoPedido({
    userId,
    produtoSelecionado,
    quantidadeNumerica,
  }: {
    userId: string
    produtoSelecionado: Produto
    quantidadeNumerica: number
  }) {
    const novoEstoque = Number(produtoSelecionado.estoque) + quantidadeNumerica

    const { error: erroAtualizarEstoque } = await supabase
      .from("products")
      .update({ estoque: novoEstoque })
      .eq("id", produtoSelecionado.id)
      .eq("user_id", userId)

    if (erroAtualizarEstoque) {
      return { ok: false as const, mensagem: "Houve erro ao lançar no estoque." }
    }

    await registrarMovimentoEstoque({
      productId: produtoSelecionado.id,
      userId,
      tipo: "entrada",
      quantidade: quantidadeNumerica,
      motivo: "Reposição fornecedor",
    })

    return { ok: true as const }
  }

  async function estornarEstoqueDoPedido({
  userId,
  produtoSelecionado,
  quantidadeNumerica,
}: {
  userId: string
  produtoSelecionado: Produto
  quantidadeNumerica: number
}) {
  const estoqueAtual = Number(produtoSelecionado.estoque || 0)
  const novoEstoque = estoqueAtual - quantidadeNumerica

  if (novoEstoque < 0) {
    return {
      ok: false as const,
      mensagem: "Não foi possível estornar o estoque porque o saldo atual ficaria negativo.",
    }
  }

  const { error: erroAtualizarEstoque } = await supabase
    .from("products")
    .update({ estoque: novoEstoque })
    .eq("id", produtoSelecionado.id)
    .eq("user_id", userId)

  if (erroAtualizarEstoque) {
    return {
      ok: false as const,
      mensagem: "Houve erro ao estornar o estoque do pedido.",
    }
  }

  await registrarMovimentoEstoque({
    productId: produtoSelecionado.id,
    userId,
    tipo: "saida",
    quantidade: quantidadeNumerica,
    motivo: "Cancelamento de pedido com estorno",
  })

  return { ok: true as const }
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

    let produtoSelecionado = produtoSelecionadoAtual()

    if (!produtoSelecionado) {
      setMensagem("Produto não encontrado.")
      return
    }

    let nomeProduto = produtoSelecionado.nome
    let quantidadeNumerica = Number(quantidade)

    if (idEmEdicao) {
      const pedidoAtual = pedidos.find((p) => p.id === idEmEdicao)

      if (!pedidoAtual) {
        setMensagem("Pedido não encontrado.")
        return
      }

      if (pedidoAtual.estoque_lancado) {
        const produtoOriginal = produtos.find((p) => p.id === pedidoAtual.product_id)

        if (produtoOriginal) {
          produtoSelecionado = produtoOriginal
          nomeProduto = produtoOriginal.nome
        } else {
          nomeProduto = pedidoAtual.produto
        }

        quantidadeNumerica = Number(pedidoAtual.quantidade)
      }

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
        pedidoAtual.status !== "Recebido" &&
        status === "Recebido" &&
        !pedidoAtual.estoque_lancado

      if (podeLancarEstoque) {
        const resultado = await lancarEstoqueDoPedido({
          userId: user.id,
          produtoSelecionado,
          quantidadeNumerica,
        })

        if (!resultado.ok) {
          setMensagem("Pedido atualizado, mas houve erro ao lançar no estoque.")
          await carregarPedidos()
          await carregarProdutos()
          return
        }

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

    const criarJaRecebido = status === "Recebido"

    const { data: pedidoCriado, error } = await supabase
      .from("orders")
      .insert([
        {
          user_id: user.id,
          product_id: produtoSelecionado.id,
          produto: nomeProduto,
          fornecedor,
          quantidade: quantidadeNumerica,
          status,
          estoque_lancado: criarJaRecebido,
        },
      ])
      .select("id")
      .single()

    if (error) {
      setMensagem("Erro ao cadastrar pedido.")
      return
    }

    if (criarJaRecebido) {
      const resultado = await lancarEstoqueDoPedido({
        userId: user.id,
        produtoSelecionado,
        quantidadeNumerica,
      })

      if (!resultado.ok) {
        if (pedidoCriado?.id) {
          await supabase
            .from("orders")
            .update({ estoque_lancado: false })
            .eq("id", pedidoCriado.id)
            .eq("user_id", user.id)
        }

        setMensagem("Pedido cadastrado, mas houve erro ao lançar no estoque.")
        await carregarPedidos()
        await carregarProdutos()
        return
      }
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

  async function cancelarPedido(id: number) {
  setMensagem("")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Você precisa estar logado.")
    return
  }

  const pedido = pedidos.find((p) => p.id === id)

  if (!pedido) {
    setMensagem("Pedido não encontrado.")
    return
  }

  if (pedido.status === "Cancelado") {
    setMensagem("Esse pedido já está cancelado.")
    return
  }

  if (pedido.estoque_lancado) {
    const produtoRelacionado = produtos.find((p) => p.id === pedido.product_id)

    if (!produtoRelacionado) {
      setMensagem("Produto do pedido não encontrado para estorno.")
      return
    }

    const resultado = await estornarEstoqueDoPedido({
      userId: user.id,
      produtoSelecionado: produtoRelacionado,
      quantidadeNumerica: Number(pedido.quantidade),
    })

    if (!resultado.ok) {
      setMensagem(resultado.mensagem)
      return
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status: "Cancelado",
        estoque_lancado: false,
      })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      setMensagem("Estoque estornado, mas houve erro ao cancelar o pedido.")
      return
    }

    setMensagem("Pedido cancelado e estoque estornado com sucesso.")
    await carregarPedidos()
    await carregarProdutos()
    return
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: "Cancelado",
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    setMensagem("Erro ao cancelar pedido.")
    return
  }

  setMensagem("Pedido cancelado com sucesso.")
  await carregarPedidos()
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

  const pedido = pedidos.find((p) => p.id === id)

  if (!pedido) {
    setMensagem("Pedido não encontrado.")
    return
  }

  if (pedido.estoque_lancado) {
    setMensagem("Não é possível excluir um pedido que ainda está com estoque lançado. Cancele o pedido primeiro.")
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

  function produtoDoPedido(pedido: Pedido) {
    if (pedido.product_id) {
      const produtoRelacionado = produtos.find((p) => p.id === pedido.product_id)
      if (produtoRelacionado) return produtoRelacionado
    }
    return null
  }

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return pedidos.filter((pedido) => {
      const produtoRelacionado = produtoDoPedido(pedido)

      const textoProduto = [
        produtoRelacionado?.nome,
        produtoRelacionado?.sku,
        produtoRelacionado?.marca,
        produtoRelacionado?.categoria,
        produtoRelacionado?.tipo,
        pedido.produto,
        pedido.fornecedor,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      const passouBusca = !termo || textoProduto.includes(termo)
      const passouStatus =
        filtroStatus === "Todos" || pedido.status === filtroStatus

      return passouBusca && passouStatus
    })
  }, [pedidos, busca, filtroStatus, produtos])

  return (
    <div>
      <h2 className="page-title">Pedidos</h2>
      <p className="page-subtitle">
  Controle de reposição e pedidos ao fornecedor. Pedidos já lançados no estoque podem ser cancelados com estorno automático.
</p>


      {mensagem && !modalAberto && <p>{mensagem}</p>}

      <div className="page-actions">
        <button onClick={abrirNovoModal} className="btn btn-primary">
          + Novo pedido
        </button>
      </div>

      <div className="table-toolbar">
        <input
          placeholder="Buscar por produto, marca, categoria, tipo ou fornecedor"
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
              <th style={th}>Detalhes</th>
              <th style={th}>Fornecedor</th>
              <th style={th}>Quantidade</th>
              <th style={th}>Status</th>
              <th style={th}>Estoque lançado</th>
              <th style={th}>Data</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {pedidosFiltrados.map((pedido) => {
              const produtoRelacionado = produtoDoPedido(pedido)

              return (
                <tr key={pedido.id}>
                  <td style={td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <strong>{produtoRelacionado?.nome || pedido.produto}</strong>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {produtoRelacionado?.sku || "-"}
                      </span>
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span>{produtoRelacionado?.marca || "-"}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {[produtoRelacionado?.categoria, produtoRelacionado?.tipo, produtoRelacionado?.unidade]
                          .filter(Boolean)
                          .join(" • ") || "-"}
                      </span>
                    </div>
                  </td>
                  <td style={td}>{pedido.fornecedor || "-"}</td>
                  <td style={td}>
                    {pedido.quantidade} {produtoRelacionado?.unidade || "un"}
                  </td>
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

    {pedido.status !== "Cancelado" && (
      <button
        onClick={() => cancelarPedido(pedido.id)}
        className="btn btn-secondary btn-sm"
      >
        Cancelar
      </button>
    )}

    <button
      onClick={() => excluirPedido(pedido.id)}
      className="btn btn-danger btn-sm"
    >
      Excluir
    </button>
  </div>
</td>
                </tr>
              )
            })}

            {pedidosFiltrados.length === 0 && (
              <tr>
                <td style={tdVazio} colSpan={8}>
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
            <select
  value={productId}
  onChange={(e) => setProductId(e.target.value)}
  disabled={bloqueiaCamposEstruturais}
>
  <option value="">Selecione um produto</option>

  {produtos.map((produto) => {
    const detalhes = [
      produto.marca,
      produto.categoria,
      produto.tipo,
      produto.unidade,
    ]
      .filter(Boolean)
      .join(" • ")

    return (
      <option key={produto.id} value={produto.id}>
        {produto.nome}
        {produto.sku ? ` • ${produto.sku}` : ""}
        {detalhes ? ` • ${detalhes}` : ""}
      </option>
    )
  })}
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
              disabled={bloqueiaCamposEstruturais}
            />

            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Pendente">Pendente</option>
              <option value="Encomendado">Encomendado</option>
              <option value="Enviado">Enviado</option>
              <option value="Recebido">Recebido</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {productId && (
            <div style={{ marginTop: 16, fontSize: 14, color: "#6b7280" }}>
              Produto selecionado:{" "}
              <strong style={{ color: "inherit" }}>
                {produtoSelecionadoAtual()?.nome}
              </strong>
              {" • "}
              {[produtoSelecionadoAtual()?.marca, produtoSelecionadoAtual()?.categoria, produtoSelecionadoAtual()?.tipo]
                .filter(Boolean)
                .join(" • ")}
            </div>
          )}

          {status === "Recebido" && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#ecfdf5",
                color: "#065f46",
                fontSize: 14,
              }}
            >
              Ao salvar com status <strong>Recebido</strong>, o estoque será lançado imediatamente.
            </div>
          )}

          {bloqueiaCamposEstruturais && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#fff7ed",
                color: "#9a3412",
                fontSize: 14,
              }}
            >
              Este pedido já lançou estoque. Produto e quantidade foram bloqueados para evitar inconsistência.
            </div>
          )}

          {pedidoEmEdicao?.estoque_lancado && pedidoEmEdicao?.status !== "Cancelado" && (
  <div
    style={{
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 10,
      background: "#eff6ff",
      color: "#1d4ed8",
      fontSize: 14,
    }}
  >
    Se este pedido for cancelado, o sistema estornará automaticamente a quantidade lançada no estoque.
  </div>
)}
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
  verticalAlign: "top" as const,
}

const tdVazio = {
  borderBottom: "1px solid #e5e7eb",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
}