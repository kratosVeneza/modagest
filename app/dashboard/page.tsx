"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type GraficoItem = {
  data: string
  total: number
}

type VendaBanco = {
  id: number
  product_id: number
  customer_id: number | null
  quantidade: number
  valor_total: number
  created_at: string
  user_id: string
  status?: string
}

type ProdutoBanco = {
  id: number
  nome: string
  sku: string
}

type ClienteBanco = {
  id: number
  nome: string
}

type VendaRecente = {
  id: number
  nomeProduto: string
  skuProduto: string
  nomeCliente: string
  quantidade: number
  valorTotal: number
  created_at: string
}

type ProdutoMaisVendido = {
  productId: number
  nomeProduto: string
  skuProduto: string
  totalQuantidade: number
  totalFaturado: number
}

export default function Dashboard() {
  const [faturamentoHoje, setFaturamentoHoje] = useState(0)
  const [faturamentoMes, setFaturamentoMes] = useState(0)
  const [produtosVendidosHoje, setProdutosVendidosHoje] = useState(0)
  const [estoqueBaixo, setEstoqueBaixo] = useState(0)
  const [pedidosPendentes, setPedidosPendentes] = useState(0)
  const [pedidosRecebidos, setPedidosRecebidos] = useState(0)
  const [graficoVendas, setGraficoVendas] = useState<GraficoItem[]>([])
  const [ultimasVendas, setUltimasVendas] = useState<VendaRecente[]>([])
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState<ProdutoMaisVendido[]>([])
  const [mensagem, setMensagem] = useState("")

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

    const agora = new Date()

    const inicioHoje = new Date()
    inicioHoje.setHours(0, 0, 0, 0)

    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(agora.getDate() - 6)
    seteDiasAtras.setHours(0, 0, 0, 0)

    const { data: vendasHojeData } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "Cancelada")
      .gte("created_at", inicioHoje.toISOString())

    if (vendasHojeData) {
      const totalHoje = vendasHojeData.reduce(
        (soma, venda) => soma + Number(venda.valor_total),
        0
      )

      const totalItensHoje = vendasHojeData.reduce(
        (soma, venda) => soma + Number(venda.quantidade),
        0
      )

      setFaturamentoHoje(totalHoje)
      setProdutosVendidosHoje(totalItensHoje)
    }

    const { data: vendasMesData } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "Cancelada")
      .gte("created_at", inicioMes.toISOString())

    if (vendasMesData) {
      const totalMes = vendasMesData.reduce(
        (soma, venda) => soma + Number(venda.valor_total),
        0
      )

      setFaturamentoMes(totalMes)
    }

    const { data: produtosData } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .lt("estoque", 5)

    if (produtosData) {
      setEstoqueBaixo(produtosData.length)
    }

    const { data: pedidosPendentesData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["Pendente", "Encomendado", "Enviado"])

    if (pedidosPendentesData) {
      setPedidosPendentes(pedidosPendentesData.length)
    }

    const { data: pedidosRecebidosData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "Recebido")

    if (pedidosRecebidosData) {
      setPedidosRecebidos(pedidosRecebidosData.length)
    }

    const { data: vendasUltimosDias } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "Cancelada")
      .gte("created_at", seteDiasAtras.toISOString())
      .order("created_at", { ascending: true })

    if (vendasUltimosDias) {
      const dias: GraficoItem[] = []

      for (let i = 0; i < 7; i++) {
        const data = new Date()
        data.setDate(agora.getDate() - (6 - i))
        const chave = data.toLocaleDateString("pt-BR")
        dias.push({ data: chave, total: 0 })
      }

      vendasUltimosDias.forEach((venda) => {
        const dataVenda = new Date(venda.created_at).toLocaleDateString("pt-BR")
        const item = dias.find((d) => d.data === dataVenda)

        if (item) {
          item.total += Number(venda.valor_total)
        }
      })

      setGraficoVendas(dias)
    }

    const { data: vendasRecentesData } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "Cancelada")
      .order("created_at", { ascending: false })
      .limit(5)

    const { data: produtosTodosData } = await supabase
      .from("products")
      .select("id, nome, sku")
      .eq("user_id", user.id)

    const { data: clientesTodosData } = await supabase
      .from("customers")
      .select("id, nome")
      .eq("user_id", user.id)

    if (vendasRecentesData && produtosTodosData && clientesTodosData) {
      const vendasTipadas = vendasRecentesData as VendaBanco[]
      const produtosTipados = produtosTodosData as ProdutoBanco[]
      const clientesTipados = clientesTodosData as ClienteBanco[]

      const vendasFormatadas: VendaRecente[] = vendasTipadas.map((venda) => {
        const produtoRelacionado = produtosTipados.find(
          (produto) => produto.id === venda.product_id
        )

        const clienteRelacionado = clientesTipados.find(
          (cliente) => cliente.id === venda.customer_id
        )

        return {
          id: venda.id,
          nomeProduto: produtoRelacionado?.nome || "Produto removido",
          skuProduto: produtoRelacionado?.sku || "-",
          nomeCliente: clienteRelacionado?.nome || "Sem cliente",
          quantidade: venda.quantidade,
          valorTotal: Number(venda.valor_total),
          created_at: venda.created_at,
        }
      })

      setUltimasVendas(vendasFormatadas)

      const { data: todasVendasAtivasData } = await supabase
        .from("sales")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "Cancelada")

      const todasVendasAtivas = (todasVendasAtivasData ?? []) as VendaBanco[]

      const agrupado = new Map<number, ProdutoMaisVendido>()

      todasVendasAtivas.forEach((venda) => {
        const produtoRelacionado = produtosTipados.find(
          (produto) => produto.id === venda.product_id
        )

        const nomeProduto = produtoRelacionado?.nome || "Produto removido"
        const skuProduto = produtoRelacionado?.sku || "-"

        if (!agrupado.has(venda.product_id)) {
          agrupado.set(venda.product_id, {
            productId: venda.product_id,
            nomeProduto,
            skuProduto,
            totalQuantidade: 0,
            totalFaturado: 0,
          })
        }

        const item = agrupado.get(venda.product_id)!

        item.totalQuantidade += Number(venda.quantidade)
        item.totalFaturado += Number(venda.valor_total)
      })

      const ranking = Array.from(agrupado.values())
        .sort((a, b) => b.totalQuantidade - a.totalQuantidade)
        .slice(0, 5)

      setProdutosMaisVendidos(ranking)
    }
  }

  const maxGrafico = useMemo(() => {
    const maior = Math.max(...graficoVendas.map((item) => item.total), 0)
    return maior === 0 ? 1 : maior
  }, [graficoVendas])

  function formatarData(dataIso: string) {
    const data = new Date(dataIso)
    return data.toLocaleString("pt-BR")
  }

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Resumo geral da operação da sua loja.</p>

      {mensagem && <p>{mensagem}</p>}

      <div style={grid}>
        <div style={card}>
          <h3>Faturamento hoje</h3>
          <p>R$ {faturamentoHoje.toFixed(2)}</p>
        </div>

        <div style={card}>
          <h3>Faturamento do mês</h3>
          <p>R$ {faturamentoMes.toFixed(2)}</p>
        </div>

        <div style={card}>
          <h3>Produtos vendidos hoje</h3>
          <p>{produtosVendidosHoje}</p>
        </div>

        <div style={card}>
          <h3>Estoque baixo</h3>
          <p>{estoqueBaixo}</p>
        </div>

        <div style={card}>
          <h3>Pedidos pendentes</h3>
          <p>{pedidosPendentes}</p>
        </div>

        <div style={card}>
          <h3>Pedidos recebidos</h3>
          <p>{pedidosRecebidos}</p>
        </div>
      </div>

      <div style={graficoBox}>
        <h3 style={{ marginTop: 0 }}>Faturamento dos últimos 7 dias</h3>

        <div style={graficoArea}>
          {graficoVendas.map((item) => {
            const altura = `${(item.total / maxGrafico) * 180}px`

            return (
              <div key={item.data} style={colunaBox}>
                <div style={valorTopo}>R$ {item.total.toFixed(0)}</div>

                <div style={barraContainer}>
                  <div
                    style={{
                      ...barra,
                      height: altura,
                    }}
                  />
                </div>

                <div style={rotulo}>{item.data}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={duasColunas}>
        <div style={blocoTabela}>
          <h3>Últimas vendas</h3>

          <table style={tabela}>
            <thead>
              <tr>
                <th style={th}>Cliente</th>
                <th style={th}>Produto</th>
                <th style={th}>Qtd.</th>
                <th style={th}>Valor</th>
                <th style={th}>Data</th>
              </tr>
            </thead>

            <tbody>
              {ultimasVendas.map((venda) => (
                <tr key={venda.id}>
                  <td style={td}>{venda.nomeCliente}</td>
                  <td style={td}>{venda.nomeProduto}</td>
                  <td style={td}>{venda.quantidade}</td>
                  <td style={td}>R$ {venda.valorTotal.toFixed(2)}</td>
                  <td style={td}>{formatarData(venda.created_at)}</td>
                </tr>
              ))}

              {ultimasVendas.length === 0 && (
                <tr>
                  <td style={tdVazio} colSpan={5}>
                    Nenhuma venda recente encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={blocoTabela}>
          <h3>Produtos mais vendidos</h3>

          <table style={tabela}>
            <thead>
              <tr>
                <th style={th}>Produto</th>
                <th style={th}>SKU</th>
                <th style={th}>Qtd. vendida</th>
                <th style={th}>Faturado</th>
              </tr>
            </thead>

            <tbody>
              {produtosMaisVendidos.map((produto) => (
                <tr key={produto.productId}>
                  <td style={td}>{produto.nomeProduto}</td>
                  <td style={td}>{produto.skuProduto}</td>
                  <td style={td}>{produto.totalQuantidade}</td>
                  <td style={td}>R$ {produto.totalFaturado.toFixed(2)}</td>
                </tr>
              ))}

              {produtosMaisVendidos.length === 0 && (
                <tr>
                  <td style={tdVazio} colSpan={4}>
                    Nenhum produto vendido ainda.
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

const graficoBox = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "24px",
}

const graficoArea = {
  display: "flex",
  alignItems: "flex-end",
  gap: "16px",
  height: "260px",
  marginTop: "20px",
  overflowX: "auto" as const,
}

const colunaBox = {
  minWidth: "90px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "flex-end",
}

const valorTopo = {
  fontSize: "12px",
  color: "#374151",
  marginBottom: "8px",
}

const barraContainer = {
  width: "42px",
  height: "180px",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  background: "#f3f4f6",
  borderRadius: "8px",
  overflow: "hidden",
}

const barra = {
  width: "100%",
  background: "#2563eb",
  borderRadius: "8px 8px 0 0",
}

const rotulo = {
  marginTop: "10px",
  fontSize: "12px",
  color: "#6b7280",
  textAlign: "center" as const,
}

const duasColunas = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
}

const blocoTabela = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
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