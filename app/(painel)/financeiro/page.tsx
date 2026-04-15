"use client"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { montarCabecalhoPDF } from "@/lib/pdfHeader"
import { imageUrlToDataUrl } from "@/lib/imageToDataUrl"
import AnimatedModal from "../../components/AnimatedModal"
import HelpTooltip from "../../components/HelpTooltip"
import HelpBanner from "../../components/InfoBanner"
import { getMyPlanAccess } from "@/lib/getMyPlanAccess"
import {
  getFinancialTransactions,
  type FinancialTransaction,
} from "@/lib/services/financial/getFinancialTransactions"
import FeatureBlockedCard from "@/app/components/FeatureBlockedCard"
import { createFinancialTransaction } from "@/lib/services/financial/createFinancialTransaction"
import { updateFinancialTransaction } from "@/lib/services/financial/updateFinancialTransaction"
import { deleteFinancialTransaction } from "@/lib/services/financial/deleteFinancialTransaction"
import { markFinancialTransactionPaid } from "@/lib/services/financial/markFinancialTransactionPaid"


type SalePayment = {
  id: number
  sale_id: number
  valor: number
  forma_pagamento: string
  observacao: string | null
  created_at: string
}

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

type LinhaFinanceira = {
  origem: "venda" | "manual"
  id: string
  tipo: "entrada" | "saida"
  descricao: string
  categoria: string
  valor: number
  status: "pago" | "pendente"
  vencimento: string | null
  pagamento: string | null
  criadoEm: string
  formaPagamento?: string
}

type SaleResumo = {
  id: number
  status: string | null
  valor_total: number
  created_at: string
  products?: { nome: string } | null
  customers?: { nome: string } | null
}

const categorias = [
  "Fornecedor",
  "Aluguel",
  "Energia",
  "Internet",
  "Funcionário",
  "Frete",
  "Marketing",
  "Imposto",
  "Retirada",
  "Entrada extra",
  "Outros",
]

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function formatarDataInput(dataIso?: string | null) {
  if (!dataIso) return ""
  const data = new Date(dataIso)
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, "0")
  const dia = String(data.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function montarDataISO(dataInput: string) {
  if (!dataInput) return null
  return new Date(`${dataInput}T12:00:00-03:00`).toISOString()
}

export default function Financeiro() {
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [pagamentosVendas, setPagamentosVendas] = useState<SalePayment[]>([])
  const [movimentacoes, setMovimentacoes] = useState<FinancialTransaction[]>([])
  const [vendas, setVendas] = useState<SaleResumo[]>([])
  const [mensagem, setMensagem] = useState("")
  const [nomeLoja, setNomeLoja] = useState("ModaGest")
  const [logoUrl, setLogoUrl] = useState("")
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("Todos")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [modalAberto, setModalAberto] = useState(false)
  const [idEdicao, setIdEdicao] = useState<number | null>(null)
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida")
  const [descricao, setDescricao] = useState("")
  const [categoria, setCategoria] = useState("Fornecedor")
  const [valor, setValor] = useState("")
  const [status, setStatus] = useState<"pago" | "pendente">("pendente")
  const [dataVencimento, setDataVencimento] = useState("")
  const [dataPagamento, setDataPagamento] = useState("")

  useEffect(() => {
    validarAcesso()
  }, [])

  useEffect(() => {
    if (hasAccess) {
      carregarFinanceiro()
    }
  }, [hasAccess])

  async function validarAcesso() {
    const result = await getMyPlanAccess("financeiro")
    setHasAccess(result.hasAccess)
    setLoadingAccess(false)
  }

  async function carregarFinanceiro() {
  setMensagem("")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Você precisa estar logado.")
    return
  }

  const { data: lojaData } = await supabase
    .from("stores")
    .select("nome_loja, logo_url")
    .eq("user_id", user.id)
    .maybeSingle()

  const loja = (lojaData ?? null) as Loja | null

  if (loja?.nome_loja) setNomeLoja(loja.nome_loja)
  if (loja?.logo_url) setLogoUrl(loja.logo_url)

  const { data: pagamentosData, error: pagamentosError } = await supabase
    .from("sale_payments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (pagamentosError) {
    setMensagem("Erro ao carregar recebimentos de vendas.")
    return
  }

  const { data: vendasData, error: vendasError } = await supabase
  .from("sales")
  .select(`
    id,
    status,
    valor_total,
    created_at,
    products (nome),
    customers (nome)
  `)
  .eq("user_id", user.id)

  if (vendasError) {
    setMensagem("Erro ao carregar vendas.")
    return
  }

  const vendasLista = (vendasData ?? []) as unknown as SaleResumo[]

  const vendasAtivas = vendasLista.filter(
  (v) => v.status !== "Cancelada"
)

  const idsVendasAtivas = new Set(vendasAtivas.map((v) => v.id))

  const pagamentosLista = (pagamentosData ?? []) as unknown as SalePayment[]

  const pagamentosValidos = pagamentosLista.filter((p) =>
  idsVendasAtivas.has(p.sale_id)
)

  const resultadoMovimentacoes = await getFinancialTransactions(user.id)

  if (!resultadoMovimentacoes.success) {
    setMensagem(resultadoMovimentacoes.message)
    return
  }

  setPagamentosVendas(pagamentosValidos)
  setVendas(vendasAtivas)
  setMovimentacoes(resultadoMovimentacoes.transactions)

}

  function abrirNovoModal() {
    setIdEdicao(null)
    setTipo("saida")
    setDescricao("")
    setCategoria("Fornecedor")
    setValor("")
    setStatus("pendente")
    setDataVencimento(hojeInputDate())
    setDataPagamento("")
    setModalAberto(true)
  }

  function abrirEdicao(item: FinancialTransaction) {
    setIdEdicao(item.id)
    setTipo(item.type)
    setDescricao(item.description)
    setCategoria(item.category || "Outros")
    setValor(String(item.amount))
    setStatus(item.status)
    setDataVencimento(formatarDataInput(item.due_date))
    setDataPagamento(formatarDataInput(item.paid_at))
    setModalAberto(true)
  }

  function fecharModal() {
    setIdEdicao(null)
    setTipo("saida")
    setDescricao("")
    setCategoria("Fornecedor")
    setValor("")
    setStatus("pendente")
    setDataVencimento("")
    setDataPagamento("")
    setModalAberto(false)
  }

  async function salvarMovimentacao() {
  setMensagem("")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Você precisa estar logado.")
    return
  }

  if (!descricao.trim() || Number(valor || 0) <= 0) {
    setMensagem("Informe descrição e valor válido.")
    return
  }

  if (status === "pago" && !dataPagamento) {
    setMensagem("Informe a data de pagamento.")
    return
  }

  const payload = {
    userId: user.id,
    type: tipo,
    description: descricao.trim(),
    category: categoria || null,
    amount: Number(valor),
    status,
    due_date: montarDataISO(dataVencimento),
    paid_at: status === "pago" ? montarDataISO(dataPagamento) : null,
  }

  if (idEdicao) {
    const result = await updateFinancialTransaction({
      ...payload,
      id: idEdicao,
    })

    if (!result.success) {
      setMensagem(result.message)
      return
    }
  } else {
    const result = await createFinancialTransaction(payload)

    if (!result.success) {
      setMensagem(result.message)
      return
    }
  }

  fecharModal()
  await carregarFinanceiro()
}

  async function excluirMovimentacao(id: number) {
  setMensagem("")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Você precisa estar logado.")
    return
  }

  const result = await deleteFinancialTransaction(id, user.id)

  if (!result.success) {
    setMensagem(result.message)
    return
  }

  await carregarFinanceiro()
}

  async function marcarComoPago(item: FinancialTransaction) {
  setMensagem("")

  if (item.status === "pago") return

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Você precisa estar logado.")
    return
  }

  const result = await markFinancialTransactionPaid(item.id, user.id)

  if (!result.success) {
    setMensagem(result.message)
    return
  }

  await carregarFinanceiro()
}


  function formatarData(dataIso?: string | null) {
    if (!dataIso) return "-"
    return new Date(dataIso).toLocaleString("pt-BR")
  }

  const linhasFinanceiras = useMemo<LinhaFinanceira[]>(() => {
  const recebimentosVendas: LinhaFinanceira[] = pagamentosVendas.map((p) => {
  const vendaRelacionada = vendas.find((v) => v.id === p.sale_id)

  const nomeProduto = vendaRelacionada?.products?.nome || "Produto"
  const nomeCliente = vendaRelacionada?.customers?.nome || ""

  return {
    origem: "venda",
    id: `venda-pagamento-${p.id}`,
    tipo: "entrada",
    descricao: `Venda - ${nomeProduto}${nomeCliente ? ` (${nomeCliente})` : ""}`,
    categoria: "Venda",
    valor: Number(p.valor),
    status: "pago",
    vencimento: p.created_at,
    pagamento: p.created_at,
    criadoEm: p.created_at,
    formaPagamento: p.forma_pagamento,
  }
})

  const totalPagoPorVenda = new Map<number, number>()

  for (const pagamento of pagamentosVendas) {
    const atual = totalPagoPorVenda.get(pagamento.sale_id) || 0
    totalPagoPorVenda.set(
      pagamento.sale_id,
      atual + Number(pagamento.valor || 0)
    )
  }

  const vendasPendentes = vendas.reduce<LinhaFinanceira[]>((acc, v) => {
  const totalVenda = Number(v.valor_total || 0)
  const totalPago = totalPagoPorVenda.get(v.id) || 0
  const valorPendente = totalVenda - totalPago

  const nomeProduto = v.products?.nome || "Produto"
  const nomeCliente = v.customers?.nome || ""

  if (valorPendente > 0) {
    acc.push({
      origem: "venda",
      id: `venda-pendente-${v.id}`,
      tipo: "entrada",
      descricao: `Pendente - ${nomeProduto}${nomeCliente ? ` (${nomeCliente})` : ""}`,
      categoria: "Venda",
      valor: valorPendente,
      status: "pendente",
      vencimento: v.created_at,
      pagamento: "",
      criadoEm: v.created_at,
      formaPagamento: "",
    })
  }

  return acc
}, [])

  const linhasManuais: LinhaFinanceira[] = movimentacoes.map((m) => ({
    origem: "manual",
    id: `manual-${m.id}`,
    tipo: m.type,
    descricao: m.description,
    categoria: m.category || "Outros",
    valor: Number(m.amount),
    status: m.status,
    vencimento: m.due_date,
    pagamento: m.paid_at,
    criadoEm: m.created_at,
  }))

  return [...recebimentosVendas, ...vendasPendentes, ...linhasManuais].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  )
}, [pagamentosVendas, vendas, movimentacoes])

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return linhasFinanceiras.filter((item) => {
      const produtoExtraido =
  item.origem === "venda"
    ? item.descricao.replace(/^Venda - /, "").replace(/^Pendente - /, "").split(" (")[0].toLowerCase()
    : ""

const clienteExtraido =
  item.origem === "venda" && item.descricao.includes("(")
    ? item.descricao.split("(")[1]?.replace(")", "").toLowerCase()
    : ""

const passouBusca =
  !termo ||
  item.descricao.toLowerCase().includes(termo) ||
  item.categoria.toLowerCase().includes(termo) ||
  (item.formaPagamento || "").toLowerCase().includes(termo) ||
  produtoExtraido.includes(termo) ||
  (clienteExtraido || "").includes(termo)

      const passouStatus =
        filtroStatus === "Todos" || item.status === filtroStatus

      const passouTipo =
        filtroTipo === "Todos" || item.tipo === filtroTipo

      return passouBusca && passouStatus && passouTipo
    })
  }, [linhasFinanceiras, busca, filtroStatus, filtroTipo])

  const entradasRecebidas = useMemo(() => {
    return linhasFinanceiras
      .filter((i) => i.tipo === "entrada" && i.status === "pago")
      .reduce((soma, i) => soma + i.valor, 0)
  }, [linhasFinanceiras])

  const saidasPagas = useMemo(() => {
    return linhasFinanceiras
      .filter((i) => i.tipo === "saida" && i.status === "pago")
      .reduce((soma, i) => soma + i.valor, 0)
  }, [linhasFinanceiras])

  const saldoAtual = entradasRecebidas - saidasPagas

  const entradasPendentes = useMemo(() => {
    return linhasFinanceiras
      .filter((i) => i.tipo === "entrada" && i.status === "pendente")
      .reduce((soma, i) => soma + i.valor, 0)
  }, [linhasFinanceiras])

  const saidasPendentes = useMemo(() => {
    return linhasFinanceiras
      .filter((i) => i.tipo === "saida" && i.status === "pendente")
      .reduce((soma, i) => soma + i.valor, 0)
  }, [linhasFinanceiras])

  const saldoPrevisto = saldoAtual + entradasPendentes - saidasPendentes
  const totalPendencias = entradasPendentes + saidasPendentes

  function exportarCSV() {
    if (linhasFiltradas.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const cabecalho = [
      "Origem",
      "Tipo",
      "Descrição",
      "Categoria",
      "Valor",
      "Status",
      "Forma",
      "Vencimento",
      "Pagamento",
      "Criado em",
    ]

    const linhas = linhasFiltradas.map((item) => [
      item.origem,
      item.tipo,
      item.descricao,
      item.categoria,
      item.valor.toFixed(2),
      item.status,
      item.formaPagamento || "-",
      formatarData(item.vencimento),
      formatarData(item.pagamento),
      formatarData(item.criadoEm),
    ])

    const conteudo = [cabecalho, ...linhas]
      .map((linha) =>
        linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n")

    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "financeiro_completo.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPDF() {
    if (linhasFiltradas.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const doc = new jsPDF()
    const logoDataUrl = await imageUrlToDataUrl(logoUrl)

    const startY = await montarCabecalhoPDF({
      doc,
      titulo: "Relatório Financeiro Completo",
      nomeLoja,
      logoDataUrl,
    })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Entradas recebidas: R$ ${entradasRecebidas.toFixed(2)}`, 14, startY)
    doc.text(`Saídas pagas: R$ ${saidasPagas.toFixed(2)}`, 14, startY + 6)
    doc.text(`Saldo atual: R$ ${saldoAtual.toFixed(2)}`, 14, startY + 12)
    doc.text(`Saldo previsto: R$ ${saldoPrevisto.toFixed(2)}`, 14, startY + 18)

    autoTable(doc, {
      startY: startY + 26,
      head: [[
        "Origem",
        "Tipo",
        "Descrição",
        "Categoria",
        "Valor",
        "Status",
        "Forma",
        "Vencimento",
        "Pagamento",
      ]],
      body: linhasFiltradas.map((item) => [
        item.origem,
        item.tipo,
        item.descricao,
        item.categoria,
        `R$ ${item.valor.toFixed(2)}`,
        item.status,
        item.formaPagamento || "-",
        formatarData(item.vencimento),
        formatarData(item.pagamento),
      ]),
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [37, 99, 235] },
    })

    doc.save("financeiro_completo.pdf")
  }

  if (loadingAccess) {
    return <div style={{ padding: 24 }}>Carregando...</div>
  }

  if (!hasAccess) {
    return (
      <div style={{ padding: 24 }}>
        <FeatureBlockedCard
          title="Financeiro é do plano Profissional"
          description="Atualize seu plano para controlar entradas, saídas e lucro da sua loja."
        />
      </div>
    )
  }

  return (
    <div>
      <h2 className="page-title">Financeiro</h2>
      <p className="page-subtitle">
        Controle de caixa com entradas, saídas, pendências e saldo previsto.
      </p>

      <HelpBanner
        title="Como usar o Financeiro"
        text="Cadastre aqui suas despesas e entradas extras, como marketing, frete, aluguel, energia, internet, fornecedores e retiradas. Os recebimentos das vendas entram automaticamente. O saldo atual mostra o que já entrou e saiu. O saldo previsto considera também pendências."
      />

      {mensagem && <p>{mensagem}</p>}

      <div style={acoesTopo}>
        <input
          placeholder="Buscar por descrição, categoria ou forma"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={inputBusca}
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={selectFiltro}
        >
          <option value="Todos">Todos os tipos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          style={selectFiltro}
        >
          <option value="Todos">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={abrirNovoModal} className="btn btn-primary">
            + Nova movimentação
          </button>
          <button onClick={exportarCSV} className="btn btn-secondary">
            Exportar CSV
          </button>
          <button onClick={exportarPDF} className="btn btn-primary">
            Exportar PDF
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: -6,
          marginBottom: 14,
          fontSize: 14,
          color: "#6b7280",
        }}
      >
        Use <strong>+ Nova movimentação</strong> para cadastrar despesas e entradas extras.
      </div>

      <div className="grid-3">
        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Entradas recebidas
            <HelpTooltip text="Soma dos pagamentos já recebidos das vendas e também das entradas manuais marcadas como pagas." />
          </h3>
          <p>R$ {entradasRecebidas.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Saídas pagas
            <HelpTooltip text="Soma das despesas já pagas, como frete, marketing, aluguel, energia e outras saídas manuais." />
          </h3>
          <p>R$ {saidasPagas.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Saldo atual
            <HelpTooltip text="É o resultado das entradas já pagas menos as saídas já pagas. Representa o caixa real neste momento." />
          </h3>
          <p>R$ {saldoAtual.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Entradas pendentes
            <HelpTooltip text="Valores que ainda vão entrar no caixa, mas que ainda não foram marcados como pagos." />
          </h3>
          <p>R$ {entradasPendentes.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Saídas pendentes
            <HelpTooltip text="Despesas que ainda não foram pagas, como boletos, fornecedores, aluguel ou anúncios pendentes." />
          </h3>
          <p>R$ {saidasPendentes.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Saldo previsto
            <HelpTooltip text="Mostra como o caixa ficará se todas as entradas e saídas pendentes forem realizadas." />
          </h3>
          <p>R$ {saldoPrevisto.toFixed(2)}</p>
        </div>
      </div>

      <div className="section-card" style={blocoResumo}>
        <strong>Pendências totais:</strong> R$ {totalPendencias.toFixed(2)}
      </div>

      <div className="data-table-wrap" style={{ marginTop: 20 }}>
        <table style={tabela}>
          <thead>
            <tr>
  <th style={th}>Origem</th>
  <th style={th}>Tipo</th>
  <th style={th}>Produto</th>
  <th style={th}>Cliente</th>
  <th style={th}>Descrição</th>
  <th style={th}>Categoria</th>
  <th style={th}>Valor</th>
  <th style={th}>Status</th>
  <th style={th}>Forma</th>
  <th style={th}>Vencimento</th>
  <th style={th}>Pagamento</th>
  <th style={th}>Criado em</th>
  <th style={th}>Ações</th>
</tr>
          </thead>

          <tbody>
            {linhasFiltradas.map((item) => {
              const movimentacaoManual =
                item.origem === "manual"
                  ? movimentacoes.find((m) => `manual-${m.id}` === item.id)
                  : null

              return (
                <tr key={item.id}>
  <td style={td}>
  <span
    className={
      item.origem === "venda"
        ? "status-pill status-blue"
        : "status-pill status-gray"
    }
  >
    {item.origem === "venda" ? "Automática" : "Manual"}
  </span>
</td>
  <td style={td}>
  <span
    className={
      item.tipo === "entrada"
        ? "status-pill status-green"
        : "status-pill status-red"
    }
  >
    {item.tipo === "entrada" ? "Entrada" : "Saída"}
  </span>
</td>

  <td style={td}>
    {item.origem === "venda"
      ? item.descricao.replace(/^Venda - /, "").replace(/^Pendente - /, "").split(" (")[0]
      : "-"}
  </td>

  <td style={td}>
    {item.origem === "venda" && item.descricao.includes("(")
      ? item.descricao.split("(")[1]?.replace(")", "")
      : "-"}
  </td>

  <td style={td}>{item.descricao}</td>
  <td style={td}>{item.categoria}</td>
  <td style={td}>R$ {item.valor.toFixed(2)}</td>
                  <td style={td}>
                    <span
                      className={
                        item.status === "pago"
                          ? "status-pill status-green"
                          : "status-pill status-yellow"
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={td}>{item.formaPagamento || "-"}</td>
                  <td style={td}>{formatarData(item.vencimento)}</td>
                  <td style={td}>{formatarData(item.pagamento)}</td>
                  <td style={td}>{formatarData(item.criadoEm)}</td>
                  <td style={td}>
                    {item.origem === "manual" && movimentacaoManual ? (
                      <div style={acoesTabela}>
                        {movimentacaoManual.status === "pendente" && (
                          <button
                            onClick={() => marcarComoPago(movimentacaoManual)}
                            className="btn btn-success btn-sm"
                          >
                            Marcar pago
                          </button>
                        )}
                        <button
                          onClick={() => abrirEdicao(movimentacaoManual)}
                          className="btn btn-secondary btn-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => excluirMovimentacao(movimentacaoManual.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#6b7280", fontSize: 13 }}>Automático</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {linhasFiltradas.length === 0 && (
              <tr>
                <td style={tdVazio} colSpan={13}>
  Nenhuma movimentação encontrada.
</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatedModal
        open={modalAberto}
        onClose={fecharModal}
        title={idEdicao ? "Editar movimentação" : "Nova movimentação"}
        footer={
          <>
            <button onClick={fecharModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={salvarMovimentacao} className="btn btn-primary">
              {idEdicao ? "Salvar alterações" : "Salvar movimentação"}
            </button>
          </>
        }
      >
        <>
          <div className="grid-2">
            <div>
              <label style={labelAjuda}>
                Tipo
                <HelpTooltip text="Escolha entrada para valores que aumentam o caixa e saída para despesas ou retiradas." />
              </label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as "entrada" | "saida")}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            <div>
              <label style={labelAjuda}>
                Categoria
                <HelpTooltip text="Classifique a movimentação para facilitar relatórios e análise do caixa." />
              </label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {categorias.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelAjuda}>
                Descrição
                <HelpTooltip text="Descreva claramente a movimentação. Exemplo: anúncio Instagram, frete fornecedor, aluguel da loja." />
              </label>
              <input
                placeholder="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Valor
                <HelpTooltip text="Informe o valor da entrada ou da despesa." />
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Status
                <HelpTooltip text="Use pendente quando o valor ainda não entrou ou não saiu do caixa. Use pago quando já aconteceu." />
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value as "pago" | "pendente")}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>

            <div>
              <label style={labelAjuda}>
                Data de vencimento
                <HelpTooltip text="Data prevista para pagamento ou recebimento da movimentação." />
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>

            {status === "pago" && (
              <div>
                <label style={labelAjuda}>
                  Data de pagamento
                  <HelpTooltip text="Informe a data real em que a movimentação foi paga ou recebida." />
                </label>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                />
              </div>
            )}
          </div>
        </>
      </AnimatedModal>
    </div>
  )
}

const acoesTopo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginTop: "20px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
}

const inputBusca = {
  minWidth: "260px",
  flex: 1,
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
}

const selectFiltro = {
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
}

const blocoResumo = {
  marginTop: "20px",
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

const acoesTabela = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
}

const tituloComAjuda = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
}

const labelAjuda = {
  display: "flex",
  alignItems: "center",
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "6px",
}

