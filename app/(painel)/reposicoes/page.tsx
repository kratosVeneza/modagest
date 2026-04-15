"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Patient = {
  id: number
  nome: string
  ativo: boolean
}

type Replacement = {
  id: number
  patient_id: number
  data_reposicao: string
  motivo: string | null
  observacoes: string | null
  created_at: string
  patients?: {
    nome: string
  } | null
}

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

export default function ReposicoesPage() {
  const [pacientes, setPacientes] = useState<Patient[]>([])
  const [reposicoes, setReposicoes] = useState<Replacement[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")

  const [patientId, setPatientId] = useState("")
  const [dataReposicao, setDataReposicao] = useState(hojeInputDate())
  const [motivo, setMotivo] = useState("")
  const [observacoes, setObservacoes] = useState("")

  useEffect(() => {
    carregarDados()
  }, [])

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
      .select("id, nome, ativo")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("nome", { ascending: true })

    if (pacientesError) {
      setMensagem("Erro ao carregar pacientes.")
      return
    }

    const { data: reposicoesData, error: reposicoesError } = await supabase
      .from("patient_replacements")
      .select(`
        id,
        patient_id,
        data_reposicao,
        motivo,
        observacoes,
        created_at,
        patients (nome)
      `)
      .eq("user_id", user.id)
      .order("data_reposicao", { ascending: false })

    if (reposicoesError) {
      setMensagem("Erro ao carregar reposições.")
      return
    }

    setPacientes((pacientesData ?? []) as Patient[])
    setReposicoes((reposicoesData ?? []) as unknown as Replacement[])
  }

  async function salvarReposicao() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!patientId) {
      setMensagem("Selecione um paciente.")
      return
    }

    if (!dataReposicao) {
      setMensagem("Informe a data da reposição.")
      return
    }

    const { error } = await supabase.from("patient_replacements").insert([
      {
        user_id: user.id,
        patient_id: Number(patientId),
        data_reposicao: dataReposicao,
        motivo: motivo || null,
        observacoes: observacoes || null,
      },
    ])

    if (error) {
      setMensagem(error.message || "Erro ao registrar reposição.")
      return
    }

    setPatientId("")
    setDataReposicao(hojeInputDate())
    setMotivo("")
    setObservacoes("")
    setMensagem("Reposição registrada com sucesso.")
    await carregarDados()
  }

  const reposicoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return reposicoes

    return reposicoes.filter((r) => {
      return (
        (r.patients?.nome || "").toLowerCase().includes(termo) ||
        (r.motivo || "").toLowerCase().includes(termo) ||
        (r.observacoes || "").toLowerCase().includes(termo)
      )
    })
  }, [reposicoes, busca])

  return (
    <div>
      <h2 className="page-title">Reposições</h2>
      <p className="page-subtitle">
        Registre reposições de aula e mantenha histórico do paciente.
      </p>

      {mensagem && <p>{mensagem}</p>}

      <div className="section-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Nova reposição</h3>

        <div className="grid-2">
          <div>
            <label>Paciente</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecione</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Data da reposição</label>
            <input
              type="date"
              value={dataReposicao}
              onChange={(e) => setDataReposicao(e.target.value)}
            />
          </div>

          <div>
            <label>Motivo</label>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>

          <div>
            <label>Observações</label>
            <input
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={salvarReposicao} className="btn btn-primary">
            Registrar reposição
          </button>
        </div>
      </div>

      <div className="section-card">
        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Buscar reposição"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="data-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Paciente</th>
                <th style={th}>Data</th>
                <th style={th}>Motivo</th>
                <th style={th}>Observações</th>
              </tr>
            </thead>
            <tbody>
              {reposicoesFiltradas.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.patients?.nome || "-"}</td>
                  <td style={td}>
                    {new Date(`${r.data_reposicao}T12:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={td}>{r.motivo || "-"}</td>
                  <td style={td}>{r.observacoes || "-"}</td>
                </tr>
              ))}

              {reposicoesFiltradas.length === 0 && (
                <tr>
                  <td style={td} colSpan={4}>
                    Nenhuma reposição encontrada.
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