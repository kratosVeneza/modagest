import { supabase } from "@/lib/supabase"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"

type CreateSaleInput = {
  userId: string
  productId: number
  customerId?: number | null
  quantidade: number
  valorUnitario: number
  valorTotal: number
  dataVendaIso: string
  valorRecebidoInicial?: number
  formaPagamentoInicial?: string
  observacaoPagamentoInicial?: string | null
}

type CreateSaleResult =
  | { success: true; saleId: number }
  | { success: false; message: string }

export async function createSale(input: CreateSaleInput): Promise<CreateSaleResult> {
  const {
    userId,
    productId,
    customerId = null,
    quantidade,
    valorUnitario,
    valorTotal,
    dataVendaIso,
    valorRecebidoInicial = 0,
    formaPagamentoInicial = "Pix",
    observacaoPagamentoInicial = null,
  } = input

  const { data: produto, error: produtoError } = await supabase
    .from("products")
    .select("id, estoque, preco, user_id")
    .eq("id", productId)
    .eq("user_id", userId)
    .maybeSingle()

  if (produtoError || !produto) {
    return { success: false, message: "Produto não encontrado." }
  }

  if (quantidade <= 0) {
    return { success: false, message: "Quantidade inválida." }
  }

  if (quantidade > Number(produto.estoque)) {
    return { success: false, message: "Estoque insuficiente para essa venda." }
  }

  if (valorRecebidoInicial < 0) {
    return {
      success: false,
      message: "O valor recebido inicial não pode ser negativo.",
    }
  }

  if (valorRecebidoInicial > valorTotal) {
    return {
      success: false,
      message: "O valor recebido inicial não pode ser maior que o valor total.",
    }
  }

  const vendaPayload = {
    product_id: productId,
    customer_id: customerId,
    quantidade,
    valor_unitario: valorUnitario,
    valor_total: valorTotal,
    user_id: userId,
    status: "Ativa",
    created_at: dataVendaIso,
    estoque_devolvido: false,
  }

  const { data: vendaCriada, error: erroVenda } = await supabase
    .from("sales")
    .insert([vendaPayload])
    .select("id")
    .single()

  if (erroVenda || !vendaCriada) {
    return { success: false, message: "Erro ao registrar venda." }
  }

  if (valorRecebidoInicial > 0) {
    const { error: erroPagamento } = await supabase
      .from("sale_payments")
      .insert([
        {
          sale_id: vendaCriada.id,
          user_id: userId,
          valor: valorRecebidoInicial,
          forma_pagamento: formaPagamentoInicial,
          observacao: observacaoPagamentoInicial || null,
          created_at: dataVendaIso,
        },
      ])

    if (erroPagamento) {
      return {
        success: false,
        message: "Venda criada, mas houve erro ao registrar o pagamento inicial.",
      }
    }

    const { error: erroFinanceiro } = await supabase
      .from("financial_transactions")
      .insert([
        {
          user_id: userId,
          type: "entrada",
          amount: valorRecebidoInicial,
          status: "pago",
          created_at: dataVendaIso,
        },
      ])

    if (erroFinanceiro) {
      return {
        success: false,
        message: "Venda e pagamento registrados, mas erro ao lançar no financeiro.",
      }
    }
  }

  const novoEstoque = Number(produto.estoque) - quantidade

  const { error: erroEstoque } = await supabase
    .from("products")
    .update({ estoque: novoEstoque })
    .eq("id", productId)
    .eq("user_id", userId)

  if (erroEstoque) {
    return {
      success: false,
      message: "Venda salva, mas houve erro ao atualizar o estoque.",
    }
  }

  try {
    await registrarMovimentoEstoque({
      productId,
      userId,
      tipo: "saida",
      quantidade,
      motivo: "Venda",
    })
  } catch (error: any) {
    return {
      success: false,
      message:
        error?.message ||
        "Venda salva, mas houve erro ao registrar a movimentação de estoque.",
    }
  }

  return { success: true, saleId: vendaCriada.id }
}
