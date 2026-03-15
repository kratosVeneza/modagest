"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

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

export default function Financeiro() {
  const [faturamentoTotal, setFaturamentoTotal] = useState(0)
  const [quantidadeVendida, setQuantidadeVendida] = useState(0)
  const [ticketMedio, setTicketMedio] = useState(0)
  const [ultimasVendas, setUltimasVendas] = useState<VendaExibicao[]>([])
  const [todasVendas, setTodasVendas] = useState<VendaExibicao[]>([])
  const [mensagem, setMensagem] = useState("")

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

  return (
    <div>
      <h2>Financeiro</h2>
      <p>Resumo financeiro da loja.</p>

      {mensagem && <p>{mensagem}</p>}

      <div style={acoesTopo}>
        <button onClick={exportarCSV} style={botaoExportar}>
          Exportar CSV
        </button>
      </div>

      <div style={grid}>
        <div style={card}>
          <h3>Faturamento total</h3>
          <p>R$ {faturamentoTotal.toFixed(2)}</p>
        </div>

        <div style={card}>
          <h3>Quantidade vendida</h3>
          <p>{quantidadeVendida}</p>
        </div>

        <div style={card}>
          <h3>Ticket médio</h3>
          <p>R$ {ticketMedio.toFixed(2)}</p>
        </div>
      </div>

      <div style={blocoTabela}>
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

const botaoExportar = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
  marginTop: "24px",
  marginBottom: "24px",
}

const card = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
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