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

type ServiceBilling = {
  id: number
  patient_id: number
  servico: string
  competencia_inicio: string | null
  competencia_fim: string | null
  data_vencimento: string
  data_restante_sugerida?: string | null
  valor_original: number
  desconto_percentual: number
  desconto_valor: number
  valor_total: number
  status: string
  observacao: string | null
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
  cobrancas: ServiceBilling[] = []
) {
  if (!dataInicio) return "-"

  const base = diaBasePagamento || new Date(`${dataInicio}T12:00:00`).getDate()

      const ultimaCobranca = cobrancas
    .slice()
    .sort(
      (a, b) =>
        new Date(`${b.data_vencimento}T12:00:00`).getTime() -
        new Date(`${a.data_vencimento}T12:00:00`).getTime()
    )[0]

  const referencia = ultimaCobranca?.data_vencimento || dataInicio
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
const [cobrancas, setCobrancas] = useState<ServiceBilling[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")

    const [patientId, setPatientId] = useState("")
  const [servico, setServico] = useState("Pilates")
  const [valorOriginal, setValorOriginal] = useState("")
  const [descontoPercentual, setDescontoPercentual] = useState("")
  const [descontoValor, setDescontoValor] = useState("")
  const [observacao, setObservacao] = useState("")
  const [dataVencimento, setDataVencimento] = useState(hojeInputDate())
  const [competenciaInicio, setCompetenciaInicio] = useState("")
  const [competenciaFim, setCompetenciaFim] = useState("")

  const [valorPagoInicial, setValorPagoInicial] = useState("")
  const [dataPagamentoInicial, setDataPagamentoInicial] = useState(hojeInputDate())
  const [formaPagamentoInicial, setFormaPagamentoInicial] = useState("Pix")
  const [observacaoPagamentoInicial, setObservacaoPagamentoInicial] = useState("")
  const [dataRestanteSugerida, setDataRestanteSugerida] = useState(hojeInputDate())

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

        const { data: cobrancasData, error: cobrancasError } = await supabase
      .from("service_billings")
      .select(`
        id,
        patient_id,
        servico,
        competencia_inicio,
        competencia_fim,
        data_vencimento,
        data_restante_sugerida,
        valor_original,
        desconto_percentual,
        desconto_valor,
        valor_total,
        status,
        observacao,
        created_at,
        patients (nome)
      `)
      .eq("user_id", user.id)
      .order("data_vencimento", { ascending: false })

    if (cobrancasError) {
      setMensagem("Erro ao carregar cobranças.")
      return
    }

    setPacientes((pacientesData ?? []) as Patient[])
    setCobrancas((cobrancasData ?? []) as unknown as ServiceBilling[])
  }

    const valorOriginalNumero = Number(valorOriginal || 0)
  const descontoPercentualNumero = Number(descontoPercentual || 0)
  const descontoValorNumeroDigitado = Number(descontoValor || 0)
  const valorPagoInicialNumero = Number(valorPagoInicial || 0)

  const descontoCalculado =
    descontoPercentualNumero > 0
      ? (valorOriginalNumero * descontoPercentualNumero) / 100
      : descontoValorNumeroDigitado

  const valorFinalCalculado = Math.max(valorOriginalNumero - descontoCalculado, 0)
  const valorRestanteCalculado = Math.max(valorFinalCalculado - valorPagoInicialNumero, 0)

    async function registrarCobranca() {
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

    if (!servico.trim()) {
      setMensagem("Informe o serviço.")
      return
    }

    const valorBase = Number(valorOriginal || 0)

    if (valorBase <= 0) {
      setMensagem("Informe um valor válido.")
      return
    }

    const descontoPct = Number(descontoPercentual || 0)
    let descontoAbs = Number(descontoValor || 0)

    if (descontoPct < 0 || descontoPct > 100) {
      setMensagem("O desconto percentual deve estar entre 0 e 100.")
      return
    }

    if (descontoAbs < 0) {
      setMensagem("O desconto em valor não pode ser negativo.")
      return
    }

    if (descontoPct > 0) {
      descontoAbs = (valorBase * descontoPct) / 100
    }

    const valorFinal = Math.max(valorBase - descontoAbs, 0)
    const valorInicial = Number(valorPagoInicial || 0)

    if (valorInicial < 0) {
      setMensagem("O pagamento inicial não pode ser negativo.")
      return
    }

    if (valorInicial > valorFinal) {
      setMensagem("O pagamento inicial não pode ser maior que o valor final da cobrança.")
      return
    }

    if (!dataVencimento) {
      setMensagem("Informe a data de vencimento.")
      return
    }

    const statusInicial = valorInicial >= valorFinal && valorFinal > 0 ? "quitada" : "ativa"

    const { data: cobrancaInserida, error } = await supabase
      .from("service_billings")
      .insert([
        {
          user_id: user.id,
          patient_id: Number(patientId),
          servico: servico.trim(),
          competencia_inicio: competenciaInicio || null,
          competencia_fim: competenciaFim || null,
        data_vencimento: dataVencimento,
        data_restante_sugerida: dataRestanteSugerida || null,
        valor_original: valorBase,
          desconto_percentual: descontoPct,
          desconto_valor: descontoAbs,
          valor_total: valorFinal,
          status: statusInicial,
          observacao: observacao || null,
        },
      ])
      .select("id")
      .single()

    if (error || !cobrancaInserida) {
      setMensagem(error?.message || "Erro ao registrar cobrança.")
      return
    }

    if (valorInicial > 0) {
      const { data: pagamentoInserido, error: pagamentoError } = await supabase
        .from("service_payments")
        .insert([
          {
            user_id: user.id,
            patient_id: Number(patientId),
            billing_id: cobrancaInserida.id,
            servico: servico.trim(),
            valor: valorInicial,
            forma_pagamento: formaPagamentoInicial || null,
            observacao: observacaoPagamentoInicial || null,
            data_pagamento: dataPagamentoInicial,
            competencia_inicio: competenciaInicio || null,
            competencia_fim: competenciaFim || null,
          },
        ])
        .select("id")
        .single()

      if (pagamentoError || !pagamentoInserido) {
        setMensagem(pagamentoError?.message || "Cobrança criada, mas houve erro ao registrar o pagamento inicial.")
        await carregarDados()
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
            amount: valorInicial,
            status: "pago",
            description: `Recebimento de serviço - ${servico} - ${nomePaciente}`,
            category: "Serviço",
            reference_type: "servico",
            reference_id: pagamentoInserido.id,
            created_at: new Date(`${dataPagamentoInicial}T12:00:00-03:00`).toISOString(),
            paid_at: new Date(`${dataPagamentoInicial}T12:00:00-03:00`).toISOString(),
          },
        ])

      if (financeiroError) {
        setMensagem("Cobrança e pagamento inicial salvos, mas houve erro ao lançar no financeiro.")
        await carregarDados()
        return
      }
    }

    setPatientId("")
    setServico("Pilates")
    setValorOriginal("")
    setDescontoPercentual("")
    setDescontoValor("")
    setObservacao("")
    setDataVencimento(hojeInputDate())
    setCompetenciaInicio("")
    setCompetenciaFim("")
    setValorPagoInicial("")
    setDataPagamentoInicial(hojeInputDate())
    setFormaPagamentoInicial("Pix")
    setObservacaoPagamentoInicial("")
    setDataRestanteSugerida(hojeInputDate())

    setMensagem("Cobrança registrada com sucesso.")
    await carregarDados()
  }

    const cobrancasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return cobrancas

    return cobrancas.filter((c) => {
      return (
        (c.patients?.nome || "").toLowerCase().includes(termo) ||
        (c.servico || "").toLowerCase().includes(termo) ||
        (c.status || "").toLowerCase().includes(termo) ||
        (c.observacao || "").toLowerCase().includes(termo)
      )
    })
  }, [cobrancas, busca])

    const resumoPacientes = useMemo(() => {
    return pacientes.map((p) => {
      const cobrancasPaciente = cobrancas.filter((c) => c.patient_id === p.id)
      return {
        ...p,
        proximoPagamento: calcularProximoPagamento(
          p.data_inicio,
          p.dia_base_pagamento,
          cobrancasPaciente
        ),
      }
    })
  }, [pacientes, cobrancas])

  return (
    <div>
            <h2 className="page-title">Cobranças de Serviço</h2>
      <p className="page-subtitle">
        Cadastre cobranças dos pacientes, controle vencimento, desconto e acompanhe o próximo pagamento.
      </p>

      {mensagem && <p>{mensagem}</p>}

      <div className="section-card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 12 }}>Nova cobrança</h3>

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
            <label>Valor original</label>
            <input
              type="number"
              step="0.01"
              value={valorOriginal}
              onChange={(e) => setValorOriginal(e.target.value)}
            />
          </div>

          <div>
            <label>Desconto (%)</label>
            <input
              type="number"
              step="0.01"
              value={descontoPercentual}
              onChange={(e) => setDescontoPercentual(e.target.value)}
            />
          </div>

          <div>
            <label>Desconto (R$)</label>
            <input
              type="number"
              step="0.01"
              value={descontoValor}
              onChange={(e) => setDescontoValor(e.target.value)}
            />
          </div>

          <div>
            <label>Data de vencimento</label>
            <input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
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

                    <div>
            <label>Pagamento inicial (opcional)</label>
            <input
              type="number"
              step="0.01"
              value={valorPagoInicial}
              onChange={(e) => setValorPagoInicial(e.target.value)}
              placeholder="Ex.: 100,00"
            />
          </div>

          <div>
            <label>Data do pagamento inicial</label>
            <input
              type="date"
              value={dataPagamentoInicial}
              onChange={(e) => setDataPagamentoInicial(e.target.value)}
            />
          </div>

          <div>
            <label>Forma do pagamento inicial</label>
            <select
              value={formaPagamentoInicial}
              onChange={(e) => setFormaPagamentoInicial(e.target.value)}
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
            <label>Data sugerida para restante</label>
            <input
              type="date"
              value={dataRestanteSugerida}
              onChange={(e) => setDataRestanteSugerida(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>Observação do pagamento inicial</label>
            <textarea
              rows={2}
              value={observacaoPagamentoInicial}
              onChange={(e) => setObservacaoPagamentoInicial(e.target.value)}
              placeholder="Ex.: entrada de matrícula, sinal, primeira parcela"
            />
          </div>
        </div>

                <div
          style={{
            marginTop: 16,
            padding: 14,
            border: "1px solid #d1d5db",
            borderRadius: 10,
            background: "#f8fafc",
            display: "grid",
            gap: 6,
          }}
        >
          <strong>Resumo da cobrança</strong>
          <span>Valor original: R$ {valorOriginalNumero.toFixed(2)}</span>
          <span>Desconto aplicado: R$ {descontoCalculado.toFixed(2)}</span>
          <span>Valor final: R$ {valorFinalCalculado.toFixed(2)}</span>
          <span>Pagamento inicial: R$ {valorPagoInicialNumero.toFixed(2)}</span>
          <span>Valor restante: R$ {valorRestanteCalculado.toFixed(2)}</span>
          <span>
            Data sugerida para restante:{" "}
            {dataRestanteSugerida
              ? new Date(`${dataRestanteSugerida}T12:00:00`).toLocaleDateString("pt-BR")
              : "-"}
          </span>
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={registrarCobranca} className="btn btn-primary">
            Registrar cobrança
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
            placeholder="Buscar cobrança"
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
                <th style={th}>Valor original</th>
                <th style={th}>Desconto</th>
                <th style={th}>Valor final</th>
                <th style={th}>Vencimento</th>
                <th style={th}>Restante sugerido</th>
                <th style={th}>Competência</th>
                <th style={th}>Status</th>
                <th style={th}>Observação</th>
              </tr>
            </thead>
            <tbody>
                            {cobrancasFiltradas.map((c) => (
                <tr key={c.id}>
                  <td style={td}>{c.patients?.nome || "-"}</td>
                  <td style={td}>{c.servico || "-"}</td>
                  <td style={td}>R$ {Number(c.valor_original).toFixed(2)}</td>
                  <td style={td}>
                    {Number(c.desconto_percentual || 0) > 0
                      ? `${Number(c.desconto_percentual).toFixed(2)}%`
                      : `R$ ${Number(c.desconto_valor || 0).toFixed(2)}`}
                  </td>
                  <td style={td}>R$ {Number(c.valor_total).toFixed(2)}</td>
                  <td style={td}>
                    {new Date(`${c.data_vencimento}T12:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={td}>
                    {c.data_restante_sugerida
                      ? new Date(`${c.data_restante_sugerida}T12:00:00`).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td style={td}>
                    {c.competencia_inicio
                      ? new Date(`${c.competencia_inicio}T12:00:00`).toLocaleDateString("pt-BR")
                      : "-"}{" "}
                    até{" "}
                    {c.competencia_fim
                      ? new Date(`${c.competencia_fim}T12:00:00`).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td style={td}>{c.status}</td>
                  <td style={td}>{c.observacao || "-"}</td>
                </tr>
              ))}

                {cobrancasFiltradas.length === 0 && (
                <tr>
                    <td style={td} colSpan={10}>
                    Nenhuma cobrança encontrada.
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