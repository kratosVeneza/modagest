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

      setMensagem("Cliente atualizado com sucesso.")
      limparFormulario()
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

    setMensagem("Cliente cadastrado com sucesso.")
    limparFormulario()
    carregarClientes()
  }

  function editarCliente(cliente: Cliente) {
    setIdEmEdicao(cliente.id)
    setNome(cliente.nome)
    setTelefone(cliente.telefone || "")
    setEmail(cliente.email || "")
    setCidade(cliente.cidade || "")
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
      <h2>Clientes</h2>
      <p>Cadastre e gerencie os clientes da sua loja.</p>

      {mensagem && <p>{mensagem}</p>}

      <div style={formBox}>
        <h3 style={{ marginTop: 0 }}>
          {idEmEdicao ? "Editar cliente" : "Novo cliente"}
        </h3>

        <div style={grid}>
          <input
            style={input}
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            style={input}
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />

          <input
            style={input}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={input}
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
        </div>

        <div style={acoesFormulario}>
          <button onClick={salvarCliente} style={botao}>
            {idEmEdicao ? "Salvar alterações" : "Cadastrar cliente"}
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
          placeholder="Buscar por nome, telefone, email ou cidade"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <span style={contadorResultados}>
          {clientesFiltrados.length} cliente(s)
        </span>
      </div>

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
                  <button onClick={() => editarCliente(cliente)} style={botaoEditar}>
                    Editar
                  </button>
                  <button onClick={() => excluirCliente(cliente.id)} style={botaoExcluir}>
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