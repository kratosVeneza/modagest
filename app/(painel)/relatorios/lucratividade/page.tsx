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
  quantidade: number
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
  custo: number | null
  preco: number
  user_id: string
}

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

type ProfitRow = {
  productId: number
  produto: string
  sku: string
  marca: string
  categoria: string
  quantidadeVendida: number
  faturamento: number
  custoTotal: number
  lucro: number
  margem: number
}

type Periodo = "hoje" | "7dias" | "30dias" | "mes" | "tudo"

const periodos: { value: Periodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "7 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "tudo", label: "Tudo" },
]

export default function RelatorioLucratividadePage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
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

    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, nome, sku, marca, categoria, custo, preco, user_id")
      .eq("user_id", user.id)

    if (salesError || productsError) {
      setMensagem("Erro ao carregar relatório de lucratividade.")
      setCarregando(false)
      return
    }

    setSales((salesData ?? []) as Sale[])
    setProducts((productsData ?? []) as Product[])
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

  const profitRows = useMemo<ProfitRow[]>(() => {
    const mapa = new Map<number, ProfitRow>()

    sales
      .filter((sale) => sale.status !== "Cancelada")
      .filter((sale) => inPeriodo(sale.created_at))
      .forEach((sale) => {
        const product = products.find((p) => p.id === sale.product_id)
        if (!product) return

        const quantidade = Number(sale.quantidade)
        const faturamento = Number(sale.valor_total)
        const custoUnitario = Number(product.custo || 0)
        const custoTotal = custoUnitario * quantidade
        const lucro = faturamento - custoTotal

        if (!mapa.has(product.id)) {
          mapa.set(product.id, {
            productId: product.id,
            produto: product.nome,
            sku: product.sku,
            marca: product.marca || "-",
            categoria: product.categoria || "-",
            quantidadeVendida: 0,
            faturamento: 0,
            custoTotal: 0,
            lucro: 0,
            margem: 0,
          })
        }

        const atual = mapa.get(product.id)!
        atual.quantidadeVendida += quantidade
        atual.faturamento += faturamento
        atual.custoTotal += custoTotal
        atual.lucro += lucro
      })

    return Array.from(mapa.values())
      .map((item) => ({
        ...item,
        margem: item.faturamento > 0 ? (item.lucro / item.faturamento) * 100 : 0,
      }))
      .sort((a, b) => b.lucro - a.lucro)
  }, [sales, products, periodo])

  const profitRowsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return profitRows

    return profitRows.filter((item) => {
      return (
        item.produto.toLowerCase().includes(termo) ||
        item.sku.toLowerCase().includes(termo) ||
        item.marca.toLowerCase().includes(termo) ||
        item.categoria.toLowerCase().includes(termo)
      )
    })
  }, [profitRows, busca])

  const resumo = useMemo(() => {
    const faturamento = profitRowsFiltrados.reduce((acc, item) => acc + item.faturamento, 0)
    const custoTotal = profitRowsFiltrados.reduce((acc, item) => acc + item.custoTotal, 0)
    const lucro = profitRowsFiltrados.reduce((acc, item) => acc + item.lucro, 0)
    const quantidade = profitRowsFiltrados.reduce((acc, item) => acc + item.quantidadeVendida, 0)
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0

    return {
      faturamento,
      custoTotal,
      lucro,
      quantidade,
      margem,
    }
  }, [profitRowsFiltrados])

  function formatarDataAtual() {
    return new Date().toLocaleString("pt-BR")
  }

  function exportarCSV() {
    if (profitRowsFiltrados.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const linhas = [
      ["Produto", "SKU", "Marca", "Categoria", "Qtd vendida", "Faturamento", "Custo", "Lucro", "Margem"],
      ...profitRowsFiltrados.map((r) => [
        r.produto,
        r.sku,
        r.marca,
        r.categoria,
        String(r.quantidadeVendida),
        r.faturamento.toFixed(2),
        r.custoTotal.toFixed(2),
        r.lucro.toFixed(2),
        `${r.margem.toFixed(1)}%`,
      ]),
    ]

    const conteudo = linhas
      .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(";"))
      .join("\n")

    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "relatorio_lucratividade.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPDF() {
    if (profitRowsFiltrados.length === 0) {
      setMensagem("Não há dados para exportar.")
      return
    }

    const doc = new jsPDF()
    const logoDataUrl = await imageUrlToDataUrl(logoUrl)

    const startY = await montarCabecalhoPDF({
      doc,
      titulo: "Relatório de Lucratividade por Produto",
      nomeLoja,
      logoDataUrl,
    })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Gerado em: ${formatarDataAtual()}`, 14, startY)
    doc.text(`Faturamento: R$ ${resumo.faturamento.toFixed(2)}`, 14, startY + 6)
    doc.text(`Custo total: R$ ${resumo.custoTotal.toFixed(2)}`, 14, startY + 12)
    doc.text(`Lucro bruto: R$ ${resumo.lucro.toFixed(2)}`, 14, startY + 18)
    doc.text(`Margem média: ${resumo.margem.toFixed(1)}%`, 14, startY + 24)

    autoTable(doc, {
      startY: startY + 32,
      head: [["Produto", "Qtd.", "Faturamento", "Custo", "Lucro", "Margem"]],
      body: profitRowsFiltrados.map((r) => [
        r.produto,
        String(r.quantidadeVendida),
        `R$ ${r.faturamento.toFixed(2)}`,
        `R$ ${r.custoTotal.toFixed(2)}`,
        `R$ ${r.lucro.toFixed(2)}`,
        `${r.margem.toFixed(1)}%`,
      ]),
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [124, 58, 237] },
    })

    doc.save("relatorio_lucratividade.pdf")
  }

  return (
    <div>
    <div style={{ marginBottom: 12 }}>
      <BackButton label="← Voltar" />
    </div>
      <h2 className="page-title">Relatório de Lucratividade</h2>
      <p className="page-subtitle">
        Veja quais produtos realmente dão mais retorno para o negócio.
      </p>

      <HelpBanner
        title="Como usar este relatório"
        text="Aqui você vê quanto cada produto faturou, quanto custou e qual foi o lucro bruto gerado. Isso ajuda a identificar os itens mais rentáveis do seu negócio."
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
          placeholder="Buscar por produto, SKU, marca ou categoria"
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
            Faturamento
            <HelpTooltip text="Soma total vendida dos produtos mostrados no relatório." />
          </h3>
          <p>R$ {resumo.faturamento.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Custo total
            <HelpTooltip text="Soma do custo estimado dos produtos vendidos no período." />
          </h3>
          <p>R$ {resumo.custoTotal.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Lucro bruto
            <HelpTooltip text="Diferença entre faturamento e custo total dos produtos vendidos." />
          </h3>
          <p>R$ {resumo.lucro.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Margem média
            <HelpTooltip text="Percentual médio de lucro sobre o faturamento dos produtos mostrados." />
          </h3>
          <p>{resumo.margem.toFixed(1)}%</p>
        </div>
      </div>

      <div className="section-card">
        <div style={headerBloco}>
          <div>
            <h3 style={{ margin: 0 }}>Ranking de lucratividade por produto</h3>
            <p style={subBloco}>{profitRowsFiltrados.length} produto(s)</p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table style={tabela}>
            <thead>
              <tr>
                <th style={th}>Produto</th>
                <th style={th}>SKU</th>
                <th style={th}>Marca</th>
                <th style={th}>Categoria</th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Qtd.
                    <HelpTooltip text="Quantidade total vendida desse produto no período." />
                  </span>
                </th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Faturamento
                    <HelpTooltip text="Valor total vendido desse produto no período." />
                  </span>
                </th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Custo
                    <HelpTooltip text="Custo total estimado com base no custo cadastrado do produto." />
                  </span>
                </th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Lucro
                    <HelpTooltip text="Diferença entre o faturamento e o custo total do produto." />
                  </span>
                </th>
                <th style={th}>
                  <span style={tituloComAjuda}>
                    Margem
                    <HelpTooltip text="Percentual do faturamento que virou lucro bruto." />
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td style={tdVazio} colSpan={9}>
                    Carregando...
                  </td>
                </tr>
              ) : profitRowsFiltrados.length > 0 ? (
                profitRowsFiltrados.map((r) => (
                  <tr key={r.productId}>
                    <td style={td}>{r.produto}</td>
                    <td style={td}>{r.sku}</td>
                    <td style={td}>{r.marca}</td>
                    <td style={td}>{r.categoria}</td>
                    <td style={td}>{r.quantidadeVendida}</td>
                    <td style={td}>R$ {r.faturamento.toFixed(2)}</td>
                    <td style={td}>R$ {r.custoTotal.toFixed(2)}</td>
                    <td style={td}>R$ {r.lucro.toFixed(2)}</td>
                    <td style={td}>{r.margem.toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={tdVazio} colSpan={9}>
                    Nenhum dado de lucratividade encontrado no período.
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