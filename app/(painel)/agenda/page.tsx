"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Patient = {
  id: number
  nome: string
  ativo: boolean
  data_inicio?: string | null
  dia_base_pagamento?: number | null
  valor_mensal?: number | null
}

type Appointment = {
  id: number
  patient_id: number
  servico: string
  data_agendamento: string
  hora_inicio: string
  hora_fim: string | null
  status: string
  observacoes: string | null
  created_at: string
  patients?: {
    nome: string
  } | null
}

type ScheduleRule = {
  id: number
  patient_id: number
  weekday: number
  servico: string
  hora_inicio: string
  hora_fim: string | null
  ativo: boolean
}

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

const statusOptions = ["agendado", "realizado", "faltou", "cancelado"]
const servicosPadrao = ["Pilates", "Fisioterapia", "Academia", "Avaliação", "Outro"]

export default function AgendaPage() {
  const [pacientes, setPacientes] = useState<Patient[]>([])
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([])
  const [regras, setRegras] = useState<ScheduleRule[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")

  const [idEdicao, setIdEdicao] = useState<number | null>(null)
  const [patientId, setPatientId] = useState("")
  const [servico, setServico] = useState("Pilates")
  const [dataAgendamento, setDataAgendamento] = useState(hojeInputDate())
  const [horaInicio, setHoraInicio] = useState("")
  const [horaFim, setHoraFim] = useState("")
  const [status, setStatus] = useState("agendado")
  const [observacoes, setObservacoes] = useState("")
  const [dataFiltroDia, setDataFiltroDia] = useState(hojeInputDate())

    useEffect(() => {
    if (!dataFiltroDia) return
    sincronizarAgendaDoDia(dataFiltroDia)
  }, [dataFiltroDia])

  async function carregarDados() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { data: pacientesData, error: pacientesError } = await supabase
      .from("patients")
      .select("id, nome, ativo, data_inicio, dia_base_pagamento, valor_mensal")
      .eq("user_id", user.id)
      .order("nome", { ascending: true })

    if (pacientesError) {
      setMensagem("Erro ao carregar pacientes.")
      return
    }

    const { data: regrasData, error: regrasError } = await supabase
      .from("patient_schedule_rules")
      .select("id, patient_id, weekday, servico, hora_inicio, hora_fim, ativo")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("weekday", { ascending: true })
      .order("hora_inicio", { ascending: true })

    if (regrasError) {
      setMensagem("Erro ao carregar horários fixos.")
      return
    }

    const { data: agendaData, error: agendaError } = await supabase
      .from("patient_appointments")
      .select(`
        id,
        patient_id,
        servico,
        data_agendamento,
        hora_inicio,
        hora_fim,
        status,
        observacoes,
        created_at,
        patients (nome)
      `)
      .eq("user_id", user.id)
      .order("data_agendamento", { ascending: false })
      .order("hora_inicio", { ascending: true })

    if (agendaError) {
      setMensagem("Erro ao carregar agenda.")
      return
    }

    setPacientes((pacientesData ?? []) as Patient[])
    setRegras((regrasData ?? []) as ScheduleRule[])
    setAgendamentos((agendaData ?? []) as unknown as Appointment[])
  }

    async function sincronizarAgendaDoDia(dataReferencia: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !dataReferencia) return

    const dataObj = new Date(`${dataReferencia}T12:00:00`)
    const weekday = dataObj.getDay()

    const { data: pacientesData, error: pacientesError } = await supabase
      .from("patients")
      .select("id, nome, ativo")
      .eq("user_id", user.id)

    if (pacientesError) return

    const pacientesLista = (pacientesData ?? []) as Patient[]
    const pacientesAtivosIds = new Set(
      pacientesLista.filter((p) => p.ativo).map((p) => p.id)
    )

    const { data: regrasData, error: regrasError } = await supabase
      .from("patient_schedule_rules")
      .select("id, patient_id, weekday, servico, hora_inicio, hora_fim, ativo")
      .eq("user_id", user.id)
      .eq("ativo", true)

    if (regrasError) return

    const regrasLista = (regrasData ?? []) as ScheduleRule[]

    const regrasDoDia = regrasLista.filter(
      (r) => r.weekday === weekday && pacientesAtivosIds.has(r.patient_id)
    )

    const { data: agendamentosDiaData, error: agendamentosDiaError } = await supabase
      .from("patient_appointments")
      .select("id, patient_id, servico, data_agendamento, hora_inicio, hora_fim")
      .eq("user_id", user.id)
      .eq("data_agendamento", dataReferencia)

    if (agendamentosDiaError) return

    const agendamentosDia = (agendamentosDiaData ?? []) as Appointment[]

    const chavesExistentes = new Set(
      agendamentosDia.map(
        (a) => `${a.patient_id}::${a.servico}::${a.data_agendamento}::${a.hora_inicio}`
      )
    )

    const inserts = regrasDoDia
      .filter((regra) => {
        const chave = `${regra.patient_id}::${regra.servico}::${dataReferencia}::${regra.hora_inicio}`
        return !chavesExistentes.has(chave)
      })
      .map((regra) => ({
        user_id: user.id,
        patient_id: regra.patient_id,
        servico: regra.servico,
        data_agendamento: dataReferencia,
        hora_inicio: regra.hora_inicio,
        hora_fim: regra.hora_fim || null,
        status: "agendado",
        observacoes: null,
      }))

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from("patient_appointments")
        .insert(inserts)

      if (insertError) {
        await carregarDados()
        return
      }
    }

    await carregarDados()
  }

  async function salvarAgendamento() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!patientId) {
      setMensagem("Selecione um aluno/paciente.")
      return
    }

    if (!servico.trim()) {
      setMensagem("Informe o serviço.")
      return
    }

    if (!dataAgendamento) {
      setMensagem("Informe a data.")
      return
    }

    if (!horaInicio) {
      setMensagem("Informe a hora de início.")
      return
    }

    if (idEdicao) {
      const { error } = await supabase
        .from("patient_appointments")
        .update({
          patient_id: Number(patientId),
          servico: servico.trim(),
          data_agendamento: dataAgendamento,
          hora_inicio: horaInicio,
          hora_fim: horaFim || null,
          status,
          observacoes: observacoes || null,
        })
        .eq("id", idEdicao)
        .eq("user_id", user.id)

      if (error) {
        setMensagem(error.message || "Erro ao editar agendamento.")
        return
      }

      limparFormulario()
      setMensagem("Agendamento atualizado com sucesso.")
      await carregarDados()
      return
    }

    const { error } = await supabase.from("patient_appointments").insert([
      {
        user_id: user.id,
        patient_id: Number(patientId),
        servico: servico.trim(),
        data_agendamento: dataAgendamento,
        hora_inicio: horaInicio,
        hora_fim: horaFim || null,
        status,
        observacoes: observacoes || null,
      },
    ])

    if (error) {
      setMensagem(error.message || "Erro ao cadastrar agendamento.")
      return
    }

    limparFormulario()
    setMensagem("Agendamento cadastrado com sucesso.")
    await carregarDados()
  }

  function limparFormulario() {
    setIdEdicao(null)
    setPatientId("")
    setServico("Pilates")
    setDataAgendamento(hojeInputDate())
    setHoraInicio("")
    setHoraFim("")
    setStatus("agendado")
    setObservacoes("")
  }

  function editarAgendamento(agendamento: Appointment) {
    setIdEdicao(agendamento.id)
    setPatientId(String(agendamento.patient_id))
    setServico(agendamento.servico)
    setDataAgendamento(agendamento.data_agendamento)
    setHoraInicio(agendamento.hora_inicio)
    setHoraFim(agendamento.hora_fim || "")
    setStatus(agendamento.status)
    setObservacoes(agendamento.observacoes || "")
  }

  async function excluirAgendamento(id: number) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { error } = await supabase
      .from("patient_appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      setMensagem(error.message || "Erro ao excluir agendamento.")
      return
    }

    if (idEdicao === id) {
      limparFormulario()
    }

    setMensagem("Agendamento excluído com sucesso.")
    await carregarDados()
  }

  async function atualizarStatus(id: number, novoStatus: string) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { error } = await supabase
      .from("patient_appointments")
      .update({ status: novoStatus })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      setMensagem(error.message || "Erro ao atualizar status.")
      return
    }

    await carregarDados()
  }

  const agendamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return agendamentos

    return agendamentos.filter((a) => {
      return (
        (a.patients?.nome || "").toLowerCase().includes(termo) ||
        a.servico.toLowerCase().includes(termo) ||
        a.status.toLowerCase().includes(termo)
      )
    })
  }, [agendamentos, busca])

  const agendaDoDia = useMemo(() => {
    return agendamentos
      .filter((a) => a.data_agendamento === dataFiltroDia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }, [agendamentos, dataFiltroDia])

  return (
    <div>
      <h2 className="page-title">Agenda</h2>
      <p className="page-subtitle">
        Organize horários, acompanhe presença do dia e visualize alunos/pacientes ativos e inativos.
      </p>

      {mensagem && <p>{mensagem}</p>}

      <div className="section-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>
          {idEdicao ? "Editar agendamento" : "Novo agendamento"}
        </h3>

        <div className="grid-2">
          <div>
            <label>Paciente</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecione</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} {p.ativo ? "(Ativo)" : "(Inativo)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Serviço</label>
            <select value={servico} onChange={(e) => setServico(e.target.value)}>
              {servicosPadrao.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Data</label>
            <input
              type="date"
              value={dataAgendamento}
              onChange={(e) => setDataAgendamento(e.target.value)}
            />
          </div>

          <div>
            <label>Hora de início</label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </div>

          <div>
            <label>Hora de fim</label>
            <input
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
            />
          </div>

          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={salvarAgendamento} className="btn btn-primary">
            {idEdicao ? "Salvar alterações" : "Cadastrar agendamento"}
          </button>

          {idEdicao && (
            <button onClick={limparFormulario} className="btn btn-secondary">
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Presença do dia</h3>

        <div style={{ marginBottom: 12 }}>
          <label>Data</label>
          <input
            type="date"
            value={dataFiltroDia}
            onChange={(e) => setDataFiltroDia(e.target.value)}
          />
        </div>

        <div className="data-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Paciente</th>
                <th style={th}>Serviço</th>
                <th style={th}>Início</th>
                <th style={th}>Fim</th>
                <th style={th}>Status</th>
                <th style={th}>Presença</th>
              </tr>
            </thead>
            <tbody>
              {agendaDoDia.map((a) => (
                <tr key={`dia-${a.id}`}>
                  <td style={td}>{a.patients?.nome || "-"}</td>
                  <td style={td}>{a.servico}</td>
                  <td style={td}>{a.hora_inicio}</td>
                  <td style={td}>{a.hora_fim || "-"}</td>
                  <td style={td}>{a.status === "agendado" ? "-" : a.status}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => atualizarStatus(a.id, "realizado")}
                      >
                        Presente
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => atualizarStatus(a.id, "faltou")}
                      >
                        Faltou
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {agendaDoDia.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    Nenhum agendamento para esta data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-card">
        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Buscar por paciente, serviço ou status"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="data-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Paciente</th>
                <th style={th}>Status do paciente</th>
                <th style={th}>Serviço</th>
                <th style={th}>Data</th>
                <th style={th}>Início</th>
                <th style={th}>Fim</th>
                <th style={th}>Status</th>
                <th style={th}>Observações</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {agendamentosFiltrados.map((a) => {
                const paciente = pacientes.find((p) => p.id === a.patient_id)

                return (
                  <tr
                    key={a.id}
                    style={{
                      background: paciente?.ativo ? "#f0fdf4" : "#f8fafc",
                    }}
                  >
                    <td style={td}>{a.patients?.nome || "-"}</td>
                    <td style={td}>
                      <span
                        className={
                          paciente?.ativo
                            ? "status-pill status-green"
                            : "status-pill status-gray"
                        }
                      >
                        {paciente?.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={td}>{a.servico}</td>
                    <td style={td}>
                      {new Date(`${a.data_agendamento}T12:00:00`).toLocaleDateString("pt-BR")}
                    </td>
                    <td style={td}>{a.hora_inicio}</td>
                    <td style={td}>{a.hora_fim || "-"}</td>
                    <td style={td}>
                      <span className="status-pill status-blue">{a.status}</span>
                    </td>
                    <td style={td}>{a.observacoes || "-"}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => editarAgendamento(a)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => atualizarStatus(a.id, "realizado")}
                        >
                          Realizado
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => atualizarStatus(a.id, "faltou")}
                        >
                          Faltou
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => atualizarStatus(a.id, "cancelado")}
                        >
                          Cancelar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => excluirAgendamento(a.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {agendamentosFiltrados.length === 0 && (
                <tr>
                  <td style={td} colSpan={9}>
                    Nenhum agendamento encontrado.
                  </td>
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
  verticalAlign: "top" as const,
}