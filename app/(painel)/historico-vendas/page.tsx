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
import FeatureBlockedCard from "@/app/components/FeatureBlockedCard"
import { cancelSale } from "@/lib/services/sales/cancelSale"
import { restoreSale } from "@/lib/services/sales/restoreSale"
import { addSalePayment } from "@/lib/services/sales/addSalePayment"
import { updateSalePayment } from "@/lib/services/sales/updateSalePayment"
import { deleteSalePayment } from "@/lib/services/sales/deleteSalePayment"
import { deleteCanceledSale } from "@/lib/services/sales/deleteCanceledSale"
import { applySaleDiscount } from "@/lib/services/sales/applySalesDiscount"
import {
  getSalesHistory,
  type PagamentoBanco,
  type VendaExibicao,
} from "@/lib/services/sales/getSalesHistory"

const formasPagamento = [
  "Dinheiro",
  "Pix",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
]

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function formatarDataInput(dataIso?: string) {
  if (!dataIso) return hojeInputDate()
  const data = new Date(dataIso)
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, "0")
  const dia = String(data.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function montarDataISO(dataInput: string) {
  if (!dataInput) {
    return new Date().toISOString()
  }

  return new Date(`${dataInput}T12:00:00-03:00`).toISOString()
}

export default function HistoricoVendas() {
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  const [vendas, setVendas] = useState<VendaExibicao[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [nomeLoja, setNomeLoja] = useState("ModaGest")
  const [logoUrl, setLogoUrl] = useState("")

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false)
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaExibicao | null>(null)
  const [valorPagamento, setValorPagamento] = useState("")
  const [formaPagamento, setFormaPagamento] = useState("Pix")
  const [observacaoPagamento, setObservacaoPagamento] = useState("")
  const [dataPagamento, setDataPagamento] = useState(hojeInputDate())
  const [descontoPercentual, setDescontoPercentual] = useState("")
  const [salvandoPagamento, setSalvandoPagamento] = useState(false)

  const [editandoPagamentoId, setEditandoPagamentoId] = useState<number | null>(null)
  const [modalEditarPagamentoAberto, setModalEditarPagamentoAberto] = useState(false)

  const [modalExcluirVendaAberto, setModalExcluirVendaAberto] = useState(false)
  const [vendaParaExcluir, setVendaParaExcluir] = useState<VendaExibicao | null>(null)
  const [excluindoVenda, setExcluindoVenda] = useState(false)

  const [filtroStatus, setFiltroStatus] = useState<
  "todas" | "ativas" | "canceladas" | "pagas" | "parciais" | "pendentes"
>("todas")


  const [modalDescontoAberto, setModalDescontoAberto] = useState(false)
  const [vendaParaDesconto, setVendaParaDesconto] = useState<VendaExibicao | null>(null)
  const [descontoVendaPercentual, setDescontoVendaPercentual] = useState("")
  const [salvandoDesconto, setSalvandoDesconto] = useState(false)

  useEffect(() => {
    validarAcesso()
  }, [])

  useEffect(() => {
    if (hasAccess) {
      carregarVendas()
    }
  }, [hasAccess])

  async function validarAcesso() {
    const result = await getMyPlanAccess("historico_vendas")
    setHasAccess(result.hasAccess)
    setLoadingAccess(false)
  }

  async function carregarVendas() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const resultado = await getSalesHistory(user.id)

    if (!resultado.success) {
      setMensagem(resultado.message)
      setVendas(resultado.vendas)
      return
    }

    if (resultado.loja?.nome_loja) {
      setNomeLoja(resultado.loja.nome_loja)
    }

    if (resultado.loja?.logo_url) {
      setLogoUrl(resultado.loja.logo_url)
    }

    setVendas(resultado.vendas)
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

    const resultado = await cancelSale({
      saleId: venda.id,
      userId: user.id,
    })

    setMensagem(resultado.message)

    if (resultado.success) {
      await carregarVendas()
    }
  }

  async function restaurarVenda(venda: VendaExibicao) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const resultado = await restoreSale({
      saleId: venda.id,
      userId: user.id,
    })

    setMensagem(resultado.message)

    if (resultado.success) {
      await carregarVendas()
    }
  }

  function abrirModalPagamento(venda: VendaExibicao) {
    setVendaSelecionada(venda)
    setValorPagamento("")
    setFormaPagamento("Pix")
    setObservacaoPagamento("")
    setDataPagamento(formatarDataInput(venda.created_at))
    setDescontoPercentual("")
    setModalPagamentoAberto(true)
  }

  function fecharModalPagamento() {
    setVendaSelecionada(null)
    setEditandoPagamentoId(null)
    setValorPagamento("")
    setFormaPagamento("Pix")
    setObservacaoPagamento("")
    setDataPagamento(hojeInputDate())
    setDescontoPercentual("")
    setModalPagamentoAberto(false)
  }

  function abrirModalEditarPagamento(venda: VendaExibicao, pagamento: PagamentoBanco) {
    setVendaSelecionada(venda)
    setEditandoPagamentoId(pagamento.id)
    setValorPagamento(String(pagamento.valor))
    setFormaPagamento(pagamento.forma_pagamento || "Pix")
    setObservacaoPagamento(pagamento.observacao || "")
    setDataPagamento(formatarDataInput(pagamento.created_at))
    setModalEditarPagamentoAberto(true)
  }

  function fecharModalEditarPagamento() {
    setVendaSelecionada(null)
    setEditandoPagamentoId(null)
    setValorPagamento("")
    setFormaPagamento("Pix")
    setObservacaoPagamento("")
    setDataPagamento(hojeInputDate())
    setModalEditarPagamentoAberto(false)
  }

  function abrirModalExcluirVenda(venda: VendaExibicao) {
    setVendaParaExcluir(venda)
    setModalExcluirVendaAberto(true)
  }

  function fecharModalExcluirVenda() {
    setVendaParaExcluir(null)
    setModalExcluirVendaAberto(false)
  }

  function abrirModalDesconto(venda: VendaExibicao) {
    setVendaParaDesconto(venda)
    setDescontoVendaPercentual(
      Number(venda.desconto_percentual || 0) > 0
        ? String(venda.desconto_percentual)
        : ""
    )
    setModalDescontoAberto(true)
  }

  function fecharModalDesconto() {
    setVendaParaDesconto(null)
    setDescontoVendaPercentual("")
    setModalDescontoAberto(false)
  }

  async function salvarPagamento() {
    if (!vendaSelecionada) return

    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const valor = Number(valorPagamento || 0)

    if (valor <= 0) {
      setMensagem("Informe um valor de recebimento válido.")
      return
    }

    if (Number(descontoPercentual || 0) < 0 || Number(descontoPercentual || 0) > 100) {
      setMensagem("Informe um desconto válido entre 0% e 100%.")
      return
    }

    if (valor > saldoComDesconto) {
      setMensagem(
        `O valor informado é maior que o saldo disponível da venda após o desconto (R$ ${saldoComDesconto.toFixed(2)}).`
      )
      return
    }

    if (!dataPagamento) {
      setMensagem("Informe a data do pagamento.")
      return
    }

    setSalvandoPagamento(true)

    const resultado = await addSalePayment({
      saleId: vendaSelecionada.id,
      userId: user.id,
      valor,
      formaPagamento,
      observacao: observacaoPagamento || null,
      dataPagamentoIso: montarDataISO(dataPagamento),
      descontoPercentual: Number(descontoPercentual || 0),
      descontoValor: descontoCalculado,
      valorTotalComDesconto: totalComDesconto,
    })

    setSalvandoPagamento(false)

    if (!resultado.success) {
      setMensagem(resultado.message)
      return
    }

    fecharModalPagamento()

    if (resultado.warning) {
      setMensagem(resultado.warning)
    } else {
      setMensagem("Pagamento adicionado com sucesso.")
    }

    await carregarVendas()
  }

  async function salvarEdicaoPagamento() {
    if (!vendaSelecionada || !editandoPagamentoId) return

    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const valorNovo = Number(valorPagamento || 0)

    if (valorNovo <= 0) {
      setMensagem("Informe um valor de pagamento válido.")
      return
    }

    if (!dataPagamento) {
      setMensagem("Informe a data do pagamento.")
      return
    }

    setSalvandoPagamento(true)

    const resultado = await updateSalePayment({
      paymentId: editandoPagamentoId,
      saleId: vendaSelecionada.id,
      userId: user.id,
      valor: valorNovo,
      formaPagamento,
      observacao: observacaoPagamento || null,
      dataPagamentoIso: montarDataISO(dataPagamento),
    })

    setSalvandoPagamento(false)

    if (!resultado.success) {
      setMensagem(resultado.message)
      return
    }

    fecharModalEditarPagamento()
    setMensagem("Pagamento atualizado com sucesso.")
    await carregarVendas()
  }

  async function excluirPagamento(venda: VendaExibicao, pagamentoId: number) {
    const confirmado = window.confirm("Deseja excluir este pagamento?")
    if (!confirmado) return

    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const resultado = await deleteSalePayment({
      paymentId: pagamentoId,
      saleId: venda.id,
      userId: user.id,
    })

    if (!resultado.success) {
      setMensagem(resultado.message)
      return
    }

    setMensagem("Pagamento excluído com sucesso.")
    await carregarVendas()
  }

  async function excluirVendaCancelada(venda: VendaExibicao) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    setExcluindoVenda(true)

    const resultado = await deleteCanceledSale({
      saleId: venda.id,
      userId: user.id,
    })

    setExcluindoVenda(false)
    setMensagem(resultado.message)

    if (!resultado.success) {
      return
    }

    fecharModalExcluirVenda()
    await carregarVendas()
  }

  async function salvarDescontoVenda() {
    if (!vendaParaDesconto) return

    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const percentual = Number(descontoVendaPercentual || 0)

    if (percentual < 0 || percentual > 100) {
      setMensagem("Informe um desconto válido entre 0% e 100%.")
      return
    }

    setSalvandoDesconto(true)

    const resultado = await applySaleDiscount({
      saleId: vendaParaDesconto.id,
      userId: user.id,
      descontoPercentual: percentual,
    })

    setSalvandoDesconto(false)
    setMensagem(resultado.message)

    if (!resultado.success) return

    fecharModalDesconto()
    await carregarVendas()
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

      const statusVendaNormalizado = venda.status?.toLowerCase() || ""
const statusPagamentoNormalizado = venda.payment_status?.toLowerCase() || ""

const passouFiltroStatus =
  filtroStatus === "todas" ||
  (filtroStatus === "ativas" && statusVendaNormalizado !== "cancelada") ||
  (filtroStatus === "canceladas" && statusVendaNormalizado === "cancelada") ||
  (filtroStatus === "pagas" &&
    statusVendaNormalizado !== "cancelada" &&
    statusPagamentoNormalizado === "recebida") ||
  (filtroStatus === "parciais" &&
    statusVendaNormalizado !== "cancelada" &&
    statusPagamentoNormalizado === "parcial") ||
  (filtroStatus === "pendentes" &&
    statusVendaNormalizado !== "cancelada" &&
    statusPagamentoNormalizado === "pendente")


      return passouBusca && passouDataInicio && passouDataFim && passouFiltroStatus
    })
  }, [vendas, busca, dataInicio, dataFim, filtroStatus])

  const totalFiltrado = useMemo(() => {
    return vendasFiltradas
      .filter((venda) => venda.status !== "Cancelada")
      .reduce((soma, venda) => soma + Number(venda.valor_total), 0)
  }, [vendasFiltradas])

  const totalRecebidoFiltrado = useMemo(() => {
    return vendasFiltradas
      .filter((venda) => venda.status !== "Cancelada")
      .reduce((soma, venda) => soma + Number(venda.valor_recebido), 0)
  }, [vendasFiltradas])

  const totalEmAbertoFiltrado = useMemo(() => {
    return vendasFiltradas
      .filter((venda) => venda.status !== "Cancelada")
      .reduce((soma, venda) => soma + Number(venda.valor_em_aberto), 0)
  }, [vendasFiltradas])

  const totalDescontoFiltrado = useMemo(() => {
    return vendasFiltradas
      .filter((venda) => venda.status !== "Cancelada")
      .reduce((soma, venda) => soma + Number(venda.desconto_valor || 0), 0)
  }, [vendasFiltradas])

  const descontoCalculado = useMemo(() => {
    if (!vendaSelecionada) return 0

    const percentual = Number(descontoPercentual || 0)

    if (percentual <= 0) return 0
    if (percentual > 100) return Number(vendaSelecionada.valor_total)

    return Number(vendaSelecionada.valor_total) * (percentual / 100)
  }, [descontoPercentual, vendaSelecionada])

  const totalComDesconto = useMemo(() => {
    if (!vendaSelecionada) return 0

    const total = Number(vendaSelecionada.valor_total) - descontoCalculado
    return total < 0 ? 0 : total
  }, [vendaSelecionada, descontoCalculado])

  const saldoComDesconto = useMemo(() => {
    if (!vendaSelecionada) return 0

    const saldo = totalComDesconto - Number(vendaSelecionada.valor_recebido)
    return saldo < 0 ? 0 : saldo
  }, [vendaSelecionada, totalComDesconto])

  const descontoVendaCalculado = useMemo(() => {
    if (!vendaParaDesconto) return 0

    const percentual = Number(descontoVendaPercentual || 0)
    const valorOriginal =
      Number(vendaParaDesconto.valor_original || 0) > 0
        ? Number(vendaParaDesconto.valor_original)
        : Number(vendaParaDesconto.valor_total)

    if (percentual <= 0) return 0
    if (percentual > 100) return valorOriginal

    return valorOriginal * (percentual / 100)
  }, [descontoVendaPercentual, vendaParaDesconto])

  const totalVendaComDesconto = useMemo(() => {
    if (!vendaParaDesconto) return 0

    const valorOriginal =
      Number(vendaParaDesconto.valor_original || 0) > 0
        ? Number(vendaParaDesconto.valor_original)
        : Number(vendaParaDesconto.valor_total)

    return Math.max(valorOriginal - descontoVendaCalculado, 0)
  }, [vendaParaDesconto, descontoVendaCalculado])

  const saldoVendaComDesconto = useMemo(() => {
    if (!vendaParaDesconto) return 0

    return Math.max(
      totalVendaComDesconto - Number(vendaParaDesconto.valor_recebido),
      0
    )
  }, [vendaParaDesconto, totalVendaComDesconto])

  function exportarCSV() {
    if (vendasFiltradas.length === 0) {
      setMensagem("Não há vendas para exportar.")
      return
    }

    const cabecalho = [
      "Cliente",
      "Produto",
      "Cor",
      "Tamanho",
      "SKU",
      "Quantidade",
      "Valor Unitario",
      "Valor Original",
      "Desconto %",
      "Desconto Valor",
      "Valor Total",
      "Recebido",
      "Em Aberto",
      "Situação Pagamento",
      "Status Venda",
      "Data",
    ]

    const linhas = vendasFiltradas.map((venda) => [
      venda.nomeCliente,
      venda.nomeProduto,
      venda.corProduto,
      venda.tamanhoProduto,
      venda.skuProduto,
      String(venda.quantidade),
      venda.valor_unitario.toFixed(2),
      venda.valor_original.toFixed(2),
      venda.desconto_percentual.toFixed(2),
      venda.desconto_valor.toFixed(2),
      venda.valor_total.toFixed(2),
      venda.valor_recebido.toFixed(2),
      venda.valor_em_aberto.toFixed(2),
      venda.payment_status,
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
    doc.text(`Total vendido: R$ ${totalFiltrado.toFixed(2)}`, 14, startY)
    doc.text(`Total recebido: R$ ${totalRecebidoFiltrado.toFixed(2)}`, 14, startY + 6)
    doc.text(`Total em aberto: R$ ${totalEmAbertoFiltrado.toFixed(2)}`, 14, startY + 12)
    doc.text(`Total de descontos: R$ ${totalDescontoFiltrado.toFixed(2)}`, 14, startY + 18)

    autoTable(doc, {
      startY: startY + 26,
      head: [[
        "Cliente",
        "Produto",
        "Cor",
        "Tam.",
        "SKU",
        "Qtd.",
        "Original",
        "Desc.",
        "Total",
        "Recebido",
        "Em Aberto",
        "Situação",
        "Status",
        "Data",
      ]],
      body: vendasFiltradas.map((venda) => [
        venda.nomeCliente,
        venda.nomeProduto,
        venda.corProduto,
        venda.tamanhoProduto,
        venda.skuProduto,
        String(venda.quantidade),
        `R$ ${venda.valor_original.toFixed(2)}`,
        venda.desconto_percentual > 0
          ? `${venda.desconto_percentual.toFixed(2)}% / R$ ${venda.desconto_valor.toFixed(2)}`
          : "-",
        `R$ ${venda.valor_total.toFixed(2)}`,
        `R$ ${venda.valor_recebido.toFixed(2)}`,
        `R$ ${venda.valor_em_aberto.toFixed(2)}`,
        venda.payment_status,
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

  if (loadingAccess) {
    return <div style={{ padding: 24 }}>Carregando...</div>
  }

  if (!hasAccess) {
    return (
      <div style={{ padding: 24 }}>
        <FeatureBlockedCard
          title="Histórico de vendas é do plano Profissional"
          description="Atualize seu plano para acompanhar todas as vendas, pagamentos e saldos em aberto."
        />
      </div>
    )
  }

  return (
    <div>
      <h2 className="page-title">Histórico de Vendas</h2>
      <p className="page-subtitle">Lista de vendas, recebimentos e saldos em aberto.</p>

      <HelpBanner
        title="Como usar o Histórico de Vendas"
        text="Aqui você acompanha cada venda registrada, quanto já foi recebido, quanto ainda está em aberto e pode adicionar pagamentos posteriores. Também é aqui que você cancela uma venda, quando necessário."
      />

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

        <select
  style={inputData}
  value={filtroStatus}
  onChange={(e) =>
    setFiltroStatus(
      e.target.value as
        | "todas"
        | "ativas"
        | "canceladas"
        | "pagas"
        | "parciais"
        | "pendentes"
    )
  }
>
  <option value="todas">Todas</option>
  <option value="ativas">Ativas</option>
  <option value="canceladas">Canceladas</option>
  <option value="pagas">Pagas</option>
  <option value="parciais">Parciais</option>
  <option value="pendentes">Pendentes</option>
</select>


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
        <span style={contadorResultados}>{vendasFiltradas.length} venda(s)</span>

        <span style={totalResumo}>
          <span style={tituloComAjuda}>
            Vendido
            <HelpTooltip text="Soma do valor total das vendas ativas mostradas na tela." />
          </span>{" "}
          <strong>R$ {totalFiltrado.toFixed(2)}</strong>
        </span>

        <span style={totalResumo}>
          <span style={tituloComAjuda}>
            Recebido
            <HelpTooltip text="Soma de tudo que já foi pago pelos clientes nessas vendas." />
          </span>{" "}
          <strong>R$ {totalRecebidoFiltrado.toFixed(2)}</strong>
        </span>

        <span style={totalResumo}>
          <span style={tituloComAjuda}>
            Em aberto
            <HelpTooltip text="Valor que ainda falta receber dessas vendas." />
          </span>{" "}
          <strong>R$ {totalEmAbertoFiltrado.toFixed(2)}</strong>
        </span>

        <span style={totalResumo}>
          <span style={tituloComAjuda}>
            Descontos
            <HelpTooltip text="Soma total dos descontos concedidos nas vendas ativas mostradas na tela." />
          </span>{" "}
          <strong>R$ {totalDescontoFiltrado.toFixed(2)}</strong>
        </span>
      </div>

      <div className="data-table-wrap">
        <table style={tabela}>
          <thead>
            <tr>
              <th style={th}>Cliente</th>
              <th style={th}>Produto</th>
              <th style={th}>SKU</th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Qtd.
                  <HelpTooltip text="Quantidade de itens vendidos nessa operação." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Valor total
                  <HelpTooltip text="Valor total da venda registrada." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Recebido
                  <HelpTooltip text="Valor já recebido do cliente até agora." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Em aberto
                  <HelpTooltip text="Valor restante que ainda falta receber." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Situação
                  <HelpTooltip text="Mostra se a venda está pendente, parcial ou totalmente recebida." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Status venda
                  <HelpTooltip text="Indica se a venda está ativa ou cancelada." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Data
                  <HelpTooltip text="Data da venda registrada no sistema." />
                </span>
              </th>
              <th style={th}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {vendasFiltradas.map((venda) => (
              <tr key={venda.id}>
                <td style={td}>{venda.nomeCliente}</td>

                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <strong>{venda.nomeProduto}</strong>
                    {(venda.corProduto !== "-" || venda.tamanhoProduto !== "-") && (
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {[venda.corProduto !== "-" ? venda.corProduto : null, venda.tamanhoProduto !== "-" ? venda.tamanhoProduto : null]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    )}
                  </div>
                </td>

                <td style={td}>{venda.skuProduto}</td>
                <td style={td}>{venda.quantidade}</td>

                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <strong>R$ {venda.valor_total.toFixed(2)}</strong>

                    {venda.desconto_percentual > 0 && (
                      <span style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>
                        Original: R$ {venda.valor_original.toFixed(2)}
                        <br />
                        Desconto: {venda.desconto_percentual.toFixed(2)}% (R$ {venda.desconto_valor.toFixed(2)})
                      </span>
                    )}
                  </div>
                </td>

                <td style={td}>R$ {venda.valor_recebido.toFixed(2)}</td>
                <td style={td}>R$ {venda.valor_em_aberto.toFixed(2)}</td>

                <td style={td}>
                  <span
                    className={
                      venda.payment_status === "Recebida"
                        ? "status-pill status-green"
                        : venda.payment_status === "Parcial"
                        ? "status-pill status-yellow"
                        : "status-pill status-gray"
                    }
                  >
                    {venda.payment_status}
                  </span>
                </td>

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
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={acoesTabela}>
                      {venda.status !== "Cancelada" && venda.valor_em_aberto > 0 && (
                        <button
                          onClick={() => abrirModalPagamento(venda)}
                          className="btn btn-primary btn-sm"
                        >
                          Registrar recebimento
                        </button>
                      )}

                      {venda.status !== "Cancelada" && (
                        <button
                          onClick={() => abrirModalDesconto(venda)}
                          className="btn btn-secondary btn-sm"
                        >
                          Aplicar desconto
                        </button>
                      )}

                      {venda.status !== "Cancelada" ? (
                        <button
                          onClick={() => cancelarVenda(venda)}
                          className="btn btn-danger btn-sm"
                        >
                          Cancelar venda
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => restaurarVenda(venda)}
                            className="btn btn-success btn-sm"
                          >
                            Restaurar venda
                          </button>

                          <button
                            onClick={() => abrirModalExcluirVenda(venda)}
                            className="btn btn-danger btn-sm"
                          >
                            Excluir venda
                          </button>
                        </>
                      )}
                    </div>

                    {venda.pagamentos.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {venda.pagamentos.map((pagamento) => (
                          <div
                            key={pagamento.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              padding: "8px 10px",
                              border: "1px solid #e5e7eb",
                              borderRadius: 8,
                              background: "#f8fafc",
                            }}
                          >
                            <div style={{ fontSize: 12, color: "#374151" }}>
                              <div>
                                <strong>R$ {Number(pagamento.valor).toFixed(2)}</strong>{" "}
                                • {pagamento.forma_pagamento} • {formatarData(pagamento.created_at)}
                              </div>

                              {pagamento.observacao && (
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                                  {pagamento.observacao}
                                </div>
                              )}
                            </div>

                            {venda.status !== "Cancelada" && (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button
                                  onClick={() => abrirModalEditarPagamento(venda, pagamento)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Editar pagamento
                                </button>

                                <button
                                  onClick={() => excluirPagamento(venda, pagamento.id)}
                                  className="btn btn-danger btn-sm"
                                >
                                  Excluir pagamento
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {vendasFiltradas.length === 0 && (
              <tr>
                <td style={tdVazio} colSpan={11}>
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatedModal
        open={modalPagamentoAberto}
        onClose={fecharModalPagamento}
        title="Registrar recebimento"
        footer={
          <>
            <button onClick={fecharModalPagamento} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              onClick={salvarPagamento}
              className="btn btn-primary"
              disabled={salvandoPagamento}
            >
              {salvandoPagamento ? "Salvando..." : "Salvar pagamento"}
            </button>
          </>
        }
      >
        <>
          {vendaSelecionada && (
            <div style={{ marginBottom: 16 }}>
              <div>
                <strong>Venda:</strong> {vendaSelecionada.nomeProduto}
              </div>

              <div>
                <strong>Total atual da venda:</strong> R$ {Number(vendaSelecionada.valor_total).toFixed(2)}
              </div>

              {Number(vendaSelecionada.desconto_percentual || 0) > 0 && (
                <>
                  <div>
                    <strong>Valor original:</strong> R$ {Number(vendaSelecionada.valor_original).toFixed(2)}
                  </div>
                  <div>
                    <strong>Desconto já aplicado:</strong> {Number(vendaSelecionada.desconto_percentual).toFixed(2)}% (R$ {Number(vendaSelecionada.desconto_valor).toFixed(2)})
                  </div>
                </>
              )}

              <div>
                <strong>Recebido:</strong> R$ {Number(vendaSelecionada.valor_recebido).toFixed(2)}
              </div>

              <div>
                <strong>Em aberto atual:</strong> R$ {Number(vendaSelecionada.valor_em_aberto).toFixed(2)}
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 10,
                  color: "#1d4ed8",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Saldo restante disponível para receber: R$ {saldoComDesconto.toFixed(2)}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14, fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
            Use este formulário para registrar um recebimento total ou parcial desta venda.
            Você também pode informar a data real em que o cliente pagou.
          </div>

          {vendaSelecionada && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                fontSize: 14,
                color: "#334155",
                lineHeight: 1.7,
              }}
            >
              <div>
                <strong>Total original:</strong> R$ {Number(vendaSelecionada.valor_total).toFixed(2)}
              </div>
              <div>
                <strong>Desconto:</strong> R$ {descontoCalculado.toFixed(2)} ({Number(descontoPercentual || 0).toFixed(2)}%)
              </div>
              <div>
                <strong>Total com desconto:</strong> R$ {totalComDesconto.toFixed(2)}
              </div>
              <div>
                <strong>Já recebido:</strong> R$ {Number(vendaSelecionada.valor_recebido).toFixed(2)}
              </div>
              <div>
                <strong>Saldo restante após desconto:</strong> R$ {saldoComDesconto.toFixed(2)}
              </div>
            </div>
          )}

          <div className="grid-2">
            <div>
              <label style={labelAjuda}>
                Valor do pagamento
                <HelpTooltip text="Informe o valor recebido neste pagamento." />
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Digite o valor recebido"
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Desconto (%)
                <HelpTooltip text="Informe a porcentagem de desconto concedida nesta venda antes de registrar o pagamento." />
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 10"
                value={descontoPercentual}
                onChange={(e) => setDescontoPercentual(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Forma de pagamento
                <HelpTooltip text="Selecione a forma usada pelo cliente." />
              </label>
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                {formasPagamento.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelAjuda}>
                Data do pagamento
                <HelpTooltip text="Informe a data real em que o pagamento ocorreu." />
              </label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Observação
                <HelpTooltip text="Adicione uma observação, se necessário." />
              </label>
              <input
                placeholder="Observação (opcional)"
                value={observacaoPagamento}
                onChange={(e) => setObservacaoPagamento(e.target.value)}
              />
            </div>
          </div>
        </>
      </AnimatedModal>

      <AnimatedModal
        open={modalEditarPagamentoAberto}
        onClose={fecharModalEditarPagamento}
        title="Editar pagamento"
        footer={
          <>
            <button onClick={fecharModalEditarPagamento} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              onClick={salvarEdicaoPagamento}
              className="btn btn-primary"
              disabled={salvandoPagamento}
            >
              {salvandoPagamento ? "Salvando..." : "Salvar alteração"}
            </button>
          </>
        }
      >
        <>
          {vendaSelecionada && (
            <div style={{ marginBottom: 16 }}>
              <div>
                <strong>Venda:</strong> {vendaSelecionada.nomeProduto}
              </div>
              <div>
                <strong>Total atual:</strong> R$ {vendaSelecionada.valor_total.toFixed(2)}
              </div>

              {vendaSelecionada.desconto_percentual > 0 && (
                <>
                  <div>
                    <strong>Valor original:</strong> R$ {vendaSelecionada.valor_original.toFixed(2)}
                  </div>
                  <div>
                    <strong>Desconto aplicado:</strong> {vendaSelecionada.desconto_percentual.toFixed(2)}% (R$ {vendaSelecionada.desconto_valor.toFixed(2)})
                  </div>
                </>
              )}

              <div>
                <strong>Recebido:</strong> R$ {vendaSelecionada.valor_recebido.toFixed(2)}
              </div>
              <div>
                <strong>Em aberto:</strong> R$ {vendaSelecionada.valor_em_aberto.toFixed(2)}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14, fontSize: 14, color: "#6b7280" }}>
            Atualize os dados do pagamento. O histórico e os relatórios serão recalculados automaticamente.
          </div>

          <div className="grid-2">
            <div>
              <label style={labelAjuda}>
                Valor do pagamento
                <HelpTooltip text="Atualize o valor correto desse pagamento." />
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Valor do pagamento"
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Forma de pagamento
                <HelpTooltip text="Atualize a forma usada nesse pagamento." />
              </label>
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                {formasPagamento.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelAjuda}>
                Data do pagamento
                <HelpTooltip text="Atualize a data real em que o pagamento ocorreu." />
              </label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Observação
                <HelpTooltip text="Atualize a observação desse pagamento, se necessário." />
              </label>
              <input
                placeholder="Observação (opcional)"
                value={observacaoPagamento}
                onChange={(e) => setObservacaoPagamento(e.target.value)}
              />
            </div>
          </div>
        </>
      </AnimatedModal>

      <AnimatedModal
        open={modalExcluirVendaAberto}
        onClose={fecharModalExcluirVenda}
        title="Excluir venda cancelada"
        footer={
          <>
            <button onClick={fecharModalExcluirVenda} className="btn btn-secondary">
              Fechar
            </button>
            <button
              onClick={() => vendaParaExcluir && excluirVendaCancelada(vendaParaExcluir)}
              className="btn btn-danger"
              disabled={excluindoVenda}
            >
              {excluindoVenda ? "Excluindo..." : "Excluir definitivamente"}
            </button>
          </>
        }
      >
        <>
          {vendaParaExcluir && (
            <div style={{ marginBottom: 16 }}>
              <div>
                <strong>Produto:</strong> {vendaParaExcluir.nomeProduto}
              </div>
              <div>
                <strong>Cliente:</strong> {vendaParaExcluir.nomeCliente}
              </div>
              <div>
                <strong>Valor total:</strong> R$ {vendaParaExcluir.valor_total.toFixed(2)}
              </div>
              <div>
                <strong>Data:</strong> {formatarData(vendaParaExcluir.created_at)}
              </div>
            </div>
          )}

          <div style={{ fontSize: 14, color: "#6b7280" }}>
            Esta ação remove a venda cancelada do histórico e também exclui os pagamentos
            vinculados a ela. Use apenas quando quiser limpar definitivamente o registro.
          </div>
        </>
      </AnimatedModal>

      <AnimatedModal
        open={modalDescontoAberto}
        onClose={fecharModalDesconto}
        title="Aplicar desconto na venda"
        footer={
          <>
            <button onClick={fecharModalDesconto} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              onClick={salvarDescontoVenda}
              className="btn btn-primary"
              disabled={salvandoDesconto}
            >
              {salvandoDesconto ? "Salvando..." : "Salvar desconto"}
            </button>
          </>
        }
      >
        <>
          {vendaParaDesconto && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div>
                  <strong>Venda:</strong> {vendaParaDesconto.nomeProduto}
                </div>
                <div>
                  <strong>Cliente:</strong> {vendaParaDesconto.nomeCliente}
                </div>
              </div>

              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 14,
                  color: "#334155",
                  lineHeight: 1.7,
                }}
              >
                <div>
                  <strong>Valor original:</strong> R${" "}
                  {(
                    Number(vendaParaDesconto.valor_original || 0) > 0
                      ? Number(vendaParaDesconto.valor_original)
                      : Number(vendaParaDesconto.valor_total)
                  ).toFixed(2)}
                </div>
                <div>
                  <strong>Já recebido:</strong> R$ {Number(vendaParaDesconto.valor_recebido).toFixed(2)}
                </div>
                <div>
                  <strong>Desconto calculado:</strong> R$ {descontoVendaCalculado.toFixed(2)}
                </div>
                <div>
                  <strong>Novo total da venda:</strong> R$ {totalVendaComDesconto.toFixed(2)}
                </div>
                <div>
                  <strong>Saldo em aberto após desconto:</strong> R$ {saldoVendaComDesconto.toFixed(2)}
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={labelAjuda}>
                    Desconto (%)
                    <HelpTooltip text="Informe a porcentagem de desconto que deseja aplicar sobre o valor original da venda." />
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 10"
                    value={descontoVendaPercentual}
                    onChange={(e) => setDescontoVendaPercentual(e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                Esse desconto altera o total da venda e o saldo em aberto, sem registrar
                nenhum recebimento.
              </div>
            </>
          )}
        </>
      </AnimatedModal>
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

const acoesTabela = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
}

const tituloComAjuda = {
  display: "inline-flex",
  alignItems: "center",
}

const labelAjuda = {
  display: "flex",
  alignItems: "center",
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "6px",
}