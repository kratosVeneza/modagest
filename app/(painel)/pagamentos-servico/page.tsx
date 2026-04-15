"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Patient = {
  id: number
  nome: string
  data_inicio: string | null
  dia_base_pagamento: number | null
  valor_mensal: number | null
  ativo: boolean
}

type ServicePayment = {
  id: number
  patient_id: number
  servico: string | null
  valor: number
  forma_pagamento: string | null
  observacao: string | null
  data_pagamento: string
  competencia_inicio: string | null
  competencia_fim: string | null
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

function calcularProximoPagamento(
  dataInicio?: string | null,
  diaBasePagamento?: number | null,
  pagamentos: ServicePayment[] = []
) {
  if (!dataInicio) return "-"

  const base = diaBasePagamento || new Date(`${dataInicio}T12:00:00`).getDate()

  const ultimoPagamento = pagamentos
    .slice()
    .sort(
      (a, b) =>
        new Date(`${b.data_pagamento}T12:00:00`).getTime() -
        new Date(`${a.data_pagamento}T12:00:00`).getTime()
    )[0]

  const referencia = ultimoPagamento?.data_pagamento || dataInicio
  const dataRef = new Date(`${referencia}T12:00:00`)

  const proximo = new Date(
    dataRef.getFullYear(),
    dataRef.getMonth() + 1,
    base,
    12,
    0,
    0
  )

  return proximo.toLocaleDateString("pt-BR")
}

export default function PagamentosServicoPage() {
  const [pacientes, setPacientes] = useState<Patient[]>([])
  const [pagamentos, setPagamentos] = useState<ServicePayment[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")

    const [patientId, setPatientId] = useState("")
  const [servico, setServico] = useState("Pilates")
  const [valor, setValor] = useState("")
  const [formaPagamento, setFormaPagamento] = useState("Pix")
  const [observacao, setObservacao] = useState("")
  const [dataPagamento, setDataPagamento] = useState(hojeInputDate())
  const [competenciaInicio, setCompetenciaInicio] = useState("")
  const [competenciaFim, setCompetenciaFim] = useState("")

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
      .select("id, nome, data_inicio, dia_base_pagamento, valor_mensal, ativo")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("nome", { ascending: true })

    if (pacientesError) {
      setMensagem("Erro ao carregar pacientes.")
      return
    }

    const { data: pagamentosData, error: pagamentosError } = await supabase
      .from("service_payments")
        .select(`
        id,
        patient_id,
        servico,
        valor,
        forma_pagamento,
        observacao,
        data_pagamento,
        competencia_inicio,
        competencia_fim,
        created_at,
        patients (nome)
      `)
      .eq("user_id", user.id)
      .order("data_pagamento", { ascending: false })

    if (pagamentosError) {
      setMensagem("Erro ao carregar pagamentos.")
      return
    }

    setPacientes((pacientesData ?? []) as Patient[])
    setPagamentos((pagamentosData ?? []) as unknown as ServicePayment[])
  }

  async function registrarPagamento() {
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

    if (Number(valor || 0) <= 0) {
      setMensagem("Informe um valor válido.")
      return
    }

    if (!dataPagamento) {
      setMensagem("Informe a data do pagamento.")
      return
    }

    const { data: pagamentoInserido, error } = await supabase
      .from("service_payments")
      .insert([
               {
          user_id: user.id,
          patient_id: Number(patientId),
          servico: servico || null,
          valor: Number(valor),
          forma_pagamento: formaPagamento || null,
          observacao: observacao || null,
          data_pagamento: dataPagamento,
          competencia_inicio: competenciaInicio || null,
          competencia_fim: competenciaFim || null,
        },
      ])
      .select("id")
      .single()

    if (error || !pagamentoInserido) {
      setMensagem(error?.message || "Erro ao registrar pagamento.")
      return
    }

    const paciente = pacientes.find((p) => p.id === Number(patientId))
    const nomePaciente = paciente?.nome || "Paciente"

        const { error: financeiroError } = await supabase
      .from("financial_transactions")
      .insert([
        {
          user_id: user.id,
          type: "entrada",
          amount: Number(valor),
          status: "pago",
          description: `Recebimento de serviço - ${servico} - ${nomePaciente}`,
          category: "Serviço",
          reference_type: "servico",
          reference_id: pagamentoInserido.id,
          created_at: new Date(`${dataPagamento}T12:00:00-03:00`).toISOString(),
          paid_at: new Date(`${dataPagamento}T12:00:00-03:00`).toISOString(),
        },
      ])

    if (financeiroError) {
      setMensagem("Pagamento salvo, mas houve erro ao lançar no financeiro.")
      await carregarDados()
      return
    }

    setPatientId("")
    setServico("Pilates")
    setValor("")
    setFormaPagamento("Pix")
    setObservacao("")
    setDataPagamento(hojeInputDate())
    setCompetenciaInicio("")
    setCompetenciaFim("")
  }

  const pagamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return pagamentos

        return pagamentos.filter((p) => {
      return (
        (p.patients?.nome || "").toLowerCase().includes(termo) ||
        (p.servico || "").toLowerCase().includes(termo) ||
        (p.forma_pagamento || "").toLowerCase().includes(termo) ||
        (p.observacao || "").toLowerCase().includes(termo)
      )
    })
  }, [pagamentos, busca])

  const resumoPacientes = useMemo(() => {
    return pacientes.map((p) => {
      const pagamentosPaciente = pagamentos.filter((pg) => pg.patient_id === p.id)
      return {
        ...p,
        proximoPagamento: calcularProximoPagamento(
          p.data_inicio,
          p.dia_base_pagamento,
          pagamentosPaciente
        ),
      }
    })
  }, [pacientes, pagamentos])

  return (
    <div>
      <h2 className="page-title">Pagamentos de Serviço</h2>
      <p className="page-subtitle">
        Registre recebimentos dos pacientes e acompanhe próximo pagamento.
      </p>

      {mensagem && <p>{mensagem}</p>}

      <div className="section-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Novo pagamento</h3>

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
            <label>Serviço</label>
            <select value={servico} onChange={(e) => setServico(e.target.value)}>
              <option value="Pilates">Pilates</option>
              <option value="Fisioterapia">Fisioterapia</option>
              <option value="Academia">Academia</option>
              <option value="Avaliação">Avaliação</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label>Valor</label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          <div>
            <label>Forma de pagamento</label>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
            >
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Transferência">Transferência</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label>Data do pagamento</label>
            <input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
            />
          </div>

          <div>
            <label>Competência início</label>
            <input
              type="date"
              value={competenciaInicio}
              onChange={(e) => setCompetenciaInicio(e.target.value)}
            />
          </div>

          <div>
            <label>Competência fim</label>
            <input
              type="date"
              value={competenciaFim}
              onChange={(e) => setCompetenciaFim(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>Observação</label>
            <textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={registrarPagamento} className="btn btn-primary">
            Registrar pagamento
          </button>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Resumo por paciente</h3>

        <div className="data-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Paciente</th>
                <th style={th}>Valor mensal</th>
                <th style={th}>Data de entrada</th>
                <th style={th}>Próximo pagamento</th>
              </tr>
            </thead>
            <tbody>
              {resumoPacientes.map((p) => (
                <tr key={p.id}>
                  <td style={td}>{p.nome}</td>
                  <td style={td}>R$ {Number(p.valor_mensal || 0).toFixed(2)}</td>
                  <td style={td}>
                    {p.data_inicio
                      ? new Date(`${p.data_inicio}T12:00:00`).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td style={td}>{p.proximoPagamento}</td>
                </tr>
              ))}

              {resumoPacientes.length === 0 && (
                <tr>
                  <td style={td} colSpan={4}>
                    Nenhum paciente encontrado.
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
            placeholder="Buscar pagamento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="data-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
                            <tr>
                <th style={th}>Paciente</th>
                <th style={th}>Serviço</th>
                <th style={th}>Valor</th>
                <th style={th}>Forma</th>
                <th style={th}>Data</th>
                <th style={th}>Competência</th>
                <th style={th}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {pagamentosFiltrados.map((p) => (
                                <tr key={p.id}>
                  <td style={td}>{p.patients?.nome || "-"}</td>
                  <td style={td}>{p.servico || "-"}</td>
                  <td style={td}>R$ {Number(p.valor).toFixed(2)}</td>
                  <td style={td}>{p.forma_pagamento || "-"}</td>
                  <td style={td}>
                    {new Date(`${p.data_pagamento}T12:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={td}>
                    {p.competencia_inicio
                      ? new Date(`${p.competencia_inicio}T12:00:00`).toLocaleDateString("pt-BR")
                      : "-"}{" "}
                    até{" "}
                    {p.competencia_fim
                      ? new Date(`${p.competencia_fim}T12:00:00`).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td style={td}>{p.observacao || "-"}</td>
                </tr>
              ))}

              {pagamentosFiltrados.length === 0 && (
                <tr>
                    <td style={td} colSpan={7}>
                    Nenhum pagamento encontrado.
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