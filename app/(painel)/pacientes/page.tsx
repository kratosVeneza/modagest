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

type ScheduleRule = {
  id?: number
  patient_id?: number
  weekday: number
  servico: string
  hora_inicio: string
  hora_fim: string
  ativo?: boolean
}

const diasSemana = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
]

const servicosPadrao = ["Pilates", "Fisioterapia", "Academia", "Avaliação", "Outro"]

const SLOTS_PILATES = [
  { hora_inicio: "08:00", hora_fim: "09:00" },
  { hora_inicio: "09:00", hora_fim: "10:00" },
  { hora_inicio: "10:00", hora_fim: "11:00" },
  { hora_inicio: "11:00", hora_fim: "12:00" },
  { hora_inicio: "16:00", hora_fim: "17:00" },
  { hora_inicio: "17:00", hora_fim: "18:00" },
  { hora_inicio: "18:00", hora_fim: "19:00" },
  { hora_inicio: "19:00", hora_fim: "20:00" },
]

function normalizarHora(hora?: string | null) {
  if (!hora) return ""
  return hora.slice(0, 5)
}

const LIMITE_PILATES_POR_HORARIO = 3

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
  const [todasRegras, setTodasRegras] = useState<ScheduleRule[]>([])
  const [horarios, setHorarios] = useState<ScheduleRule[]>([
    { weekday: 1, servico: "Pilates", hora_inicio: "", hora_fim: "", ativo: true },
  ])

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
      setMensagem("Erro ao carregar alunos/pacientes.")
      return
    }

    const { data: regrasData, error: regrasError } = await supabase
      .from("patient_schedule_rules")
      .select("id, patient_id, weekday, servico, hora_inicio, hora_fim, ativo")
      .eq("user_id", user.id)
      .eq("ativo", true)

    if (regrasError) {
      setMensagem("Erro ao carregar horários cadastrados.")
      return
    }

        setPacientes((data ?? []) as Patient[])
    setTodasRegras((regrasData ?? []) as ScheduleRule[])
  }

  async function carregarHorariosDoPaciente(patientId: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from("patient_schedule_rules")
      .select("id, patient_id, weekday, servico, hora_inicio, hora_fim, ativo")
      .eq("user_id", user.id)
      .eq("patient_id", patientId)
      .order("weekday", { ascending: true })
      .order("hora_inicio", { ascending: true })

    if (error) {
      setMensagem("Erro ao carregar horários do aluno/paciente.")
      return
    }

    setHorarios(
      (data as ScheduleRule[]).length > 0
        ? ((data ?? []) as ScheduleRule[])
        : [{ weekday: 1, servico: "Pilates", hora_inicio: "", hora_fim: "", ativo: true }]
    )
  }

  function adicionarHorario() {
    setHorarios((anterior) => [
      ...anterior,
      { weekday: 1, servico: "Pilates", hora_inicio: "", hora_fim: "", ativo: true },
    ])
  }

  function atualizarHorario(index: number, campo: keyof ScheduleRule, valor: string | number | boolean) {
    setHorarios((anterior) =>
      anterior.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    )
  }

  function removerHorario(index: number) {
    setHorarios((anterior) => anterior.filter((_, i) => i !== index))
  }

  function obterSugestoesPilates(index: number) {
    const linha = horarios[index]

    if (!linha || linha.servico !== "Pilates") return []

    return SLOTS_PILATES.map((slot) => {
      const ocupadosNoBanco = todasRegras.filter((regra) => {
        const mesmaSemana = Number(regra.weekday) === Number(linha.weekday)
        const mesmoServico = regra.servico === "Pilates"
        const mesmaHoraInicio = normalizarHora(regra.hora_inicio) === slot.hora_inicio
        const mesmaHoraFim = normalizarHora(regra.hora_fim) === slot.hora_fim

        const ignorarRegraAtualEmEdicao =
          idEdicao &&
          regra.patient_id === idEdicao &&
          normalizarHora(regra.hora_inicio) === normalizarHora(linha.hora_inicio) &&
          normalizarHora(regra.hora_fim) === normalizarHora(linha.hora_fim) &&
          Number(regra.weekday) === Number(linha.weekday)

        return mesmaSemana && mesmoServico && mesmaHoraInicio && mesmaHoraFim && !ignorarRegraAtualEmEdicao
      }).length

      const ocupadosNoFormulario = horarios.filter((h, i) => {
        if (i === index) return false

        return (
          h.servico === "Pilates" &&
          Number(h.weekday) === Number(linha.weekday) &&
          normalizarHora(h.hora_inicio) === slot.hora_inicio &&
          normalizarHora(h.hora_fim) === slot.hora_fim
        )
      }).length

      const ocupacao = ocupadosNoBanco + ocupadosNoFormulario
      const vagasRestantes = Math.max(LIMITE_PILATES_POR_HORARIO - ocupacao, 0)

      return {
        ...slot,
        ocupacao,
        vagasRestantes,
        disponivel: vagasRestantes > 0,
      }
    })
  }

  function aplicarSugestaoHorario(index: number, horaInicio: string, horaFim: string) {
    setHorarios((anterior) =>
      anterior.map((item, i) =>
        i === index
          ? { ...item, hora_inicio: horaInicio, hora_fim: horaFim }
          : item
      )
    )
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
    setHorarios([{ weekday: 1, servico: "Pilates", hora_inicio: "", hora_fim: "", ativo: true }])
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

    const horariosValidos = horarios.filter((h) => h.hora_inicio)

    if (horariosValidos.length === 0) {
      setMensagem("Cadastre pelo menos um dia/horário.")
      return
    }

    let patientIdFinal = idEdicao

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
    } else {
      const { data, error } = await supabase
        .from("patients")
        .insert([
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
        .select("id")
        .single()

      if (error || !data) {
        setMensagem(error?.message || "Erro ao cadastrar aluno/paciente.")
        return
      }

      patientIdFinal = data.id
    }

    if (!patientIdFinal) {
      setMensagem("Não foi possível determinar o aluno/paciente salvo.")
      return
    }

    const { error: deleteRulesError } = await supabase
      .from("patient_schedule_rules")
      .delete()
      .eq("user_id", user.id)
      .eq("patient_id", patientIdFinal)

    if (deleteRulesError) {
      setMensagem("Aluno/Paciente salvo, mas houve erro ao atualizar horários.")
      await carregarPacientes()
      return
    }

    const linhasHorarios = horariosValidos.map((h) => ({
      user_id: user.id,
      patient_id: patientIdFinal,
      weekday: Number(h.weekday),
      servico: h.servico || "Pilates",
      hora_inicio: h.hora_inicio,
      hora_fim: h.hora_fim || null,
      ativo: true,
    }))

    const { error: insertRulesError } = await supabase
      .from("patient_schedule_rules")
      .insert(linhasHorarios)

    if (insertRulesError) {
      setMensagem("Aluno/Paciente salvo, mas houve erro ao salvar dias e horários.")
      await carregarPacientes()
      return
    }

    limparFormulario()
    setMensagem(idEdicao ? "Aluno/Paciente atualizado com sucesso." : "Aluno/Paciente cadastrado com sucesso.")
    await carregarPacientes()
  }

  async function editarPaciente(paciente: Patient) {
    setIdEdicao(paciente.id)
    setNome(paciente.nome)
    setTelefone(paciente.telefone || "")
    setEmail(paciente.email || "")
    setDataNascimento(paciente.data_nascimento || "")
    setDataInicio(paciente.data_inicio || hojeInputDate())
    setDiaBasePagamento(paciente.dia_base_pagamento ? String(paciente.dia_base_pagamento) : "")
    setValorMensal(
      paciente.valor_mensal !== null && paciente.valor_mensal !== undefined
        ? String(paciente.valor_mensal)
        : ""
    )
    setObservacoes(paciente.observacoes || "")
    await carregarHorariosDoPaciente(paciente.id)
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
      novoStatus ? "Aluno/Paciente reativado com sucesso." : "Aluno/Paciente inativado com sucesso."
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
            <label>Data de entrada/retorno</label>
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

        <div style={{ marginTop: 20, marginBottom: 12 }}>
          <strong>Dias e horários fixos</strong>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {horarios.map((h, index) => {
            const sugestoesPilates = obterSugestoesPilates(index)

            return (
              <div
                key={index}
                style={{
                  display: "grid",
                  gap: 10,
                  padding: "12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#f9fafb",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1.2fr 1fr 1fr auto",
                    gap: 10,
                    alignItems: "end",
                  }}
                >

              <div>
                <label>Dia da semana</label>
                <select
                  value={h.weekday}
                  onChange={(e) => atualizarHorario(index, "weekday", Number(e.target.value))}
                >
                  {diasSemana.map((dia) => (
                    <option key={dia.value} value={dia.value}>
                      {dia.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Serviço</label>
                <select
                  value={h.servico}
                  onChange={(e) => atualizarHorario(index, "servico", e.target.value)}
                >
                  {servicosPadrao.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Hora início</label>
                <input
                  type="time"
                  value={h.hora_inicio}
                  onChange={(e) => atualizarHorario(index, "hora_inicio", e.target.value)}
                />
              </div>

              <div>
                <label>Hora fim</label>
                <input
                  type="time"
                  value={h.hora_fim}
                  onChange={(e) => atualizarHorario(index, "hora_fim", e.target.value)}
                />
              </div>

              <div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removerHorario(index)}
                    >
                      Remover
                    </button>
                  </div>
                </div>

                {h.servico === "Pilates" && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <strong style={{ fontSize: 14 }}>Sugestões de horários disponíveis</strong>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {sugestoesPilates.map((sugestao) => (
                        <button
                          key={`${sugestao.hora_inicio}-${sugestao.hora_fim}`}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={!sugestao.disponivel}
                          onClick={() =>
                            aplicarSugestaoHorario(index, sugestao.hora_inicio, sugestao.hora_fim)
                          }
                          style={{
                            opacity: sugestao.disponivel ? 1 : 0.5,
                            cursor: sugestao.disponivel ? "pointer" : "not-allowed",
                          }}
                        >
                          {sugestao.hora_inicio} às {sugestao.hora_fim}{" "}
                          {sugestao.disponivel
                            ? `(${sugestao.vagasRestantes} vaga(s))`
                            : "(lotado)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

        </div>

        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={adicionarHorario}>
            Adicionar dia/horário
          </button>
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
            placeholder="Buscar aluno/paciente"
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