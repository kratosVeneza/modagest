import { supabase } from "@/lib/supabase"

type AddPaymentInput = {
  saleId: number
  userId: string
  valor: number
  formaPagamento: string
  observacao?: string | null
  dataPagamentoIso: string
  descontoPercentual?: number
  descontoValor?: number
  valorTotalComDesconto?: number
}

type AddPaymentResult =
  | { success: true; warning?: string }
  | { success: false; message: string }

export async function addSalePayment(input: AddPaymentInput): Promise<AddPaymentResult> {
  const {
    saleId,
    userId,
    valor,
    formaPagamento,
    observacao = null,
    dataPagamentoIso,
    descontoPercentual = 0,
    descontoValor = 0,
    valorTotalComDesconto,
  } = input

  const { data: venda, error: erroVenda } = await supabase
    .from("sales")
    .select("id, valor_total, valor_original, status")
    .eq("id", saleId)
    .eq("user_id", userId)
    .maybeSingle()

  if (erroVenda || !venda) {
    return { success: false, message: "Venda não encontrada." }
  }

  if (venda.status === "Cancelada") {
    return {
      success: false,
      message: "Não é possível adicionar pagamento em venda cancelada.",
    }
  }

  const valorOriginal =
    Number(venda.valor_original || 0) > 0
      ? Number(venda.valor_original)
      : Number(venda.valor_total)

  const percentualFinal = Number(descontoPercentual || 0)

  if (percentualFinal < 0 || percentualFinal > 100) {
    return {
      success: false,
      message: "O desconto deve estar entre 0% e 100%.",
    }
  }

  const descontoFinal =
    percentualFinal > 0
      ? Number(descontoValor || valorOriginal * (percentualFinal / 100))
      : 0

  const totalFinalVenda =
    percentualFinal > 0
      ? Number(valorTotalComDesconto || valorOriginal - descontoFinal)
      : Number(venda.valor_total)

  if (totalFinalVenda < 0) {
    return {
      success: false,
      message: "O valor final da venda não pode ficar negativo.",
    }
  }

  const { data: pagamentos, error: erroPagamentos } = await supabase
    .from("sale_payments")
    .select("valor")
    .eq("sale_id", saleId)
    .eq("user_id", userId)

  if (erroPagamentos) {
    return { success: false, message: "Erro ao validar pagamentos da venda." }
  }

  const totalRecebido = (pagamentos ?? []).reduce(
    (soma, p) => soma + Number(p.valor),
    0
  )

  if (totalRecebido + valor > totalFinalVenda) {
    return {
      success: false,
      message: "Pagamento ultrapassa o valor total da venda após o desconto.",
    }
  }

  const { error: erroUpdateVenda } = await supabase
    .from("sales")
    .update({
      valor_original: valorOriginal,
      desconto_percentual: percentualFinal,
      desconto_valor: descontoFinal,
      valor_total: totalFinalVenda,
    })
    .eq("id", saleId)
    .eq("user_id", userId)

  if (erroUpdateVenda) {
    return {
      success: false,
      message: "Erro ao aplicar desconto na venda.",
    }
  }

  const { error: erroPagamento } = await supabase
    .from("sale_payments")
    .insert([
      {
        sale_id: saleId,
        user_id: userId,
        valor,
        forma_pagamento: formaPagamento,
        observacao,
        created_at: dataPagamentoIso,
      },
    ])

  if (erroPagamento) {
    return { success: false, message: "Erro ao registrar pagamento." }
  }

  const { error: erroFinanceiro } = await supabase
    .from("financial_transactions")
    .insert([
      {
        user_id: userId,
        type: "entrada",
        amount: valor,
        status: "pago",
        description:
          percentualFinal > 0
            ? `Recebimento de venda com desconto de ${percentualFinal}%`
            : "Recebimento de venda",
        reference_type: "venda",
        reference_id: saleId,
        created_at: dataPagamentoIso,
      },
    ])

  if (erroFinanceiro) {
    return {
      success: true,
      warning: "Pagamento registrado, mas houve erro ao lançar no financeiro.",
    }
  }

  return { success: true }
}

