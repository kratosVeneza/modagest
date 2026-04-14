import { supabase } from "@/lib/supabase"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"
import { getStoreSettings } from "@/lib/settings/getStoreSettings"
import { shouldCalculateTaxesOnSale } from "@/lib/tax/canUseTaxFeatures"
import { getProductTaxContext } from "@/lib/tax/getProductTaxContext"
import { calculateTax } from "@/lib/tax/calculateTax"

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
  valorOriginal?: number
  descontoPercentual?: number
  descontoValor?: number
}

type CreateSaleResult =
  | { success: true; saleId: number; warning?: string }
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
    valorOriginal = valorTotal,
    descontoPercentual = 0,
    descontoValor = 0,
  } = input

  if (quantidade <= 0) {
    return { success: false, message: "Quantidade inválida." }
  }

  if (valorUnitario <= 0) {
    return { success: false, message: "Valor unitário inválido." }
  }

  if (valorTotal < 0) {
    return { success: false, message: "Valor total inválido." }
  }

  if (descontoPercentual < 0 || descontoPercentual > 100) {
    return { success: false, message: "O desconto deve estar entre 0% e 100%." }
  }

  if (descontoValor < 0) {
    return { success: false, message: "Valor de desconto inválido." }
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

  const { data: produto, error: produtoError } = await supabase
    .from("products")
    .select("id, nome, estoque, preco, user_id")
    .eq("id", productId)
    .eq("user_id", userId)
    .maybeSingle()

  if (produtoError || !produto) {
    return { success: false, message: "Produto não encontrado." }
  }

  if (quantidade > Number(produto.estoque)) {
    return { success: false, message: "Estoque insuficiente para essa venda." }
  }

  const settings = await getStoreSettings(userId)
  const calcularImposto = shouldCalculateTaxesOnSale(settings)

  let taxPayload = {
    ncm_snapshot: null as string | null,
    tax_rule_id: null as number | null,
    cst_snapshot: null as string | null,
    cclasstrib_snapshot: null as string | null,
    cbs_aliquota_aplicada: 0,
    ibs_aliquota_aplicada: 0,
    percentual_reducao_aplicado: 0,
    base_calculo: valorTotal,
    valor_cbs: 0,
    valor_ibs: 0,
    valor_total_impostos: 0,
  }

  if (calcularImposto) {
    try {
      const { product, taxRule } = await getProductTaxContext(productId)

      const tax = calculateTax({
        valorUnitario,
        quantidade,
        product,
        taxRule,
      })

      taxPayload = {
        ncm_snapshot: product.ncm || null,
        tax_rule_id: taxRule?.id || null,
        cst_snapshot: tax.cst,
        cclasstrib_snapshot: tax.cclasstrib,
        cbs_aliquota_aplicada: tax.cbsAliquotaAplicada,
        ibs_aliquota_aplicada: tax.ibsAliquotaAplicada,
        percentual_reducao_aplicado: tax.percentualReducaoAplicado,
        base_calculo: tax.baseCalculo,
        valor_cbs: tax.valorCBS,
        valor_ibs: tax.valorIBS,
        valor_total_impostos: tax.valorTotalImpostos,
      }
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.message || "Não foi possível calcular os impostos da venda.",
      }
    }
  }

  const novoEstoque = Number(produto.estoque) - quantidade

  const { data: produtoAtualizado, error: erroReservaEstoque } = await supabase
    .from("products")
    .update({ estoque: novoEstoque })
    .eq("id", productId)
    .eq("user_id", userId)
    .eq("estoque", produto.estoque)
    .select("id, estoque")
    .maybeSingle()

  if (erroReservaEstoque) {
    return {
      success: false,
      message: "Erro ao reservar o estoque para essa venda.",
    }
  }

  if (!produtoAtualizado) {
    return {
      success: false,
      message:
        "O estoque desse produto acabou de ser alterado por outra operação. Atualize a tela e tente novamente.",
    }
  }

  const vendaPayload = {
    product_id: productId,
    customer_id: customerId,
    quantidade,
    valor_unitario: valorUnitario,
    valor_total: valorTotal,
    valor_original: valorOriginal,
    desconto_percentual: descontoPercentual,
    desconto_valor: descontoValor,
    user_id: userId,
    status: "Ativa",
    created_at: dataVendaIso,
    estoque_devolvido: false,
    ...taxPayload,
  }

  const { data: vendaCriada, error: erroVenda } = await supabase
    .from("sales")
    .insert([vendaPayload])
    .select("id")
    .single()

  if (erroVenda || !vendaCriada) {
    await supabase
      .from("products")
      .update({ estoque: produto.estoque })
      .eq("id", productId)
      .eq("user_id", userId)

    return { success: false, message: "Erro ao registrar venda." }
  }

  try {
    await registrarMovimentoEstoque({
      productId,
      userId,
      tipo: "saida",
      quantidade,
      motivo: "Venda",
      origem: "venda",
      referenciaId: Number(vendaCriada.id),
      estoqueApos: novoEstoque,
    })
  } catch (error: any) {
    await supabase
      .from("products")
      .update({ estoque: produto.estoque })
      .eq("id", productId)
      .eq("user_id", userId)

    await supabase
      .from("sales")
      .delete()
      .eq("id", vendaCriada.id)
      .eq("user_id", userId)

    return {
      success: false,
      message:
        error?.message ||
        "Houve erro ao registrar a movimentação de estoque. Nenhuma alteração foi mantida.",
    }
  }

  let warning = ""

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
      warning =
        "Venda salva e estoque baixado, mas houve erro ao registrar o pagamento inicial."
      return { success: true, saleId: vendaCriada.id, warning }
    }

    const { error: erroFinanceiro } = await supabase
      .from("financial_transactions")
      .insert([
        {
          user_id: userId,
          type: "entrada",
          amount: valorRecebidoInicial,
          status: "pago",
          description:
            descontoPercentual > 0
              ? `Recebimento inicial de venda com desconto de ${descontoPercentual}%`
              : "Recebimento inicial de venda",
          reference_type: "venda",
          reference_id: vendaCriada.id,
          created_at: dataVendaIso,
        },
      ])

    if (erroFinanceiro) {
      warning =
        "Venda salva, estoque baixado e pagamento registrado, mas erro ao lançar no financeiro."
      return { success: true, saleId: vendaCriada.id, warning }
    }
  }

  return { success: true, saleId: vendaCriada.id }
}