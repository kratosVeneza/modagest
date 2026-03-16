"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { montarCabecalhoPDF } from "@/lib/pdfHeader"
import { imageUrlToDataUrl } from "@/lib/imageToDataUrl"

type Venda = {
  id: number
  quantidade: number
  valor_total: number
  created_at: string
  status?: string
  customer_id?: number | null
}

type Cliente = {
  id: number
  nome: string
}

type VendaExibicao = {
  id: number
  quantidade: number
  valor_total: number
  created_at: string
  nomeCliente: string
}

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

export default function Financeiro() {
  const [faturamentoTotal, setFaturamentoTotal] = useState(0)
  const [quantidadeVendida, setQuantidadeVendida] = useState(0)
  const [ticketMedio, setTicketMedio] = useState(0)
  const [ultimasVendas, setUltimasVendas] = useState<VendaExibicao[]>([])
  const [todasVendas, setTodasVendas] = useState<VendaExibicao[]>([])
  const [mensagem, setMensagem] = useState("")
  const [nomeLoja, setNomeLoja] = useState("ModaGest")
  const [logoUrl, setLogoUrl] = useState("")

  useEffect(() => {
    carregarFinanceiro()
  }, [])

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

    if (loja?.nome_loja) {
      setNomeLoja(loja.nome_loja)
    }

    if (loja?.logo_url) {
      setLogoUrl(loja.logo_url)
    }

    const { data: vendasData, error } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "Cancelada")
      .order("created_at", { ascending: false })

    if (error) {
      setMensagem("Erro ao carregar dados financeiros.")
      return
    }

    const { data: clientesData } = await supabase
      .from("customers")
      .select("id, nome")
      .eq("user_id", user.id)

    const vendas = (vendasData ?? []) as Venda[]
    const clientes = (clientesData ?? []) as Cliente[]

    const vendasFormatadas: VendaExibicao[] = vendas.map((venda) => {
      const cliente = clientes.find((c) => c.id === venda.customer_id)

      return {
        id: venda.id,
        quantidade: venda.quantidade,
        valor_total: Number(venda.valor_total),
        created_at: venda.created_at,
        nomeCliente: cliente?.nome || "Sem cliente",
      }
    })

    const totalFaturamento = vendas.reduce(
      (soma, venda) => soma + Number(venda.valor_total),
      0
    )

    const totalQuantidade = vendas.reduce(
      (soma, venda) => soma + Number(venda.quantidade),
      0
    )

    const ticket = vendas.length > 0 ? totalFaturamento / vendas.length : 0

    setFaturamentoTotal(totalFaturamento)
    setQuantidadeVendida(totalQuantidade)
    setTicketMedio(ticket)
    setUltimasVendas(vendasFormatadas.slice(0, 5))
    setTodasVendas(vendasFormatadas)
  }

  function formatarData(dataIso: string) {
    const data = new Date(dataIso)
    return data.toLocaleString("pt-BR")
  }

  function exportarCSV() {
    if (todasVendas.length === 0) {
      setMensagem("Não há dados financeiros para exportar.")
      return
    }

    const cabecalho = ["Cliente", "Quantidade", "Valor Total", "Data"]

    const linhas = todasVendas.map((venda) => [
      venda.nomeCliente,
      String(venda.quantidade),
      Number(venda.valor_total).toFixed(2),
      formatarData(venda.created_at),
    ])

    const conteudo = [cabecalho, ...linhas]
      .map((linha) =>
        linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n")

    const blob = new Blob([conteudo], {
      type: "text/csv;charset=utf-8;",
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "financeiro.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPDF() {
    if (todasVendas.length === 0) {
      setMensagem("Não há dados financeiros para exportar.")
      return
    }

    const doc = new jsPDF()
    const logoDataUrl = await imageUrlToDataUrl(logoUrl)

    const startY = await montarCabecalhoPDF({
      doc,
      titulo: "Relatório Financeiro",
      nomeLoja,
      logoDataUrl,
    })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Faturamento total: R$ ${faturamentoTotal.toFixed(2)}`, 14, startY)
    doc.text(`Quantidade vendida: ${quantidadeVendida}`, 14, startY + 6)
    doc.text(`Ticket médio: R$ ${ticketMedio.toFixed(2)}`, 14, startY + 12)

    autoTable(doc, {
      startY: startY + 20,
      head: [["Cliente", "Quantidade", "Valor Total", "Data"]],
      body: todasVendas.map((venda) => [
        venda.nomeCliente,
        String(venda.quantidade),
        `R$ ${Number(venda.valor_total).toFixed(2)}`,
        formatarData(venda.created_at),
      ]),
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: [37, 99, 235],
      },
    })

    doc.save("financeiro.pdf")
  }

  return (
    <div>
      <h2 className="page-title">Financeiro</h2>
      <p className="page-subtitle">Resumo financeiro da loja.</p>

      {mensagem && <p>{mensagem}</p>}

      <div style={acoesTopo}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={exportarCSV} className="btn btn-secondary">
            Exportar CSV
          </button>

          <button onClick={exportarPDF} className="btn btn-primary">
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid-3">
        <div className="section-card">
          <h3>Faturamento total</h3>
          <p>R$ {faturamentoTotal.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3>Quantidade vendida</h3>
          <p>{quantidadeVendida}</p>
        </div>

        <div className="section-card">
          <h3>Ticket médio</h3>
          <p>R$ {ticketMedio.toFixed(2)}</p>
        </div>
      </div>

      <div className="section-card" style={blocoTabela}>
        <h3>Últimas vendas</h3>

        <table style={tabela}>
          <thead>
            <tr>
              <th style={th}>Cliente</th>
              <th style={th}>Quantidade</th>
              <th style={th}>Valor total</th>
              <th style={th}>Data</th>
            </tr>
          </thead>

          <tbody>
            {ultimasVendas.map((venda) => (
              <tr key={venda.id}>
                <td style={td}>{venda.nomeCliente}</td>
                <td style={td}>{venda.quantidade}</td>
                <td style={td}>R$ {Number(venda.valor_total).toFixed(2)}</td>
                <td style={td}>{formatarData(venda.created_at)}</td>
              </tr>
            ))}

            {ultimasVendas.length === 0 && (
              <tr>
                <td style={tdVazio} colSpan={4}>
                  Nenhuma venda ativa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const acoesTopo = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: "20px",
  marginBottom: "20px",
}

const blocoTabela = {
  marginTop: "20px",
}

const tabela = {
  width: "100%",
  borderCollapse: "collapse" as const,
  marginTop: "12px",
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

const tdVazio = {
  borderBottom: "1px solid #e5e7eb",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
}