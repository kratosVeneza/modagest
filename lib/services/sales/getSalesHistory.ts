import { supabase } from "@/lib/supabase"

export type VendaBanco = {
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

export type ProdutoBanco = {
  id: number
  nome: string
  sku: string
  estoque: number
  cor: string | null
  tamanho: string | null
}

export type ClienteBanco = {
  id: number
  nome: string
}

export type PagamentoBanco = {
  id: number
  sale_id: number
  valor: number
  forma_pagamento: string
  observacao: string | null
  created_at: string
}

export type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

export type VendaExibicao = {
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

type GetSalesHistoryResult =
  | {
      success: true
      vendas: VendaExibicao[]
      loja: Loja | null
    }
  | {
      success: false
      message: string
      vendas: VendaExibicao[]
      loja: Loja | null
    }

function calcularStatusPagamento(
  valorTotal: number,
  valorRecebido: number
): "Pendente" | "Parcial" | "Recebida" {
  if (valorRecebido <= 0) return "Pendente"
  if (valorRecebido >= valorTotal) return "Recebida"
  return "Parcial"
}

export async function getSalesHistory(userId: string): Promise<GetSalesHistoryResult> {
  const { data: lojaData } = await supabase
    .from("stores")
    .select("nome_loja, logo_url")
    .eq("user_id", userId)
    .maybeSingle()

  const loja = (lojaData ?? null) as Loja | null

  const { data: vendasData, error: erroVendas } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (erroVendas) {
    return {
      success: false,
      message: "Erro ao carregar vendas.",
      vendas: [],
      loja,
    }
  }

  const { data: produtosData, error: erroProdutos } = await supabase
    .from("products")
    .select("id, nome, sku, estoque, cor, tamanho")
    .eq("user_id", userId)

  if (erroProdutos) {
    return {
      success: false,
      message: "Erro ao carregar produtos.",
      vendas: [],
      loja,
    }
  }

  const { data: clientesData, error: erroClientes } = await supabase
    .from("customers")
    .select("id, nome")
    .eq("user_id", userId)

  if (erroClientes) {
    return {
      success: false,
      message: "Erro ao carregar clientes.",
      vendas: [],
      loja,
    }
  }

  const { data: pagamentosData, error: erroPagamentos } = await supabase
    .from("sale_payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (erroPagamentos) {
    return {
      success: false,
      message: "Erro ao carregar pagamentos.",
      vendas: [],
      loja,
    }
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

  return {
    success: true,
    vendas: vendasFormatadas,
    loja,
  }
}
