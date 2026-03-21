"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { montarCabecalhoPDF } from "@/lib/pdfHeader"
import { imageUrlToDataUrl } from "@/lib/imageToDataUrl"
import HelpTooltip from "../../../components/HelpTooltip"
import HelpBanner from "../../../components/InfoBanner"
import BackButton from "@/app/components/BackButton"

type Sale = {
  id: number
  product_id: number
  customer_id: number | null
  quantidade: number
  valor_unitario: number
  valor_total: number
  created_at: string
  status?: string
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

type SalePayment = {
  id: number
  sale_id: number
  valor: number
  created_at: string
  user_id: string
}

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

type SaleRow = {
  id: number
  data: string
  cliente: string
  produto: string
  sku: string
  marca: string
  categoria: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  recebido: number
  emAberto: number
}

type Periodo = "hoje" | "7dias" | "30dias" | "mes" | "tudo"

const periodos: { value: Periodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "7 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "tudo", label: "Tudo" },
]

export default function RelatorioVendasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payments, setPayments] = useState<SalePayment[]>([])
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
      { data: productsData, error: productsError },
      { data: customersData, error: customersError },
      { data: paymentsData, error: paymentsError },
    ] = await Promise.all([
      supabase
        .from("sales")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("id, nome, sku, marca, categoria, user_id")
        .eq("user_id", user.id),
      supabase
        .from("customers")
        .select("id, nome, user_id")
        .eq("user_id", user.id),
      supabase
        .from("sale_payments")
        .select("id, sale_id, valor, created_at, user_id")
        .eq("user_id", user.id),
    ])

    if (salesError || productsError || customersError || paymentsError) {
      setMensagem("Erro ao carregar relatório de vendas.")
      setCarregando(false)
      return
    }

    setSales((salesData ?? []) as Sale[])
    setProducts((productsData ?? []) as Product[])
    setCustomers((customersData ?? []) as Customer[])
    setPayments((paymentsData ?? []) as SalePayment[])
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

  const salesRows = useMemo<SaleRow[]>(() => {
    return sales
      .filter((sale) => sale.status !== "Cancelada")
      .filter((sale) => inPeriodo(sale.created_at))
      .map((sale) => {
        const product = products.find((p) => p.id === sale.product_id)
        const customer = customers.find((c) => c.id === sale.customer_id)
        const salePayments = payments.filter((p) => p.sale_id === sale.id)
        const recebido = salePayments.reduce((acc, item) => acc + Number(item.valor), 0)

        return {
          id: sale.id,
          data: sale.created_at,
          cliente: customer?.nome || "Sem cliente",
          produto: product?.nome || "Produto removido",
          sku: product?.sku || "-",
          marca: product?.marca || "-",
          categoria: product?.categoria || "-",
          quantidade: Number(sale.quantidade),
          valorUnitario: Number(sale.valor_unitario),
          valorTotal: Number(sale.valor_total),
          recebido,
          emAberto: Math.max(Number(sale.valor_total) - recebido, 0),
        }
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [sales, products, customers, payments, periodo])

  const salesRowsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return salesRows

    return salesRows.filter((item) => {
      return (
        item.cliente.toLowerCase().includes(termo) ||
        item.produto.toLowerCase().includes(termo) ||
        item.sku.toLowerCase().includes(termo) ||
        item.marca.toLowerCase().includes(termo) ||
        item.categoria.toLowerCase().includes(termo)
      )
    })
  }, [salesRows, busca])

  const resumo = useMemo(() => {
    const vendido = salesRowsFiltrados.reduce((acc, item) => acc + item.valorTotal, 0)
    const recebido = salesRowsFiltrados.reduce((acc, item) => acc + item.recebido, 0)
    const emAberto = salesRowsFiltrados.reduce((acc, item) => acc + item.emAberto, 0)
    const quantidade = salesRowsFiltrados.reduce((acc, item) => acc + item.quantidade, 0)
    const ticketMedio = salesRowsFiltrados.length > 0 ? vendido / salesRowsFiltrados.length : 0

    return {
      vendido,
      recebido,
      emAberto,
      quantidade,
      ticketMedio,
    }
  }, [salesRowsFiltrados])

  function formatarData(dataIso: string) {
    return new Date(dataIso).toLocaleString("pt-BR")
  }

  function exportarCSV() {
    if (salesRowsFiltrados.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const linhas = [
      [
        "Data",
        "Cliente",
        "Produto",
        "SKU",
        "Marca",
        "Categoria",
        "Quantidade",
        "Valor unitário",
        "Valor total",
        "Recebido",
        "Em aberto",
      ],
      ...salesRowsFiltrados.map((r) => [
        formatarData(r.data),
        r.cliente,
        r.produto,
        r.sku,
        r.marca,
        r.categoria,
        String(r.quantidade),
        r.valorUnitario.toFixed(2),
        r.valorTotal.toFixed(2),
        r.recebido.toFixed(2),
        r.emAberto.toFixed(2),
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
    link.download = "relatorio_vendas.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPDF() {
    if (salesRowsFiltrados.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const doc = new jsPDF()
    const logoDataUrl = await imageUrlToDataUrl(logoUrl)

    const startY = await montarCabecalhoPDF({
      doc,
      titulo: "Relatório de Vendas",
      nomeLoja,
      logoDataUrl,
    })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Total vendido: R$ ${resumo.vendido.toFixed(2)}`, 14, startY)
    doc.text(`Total recebido: R$ ${resumo.recebido.toFixed(2)}`, 14, startY + 6)
    doc.text(`Total em aberto: R$ ${resumo.emAberto.toFixed(2)}`, 14, startY + 12)
    doc.text(`Ticket médio: R$ ${resumo.ticketMedio.toFixed(2)}`, 14, startY + 18)

    autoTable(doc, {
      startY: startY + 26,
      head: [["Data", "Cliente", "Produto", "Qtd.", "Total", "Recebido", "Aberto"]],
      body: salesRowsFiltrados.map((r) => [
        formatarData(r.data),
        r.cliente,
        r.produto,
        String(r.quantidade),
        `R$ ${r.valorTotal.toFixed(2)}`,
        `R$ ${r.recebido.toFixed(2)}`,
        `R$ ${r.emAberto.toFixed(2)}`,
      ]),
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [37, 99, 235] },
    })

    doc.save("relatorio_vendas.pdf")
  }

  return (
    <div>
     <div style={{ marginBottom: 12 }}>
      <BackButton label=" Voltar" />
    </div>
      <h2 className="page-title">Relatório de Vendas</h2>
      <p className="page-subtitle">
        Analise as vendas registradas, o valor vendido, recebido e o saldo em aberto.
      </p>

      <HelpBanner
        title="Como usar este relatório"
        text="Aqui você acompanha as vendas ativas do período, incluindo cliente, produto, quantidade, valor vendido, quanto já foi recebido e o que ainda falta entrar."
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
          placeholder="Buscar por cliente, produto, SKU, marca ou categoria"
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
            Total vendido
            <HelpTooltip text="Soma do valor total das vendas ativas no período e na busca atual." />
          </h3>
          <p>R$ {resumo.vendido.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Total recebido
            <HelpTooltip text="Soma dos pagamentos já recebidos dessas vendas." />
          </h3>
          <p>R$ {resumo.recebido.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Em aberto
            <HelpTooltip text="Valor que ainda falta receber dessas vendas." />
          </h3>
          <p>R$ {resumo.emAberto.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Ticket médio
            <HelpTooltip text="Valor médio por venda no conjunto filtrado." />
          </h3>
          <p>R$ {resumo.ticketMedio.toFixed(2)}</p>
        </div>
      </div>

      <div className="section-card">
        <div style={headerBloco}>
          <div>
            <h3 style={{ margin: 0 }}>Lista de vendas</h3>
            <p style={subBloco}>{salesRowsFiltrados.length} venda(s)</p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table style={tabela}>
            <thead>
              <tr>
                <th style={th}>Data</th>
                <th style={th}>Cliente</th>
                <th style={th}>Produto</th>
                <th style={th}>SKU</th>
                <th style={th}>Marca</th>
                <th style={th}>Categoria</th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Qtd.
                    <HelpTooltip text="Quantidade vendida nessa operação." />
                  </span>
                </th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Valor total
                    <HelpTooltip text="Valor total vendido nessa operação." />
                  </span>
                </th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Recebido
                    <HelpTooltip text="Quanto já foi pago pelo cliente nessa venda." />
                  </span>
                </th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Em aberto
                    <HelpTooltip text="Quanto ainda falta receber dessa venda." />
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td style={tdVazio} colSpan={10}>
                    Carregando...
                  </td>
                </tr>
              ) : salesRowsFiltrados.length > 0 ? (
                salesRowsFiltrados.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{formatarData(r.data)}</td>
                    <td style={td}>{r.cliente}</td>
                    <td style={td}>{r.produto}</td>
                    <td style={td}>{r.sku}</td>
                    <td style={td}>{r.marca}</td>
                    <td style={td}>{r.categoria}</td>
                    <td style={td}>{r.quantidade}</td>
                    <td style={td}>R$ {r.valorTotal.toFixed(2)}</td>
                    <td style={td}>R$ {r.recebido.toFixed(2)}</td>
                    <td style={td}>R$ {r.emAberto.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={tdVazio} colSpan={10}>
                    Nenhuma venda encontrada no período.
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
