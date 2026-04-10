import { supabase } from "@/lib/supabase"

type ApplySaleDiscountInput = {
  saleId: number
  userId: string
  descontoPercentual: number
}

type ApplySaleDiscountResult =
  | { success: true; message: string }
  | { success: false; message: string }

export async function applySaleDiscount({
  saleId,
  userId,
  descontoPercentual,
}: ApplySaleDiscountInput): Promise<ApplySaleDiscountResult> {
  if (descontoPercentual < 0 || descontoPercentual > 100) {
    return {
      success: false,
      message: "O desconto deve estar entre 0% e 100%.",
    }
  }

  const { data: venda, error: erroVenda } = await supabase
    .from("sales")
    .select("id, user_id, status, valor_total, valor_original")
    .eq("id", saleId)
    .eq("user_id", userId)
    .maybeSingle()

  if (erroVenda || !venda) {
    return {
      success: false,
      message: "Venda não encontrada.",
    }
  }

  if (venda.status === "Cancelada") {
    return {
      success: false,
      message: "Não é possível aplicar desconto em venda cancelada.",
    }
  }

  const valorOriginal =
    Number(venda.valor_original || 0) > 0
      ? Number(venda.valor_original)
      : Number(venda.valor_total)

  const descontoValor = valorOriginal * (descontoPercentual / 100)
  const valorTotalComDesconto = Math.max(valorOriginal - descontoValor, 0)

  const { data: pagamentos, error: erroPagamentos } = await supabase
    .from("sale_payments")
    .select("valor")
    .eq("sale_id", saleId)
    .eq("user_id", userId)

  if (erroPagamentos) {
    return {
      success: false,
      message: "Erro ao validar pagamentos da venda.",
    }
  }

  const totalRecebido = (pagamentos ?? []).reduce(
    (soma, item) => soma + Number(item.valor),
    0
  )

  if (totalRecebido > valorTotalComDesconto) {
    return {
      success: false,
      message:
        "Não é possível aplicar esse desconto porque o valor já recebido ficaria maior que o novo total da venda.",
    }
  }

  const { error: erroUpdate } = await supabase
    .from("sales")
    .update({
      valor_original: valorOriginal,
      desconto_percentual: descontoPercentual,
      desconto_valor: descontoValor,
      valor_total: valorTotalComDesconto,
    })
    .eq("id", saleId)
    .eq("user_id", userId)

  if (erroUpdate) {
    return {
      success: false,
      message: "Erro ao aplicar desconto na venda.",
    }
  }

  return {
    success: true,
    message: "Desconto aplicado com sucesso.",
  }
}