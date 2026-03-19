"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { montarCabecalhoPDF } from "@/lib/pdfHeader"
import { imageUrlToDataUrl } from "@/lib/imageToDataUrl"
import HelpTooltip from "../../../components/HelpTooltip"
import HelpBanner from "../../../components/InfoBanner"

type Sale = {
  id: number
  product_id: number
  customer_id: number | null
  valor_total: number
  status?: string
  user_id: string
}

type SalePayment = {
  id: number
  sale_id: number
  valor: number
  forma_pagamento: string
  observacao: string | null
  created_at: string
  user_id: string
}

type Product = {
  id: number
  nome: string
  sku: string
  marca: string | null
  categoria: string | null
  user_id: string
}

type Customer = {
  id: number
  nome: string
  user_id: string
}

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

type PaymentRow = {
  id: number
  data: string
  vendaId: number
  cliente: string
  produto: string
  sku: string
  forma: string
  valor: number
  observacao: string
}

type FormaResumo = {
  forma: string
  valor: number
}

type Periodo = "hoje" | "7dias" | "30dias" | "mes" | "tudo"

const periodos: { value: Periodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "7 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "tudo", label: "Tudo" },
]

export default function RelatorioRecebimentosPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<SalePayment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
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

    const [
      { data: salesData, error: salesError },
      { data: paymentsData, error: paymentsError },
      { data: productsData, error: productsError },
      { data: customersData, error: customersError },
    ] = await Promise.all([
      supabase.from("sales").select("id, product_id, customer_id, valor_total, status, user_id").eq("user_id", user.id),
      supabase
        .from("sale_payments")
        .select("id, sale_id, valor, forma_pagamento, observacao, created_at, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("id, nome, sku, marca, categoria, user_id")
        .eq("user_id", user.id),
      supabase.from("customers").select("id, nome, user_id").eq("user_id", user.id),
    ])

    if (salesError || paymentsError || productsError || customersError) {
      setMensagem("Erro ao carregar relatório de recebimentos.")
      setCarregando(false)
      return
    }

    setSales((salesData ?? []) as Sale[])
    setPayments((paymentsData ?? []) as SalePayment[])
    setProducts((productsData ?? []) as Product[])
    setCustomers((customersData ?? []) as Customer[])
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

  function inPeriodo(dataIso: string) {
    const { inicio, fim } = getPeriodoRange()
    if (!inicio || !fim) return true
    const data = new Date(dataIso)
    return data >= inicio && data <= fim
  }

  const idsVendasAtivas = useMemo(() => {
    return new Set(sales.filter((sale) => sale.status !== "Cancelada").map((sale) => sale.id))
  }, [sales])

  const paymentRows = useMemo<PaymentRow[]>(() => {
    return payments
      .filter((payment) => idsVendasAtivas.has(payment.sale_id))
      .filter((payment) => inPeriodo(payment.created_at))
      .map((payment) => {
        const sale = sales.find((s) => s.id === payment.sale_id)
        const product = products.find((p) => p.id === sale?.product_id)
        const customer = customers.find((c) => c.id === sale?.customer_id)

        return {
          id: payment.id,
          data: payment.created_at,
          vendaId: payment.sale_id,
          cliente: customer?.nome || "Sem cliente",
          produto: product?.nome || "Produto removido",
          sku: product?.sku || "-",
          forma: payment.forma_pagamento,
          valor: Number(payment.valor),
          observacao: payment.observacao || "-",
        }
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [payments, sales, products, customers, periodo, idsVendasAtivas])

  const paymentRowsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return paymentRows

    return paymentRows.filter((item) => {
      return (
        item.cliente.toLowerCase().includes(termo) ||
        item.produto.toLowerCase().includes(termo) ||
        item.sku.toLowerCase().includes(termo) ||
        item.forma.toLowerCase().includes(termo) ||
        item.observacao.toLowerCase().includes(termo)
      )
    })
  }, [paymentRows, busca])

  const resumo = useMemo(() => {
    const total = paymentRowsFiltrados.reduce((acc, item) => acc + item.valor, 0)
    const quantidade = paymentRowsFiltrados.length
    const ticket = quantidade > 0 ? total / quantidade : 0

    const mapa = new Map<string, number>()
    paymentRowsFiltrados.forEach((item) => {
      mapa.set(item.forma, (mapa.get(item.forma) || 0) + item.valor)
    })

    const porForma: FormaResumo[] = Array.from(mapa.entries())
      .map(([forma, valor]) => ({ forma, valor }))
      .sort((a, b) => b.valor - a.valor)

    return {
      total,
      quantidade,
      ticket,
      porForma,
    }
  }, [paymentRowsFiltrados])

  function formatarData(dataIso: string) {
    return new Date(dataIso).toLocaleString("pt-BR")
  }

  function exportarCSV() {
    if (paymentRowsFiltrados.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const linhas = [
      ["Data", "Venda", "Cliente", "Produto", "SKU", "Forma", "Valor", "Observação"],
      ...paymentRowsFiltrados.map((r) => [
        formatarData(r.data),
        String(r.vendaId),
        r.cliente,
        r.produto,
        r.sku,
        r.forma,
        r.valor.toFixed(2),
        r.observacao,
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
    link.download = "relatorio_recebimentos.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPDF() {
    if (paymentRowsFiltrados.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const doc = new jsPDF()
    const logoDataUrl = await imageUrlToDataUrl(logoUrl)

    const startY = await montarCabecalhoPDF({
      doc,
      titulo: "Relatório de Recebimentos",
      nomeLoja,
      logoDataUrl,
    })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Total recebido: R$ ${resumo.total.toFixed(2)}`, 14, startY)
    doc.text(`Quantidade de recebimentos: ${resumo.quantidade}`, 14, startY + 6)
    doc.text(`Valor médio por recebimento: R$ ${resumo.ticket.toFixed(2)}`, 14, startY + 12)

    autoTable(doc, {
      startY: startY + 20,
      head: [["Data", "Venda", "Cliente", "Produto", "Forma", "Valor"]],
      body: paymentRowsFiltrados.map((r) => [
        formatarData(r.data),
        `#${r.vendaId}`,
        r.cliente,
        r.produto,
        r.forma,
        `R$ ${r.valor.toFixed(2)}`,
      ]),
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [5, 150, 105] },
    })

    doc.save("relatorio_recebimentos.pdf")
  }

  return (
    <div>
      <h2 className="page-title">Relatório de Recebimentos</h2>
      <p className="page-subtitle">
        Acompanhe os valores que realmente entraram no caixa, com data e forma de pagamento.
      </p>

      <HelpBanner
        title="Como usar este relatório"
        text="Aqui você vê todos os recebimentos vinculados às vendas ativas, com data, forma de pagamento, cliente, produto e observação. É o relatório ideal para acompanhar entradas reais no caixa."
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
          placeholder="Buscar por cliente, produto, SKU, forma ou observação"
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

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Total recebido
            <HelpTooltip text="Soma dos recebimentos exibidos no período e na busca atual." />
          </h3>
          <p>R$ {resumo.total.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Qtde. de recebimentos
            <HelpTooltip text="Quantidade de lançamentos de recebimento encontrados no filtro atual." />
          </h3>
          <p>{resumo.quantidade}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Valor médio
            <HelpTooltip text="Valor médio por recebimento no conjunto filtrado." />
          </h3>
          <p>R$ {resumo.ticket.toFixed(2)}</p>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 24 }}>
        <div style={headerBloco}>
          <div>
            <h3 style={{ margin: 0 }}>Recebimentos por forma</h3>
            <p style={subBloco}>Distribuição por método de pagamento</p>
          </div>
        </div>

        <div style={gridFormas}>
          {resumo.porForma.length > 0 ? (
            resumo.porForma.map((item) => (
              <div key={item.forma} style={formaCard}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{item.forma}</span>
                <strong style={{ fontSize: 18 }}>R$ {item.valor.toFixed(2)}</strong>
              </div>
            ))
          ) : (
            <div style={{ color: "#6b7280" }}>Nenhum recebimento encontrado.</div>
          )}
        </div>
      </div>

      <div className="section-card">
        <div style={headerBloco}>
          <div>
            <h3 style={{ margin: 0 }}>Lista de recebimentos</h3>
            <p style={subBloco}>{paymentRowsFiltrados.length} recebimento(s)</p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table style={tabela}>
            <thead>
              <tr>
                <th style={th}>Data</th>
                <th style={th}>Venda</th>
                <th style={th}>Cliente</th>
                <th style={th}>Produto</th>
                <th style={th}>SKU</th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Forma
                    <HelpTooltip text="Forma usada no recebimento, como Pix, dinheiro ou cartão." />
                  </span>
                </th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Valor
                    <HelpTooltip text="Valor efetivamente recebido nessa entrada." />
                  </span>
                </th>
                <th style={th}>Observação</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td style={tdVazio} colSpan={8}>
                    Carregando...
                  </td>
                </tr>
              ) : paymentRowsFiltrados.length > 0 ? (
                paymentRowsFiltrados.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{formatarData(r.data)}</td>
                    <td style={td}>#{r.vendaId}</td>
                    <td style={td}>{r.cliente}</td>
                    <td style={td}>{r.produto}</td>
                    <td style={td}>{r.sku}</td>
                    <td style={td}>{r.forma}</td>
                    <td style={td}>R$ {r.valor.toFixed(2)}</td>
                    <td style={td}>{r.observacao}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={tdVazio} colSpan={8}>
                    Nenhum recebimento encontrado no período.
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

const gridFormas = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
}

const formaCard = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
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