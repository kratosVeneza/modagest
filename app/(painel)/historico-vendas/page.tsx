"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { montarCabecalhoPDF } from "@/lib/pdfHeader"
import { imageUrlToDataUrl } from "@/lib/imageToDataUrl"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"
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
  cor: string | null
  tamanho: string | null
}

type ClienteBanco = {
  id: number
  nome: string
}

type PagamentoBanco = {
  id: number
  sale_id: number
  valor: number
  forma_pagamento: string
  observacao: string | null
  created_at: string
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
  valor_recebido: number
  valor_em_aberto: number
  payment_status: "Pendente" | "Parcial" | "Recebida"
  created_at: string
  status: string
  estoque_devolvido: boolean
  nomeProduto: string
  skuProduto: string
  corProduto: string
  tamanhoProduto: string
  nomeCliente: string
  pagamentos: PagamentoBanco[]
}

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
  const [salvandoPagamento, setSalvandoPagamento] = useState(false)
  const [editandoPagamentoId, setEditandoPagamentoId] = useState<number | null>(null)
  const [modalEditarPagamentoAberto, setModalEditarPagamentoAberto] = useState(false)
  const [modalExcluirVendaAberto, setModalExcluirVendaAberto] = useState(false)
  const [vendaParaExcluir, setVendaParaExcluir] = useState<VendaExibicao | null>(null)
  const [excluindoVenda, setExcluindoVenda] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "ativas" | "canceladas">("todas")

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

  function calcularStatusPagamento(
    valorTotal: number,
    valorRecebido: number
  ): "Pendente" | "Parcial" | "Recebida" {
    if (valorRecebido <= 0) return "Pendente"
    if (valorRecebido >= valorTotal) return "Recebida"
    return "Parcial"
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
  .select("id, nome, sku, estoque, cor, tamanho")
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

    const { data: pagamentosData, error: erroPagamentos } = await supabase
      .from("sale_payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (erroPagamentos) {
      setMensagem("Erro ao carregar pagamentos.")
      return
    }

    const vendasTipadas = (vendasData ?? []) as VendaBanco[]
    const produtosTipados = (produtosData ?? []) as ProdutoBanco[]
    const clientesTipados = (clientesData ?? []) as ClienteBanco[]
    const pagamentosTipados = (pagamentosData ?? []) as PagamentoBanco[]

    const vendasFormatadas: VendaExibicao[] = vendasTipadas.map((venda) => {
      const produtoRelacionado = produtosTipados.find(
        (produto) => produto.id === venda.product_id
      )

      const clienteRelacionado = clientesTipados.find(
        (cliente) => cliente.id === venda.customer_id
      )

      const pagamentosDaVenda = pagamentosTipados.filter(
        (pagamento) => pagamento.sale_id === venda.id
      )

      const valorRecebido = pagamentosDaVenda.reduce(
        (soma, item) => soma + Number(item.valor),
        0
      )

      const valorEmAberto = Math.max(Number(venda.valor_total) - valorRecebido, 0)

      return {
        id: venda.id,
        product_id: venda.product_id,
        customer_id: venda.customer_id,
        quantidade: venda.quantidade,
        valor_unitario: Number(venda.valor_unitario),
        valor_total: Number(venda.valor_total),
        valor_recebido: valorRecebido,
        valor_em_aberto: valorEmAberto,
        payment_status: calcularStatusPagamento(Number(venda.valor_total), valorRecebido),
        created_at: venda.created_at,
        status: venda.status || "Ativa",
        estoque_devolvido: Boolean(venda.estoque_devolvido),
        nomeProduto: produtoRelacionado?.nome || "Produto removido",
        skuProduto: produtoRelacionado?.sku || "-",
        corProduto: produtoRelacionado?.cor || "-",
        tamanhoProduto: produtoRelacionado?.tamanho || "-",
        nomeCliente: clienteRelacionado?.nome || "Sem cliente",

        pagamentos: pagamentosDaVenda,
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
    setModalPagamentoAberto(true)
  }

  function fecharModalPagamento() {
    setVendaSelecionada(null)
    setEditandoPagamentoId(null)
    setValorPagamento("")
    setFormaPagamento("Pix")
    setObservacaoPagamento("")
    setDataPagamento(hojeInputDate())
    setModalPagamentoAberto(false)
  }

  function abrirModalExcluirVenda(venda: VendaExibicao) {
  setVendaParaExcluir(venda)
  setModalExcluirVendaAberto(true)
}

function fecharModalExcluirVenda() {
  setVendaParaExcluir(null)
  setModalExcluirVendaAberto(false)
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
    setMensagem("Informe um valor de pagamento válido.")
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

  if (venda.status?.toLowerCase() !== "cancelada") {
    setMensagem("Somente vendas canceladas podem ser excluídas do histórico.")
    return
  }

  setExcluindoVenda(true)

  const { error: erroPagamentos } = await supabase
    .from("sale_payments")
    .delete()
    .eq("sale_id", venda.id)
    .eq("user_id", user.id)

  if (erroPagamentos) {
    console.log("ERRO AO EXCLUIR PAGAMENTOS DA VENDA:", erroPagamentos)
    setExcluindoVenda(false)
    setMensagem(erroPagamentos.message || "Erro ao excluir pagamentos da venda.")
    return
  }

  const { error: erroVenda } = await supabase
    .from("sales")
    .delete()
    .eq("id", venda.id)
    .eq("user_id", user.id)

  setExcluindoVenda(false)

  if (erroVenda) {
    console.log("ERRO AO EXCLUIR VENDA CANCELADA:", erroVenda)
    setMensagem(erroVenda.message || "Erro ao excluir venda cancelada.")
    return
  }

  fecharModalExcluirVenda()
  setMensagem("Venda cancelada excluída do histórico com sucesso.")
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
      
        const statusNormalizado = venda.status?.toLowerCase() || ""

const passouFiltroStatus =
  filtroStatus === "todas" ||
  (filtroStatus === "ativas" && statusNormalizado !== "cancelada") ||
  (filtroStatus === "canceladas" && statusNormalizado === "cancelada")

      return passouBusca && passouDataInicio && passouDataFim && passouFiltroStatus
    })
  }, [vendas, busca, dataInicio, dataFim])

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

    autoTable(doc, {
      startY: startY + 20,
      head: [[
      "Cliente",
      "Produto",
      "Cor",
      "Tam.",
      "SKU",
      "Quantidade",
      "Valor Total",
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
    setFiltroStatus(e.target.value as "todas" | "ativas" | "canceladas")
  }
>
  <option value="todas">Todas</option>
  <option value="ativas">Ativas</option>
  <option value="canceladas">Canceladas</option>
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
                <td style={td}>R$ {venda.valor_total.toFixed(2)}</td>
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
        Adicionar pagamento
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
  title="Adicionar pagamento"
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
          <strong>Total:</strong> R$ {vendaSelecionada.valor_total.toFixed(2)}
        </div>
        <div>
          <strong>Recebido:</strong> R$ {vendaSelecionada.valor_recebido.toFixed(2)}
        </div>
        <div>
          <strong>Em aberto:</strong> R$ {vendaSelecionada.valor_em_aberto.toFixed(2)}
        </div>
      </div>
    )}

    <div style={{ marginBottom: 14, fontSize: 14, color: "#6b7280" }}>
      Use este formulário para registrar pagamentos feitos depois da venda, inclusive com data retroativa.
    </div>

    <div className="grid-2">
      <div>
        <label style={labelAjuda}>
          Valor do pagamento
          <HelpTooltip text="Informe o valor recebido neste pagamento." />
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
          <strong>Total:</strong> R$ {vendaSelecionada.valor_total.toFixed(2)}
        </div>
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
