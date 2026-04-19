"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Patient = {
  id: number
  nome: string
  data_inicio: string | null
  dia_base_pagamento: number | null
  valor_mensal: number | null
  ativo: boolean
}

type PatientStatusHistory = {
  id: number
  patient_id: number
  status: "ativo" | "inativo"
  start_date: string
  end_date: string | null
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

type ServicePayment = {
  id: number
  billing_id: number | null
  patient_id: number
  servico: string | null
  valor: number
  forma_pagamento: string | null
  observacao: string | null
  data_pagamento: string
  competencia_inicio: string | null
  competencia_fim: string | null
  created_at: string
}

type CobrancaComResumo = ServiceBilling & {
  valorPago: number
  valorEmAberto: number
  statusVisual: "quitada" | "parcial" | "ativa" | "vencida" | "cancelada"
  proximoPagamentoPaciente: string
  valorMensalPaciente: number
  dataEntradaPaciente: string | null
  pagamentosDaCobranca: ServicePayment[]
}

type PacienteLote = {
  patient_id: number
  nome: string
  valor_mensal: number
  dia_base_pagamento: number | null
  competencia_inicio: string | null
  competencia_fim: string | null
  data_vencimento: string
  servico: string
  selecionado: boolean
}

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function formatarData(data?: string | null) {
  if (!data) return "-"
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR")
}

function formatarDataHoraIso(dataIso?: string | null) {
  if (!dataIso) return "-"
  return new Date(dataIso).toLocaleString("pt-BR")
}

function formatarCompetencia(inicio?: string | null, fim?: string | null) {
  if (!inicio && !fim) return "-"
  if (inicio && fim) return `${formatarData(inicio)} até ${formatarData(fim)}`
  return inicio ? formatarData(inicio) : formatarData(fim)
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

function competenciaMes(chaveData?: string | null) {
  if (!chaveData) return ""
  const data = new Date(`${chaveData}T12:00:00`)
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, "0")
  return `${ano}-${mes}`
}

function ultimoDiaDoMes(ano: number, mesIndex: number) {
  return new Date(ano, mesIndex + 1, 0).getDate()
}

function montarDataBaseNoMes(ano: number, mesIndex: number, diaBase: number) {
  const diaFinal = Math.min(diaBase, ultimoDiaDoMes(ano, mesIndex))
  const mes = String(mesIndex + 1).padStart(2, "0")
  const dia = String(diaFinal).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function montarCompetenciaAutomaticaPorDiaBase(
  referenciaMes?: string | null,
  diaBasePagamento?: number | null
) {
  const referencia = referenciaMes || hojeInputDate()
  const dataRef = new Date(`${referencia}T12:00:00`)

  const anoAtual = dataRef.getFullYear()
  const mesAtual = dataRef.getMonth()

  const diaBase = Number(diaBasePagamento || dataRef.getDate() || 1)

  const dataVencimento = montarDataBaseNoMes(anoAtual, mesAtual, diaBase)

  const dataAnterior = new Date(anoAtual, mesAtual - 1, 1, 12, 0, 0)
  const anoAnterior = dataAnterior.getFullYear()
  const mesAnterior = dataAnterior.getMonth()

  const competenciaInicio = montarDataBaseNoMes(anoAnterior, mesAnterior, diaBase)
  const competenciaFim = montarDataBaseNoMes(anoAtual, mesAtual, diaBase)

  return {
    competenciaInicio,
    competenciaFim,
    dataVencimento,
  }
}

function montarPeriodoDoMes(referenciaMes?: string | null) {
  const referencia = referenciaMes || hojeInputDate()
  const dataRef = new Date(`${referencia}T12:00:00`)

  const ano = dataRef.getFullYear()
  const mes = dataRef.getMonth()

  const inicio = `${ano}-${String(mes + 1).padStart(2, "0")}-01`
  const fim = `${ano}-${String(ultimoDiaDoMes(ano, mes)).padStart(2, "0")}`

  return { inicio, fim }
}

function montarCompetenciaDoPacienteNoMes(
  referenciaMes: string,
  paciente: Patient
) {
  const dataRef = new Date(`${referenciaMes}T12:00:00`)
  const anoAtual = dataRef.getFullYear()
  const mesAtual = dataRef.getMonth()

  const diaBase = Number(
    paciente.dia_base_pagamento ||
      (paciente.data_inicio ? new Date(`${paciente.data_inicio}T12:00:00`).getDate() : 1)
  )

  const dataVencimento = montarDataBaseNoMes(anoAtual, mesAtual, diaBase)

  const dataAnterior = new Date(anoAtual, mesAtual - 1, 1, 12, 0, 0)
  const anoAnterior = dataAnterior.getFullYear()
  const mesAnterior = dataAnterior.getMonth()

  let competenciaInicio = montarDataBaseNoMes(anoAnterior, mesAnterior, diaBase)
  let competenciaFim = montarDataBaseNoMes(anoAtual, mesAtual, diaBase)

  if (paciente.data_inicio) {
    const entrada = new Date(`${paciente.data_inicio}T12:00:00`)
    const entradaIso = `${entrada.getFullYear()}-${String(entrada.getMonth() + 1).padStart(2, "0")}-${String(entrada.getDate()).padStart(2, "0")}`

    if (entradaIso > competenciaInicio) {
      competenciaInicio = entradaIso
    }
  }

  return {
    competenciaInicio,
    competenciaFim,
    dataVencimento,
  }
}

function statusVisualDaCobranca(
  cobranca: ServiceBilling,
  valorPago: number,
  valorEmAberto: number
): CobrancaComResumo["statusVisual"] {
  if (cobranca.status === "cancelada") return "cancelada"
  if (valorEmAberto <= 0) return "quitada"
  if (valorPago > 0 && valorEmAberto > 0) return "parcial"

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const vencimento = new Date(`${cobranca.data_vencimento}T12:00:00`)
  if (vencimento.getTime() < hoje.getTime()) return "vencida"

  return "ativa"
}

function labelStatus(status: CobrancaComResumo["statusVisual"]) {
  switch (status) {
    case "quitada":
      return "Quitada"
    case "parcial":
      return "Parcial"
    case "vencida":
      return "Vencida"
    case "cancelada":
      return "Cancelada"
    default:
      return "Ativa"
  }
}

function textoOuNull(valor: string) {
  const limpo = valor.trim()
  return limpo ? limpo : null
}

function formaPagamentoOuNull(valor: string) {
  const limpo = valor.trim()
  return limpo ? limpo : null
}

function pacienteEstavaAtivoNoPeriodo(
  paciente: Patient,
  inicio: string,
  fim: string,
  historicoStatus: PatientStatusHistory[]
) {
  if (!inicio || !fim) return true

  const inicioPeriodo = new Date(`${inicio}T00:00:00`)
  const fimPeriodo = new Date(`${fim}T23:59:59`)

  const historicoDoPaciente = historicoStatus.filter((h) => h.patient_id === paciente.id)

  if (historicoDoPaciente.length > 0) {
    return historicoDoPaciente.some((h) => {
      if (h.status !== "ativo") return false

      const inicioStatus = new Date(`${h.start_date}T00:00:00`)
      const fimStatus = h.end_date ? new Date(`${h.end_date}T23:59:59`) : null

      return inicioStatus <= fimPeriodo && (!fimStatus || fimStatus >= inicioPeriodo)
    })
  }

  if (!paciente.data_inicio) return false

  const dataInicioPaciente = new Date(`${paciente.data_inicio}T00:00:00`)
  return dataInicioPaciente <= fimPeriodo
}

export default function PagamentosServicoPage() {
  const [pacientes, setPacientes] = useState<Patient[]>([])
  const [cobrancas, setCobrancas] = useState<ServiceBilling[]>([])
  const [pagamentos, setPagamentos] = useState<ServicePayment[]>([])
  const [mensagem, setMensagem] = useState("")

  const [busca, setBusca] = useState("")
  const [filtroPaciente, setFiltroPaciente] = useState("todos")
  const [filtroServico, setFiltroServico] = useState("todos")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroCompetencia, setFiltroCompetencia] = useState("")
  const [somenteEmAberto, setSomenteEmAberto] = useState(false)

  const [billingIdExpandido, setBillingIdExpandido] = useState<number | null>(null)
  const [billingIdPagamento, setBillingIdPagamento] = useState<number | null>(null)
  const [paymentIdEdicao, setPaymentIdEdicao] = useState<number | null>(null)

  const [valorPagamento, setValorPagamento] = useState("")
  const [dataPagamento, setDataPagamento] = useState(hojeInputDate())
  const [formaPagamento, setFormaPagamento] = useState("Pix")
  const [observacaoPagamento, setObservacaoPagamento] = useState("")

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

 const [servicoLote, setServicoLote] = useState("Pilates")
const [referenciaMesLote, setReferenciaMesLote] = useState(hojeInputDate())
const [dataInicioPeriodo, setDataInicioPeriodo] = useState("")
const [dataFimPeriodo, setDataFimPeriodo] = useState("")
const [historicoStatus, setHistoricoStatus] = useState<PatientStatusHistory[]>([])
const [pacientesLote, setPacientesLote] = useState<PacienteLote[]>([])
const [selecionarTodosLote, setSelecionarTodosLote] = useState(true)

useEffect(() => {
  const periodo = montarPeriodoDoMes(referenciaMesLote)
  setDataInicioPeriodo(periodo.inicio)
  setDataFimPeriodo(periodo.fim)
}, [referenciaMesLote])

useEffect(() => {
  carregarDados()
}, [])

useEffect(() => {
  const listaBase =
    dataInicioPeriodo && dataFimPeriodo
      ? pacientes.filter((p) =>
          pacienteEstavaAtivoNoPeriodo(
            p,
            dataInicioPeriodo,
            dataFimPeriodo,
            historicoStatus
          )
        )
      : pacientes

  const lista = listaBase.map((p) => {
    const automatico = montarCompetenciaDoPacienteNoMes(
      referenciaMesLote,
      p
    )

    return {
      patient_id: p.id,
      nome: p.nome,
      valor_mensal: Number(p.valor_mensal || 0),
      dia_base_pagamento: p.dia_base_pagamento,
      competencia_inicio: automatico.competenciaInicio,
      competencia_fim: automatico.competenciaFim,
      data_vencimento: automatico.dataVencimento,
      servico: servicoLote,
      selecionado: selecionarTodosLote,
    }
  })

  setPacientesLote(lista)
}, [
  pacientes,
  servicoLote,
  referenciaMesLote,
  selecionarTodosLote,
  dataInicioPeriodo,
  dataFimPeriodo,
  historicoStatus,
])

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
      .order("data_vencimento", { ascending: true })

    if (cobrancasError) {
      setMensagem("Erro ao carregar cobranças.")
      return
    }

    const { data: pagamentosData, error: pagamentosError } = await supabase
      .from("service_payments")
      .select(`
        id,
        billing_id,
        patient_id,
        servico,
        valor,
        forma_pagamento,
        observacao,
        data_pagamento,
        competencia_inicio,
        competencia_fim,
        created_at
      `)
      .eq("user_id", user.id)
      .order("data_pagamento", { ascending: false })

    if (pagamentosError) {
      setMensagem("Erro ao carregar pagamentos da cobrança.")
      return
    }

    const { data: historicoData, error: historicoError } = await supabase
  .from("patient_status_history")
  .select("id, patient_id, status, start_date, end_date")
  .eq("user_id", user.id)

setPacientes((pacientesData ?? []) as Patient[])
setCobrancas((cobrancasData ?? []) as unknown as ServiceBilling[])
setPagamentos((pagamentosData ?? []) as unknown as ServicePayment[])

if (historicoError) {
  setHistoricoStatus([])
  setMensagem("Histórico de status não carregado. Os pacientes foram exibidos com base no cadastro atual.")
} else {
  setHistoricoStatus((historicoData ?? []) as PatientStatusHistory[])
}

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
        setMensagem(
          pagamentoError?.message ||
            "Cobrança criada, mas houve erro ao registrar o pagamento inicial."
        )
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
        setMensagem(
          "Cobrança e pagamento inicial salvos, mas houve erro ao lançar no financeiro."
        )
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

  async function adicionarPagamento(cobranca: ServiceBilling) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const valor = Number(valorPagamento || 0)

    if (valor <= 0) {
      setMensagem("Informe um valor de pagamento válido.")
      return
    }

    const pagamentosDaCobranca = pagamentos.filter((p) => p.billing_id === cobranca.id)

    const totalPagoOutros = pagamentosDaCobranca
      .filter((p) => p.id !== paymentIdEdicao)
      .reduce((soma, p) => soma + Number(p.valor), 0)

    const emAbertoAtual = Math.max(Number(cobranca.valor_total) - totalPagoOutros, 0)

    if (valor > emAbertoAtual) {
      setMensagem("O pagamento não pode ser maior que o valor em aberto.")
      return
    }

    let paymentIdFinal: number | null = null

    if (paymentIdEdicao) {
      const { error: updateError } = await supabase
        .from("service_payments")
        .update({
          valor,
          forma_pagamento: formaPagamentoOuNull(formaPagamento),
          observacao: textoOuNull(observacaoPagamento),
          data_pagamento: dataPagamento,
        })
        .eq("id", paymentIdEdicao)
        .eq("user_id", user.id)

      if (updateError) {
        setMensagem(updateError.message || "Erro ao editar pagamento.")
        return
      }

      paymentIdFinal = paymentIdEdicao

      const { error: financeiroUpdateError } = await supabase
        .from("financial_transactions")
        .update({
          amount: valor,
          description: `Recebimento de serviço - ${cobranca.servico} - ${cobranca.patients?.nome || "Paciente"}`,
          created_at: new Date(`${dataPagamento}T12:00:00-03:00`).toISOString(),
          paid_at: new Date(`${dataPagamento}T12:00:00-03:00`).toISOString(),
        })
        .eq("user_id", user.id)
        .eq("reference_type", "servico")
        .eq("reference_id", paymentIdEdicao)

      if (financeiroUpdateError) {
        setMensagem("Pagamento editado, mas houve erro ao atualizar o financeiro.")
        await carregarDados()
        return
      }
    } else {
      const { data: pagamentoInserido, error: pagamentoError } = await supabase
        .from("service_payments")
        .insert([
          {
            user_id: user.id,
            billing_id: cobranca.id,
            patient_id: cobranca.patient_id,
            servico: cobranca.servico,
            valor,
            forma_pagamento: formaPagamentoOuNull(formaPagamento),
            observacao: textoOuNull(observacaoPagamento),
            data_pagamento: dataPagamento,
            competencia_inicio: cobranca.competencia_inicio || null,
            competencia_fim: cobranca.competencia_fim || null,
          },
        ])
        .select("id")
        .single()

      if (pagamentoError || !pagamentoInserido) {
        setMensagem(pagamentoError?.message || "Erro ao adicionar pagamento.")
        return
      }

      paymentIdFinal = pagamentoInserido.id

      const nomePaciente = cobranca.patients?.nome || "Paciente"

      const { error: financeiroError } = await supabase
        .from("financial_transactions")
        .insert([
          {
            user_id: user.id,
            type: "entrada",
            amount: valor,
            status: "pago",
            description: `Recebimento de serviço - ${cobranca.servico} - ${nomePaciente}`,
            category: "Serviço",
            reference_type: "servico",
            reference_id: paymentIdFinal,
            created_at: new Date(`${dataPagamento}T12:00:00-03:00`).toISOString(),
            paid_at: new Date(`${dataPagamento}T12:00:00-03:00`).toISOString(),
          },
        ])

      if (financeiroError) {
        setMensagem("Pagamento adicionado, mas houve erro ao lançar no financeiro.")
        await carregarDados()
        return
      }
    }

    const totalPagoFinal = totalPagoOutros + valor
    const novoStatus = totalPagoFinal >= Number(cobranca.valor_total) ? "quitada" : "ativa"

    await supabase
      .from("service_billings")
      .update({ status: novoStatus })
      .eq("id", cobranca.id)
      .eq("user_id", user.id)

    limparFormularioPagamento()
    setMensagem(paymentIdEdicao ? "Pagamento editado com sucesso." : "Pagamento adicionado com sucesso.")
    await carregarDados()
  }

  async function excluirPagamento(cobranca: ServiceBilling, pagamento: ServicePayment) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { error: financeiroDeleteError } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("user_id", user.id)
      .eq("reference_type", "servico")
      .eq("reference_id", pagamento.id)

    if (financeiroDeleteError) {
      setMensagem(
        financeiroDeleteError.message || "Erro ao excluir lançamento financeiro do pagamento."
      )
      return
    }

    const { error: pagamentoDeleteError } = await supabase
      .from("service_payments")
      .delete()
      .eq("id", pagamento.id)
      .eq("user_id", user.id)

    if (pagamentoDeleteError) {
      setMensagem(pagamentoDeleteError.message || "Erro ao excluir pagamento.")
      return
    }

    const pagamentosRestantes = pagamentos
      .filter((p) => p.billing_id === cobranca.id && p.id !== pagamento.id)
      .reduce((soma, p) => soma + Number(p.valor), 0)

    const novoStatus = pagamentosRestantes >= Number(cobranca.valor_total) ? "quitada" : "ativa"

    await supabase
      .from("service_billings")
      .update({ status: novoStatus })
      .eq("id", cobranca.id)
      .eq("user_id", user.id)

    limparFormularioPagamento()
    setMensagem("Pagamento excluído com sucesso.")
    await carregarDados()
  }

  async function cancelarCobranca(cobrancaId: number) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { error } = await supabase
      .from("service_billings")
      .update({ status: "cancelada" })
      .eq("id", cobrancaId)
      .eq("user_id", user.id)

    if (error) {
      setMensagem(error.message || "Erro ao cancelar cobrança.")
      return
    }

    setMensagem("Cobrança cancelada com sucesso.")
    await carregarDados()
  }

  async function excluirCobranca(cobranca: ServiceBilling) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const pagamentosDaCobranca = pagamentos.filter((p) => p.billing_id === cobranca.id)
    const idsPagamentos = pagamentosDaCobranca.map((p) => p.id)

    if (idsPagamentos.length > 0) {
      const { error: financeiroDeleteError } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("user_id", user.id)
        .eq("reference_type", "servico")
        .in("reference_id", idsPagamentos)

      if (financeiroDeleteError) {
        setMensagem(
          financeiroDeleteError.message ||
            "Erro ao excluir lançamentos financeiros da cobrança."
        )
        return
      }

      const { error: pagamentosDeleteError } = await supabase
        .from("service_payments")
        .delete()
        .eq("user_id", user.id)
        .eq("billing_id", cobranca.id)

      if (pagamentosDeleteError) {
        setMensagem(pagamentosDeleteError.message || "Erro ao excluir pagamentos da cobrança.")
        return
      }
    }

    const { error: cobrancaDeleteError } = await supabase
      .from("service_billings")
      .delete()
      .eq("id", cobranca.id)
      .eq("user_id", user.id)

    if (cobrancaDeleteError) {
      setMensagem(cobrancaDeleteError.message || "Erro ao excluir cobrança.")
      return
    }

    if (billingIdExpandido === cobranca.id) {
      setBillingIdExpandido(null)
    }

    limparFormularioPagamento()
    setMensagem("Cobrança excluída com sucesso.")
    await carregarDados()
  }

  function editarPagamentoExistente(cobrancaId: number, pagamento: ServicePayment) {
  setBillingIdExpandido(cobrancaId)
  setBillingIdPagamento(cobrancaId)
  setPaymentIdEdicao(pagamento.id)
  setValorPagamento(String(Number(pagamento.valor)))
  setDataPagamento(pagamento.data_pagamento || hojeInputDate())
  setFormaPagamento(pagamento.forma_pagamento || "Pix")
  setObservacaoPagamento(pagamento.observacao || "")

  setMensagem(`Editando pagamento de R$ ${Number(pagamento.valor).toFixed(2)}.`)
}

function alternarPacienteLote(patientId: number, checked: boolean) {
  setPacientesLote((atual) =>
    atual.map((item) =>
      item.patient_id === patientId ? { ...item, selecionado: checked } : item
    )
  )
}

function atualizarCampoPacienteLote(
  patientId: number,
  campo: keyof PacienteLote,
  valor: string | boolean | number | null
) {
  setPacientesLote((atual) =>
    atual.map((item) =>
      item.patient_id === patientId
        ? {
            ...item,
            [campo]: valor,
          }
        : item
    )
  )
}

async function gerarCobrancasEmLote() {
  setMensagem("")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Você precisa estar logado.")
    return
  }

  const selecionados = pacientesLote.filter((p) => p.selecionado)

  if (selecionados.length === 0) {
    setMensagem("Selecione pelo menos um paciente ativo.")
    return
  }

  if (!referenciaMesLote) {
    setMensagem("Informe o mês de referência do lote.")
    return
  }

  if (!dataInicioPeriodo || !dataFimPeriodo) {
    setMensagem("Informe a data inicial e final do período para localizar os pacientes válidos.")
    return
  } 

  const pacientesValidos = selecionados.filter((item) => {
  const paciente = pacientes.find((p) => p.id === item.patient_id)
  if (!paciente) return false

  return pacienteEstavaAtivoNoPeriodo(
    paciente,
    dataInicioPeriodo,
    dataFimPeriodo,
    historicoStatus
  )
})

  if (pacientesValidos.length === 0) {
    setMensagem("Nenhum paciente válido foi encontrado no período informado.")
    return
  }

  const cobrancasParaInserir = pacientesValidos.map((p) => ({ 
      user_id: user.id,
      patient_id: p.patient_id,
      servico: p.servico,
      competencia_inicio: p.competencia_inicio || null,
      competencia_fim: p.competencia_fim || null,
      data_vencimento: p.data_vencimento,
      data_restante_sugerida: null,
      valor_original: Number(p.valor_mensal || 0),
      desconto_percentual: 0,
      desconto_valor: 0,
      valor_total: Number(p.valor_mensal || 0),
      status: "ativa",
      observacao: "Cobrança gerada em lote",
    }))

  if (cobrancasParaInserir.length === 0) {
    setMensagem("Nenhum paciente ativo válido encontrado para gerar cobranças.")
    return
  }

  const { error: insertError } = await supabase
    .from("service_billings")
    .insert(cobrancasParaInserir)

  if (insertError) {
    setMensagem(insertError.message || "Erro ao gerar cobranças em lote.")
    return
  }

  setMensagem(`${cobrancasParaInserir.length} cobrança(s) gerada(s) com sucesso.`)
  await carregarDados()
}

  function abrirFormularioPagamento(cobranca: CobrancaComResumo) {
    setBillingIdExpandido((atual) => (atual === cobranca.id ? null : cobranca.id))
    setBillingIdPagamento(cobranca.id)
    setPaymentIdEdicao(null)
    setValorPagamento("")
    setDataPagamento(hojeInputDate())
    setFormaPagamento("Pix")
    setObservacaoPagamento("")
  }

  function preencherValorRestante(cobranca: CobrancaComResumo) {
    setBillingIdExpandido(cobranca.id)
    setBillingIdPagamento(cobranca.id)
    setPaymentIdEdicao(null)
    setValorPagamento(String(Number(cobranca.valorEmAberto.toFixed(2))))
    setDataPagamento(hojeInputDate())
    setFormaPagamento("Pix")
    setObservacaoPagamento("")
  }

  function limparFormularioPagamento() {
    setBillingIdPagamento(null)
    setPaymentIdEdicao(null)
    setValorPagamento("")
    setDataPagamento(hojeInputDate())
    setFormaPagamento("Pix")
    setObservacaoPagamento("")
  }

  function limparFiltros() {
    setBusca("")
    setFiltroPaciente("todos")
    setFiltroServico("todos")
    setFiltroStatus("todos")
    setFiltroCompetencia("")
    setSomenteEmAberto(false)
  }

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

  const servicosDisponiveis = useMemo(() => {
    return Array.from(new Set(cobrancas.map((c) => c.servico).filter(Boolean))).sort()
  }, [cobrancas])

  const competenciasDisponiveis = useMemo(() => {
    return Array.from(
      new Set(
        cobrancas
          .map((c) => competenciaMes(c.competencia_inicio || c.data_vencimento))
          .filter(Boolean)
      )
    ).sort()
  }, [cobrancas])

  const cobrancasComResumo = useMemo<CobrancaComResumo[]>(() => {
    return cobrancas.map((c) => {
      const pagamentosDaCobranca = pagamentos.filter((p) => p.billing_id === c.id)
      const valorPago = pagamentosDaCobranca.reduce((soma, p) => soma + Number(p.valor), 0)
      const valorEmAberto = Math.max(Number(c.valor_total) - valorPago, 0)
      const paciente = resumoPacientes.find((p) => p.id === c.patient_id)

      return {
        ...c,
        valorPago,
        valorEmAberto,
        statusVisual: statusVisualDaCobranca(c, valorPago, valorEmAberto),
        proximoPagamentoPaciente: paciente?.proximoPagamento || "-",
        valorMensalPaciente: Number(paciente?.valor_mensal || 0),
        dataEntradaPaciente: paciente?.data_inicio || null,
        pagamentosDaCobranca,
      }
    })
  }, [cobrancas, pagamentos, resumoPacientes])

  const cobrancasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return cobrancasComResumo.filter((c) => {
      const bateBusca =
        !termo ||
        (c.patients?.nome || "").toLowerCase().includes(termo) ||
        (c.servico || "").toLowerCase().includes(termo) ||
        (c.observacao || "").toLowerCase().includes(termo) ||
        labelStatus(c.statusVisual).toLowerCase().includes(termo)

      const batePaciente = filtroPaciente === "todos" || String(c.patient_id) === filtroPaciente
      const bateServico = filtroServico === "todos" || c.servico === filtroServico
      const bateStatus = filtroStatus === "todos" || c.statusVisual === filtroStatus

      const mesCompetencia = competenciaMes(c.competencia_inicio || c.data_vencimento)
      const bateCompetencia = !filtroCompetencia || mesCompetencia === filtroCompetencia

      const bateEmAberto = !somenteEmAberto || c.valorEmAberto > 0

      return (
        bateBusca &&
        batePaciente &&
        bateServico &&
        bateStatus &&
        bateCompetencia &&
        bateEmAberto
      )
    })
  }, [
    busca,
    cobrancasComResumo,
    filtroPaciente,
    filtroServico,
    filtroStatus,
    filtroCompetencia,
    somenteEmAberto,
  ])

  const totais = useMemo(() => {
    const totalCobrado = cobrancasFiltradas.reduce(
      (soma, c) => soma + Number(c.valor_total || 0),
      0
    )
    const totalPago = cobrancasFiltradas.reduce((soma, c) => soma + Number(c.valorPago || 0), 0)
    const totalEmAberto = cobrancasFiltradas.reduce(
      (soma, c) => soma + Number(c.valorEmAberto || 0),
      0
    )
    const vencidas = cobrancasFiltradas.filter((c) => c.statusVisual === "vencida").length
    const parciais = cobrancasFiltradas.filter((c) => c.statusVisual === "parcial").length
    const inadimplentes = new Set(
      cobrancasFiltradas
        .filter((c) => c.statusVisual === "vencida" || c.statusVisual === "parcial")
        .map((c) => c.patient_id)
    ).size

    return {
      totalCobrado,
      totalPago,
      totalEmAberto,
      vencidas,
      parciais,
      inadimplentes,
    }
  }, [cobrancasFiltradas])

  const leituraRapida = useMemo(() => {
    if (cobrancasFiltradas.length === 0) {
      return "Nenhuma cobrança encontrada com os filtros atuais."
    }

    if (totais.vencidas > 0) {
      return `Existem ${totais.vencidas} cobrança(s) vencida(s) e R$ ${totais.totalEmAberto.toFixed(2)} em aberto no filtro atual.`
    }

    if (totais.parciais > 0) {
      return `Há ${totais.parciais} cobrança(s) com pagamento parcial. Use o botão \"Restante\" para acelerar a baixa.`
    }

    if (totais.totalEmAberto <= 0) {
      return "Todas as cobranças filtradas estão quitadas."
    }

    return `Você tem R$ ${totais.totalPago.toFixed(2)} recebidos e R$ ${totais.totalEmAberto.toFixed(2)} em aberto no filtro atual.`
  }, [cobrancasFiltradas, totais])

  return (
    <div>
      <h2 className="page-title">Pagamentos de serviços</h2>
      <p className="page-subtitle">
        Controle cobranças, competência, inadimplência e recebimentos com uma visão mais compacta, no estilo do histórico de vendas.
      </p>

      {mensagem && <div style={mensagemBox}>{mensagem}</div>}

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
            <label>Observação</label>
            <textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
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

        <div style={resumoCobrancaBox}>
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
  <h3 style={{ marginBottom: 12 }}>Gerar cobranças em lote</h3>
  <p style={{ marginTop: 0, color: "#64748b", fontSize: 14 }}>
    Gere cobranças para pacientes ativos com competência e vencimento sugerido pelo dia base de pagamento.
  </p>

  <div className="grid-2">
    <div>
      <label>Serviço do lote</label>
      <select value={servicoLote} onChange={(e) => setServicoLote(e.target.value)}>
        <option value="Pilates">Pilates</option>
        <option value="Fisioterapia">Fisioterapia</option>
        <option value="Academia">Academia</option>
        <option value="Avaliação">Avaliação</option>
        <option value="Outro">Outro</option>
      </select>
    </div>

    <div>
      <label>Selecionar todos os listados</label>
      <select
        value={selecionarTodosLote ? "sim" : "nao"}
        onChange={(e) => setSelecionarTodosLote(e.target.value === "sim")}
      >
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </div>

    <div>
  <label>Data inicial do período</label>
  <input
    type="date"
    value={dataInicioPeriodo}
    readOnly
  />
</div>

<div>
  <label>Data final do período</label>
  <input
    type="date"
    value={dataFimPeriodo}
    readOnly
  />
</div>

    <div>
      <label>Mês de referência do lote</label>
      <input
        type="date"
        value={referenciaMesLote}
        onChange={(e) => setReferenciaMesLote(e.target.value)}
      />
    </div>

    <div>
      <label>Regra automática</label>
      <div
        style={{
          minHeight: 42,
          display: "flex",
          alignItems: "center",
          padding: "10px 12px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          background: "#f8fafc",
          color: "#475569",
          fontSize: 14,
        }}
      >
        Serão listados apenas os pacientes que estavam ativos no mês de referência
      </div>
    </div>
  </div>

  <div style={{ marginTop: 16 }}>
    <strong>Pacientes ativos do lote</strong>
  </div>

  <div className="data-table-wrap" style={{ marginTop: 10 }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
  <th style={th}>Sel.</th>
  <th style={th}>Paciente</th>
  <th style={th}>Serviço</th>
  <th style={th}>Valor</th>
  <th style={th}>Dia base</th>
  <th style={th}>Competência início</th>
  <th style={th}>Competência fim</th>
  <th style={th}>Vencimento sugerido</th>
</tr>
      </thead>
      <tbody>
        {pacientesLote.map((item) => (
          <tr key={item.patient_id}>
            <td style={td}>
              <input
                type="checkbox"
                checked={item.selecionado}
                onChange={(e) => alternarPacienteLote(item.patient_id, e.target.checked)}
              />
            </td>
            <td style={td}>{item.nome}</td>
            <td style={td}>
              <select
                value={item.servico}
                onChange={(e) =>
                  atualizarCampoPacienteLote(item.patient_id, "servico", e.target.value)
                }
              >
                <option value="Pilates">Pilates</option>
                <option value="Fisioterapia">Fisioterapia</option>
                <option value="Academia">Academia</option>
                <option value="Avaliação">Avaliação</option>
                <option value="Outro">Outro</option>
              </select>
            </td>
            <td style={td}>
              <input
                type="number"
                step="0.01"
                value={item.valor_mensal}
                onChange={(e) =>
                  atualizarCampoPacienteLote(
                    item.patient_id,
                    "valor_mensal",
                    Number(e.target.value || 0)
                  )
                }
              />
            </td>
            <td style={td}>{item.dia_base_pagamento || "-"}</td>
            <td style={td}>
  <input
    type="date"
    value={item.competencia_inicio || ""}
    onChange={(e) =>
      atualizarCampoPacienteLote(item.patient_id, "competencia_inicio", e.target.value)
    }
  />
</td>

<td style={td}>
  <input
    type="date"
    value={item.competencia_fim || ""}
    onChange={(e) =>
      atualizarCampoPacienteLote(item.patient_id, "competencia_fim", e.target.value)
    }
  />
</td>
            <td style={td}>
              <input
                type="date"
                value={item.data_vencimento}
                onChange={(e) =>
                  atualizarCampoPacienteLote(item.patient_id, "data_vencimento", e.target.value)
                }
              />
            </td>
          </tr>
        ))}

        {pacientesLote.length === 0 && (
          <tr>
            <td style={td} colSpan={8}>
              Nenhum paciente encontrado para o mês de referência informado.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  <div style={{ marginTop: 14 }}>
    <button className="btn btn-primary" onClick={gerarCobrancasEmLote}>
      Gerar cobranças em lote
    </button>
  </div>
</div>

      <div className="section-card" style={{ marginBottom: 20 }}>
        <div style={toolbarGrid}>
          <div style={{ gridColumn: "1 / -1" }}>
            <input
              placeholder="Buscar por paciente, serviço, observação ou status"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div>
            <label>Paciente</label>
            <select value={filtroPaciente} onChange={(e) => setFiltroPaciente(e.target.value)}>
              <option value="todos">Todos</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Serviço</label>
            <select value={filtroServico} onChange={(e) => setFiltroServico(e.target.value)}>
              <option value="todos">Todos</option>
              {servicosDisponiveis.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="ativa">Ativa</option>
              <option value="parcial">Parcial</option>
              <option value="quitada">Quitada</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div>
            <label>Competência</label>
            <select
              value={filtroCompetencia}
              onChange={(e) => setFiltroCompetencia(e.target.value)}
            >
              <option value="">Todas</option>
              {competenciasDisponiveis.map((item) => (
                <option key={item} value={item}>
                  {item.split("-").reverse().join("/")}
                </option>
              ))}
            </select>
          </div>

          <div style={checkboxWrap}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={somenteEmAberto}
                onChange={(e) => setSomenteEmAberto(e.target.checked)}
              />
              Somente em aberto
            </label>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={limparFiltros}>
            Limpar filtros
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setFiltroStatus("vencida")
              setSomenteEmAberto(true)
            }}
          >
            Ver inadimplentes
          </button>
        </div>

        <div style={cardsGrid}>
          <div style={miniCard}>
            <span style={cardMiniLabel}>Total cobrado</span>
            <strong style={cardMiniValue}>R$ {totais.totalCobrado.toFixed(2)}</strong>
          </div>
          <div style={miniCard}>
            <span style={cardMiniLabel}>Total pago</span>
            <strong style={cardMiniValue}>R$ {totais.totalPago.toFixed(2)}</strong>
          </div>
          <div style={miniCard}>
            <span style={cardMiniLabel}>Em aberto</span>
            <strong style={cardMiniValue}>R$ {totais.totalEmAberto.toFixed(2)}</strong>
          </div>
          <div style={miniCard}>
            <span style={cardMiniLabel}>Vencidas</span>
            <strong style={cardMiniValue}>{totais.vencidas}</strong>
          </div>
          <div style={miniCard}>
            <span style={cardMiniLabel}>Parciais</span>
            <strong style={cardMiniValue}>{totais.parciais}</strong>
          </div>
          <div style={miniCard}>
            <span style={cardMiniLabel}>Pacientes em atenção</span>
            <strong style={cardMiniValue}>{totais.inadimplentes}</strong>
          </div>
        </div>

        <div style={leituraRapidaBox}>
          <strong>Leitura rápida:</strong> {leituraRapida}
        </div>
      </div>

      <div className="section-card">
        <div className="data-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Paciente</th>
                <th style={th}>Serviço</th>
                <th style={th}>Valor final</th>
                <th style={th}>Pago</th>
                <th style={th}>Em aberto</th>
                <th style={th}>Competência</th>
                <th style={th}>Vencimento</th>
                <th style={th}>Próximo pagto</th>
                <th style={th}>Status</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {cobrancasFiltradas.map((c) => {
                const expandido =
  billingIdExpandido === c.id || billingIdPagamento === c.id

                return (
                  <Fragment key={c.id}>
                    <tr
                      style={
                        c.statusVisual === "vencida"
                          ? linhaVencida
                          : c.statusVisual === "parcial"
                          ? linhaParcial
                          : undefined
                      }
                    >
                      <td style={td}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong>{c.patients?.nome || "-"}</strong>
                          <span style={subInfo}>
                            Mensal: R$ {Number(c.valorMensalPaciente || 0).toFixed(2)}
                          </span>
                          <span style={subInfo}>
                            Entrada: {formatarData(c.dataEntradaPaciente)}
                          </span>
                        </div>
                      </td>
                      <td style={td}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong>{c.servico || "-"}</strong>
                          <span style={subInfo}>
                            Original: R$ {Number(c.valor_original).toFixed(2)}
                          </span>
                          <span style={subInfo}>
                            Desconto:{" "}
                            {Number(c.desconto_percentual || 0) > 0
                              ? `${Number(c.desconto_percentual).toFixed(2)}%`
                              : `R$ ${Number(c.desconto_valor || 0).toFixed(2)}`}
                          </span>
                        </div>
                      </td>
                      <td style={td}>R$ {Number(c.valor_total).toFixed(2)}</td>
                      <td style={td}>R$ {Number(c.valorPago).toFixed(2)}</td>
                      <td style={td}>R$ {Number(c.valorEmAberto).toFixed(2)}</td>
                      <td style={td}>{formatarCompetencia(c.competencia_inicio, c.competencia_fim)}</td>
                      <td style={td}>{formatarData(c.data_vencimento)}</td>
                      <td style={td}>{c.proximoPagamentoPaciente}</td>
                      <td style={td}>
                        <span style={badgeStatus(c.statusVisual)}>{labelStatus(c.statusVisual)}</span>
                      </td>
                      <td style={td}>
                        <div style={acoesGridCompacta}>
                          {c.statusVisual !== "cancelada" && (
  <>
    {c.valorEmAberto > 0 && (
      <>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => abrirFormularioPagamento(c)}
        >
          {billingIdExpandido === c.id && billingIdPagamento === c.id && !paymentIdEdicao
            ? "Fechar"
            : "Receber"}
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => preencherValorRestante(c)}
        >
          Restante
        </button>
      </>
    )}

    {billingIdExpandido === c.id && (
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          if (billingIdExpandido === c.id) {
            setBillingIdExpandido(null)
            limparFormularioPagamento()
          }
        }}
      >
        Minimizar
      </button>
    )}
  </>
)}
{c.pagamentosDaCobranca.length > 0 && (
  <button
    type="button"
    className="btn btn-secondary btn-sm"
    onClick={() => {
      if (billingIdExpandido === c.id) {
        setBillingIdExpandido(null)
        limparFormularioPagamento()
      } else {
        setBillingIdExpandido(c.id)
      }
    }}
  >
    {billingIdExpandido === c.id ? "Ocultar pagamentos" : "Ver pagamentos"}
  </button>
)}

{c.statusVisual !== "cancelada" && (
  <button
    className="btn btn-danger btn-sm"
    onClick={() => cancelarCobranca(c.id)}
  >
    Cancelar
  </button>
)}

                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => excluirCobranca(c)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandido && (
                      <tr>
                        <td style={{ ...td, background: "#f8fafc" }} colSpan={10}>
                          <div style={blocoDetalhes}>
                            {c.statusVisual !== "cancelada" &&
  (c.valorEmAberto > 0 || (billingIdPagamento === c.id && !!paymentIdEdicao)) && (
    <div style={painelPagamento}>
                                <strong style={{ marginBottom: 8 }}>
  {billingIdPagamento === c.id && paymentIdEdicao
    ? "Editar pagamento"
    : "Registrar pagamento"}
</strong>

                                <div style={formPagamentoGrid}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Valor do pagamento"
                                    value={billingIdPagamento === c.id ? valorPagamento : ""}
                                    onChange={(e) => {
                                      setBillingIdPagamento(c.id)
                                      setValorPagamento(e.target.value)
                                    }}
                                  />
                                  <input
                                    type="date"
                                    value={billingIdPagamento === c.id ? dataPagamento : hojeInputDate()}
                                    onChange={(e) => {
                                      setBillingIdPagamento(c.id)
                                      setDataPagamento(e.target.value)
                                    }}
                                  />
                                  <select
                                    value={billingIdPagamento === c.id ? formaPagamento : "Pix"}
                                    onChange={(e) => {
                                      setBillingIdPagamento(c.id)
                                      setFormaPagamento(e.target.value)
                                    }}
                                  >
                                    <option value="Pix">Pix</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Cartão de débito">Cartão de débito</option>
                                    <option value="Cartão de crédito">Cartão de crédito</option>
                                    <option value="Transferência">Transferência</option>
                                    <option value="Outro">Outro</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Observação"
                                    value={billingIdPagamento === c.id ? observacaoPagamento : ""}
                                    onChange={(e) => {
                                      setBillingIdPagamento(c.id)
                                      setObservacaoPagamento(e.target.value)
                                    }}
                                  />
                                </div>

                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                                  <button className="btn btn-primary btn-sm" onClick={() => adicionarPagamento(c)}>
                                    {paymentIdEdicao ? "Salvar edição" : "Adicionar pagamento"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                      limparFormularioPagamento()
                                      setBillingIdExpandido(null)
                                    }}
                                  >
                                    Fechar painel
                                  </button>
                                </div>
                              </div>
                            )}

                            <div style={painelHistorico}>
                              <strong style={{ marginBottom: 8 }}>Pagamentos da cobrança</strong>

                              {c.pagamentosDaCobranca.length > 0 ? (
                                <div style={{ display: "grid", gap: 8 }}>
                                  {c.pagamentosDaCobranca.map((p) => (
                                    <div key={p.id} style={pagamentoItem}>
                                      <div style={{ display: "grid", gap: 4 }}>
                                        <span>
                                          <strong>Valor:</strong> R$ {Number(p.valor).toFixed(2)}
                                        </span>
                                        <span>
                                          <strong>Data:</strong> {formatarData(p.data_pagamento)}
                                        </span>
                                        <span>
                                          <strong>Forma:</strong> {p.forma_pagamento || "-"}
                                        </span>
                                        <span>
                                          <strong>Obs.:</strong> {p.observacao || "-"}
                                        </span>
                                        <span style={subInfo}>
                                          Registrado em {formatarDataHoraIso(p.created_at)}
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <button
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => editarPagamentoExistente(c.id, p)}
                                        >
                                          Editar pagamento
                                        </button>
                                        <button
                                          className="btn btn-danger btn-sm"
                                          onClick={() => excluirPagamento(c, p)}
                                        >
                                          Excluir pagamento
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ margin: 0, color: "#64748b" }}>
                                  Ainda não há pagamentos nessa cobrança.
                                </p>
                              )}

                              {c.observacao && (
                                <div style={observacaoBox}>
                                  <strong>Observação da cobrança:</strong> {c.observacao}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}

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
  fontSize: 13,
  color: "#475569",
  whiteSpace: "nowrap" as const,
}

const td = {
  borderBottom: "1px solid #e5e7eb",
  padding: "12px",
  verticalAlign: "top" as const,
  fontSize: 14,
}

const linhaVencida = {
  background: "#fff7ed",
}

const linhaParcial = {
  background: "#f8fafc",
}

const subInfo = {
  fontSize: 12,
  color: "#64748b",
}

const mensagemBox: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
}

const resumoCobrancaBox: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#f8fafc",
  display: "grid",
  gap: 6,
}

const toolbarGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
}

const checkboxWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "end",
}

const cardsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 16,
}

const miniCard: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
}

const cardMiniLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#64748b",
  marginBottom: 6,
}

const cardMiniValue: React.CSSProperties = {
  fontSize: 22,
  color: "#0f172a",
}

const leituraRapidaBox: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 14,
}

const acoesGridCompacta: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
}

const blocoDetalhes: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(300px, 420px) minmax(320px, 1fr)",
  gap: 16,
}

const painelPagamento: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  minWidth: 0,
}

const painelHistorico: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  minWidth: 0,
}

const formPagamentoGrid: React.CSSProperties = {
  display: "grid",
  gap: 8,
}

const pagamentoItem: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  background: "#fff",
}

const observacaoBox: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 14,
}

function badgeStatus(status: CobrancaComResumo["statusVisual"]): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  }

  if (status === "quitada") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    }
  }

  if (status === "parcial") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
    }
  }

  if (status === "vencida") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#b91c1c",
    }
  }

  if (status === "cancelada") {
    return {
      ...base,
      background: "#e5e7eb",
      color: "#374151",
    }
  }

  return {
    ...base,
    background: "#fef3c7",
    color: "#92400e",
  }
}
