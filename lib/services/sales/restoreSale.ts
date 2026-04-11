import { supabase } from "@/lib/supabase"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"

type RestoreSaleInput = {
  saleId: number
  userId: string
}

type RestoreSaleResult =
  | { success: true; message: string }
  | { success: false; message: string }

export async function restoreSale(input: RestoreSaleInput): Promise<RestoreSaleResult> {
  const { saleId, userId } = input

  const { data: vendaAtual, error: erroVendaAtual } = await supabase
    .from("sales")
    .select("id, status, estoque_devolvido, quantidade, product_id")
    .eq("id", saleId)
    .eq("user_id", userId)
    .maybeSingle()

  if (erroVendaAtual || !vendaAtual) {
    return { success: false, message: "Não foi possível localizar essa venda." }
  }

  if (vendaAtual.status?.toLowerCase() !== "cancelada") {
    return { success: false, message: "Somente vendas canceladas podem ser restauradas." }
  }

  if (!vendaAtual.estoque_devolvido) {
    return { success: false, message: "Essa venda já está ativa no estoque." }
  }

  const { data: produtoData, error: erroProduto } = await supabase
    .from("products")
    .select("id, nome, sku, marca, categoria, tipo, cor, tamanho, unidade, estoque")
    .eq("id", vendaAtual.product_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (erroProduto || !produtoData) {
    return { success: false, message: "Não foi possível localizar o produto dessa venda." }
  }

  if (Number(produtoData.estoque) < Number(vendaAtual.quantidade)) {
    return { success: false, message: "Não há estoque suficiente para restaurar essa venda." }
  }

  const novoEstoque = Number(produtoData.estoque) - Number(vendaAtual.quantidade)

  const { error: erroAtualizarEstoque } = await supabase
    .from("products")
    .update({ estoque: novoEstoque })
    .eq("id", vendaAtual.product_id)
    .eq("user_id", userId)

  if (erroAtualizarEstoque) {
    return {
      success: false,
      message: "Erro ao baixar novamente o estoque para restaurar a venda.",
    }
  }

  try {
    await registrarMovimentoEstoque({
      productId: vendaAtual.product_id,
      userId,
      tipo: "saida", // CORRETO: é uma saída novamente
      quantidade: Number(vendaAtual.quantidade),
      motivo: "Restauração de venda cancelada",
      origem: "venda",
      referenciaId: vendaAtual.id,
      estoqueApos: novoEstoque,
      productSnapshot: {
        nome: produtoData.nome,
        sku: produtoData.sku,
        marca: produtoData.marca,
        categoria: produtoData.categoria,
        tipo: produtoData.tipo,
        cor: produtoData.cor,
        tamanho: produtoData.tamanho,
        unidade: produtoData.unidade,
      },
    })
  } catch (error: any) {
    return {
      success: false,
      message:
        error?.message ||
        "Estoque ajustado, mas houve erro ao registrar a movimentação.",
    }
  }

  const { error: erroVenda } = await supabase
    .from("sales")
    .update({
      status: "Ativa",
      estoque_devolvido: false,
    })
    .eq("id", vendaAtual.id)
    .eq("user_id", userId)

  if (erroVenda) {
    return { success: false, message: "Erro ao restaurar a venda." }
  }

  return { success: true, message: "Venda restaurada com sucesso." }
}

