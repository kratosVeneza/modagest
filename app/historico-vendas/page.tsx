"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { montarCabecalhoPDF } from "@/lib/pdfHeader"
import { imageUrlToDataUrl } from "@/lib/imageToDataUrl"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"

type VendaBanco = {
  id: number
  product_id: number
  customer_id: number | null
  quantidade: number
  valor_unitario: number
  valor_total: number
  created_at: string
  user_id: string
  status: string
  estoque_devolvido: boolean
}

type ProdutoBanco = {
  id: number
  nome: string
  sku: string
  estoque: number
}

type ClienteBanco = {
  id: number
  nome: string
}

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

type VendaExibicao = {
  id: number
  product_id: number
  customer_id: number | null
  quantidade: number
  valor_unitario: number
  valor_total: number
  created_at: string
  status: string
  estoque_devolvido: boolean
  nomeProduto: string
  skuProduto: string
  nomeCliente: string
}

export default function HistoricoVendas() {
  const [vendas, setVendas] = useState<VendaExibicao[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [nomeLoja, setNomeLoja] = useState("ModaGest")
  const [logoUrl, setLogoUrl] = useState("")

  useEffect(() => {
    carregarVendas()
  }, [])

  async function carregarVendas() {
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

    const { data: vendasData, error: erroVendas } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (erroVendas) {
      setMensagem("Erro ao carregar vendas.")
      return
    }

    const { data: produtosData, error: erroProdutos } = await supabase
      .from("products")
      .select("id, nome, sku, estoque")
      .eq("user_id", user.id)

    if (erroProdutos) {
      setMensagem("Erro ao carregar produtos.")
      return
    }

    const { data: clientesData, error: erroClientes } = await supabase
      .from("customers")
      .select("id, nome")
      .eq("user_id", user.id)

    if (erroClientes) {
      setMensagem("Erro ao carregar clientes.")
      return
    }

    const vendasTipadas = (vendasData ?? []) as VendaBanco[]
    const produtosTipados = (produtosData ?? []) as ProdutoBanco[]
    const clientesTipados = (clientesData ?? []) as ClienteBanco[]

    const vendasFormatadas: VendaExibicao[] = vendasTipadas.map((venda) => {
      const produtoRelacionado = produtosTipados.find(
        (produto) => produto.id === venda.product_id
      )

      const clienteRelacionado = clientesTipados.find(
        (cliente) => cliente.id === venda.customer_id
      )

      return {
        id: venda.id,
        product_id: venda.product_id,
        customer_id: venda.customer_id,
        quantidade: venda.quantidade,
        valor_unitario: Number(venda.valor_unitario),
        valor_total: Number(venda.valor_total),
        created_at: venda.created_at,
        status: venda.status || "Ativa",
        estoque_devolvido: Boolean(venda.estoque_devolvido),
        nomeProduto: produtoRelacionado?.nome || "Produto removido",
        skuProduto: produtoRelacionado?.sku || "-",
        nomeCliente: clienteRelacionado?.nome || "Sem cliente",
      }
    })

    setVendas(vendasFormatadas)
  }

  async function cancelarVenda(venda: VendaExibicao) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (venda.status === "Cancelada") {
      setMensagem("Essa venda já está cancelada.")
      return
    }

    const { data: produtoData, error: erroProduto } = await supabase
      .from("products")
      .select("id, estoque")
      .eq("id", venda.product_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (erroProduto || !produtoData) {
      setMensagem("Não foi possível localizar o produto dessa venda.")
      return
    }

    const novoEstoque = Number(produtoData.estoque) + Number(venda.quantidade)

    if (!venda.estoque_devolvido) {
      const { error: erroAtualizarEstoque } = await supabase
        .from("products")
        .update({ estoque: novoEstoque })
        .eq("id", venda.product_id)
        .eq("user_id", user.id)

      if (erroAtualizarEstoque) {
        setMensagem("Erro ao devolver o item ao estoque.")
        return
      }

      await registrarMovimentoEstoque({
        productId: venda.product_id,
        userId: user.id,
        tipo: "cancelamento",
        quantidade: venda.quantidade,
        motivo: "Cancelamento de venda",
      })
    }

    const { error: erroVenda } = await supabase
      .from("sales")
      .update({
        status: "Cancelada",
        estoque_devolvido: true,
      })
      .eq("id", venda.id)
      .eq("user_id", user.id)

    if (erroVenda) {
      setMensagem("Erro ao cancelar a venda.")
      return
    }

    setMensagem("Venda cancelada e estoque devolvido com sucesso.")
    carregarVendas()
  }

  function formatarData(dataIso: string) {
    const data = new Date(dataIso)
    return data.toLocaleString("pt-BR")
  }

  const vendasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return vendas.filter((venda) => {
      const passouBusca =
        !termo ||
        venda.nomeProduto.toLowerCase().includes(termo) ||
        venda.skuProduto.toLowerCase().includes(termo) ||
        venda.nomeCliente.toLowerCase().includes(termo)

      const dataVenda = new Date(venda.created_at)

      const passouDataInicio =
        !dataInicio || dataVenda >= new Date(`${dataInicio}T00:00:00`)

      const passouDataFim =
        !dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`)

      return passouBusca && passouDataInicio && passouDataFim
    })
  }, [vendas, busca, dataInicio, dataFim])

  const totalFiltrado = useMemo(() => {
    return vendasFiltradas
      .filter((venda) => venda.status !== "Cancelada")
      .reduce((soma, venda) => soma + Number(venda.valor_total), 0)
  }, [vendasFiltradas])

  function exportarCSV() {
    if (vendasFiltradas.length === 0) {
      setMensagem("Não há vendas para exportar.")
      return
    }

    const cabecalho = [
      "Cliente",
      "Produto",
      "SKU",
      "Quantidade",
      "Valor Unitario",
      "Valor Total",
      "Status",
      "Data",
    ]

    const linhas = vendasFiltradas.map((venda) => [
      venda.nomeCliente,
      venda.nomeProduto,
      venda.skuProduto,
      String(venda.quantidade),
      venda.valor_unitario.toFixed(2),
      venda.valor_total.toFixed(2),
      venda.status,
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
    link.download = "historico_vendas.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPDF() {
    if (vendasFiltradas.length === 0) {
      setMensagem("Não há vendas para exportar.")
      return
    }

    const doc = new jsPDF()
    const logoDataUrl = await imageUrlToDataUrl(logoUrl)

    const startY = await montarCabecalhoPDF({
      doc,
      titulo: "Histórico de Vendas",
      nomeLoja,
      logoDataUrl,
    })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Total no filtro: R$ ${totalFiltrado.toFixed(2)}`, 14, startY)
    doc.text(`Quantidade de vendas: ${vendasFiltradas.length}`, 14, startY + 6)

    autoTable(doc, {
      startY: startY + 14,
      head: [[
        "Cliente",
        "Produto",
        "SKU",
        "Quantidade",
        "Valor Unit.",
        "Valor Total",
        "Status",
        "Data",
      ]],
      body: vendasFiltradas.map((venda) => [
        venda.nomeCliente,
        venda.nomeProduto,
        venda.skuProduto,
        String(venda.quantidade),
        `R$ ${venda.valor_unitario.toFixed(2)}`,
        `R$ ${venda.valor_total.toFixed(2)}`,
        venda.status,
        formatarData(venda.created_at),
      ]),
      styles: {
        fontSize: 8.5,
      },
      headStyles: {
        fillColor: [37, 99, 235],
      },
    })

    doc.save("historico_vendas.pdf")
  }

  return (
    <div>
      <h2 className="page-title">Histórico de Vendas</h2>
      <p className="page-subtitle">Lista de vendas registradas no sistema.</p>

      {mensagem && <p>{mensagem}</p>}

      <div style={filtrosBox}>
        <input
          style={inputBusca}
          placeholder="Buscar por cliente, produto ou SKU"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <input
          style={inputData}
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
        />

        <input
          style={inputData}
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
        />

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={exportarCSV} className="btn btn-secondary">
            Exportar CSV
          </button>

          <button onClick={exportarPDF} className="btn btn-primary">
            Exportar PDF
          </button>
        </div>
      </div>

      <div style={resumoBox}>
        <span style={contadorResultados}>
          {vendasFiltradas.length} venda(s)
        </span>

        <span style={totalResumo}>
          Total no filtro: <strong>R$ {totalFiltrado.toFixed(2)}</strong>
        </span>
      </div>

      <table style={tabela}>
        <thead>
          <tr>
            <th style={th}>Cliente</th>
            <th style={th}>Produto</th>
            <th style={th}>SKU</th>
            <th style={th}>Quantidade</th>
            <th style={th}>Valor unitário</th>
            <th style={th}>Valor total</th>
            <th style={th}>Status</th>
            <th style={th}>Data</th>
            <th style={th}>Ações</th>
          </tr>
        </thead>

        <tbody>
          {vendasFiltradas.map((venda) => (
            <tr key={venda.id}>
              <td style={td}>{venda.nomeCliente}</td>
              <td style={td}>{venda.nomeProduto}</td>
              <td style={td}>{venda.skuProduto}</td>
              <td style={td}>{venda.quantidade}</td>
              <td style={td}>R$ {venda.valor_unitario.toFixed(2)}</td>
              <td style={td}>R$ {venda.valor_total.toFixed(2)}</td>
              <td style={td}>
                <span
                  className={
                    venda.status === "Cancelada"
                      ? "status-pill status-red"
                      : "status-pill status-green"
                  }
                >
                  {venda.status}
                </span>
              </td>
              <td style={td}>{formatarData(venda.created_at)}</td>
              <td style={td}>
                {venda.status !== "Cancelada" ? (
                  <button
                    onClick={() => cancelarVenda(venda)}
                    className="btn btn-danger btn-sm"
                  >
                    Cancelar venda
                  </button>
                ) : (
                  <span style={textoCancelado}>Já cancelada</span>
                )}
              </td>
            </tr>
          ))}

          {vendasFiltradas.length === 0 && (
            <tr>
              <td style={tdVazio} colSpan={9}>
                Nenhuma venda encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const tabela = {
  width: "100%",
  borderCollapse: "collapse" as const,
  marginTop: "20px",
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

const filtrosBox = {
  display: "flex",
  gap: "12px",
  marginTop: "20px",
  marginBottom: "12px",
  alignItems: "center",
  flexWrap: "wrap" as const,
}

const inputBusca = {
  flex: 1,
  minWidth: "260px",
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
}

const inputData = {
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
}

const resumoBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "8px",
  flexWrap: "wrap" as const,
}

const contadorResultados = {
  fontSize: "14px",
  color: "#6b7280",
}

const totalResumo = {
  fontSize: "14px",
  color: "#111827",
}

const textoCancelado = {
  color: "#6b7280",
  fontSize: "13px",
}