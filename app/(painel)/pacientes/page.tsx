"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Patient = {
  id: number
  nome: string
  telefone: string | null
  email: string | null
  data_nascimento: string | null
  data_inicio: string
  dia_base_pagamento: number | null
  valor_mensal: number | null
  observacoes: string | null
  ativo: boolean
  created_at: string
}

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function calcularProximoPagamento(dataInicio: string, diaBasePagamento?: number | null) {
  if (!dataInicio) return "-"

  const hoje = new Date()
  const base = diaBasePagamento || new Date(dataInicio).getDate()

  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()

  let proximo = new Date(ano, mes, base, 12, 0, 0)

  if (proximo < hoje) {
    proximo = new Date(ano, mes + 1, base, 12, 0, 0)
  }

  return proximo.toLocaleDateString("pt-BR")
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Patient[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")

  const [idEdicao, setIdEdicao] = useState<number | null>(null)
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [dataInicio, setDataInicio] = useState(hojeInputDate())
  const [diaBasePagamento, setDiaBasePagamento] = useState("")
  const [valorMensal, setValorMensal] = useState("")
  const [observacoes, setObservacoes] = useState("")

  useEffect(() => {
    carregarPacientes()
  }, [])

  async function carregarPacientes() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      setMensagem("Erro ao carregar pacientes.")
      return
    }

    setPacientes((data ?? []) as Patient[])
  }

    async function salvarPaciente() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!nome.trim()) {
      setMensagem("Informe o nome do aluno/paciente.")
      return
    }

    if (idEdicao) {
      const { error } = await supabase
        .from("patients")
        .update({
          nome: nome.trim(),
          telefone: telefone || null,
          email: email || null,
          data_nascimento: dataNascimento || null,
          data_inicio: dataInicio,
          dia_base_pagamento: diaBasePagamento ? Number(diaBasePagamento) : null,
          valor_mensal: valorMensal ? Number(valorMensal) : 0,
          observacoes: observacoes || null,
        })
        .eq("id", idEdicao)
        .eq("user_id", user.id)

      if (error) {
        setMensagem(error.message || "Erro ao editar aluno/paciente.")
        return
      }

      limparFormulario()
      setMensagem("Aluno/Paciente atualizado com sucesso.")
      await carregarPacientes()
      return
    }

    const { error } = await supabase.from("patients").insert([
      {
        user_id: user.id,
        nome: nome.trim(),
        telefone: telefone || null,
        email: email || null,
        data_nascimento: dataNascimento || null,
        data_inicio: dataInicio,
        dia_base_pagamento: diaBasePagamento ? Number(diaBasePagamento) : null,
        valor_mensal: valorMensal ? Number(valorMensal) : 0,
        observacoes: observacoes || null,
        ativo: true,
      },
    ])

    if (error) {
      setMensagem(error.message || "Erro ao cadastrar aluno/paciente.")
      return
    }

    limparFormulario()
    setMensagem("Aluno/Paciente cadastrado com sucesso.")
    await carregarPacientes()
  }

    function limparFormulario() {
    setIdEdicao(null)
    setNome("")
    setTelefone("")
    setEmail("")
    setDataNascimento("")
    setDataInicio(hojeInputDate())
    setDiaBasePagamento("")
    setValorMensal("")
    setObservacoes("")
  }

  function editarPaciente(paciente: Patient) {
    setIdEdicao(paciente.id)
    setNome(paciente.nome)
    setTelefone(paciente.telefone || "")
    setEmail(paciente.email || "")
    setDataNascimento(paciente.data_nascimento || "")
    setDataInicio(paciente.data_inicio || hojeInputDate())
    setDiaBasePagamento(
      paciente.dia_base_pagamento ? String(paciente.dia_base_pagamento) : ""
    )
    setValorMensal(
      paciente.valor_mensal !== null && paciente.valor_mensal !== undefined
        ? String(paciente.valor_mensal)
        : ""
    )
    setObservacoes(paciente.observacoes || "")
  }

  async function alternarStatusPaciente(paciente: Patient) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const novoStatus = !paciente.ativo

    const { error } = await supabase
      .from("patients")
      .update({
        ativo: novoStatus,
        data_inicio: novoStatus ? dataInicio : paciente.data_inicio,
        dia_base_pagamento: novoStatus
          ? diaBasePagamento
            ? Number(diaBasePagamento)
            : paciente.dia_base_pagamento
          : paciente.dia_base_pagamento,
        valor_mensal: novoStatus
          ? valorMensal
            ? Number(valorMensal)
            : paciente.valor_mensal
          : paciente.valor_mensal,
      })
      .eq("id", paciente.id)
      .eq("user_id", user.id)

    if (error) {
      setMensagem(error.message || "Erro ao alterar status.")
      return
    }

    setMensagem(
      novoStatus
        ? "Aluno/Paciente reativado com sucesso."
        : "Aluno/Paciente inativado com sucesso."
    )
    await carregarPacientes()
  }

  async function excluirPaciente(id: number) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      setMensagem(error.message || "Erro ao excluir aluno/paciente.")
      return
    }

    if (idEdicao === id) {
      limparFormulario()
    }

    setMensagem("Aluno/Paciente excluído com sucesso.")
    await carregarPacientes()
  }

  const pacientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return pacientes

    return pacientes.filter((p) => {
      return (
        p.nome.toLowerCase().includes(termo) ||
        (p.telefone || "").toLowerCase().includes(termo) ||
        (p.email || "").toLowerCase().includes(termo)
      )
    })
  }, [pacientes, busca])

  return (
    <div>
        <h2 className="page-title">Alunos/Pacientes</h2>
      <p className="page-subtitle">
        Cadastre alunos/pacientes, acompanhe status, data de entrada, retorno e próximo pagamento.
      </p>

      {mensagem && <p>{mensagem}</p>}

      <div className="section-card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 12 }}>
          {idEdicao ? "Editar aluno/paciente" : "Novo aluno/paciente"}
        </h3>

        <div className="grid-2">
          <div>
            <label>Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div>
            <label>Telefone</label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>

          <div>
            <label>E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <label>Data de nascimento</label>
            <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
          </div>

          <div>
            <label>Data de entrada</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>

          <div>
            <label>Dia base do pagamento</label>
            <input
              type="number"
              min="1"
              max="31"
              value={diaBasePagamento}
              onChange={(e) => setDiaBasePagamento(e.target.value)}
              placeholder="Ex.: 10"
            />
          </div>

          <div>
            <label>Valor mensal</label>
            <input
              type="number"
              step="0.01"
              value={valorMensal}
              onChange={(e) => setValorMensal(e.target.value)}
            />
          </div>

          <div>
            <label>Observações</label>
            <input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>

                <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={salvarPaciente} className="btn btn-primary">
            {idEdicao ? "Salvar alterações" : "Cadastrar aluno/paciente"}
          </button>

          {idEdicao && (
            <button onClick={limparFormulario} className="btn btn-secondary">
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div className="section-card">
        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Buscar paciente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="data-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
                <tr>
                <th style={th}>Nome</th>
                <th style={th}>Telefone</th>
                <th style={th}>Entrada/Retorno</th>
                <th style={th}>Próx. pagamento</th>
                <th style={th}>Valor mensal</th>
                <th style={th}>Status</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
                            {pacientesFiltrados.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    background: p.ativo ? "#f0fdf4" : "#f8fafc",
                  }}
                >
                  <td style={td}>{p.nome}</td>
                  <td style={td}>{p.telefone || "-"}</td>
                  <td style={td}>
                    {new Date(`${p.data_inicio}T12:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={td}>
                    {calcularProximoPagamento(p.data_inicio, p.dia_base_pagamento)}
                  </td>
                  <td style={td}>R$ {Number(p.valor_mensal || 0).toFixed(2)}</td>
                  <td style={td}>
                    <span className={p.ativo ? "status-pill status-green" : "status-pill status-gray"}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => editarPaciente(p)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => alternarStatusPaciente(p)}
                      >
                        {p.ativo ? "Inativar" : "Reativar"}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => excluirPaciente(p.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pacientesFiltrados.length === 0 && (
                <tr>
                    <td style={td} colSpan={7}>Nenhum aluno/paciente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
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