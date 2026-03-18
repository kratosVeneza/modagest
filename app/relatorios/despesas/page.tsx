"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { montarCabecalhoPDF } from "@/lib/pdfHeader"
import { imageUrlToDataUrl } from "@/lib/imageToDataUrl"
import HelpTooltip from "../../components/HelpTooltip"
import HelpBanner from "../../components/InfoBanner"

type FinancialTransaction = {
  id: number
  type: "entrada" | "saida"
  description: string
  category: string | null
  amount: number
  status: "pago" | "pendente"
  due_date: string | null
  paid_at: string | null
  created_at: string
  user_id: string
}

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

type ExpenseRow = {
  id: number
  data: string
  descricao: string
  categoria: string
  valor: number
  status: "pago" | "pendente"
  vencimento: string | null
  pagamento: string | null
}

type Periodo = "hoje" | "7dias" | "30dias" | "mes" | "tudo"

const periodos: { value: Periodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "7 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "tudo", label: "Tudo" },
]

export default function RelatorioDespesasPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [periodo, setPeriodo] = useState<Periodo>("30dias")
  const [busca, setBusca] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [nomeLoja, setNomeLoja] = useState("ModaGest")
  const [logoUrl, setLogoUrl] = useState("")

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      setCarregando(false)
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

    const { data, error } = await supabase
      .from("financial_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "saida")
      .order("created_at", { ascending: false })

    if (error) {
      setMensagem("Erro ao carregar relatório de despesas.")
      setCarregando(false)
      return
    }

    setTransactions((data ?? []) as FinancialTransaction[])
    setCarregando(false)
  }

  function getPeriodoRange() {
    const agora = new Date()

    if (periodo === "tudo") {
      return { inicio: null as Date | null, fim: null as Date | null }
    }

    if (periodo === "hoje") {
      const inicio = new Date()
      inicio.setHours(0, 0, 0, 0)
      return { inicio, fim: agora }
    }

    if (periodo === "7dias") {
      const inicio = new Date()
      inicio.setDate(agora.getDate() - 6)
      inicio.setHours(0, 0, 0, 0)
      return { inicio, fim: agora }
    }

    if (periodo === "30dias") {
      const inicio = new Date()
      inicio.setDate(agora.getDate() - 29)
      inicio.setHours(0, 0, 0, 0)
      return { inicio, fim: agora }
    }

    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
    return { inicio, fim: agora }
  }

  function inPeriodo(dataIso: string | null) {
    if (!dataIso) return false
    const { inicio, fim } = getPeriodoRange()
    if (!inicio || !fim) return true
    const data = new Date(dataIso)
    return data >= inicio && data <= fim
  }

  const expenseRows = useMemo<ExpenseRow[]>(() => {
    return transactions
      .filter((item) => inPeriodo(item.paid_at || item.due_date || item.created_at))
      .map((item) => ({
        id: item.id,
        data: item.paid_at || item.due_date || item.created_at,
        descricao: item.description,
        categoria: item.category || "Outros",
        valor: Number(item.amount),
        status: item.status,
        vencimento: item.due_date,
        pagamento: item.paid_at,
      }))
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [transactions, periodo])

  const expenseRowsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return expenseRows

    return expenseRows.filter((item) => {
      return (
        item.descricao.toLowerCase().includes(termo) ||
        item.categoria.toLowerCase().includes(termo) ||
        item.status.toLowerCase().includes(termo)
      )
    })
  }, [expenseRows, busca])

  const resumo = useMemo(() => {
    const pagas = expenseRowsFiltrados
      .filter((item) => item.status === "pago")
      .reduce((acc, item) => acc + item.valor, 0)

    const pendentes = expenseRowsFiltrados
      .filter((item) => item.status === "pendente")
      .reduce((acc, item) => acc + item.valor, 0)

    const total = expenseRowsFiltrados.reduce((acc, item) => acc + item.valor, 0)

    return {
      pagas,
      pendentes,
      total,
      quantidade: expenseRowsFiltrados.length,
    }
  }, [expenseRowsFiltrados])

  function formatarData(dataIso: string | null) {
    if (!dataIso) return "-"
    return new Date(dataIso).toLocaleString("pt-BR")
  }

  function exportarCSV() {
    if (expenseRowsFiltrados.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const linhas = [
      ["Data", "Descrição", "Categoria", "Valor", "Status", "Vencimento", "Pagamento"],
      ...expenseRowsFiltrados.map((r) => [
        formatarData(r.data),
        r.descricao,
        r.categoria,
        r.valor.toFixed(2),
        r.status,
        formatarData(r.vencimento),
        formatarData(r.pagamento),
      ]),
    ]

    const conteudo = linhas
      .map((linha) =>
        linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n")

    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "relatorio_despesas.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPDF() {
    if (expenseRowsFiltrados.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const doc = new jsPDF()
    const logoDataUrl = await imageUrlToDataUrl(logoUrl)

    const startY = await montarCabecalhoPDF({
      doc,
      titulo: "Relatório de Despesas",
      nomeLoja,
      logoDataUrl,
    })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Despesas pagas: R$ ${resumo.pagas.toFixed(2)}`, 14, startY)
    doc.text(`Despesas pendentes: R$ ${resumo.pendentes.toFixed(2)}`, 14, startY + 6)
    doc.text(`Total de despesas: R$ ${resumo.total.toFixed(2)}`, 14, startY + 12)

    autoTable(doc, {
      startY: startY + 20,
      head: [["Data", "Descrição", "Categoria", "Valor", "Status"]],
      body: expenseRowsFiltrados.map((r) => [
        formatarData(r.data),
        r.descricao,
        r.categoria,
        `R$ ${r.valor.toFixed(2)}`,
        r.status,
      ]),
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [220, 38, 38] },
    })

    doc.save("relatorio_despesas.pdf")
  }

  return (
    <div>
      <h2 className="page-title">Relatório de Despesas</h2>
      <p className="page-subtitle">
        Acompanhe os gastos pagos e pendentes da operação.
      </p>

      <HelpBanner
        title="Como usar este relatório"
        text="Aqui você vê as despesas lançadas no financeiro, com categoria, valor, status e datas. É ideal para acompanhar custos como marketing, frete, aluguel, internet e fornecedores."
      />

      {mensagem && <p>{mensagem}</p>}

      <div className="period-filter">
        {periodos.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`period-btn ${periodo === item.value ? "active" : ""}`}
            onClick={() => setPeriodo(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={acoesTopo}>
        <input
          placeholder="Buscar por descrição, categoria ou status"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={inputBusca}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={exportarCSV} className="btn btn-secondary">
            Exportar CSV
          </button>
          <button onClick={exportarPDF} className="btn btn-primary">
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Despesas pagas
            <HelpTooltip text="Soma das despesas marcadas como pagas no filtro atual." />
          </h3>
          <p>R$ {resumo.pagas.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Despesas pendentes
            <HelpTooltip text="Soma das despesas ainda não pagas no filtro atual." />
          </h3>
          <p>R$ {resumo.pendentes.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Total
            <HelpTooltip text="Soma de todas as despesas mostradas no filtro atual." />
          </h3>
          <p>R$ {resumo.total.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Quantidade
            <HelpTooltip text="Quantidade de lançamentos de despesas encontrados." />
          </h3>
          <p>{resumo.quantidade}</p>
        </div>
      </div>

      <div className="section-card">
        <div style={headerBloco}>
          <div>
            <h3 style={{ margin: 0 }}>Lista de despesas</h3>
            <p style={subBloco}>{expenseRowsFiltrados.length} despesa(s)</p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table style={tabela}>
            <thead>
              <tr>
                <th style={th}>Data</th>
                <th style={th}>Descrição</th>
                <th style={th}>Categoria</th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Valor
                    <HelpTooltip text="Valor lançado para a despesa." />
                  </span>
                </th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Status
                    <HelpTooltip text="Indica se a despesa já foi paga ou ainda está pendente." />
                  </span>
                </th>
                <th style={th}>Vencimento</th>
                <th style={th}>Pagamento</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td style={tdVazio} colSpan={7}>
                    Carregando...
                  </td>
                </tr>
              ) : expenseRowsFiltrados.length > 0 ? (
                expenseRowsFiltrados.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{formatarData(r.data)}</td>
                    <td style={td}>{r.descricao}</td>
                    <td style={td}>{r.categoria}</td>
                    <td style={td}>R$ {r.valor.toFixed(2)}</td>
                    <td style={td}>
                      <span
                        className={
                          r.status === "pago"
                            ? "status-pill status-green"
                            : "status-pill status-yellow"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={td}>{formatarData(r.vencimento)}</td>
                    <td style={td}>{formatarData(r.pagamento)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={tdVazio} colSpan={7}>
                    Nenhuma despesa encontrada no período.
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
  minWidth: "280px",
  flex: 1,
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
}

const headerBloco = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "16px",
  flexWrap: "wrap" as const,
}

const subBloco = {
  margin: "4px 0 0 0",
  color: "#6b7280",
  fontSize: "14px",
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

const tituloComAjuda = {
  display: "inline-flex",
  alignItems: "center",
}
