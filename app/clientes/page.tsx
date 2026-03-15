"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Cliente = {
  id: number
  nome: string
  telefone: string
  email: string
  cidade: string
  user_id: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [cidade, setCidade] = useState("")
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null)
  const [busca, setBusca] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    carregarClientes()
  }, [])

  async function carregarClientes() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("nome", { ascending: true })

    if (error) {
      setMensagem("Erro ao carregar clientes.")
      return
    }

    setClientes((data ?? []) as Cliente[])
  }

  function limparFormulario() {
    setNome("")
    setTelefone("")
    setEmail("")
    setCidade("")
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

  async function salvarCliente() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!nome.trim()) {
      setMensagem("Informe o nome do cliente.")
      return
    }

    if (idEmEdicao) {
      const { error } = await supabase
        .from("customers")
        .update({
          nome,
          telefone,
          email,
          cidade,
        })
        .eq("id", idEmEdicao)
        .eq("user_id", user.id)

      if (error) {
        setMensagem("Erro ao atualizar cliente.")
        return
      }

      fecharModal()
      carregarClientes()
      return
    }

    const { error } = await supabase.from("customers").insert([
      {
        user_id: user.id,
        nome,
        telefone,
        email,
        cidade,
      },
    ])

    if (error) {
      setMensagem("Erro ao cadastrar cliente.")
      return
    }

    fecharModal()
    carregarClientes()
  }

  function editarCliente(cliente: Cliente) {
    setIdEmEdicao(cliente.id)
    setNome(cliente.nome)
    setTelefone(cliente.telefone || "")
    setEmail(cliente.email || "")
    setCidade(cliente.cidade || "")
    setMensagem("")
    setModalAberto(true)
  }

  async function excluirCliente(id: number) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      setMensagem("Erro ao excluir cliente.")
      return
    }

    if (idEmEdicao === id) {
      limparFormulario()
    }

    setMensagem("Cliente excluído com sucesso.")
    carregarClientes()
  }

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    if (!termo) return clientes

    return clientes.filter((cliente) => {
      return (
        cliente.nome.toLowerCase().includes(termo) ||
        (cliente.telefone || "").toLowerCase().includes(termo) ||
        (cliente.email || "").toLowerCase().includes(termo) ||
        (cliente.cidade || "").toLowerCase().includes(termo)
      )
    })
  }, [clientes, busca])

  return (
    <div>
      <h2 className="page-title">Clientes</h2>
      <p className="page-subtitle">Cadastre e gerencie os clientes da sua loja.</p>

      {mensagem && !modalAberto && <p>{mensagem}</p>}

      <div className="page-actions">
        <button onClick={abrirNovoModal} className="btn btn-primary">
          + Novo cliente
        </button>
      </div>

      <div className="table-toolbar">
        <input
          placeholder="Buscar por nome, telefone, email ou cidade"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ maxWidth: "420px" }}
        />
        <span className="info-muted">{clientesFiltrados.length} cliente(s)</span>
      </div>

      <div className="data-table-wrap">
        <table style={tabela}>
          <thead>
            <tr>
              <th style={th}>Nome</th>
              <th style={th}>Telefone</th>
              <th style={th}>Email</th>
              <th style={th}>Cidade</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {clientesFiltrados.map((cliente) => (
              <tr key={cliente.id}>
                <td style={td}>{cliente.nome}</td>
                <td style={td}>{cliente.telefone || "-"}</td>
                <td style={td}>{cliente.email || "-"}</td>
                <td style={td}>{cliente.cidade || "-"}</td>
                <td style={td}>
                  <div style={acoesTabela}>
                    <button
                      onClick={() => editarCliente(cliente)}
                      className="btn btn-success btn-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluirCliente(cliente.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {clientesFiltrados.length === 0 && (
              <tr>
                <td style={tdVazio} colSpan={5}>
                  Nenhum cliente encontrado.
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
                {idEmEdicao ? "Editar cliente" : "Novo cliente"}
              </h3>

              <button onClick={fecharModal} className="icon-btn">
                ×
              </button>
            </div>

            <div className="modal-body">
              {mensagem && <p style={{ marginTop: 0 }}>{mensagem}</p>}

              <div className="grid-2">
                <input
                  placeholder="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />

                <input
                  placeholder="Telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />

                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  placeholder="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={fecharModal} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={salvarCliente} className="btn btn-primary">
                {idEmEdicao ? "Salvar alterações" : "Cadastrar cliente"}
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