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
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">Resumo geral da operação da sua loja.</p>

      {mensagem && <p>{mensagem}</p>}

      <div className="grid-3" style={{ marginTop: "24px", marginBottom: "24px" }}>
        <div className="metric-card">
          <p className="metric-label">Faturamento hoje</p>
          <p className="metric-value">R$ {faturamentoHoje.toFixed(2)}</p>
          <div className="metric-helper">Resultado do dia atual</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Faturamento do mês</p>
          <p className="metric-value">R$ {faturamentoMes.toFixed(2)}</p>
          <div className="metric-helper">Acumulado mensal</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Produtos vendidos hoje</p>
          <p className="metric-value">{produtosVendidosHoje}</p>
          <div className="metric-helper">Itens vendidos no dia</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Estoque baixo</p>
          <p className="metric-value">{estoqueBaixo}</p>
          <div className="metric-helper">Produtos abaixo do limite</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Pedidos pendentes</p>
          <p className="metric-value">{pedidosPendentes}</p>
          <div className="metric-helper">Aguardando conclusão</div>
        </div>

        <div className="metric-card">
          <p className="metric-label">Pedidos recebidos</p>
          <p className="metric-value">{pedidosRecebidos}</p>
          <div className="metric-helper">Reposições concluídas</div>
        </div>
      </div>

      <div className="chart-shell" style={{ marginBottom: "24px" }}>
        <h3 className="dashboard-block-title">Faturamento dos últimos 7 dias</h3>
        <p className="dashboard-block-subtitle">
          Visão rápida da evolução recente das vendas
        </p>

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

      <div className="dashboard-two-columns">
        <div className="section-card">
          <h3 className="dashboard-block-title">Últimas vendas</h3>
          <p className="dashboard-block-subtitle">
            As 5 movimentações mais recentes
          </p>

          <div className="data-table-wrap" style={{ marginTop: "16px" }}>
            <table className="premium-table" style={tabela}>
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
        </div>

        <div className="section-card">
          <h3 className="dashboard-block-title">Produtos mais vendidos</h3>
          <p className="dashboard-block-subtitle">
            Ranking dos itens com maior saída
          </p>

          <div className="data-table-wrap" style={{ marginTop: "16px" }}>
            <table className="premium-table" style={tabela}>
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
    </div>
  )
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
}

const tdVazio = {
  borderBottom: "1px solid #e5e7eb",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
}