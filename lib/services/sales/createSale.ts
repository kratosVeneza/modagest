import { supabase } from "@/lib/supabase"
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

  const { data, error } = await supabase.rpc("create_sale_safe", {
    p_user_id: userId,
    p_product_id: productId,
    p_customer_id: customerId,
    p_quantidade: quantidade,
    p_valor_unitario: valorUnitario,
    p_valor_total: valorTotal,
    p_data_venda: dataVendaIso,
    p_valor_original: valorOriginal,
    p_desconto_percentual: descontoPercentual,
    p_desconto_valor: descontoValor,
    p_ncm_snapshot: taxPayload.ncm_snapshot,
    p_tax_rule_id: taxPayload.tax_rule_id,
    p_cst_snapshot: taxPayload.cst_snapshot,
    p_cclasstrib_snapshot: taxPayload.cclasstrib_snapshot,
    p_cbs_aliquota_aplicada: taxPayload.cbs_aliquota_aplicada,
    p_ibs_aliquota_aplicada: taxPayload.ibs_aliquota_aplicada,
    p_percentual_reducao_aplicado: taxPayload.percentual_reducao_aplicado,
    p_base_calculo: taxPayload.base_calculo,
    p_valor_cbs: taxPayload.valor_cbs,
    p_valor_ibs: taxPayload.valor_ibs,
    p_valor_total_impostos: taxPayload.valor_total_impostos,
  })

  if (error) {
    return {
      success: false,
      message: error.message || "Erro ao registrar venda.",
    }
  }

  const resultado = Array.isArray(data) ? data[0] : data

  if (!resultado?.success || !resultado?.sale_id) {
    return {
      success: false,
      message: resultado?.message || "Não foi possível registrar a venda.",
    }
  }

  let warning = ""

  if (valorRecebidoInicial > 0) {
    const { error: erroPagamento } = await supabase
      .from("sale_payments")
      .insert([
        {
          sale_id: resultado.sale_id,
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
      return { success: true, saleId: Number(resultado.sale_id), warning }
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
          reference_id: resultado.sale_id,
          created_at: dataVendaIso,
        },
      ])

    if (erroFinanceiro) {
      warning =
        "Venda salva, estoque baixado e pagamento registrado, mas erro ao lançar no financeiro."
      return { success: true, saleId: Number(resultado.sale_id), warning }
    }
  }

  return { success: true, saleId: Number(resultado.sale_id) }
}