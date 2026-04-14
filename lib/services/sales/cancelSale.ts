import { supabase } from "@/lib/supabase"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"

type CancelSaleInput = {
  saleId: number
  userId: string
}

type CancelSaleResult =
  | { success: true; message: string }
  | { success: false; message: string }

export async function cancelSale(input: CancelSaleInput): Promise<CancelSaleResult> {
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

  if (vendaAtual.status === "Cancelada") {
    return { success: false, message: "Essa venda já está cancelada." }
  }

  if (vendaAtual.estoque_devolvido) {
    return { success: false, message: "O estoque dessa venda já foi devolvido." }
  }

  const { data: vendaTravada, error: erroTravamento } = await supabase
    .from("sales")
    .update({
      status: "Cancelada",
      estoque_devolvido: true,
    })
    .eq("id", vendaAtual.id)
    .eq("user_id", userId)
    .eq("status", vendaAtual.status)
    .eq("estoque_devolvido", false)
    .select("id, status, estoque_devolvido, quantidade, product_id")
    .maybeSingle()

  if (erroTravamento) {
    return { success: false, message: "Erro ao iniciar o cancelamento da venda." }
  }

  if (!vendaTravada) {
    return {
      success: false,
      message: "Essa venda já foi processada por outra operação. Atualize a tela e tente novamente.",
    }
  }

  const { data: produtoData, error: erroProduto } = await supabase
    .from("products")
    .select("id, nome, sku, marca, categoria, tipo, cor, tamanho, unidade, estoque")
    .eq("id", vendaTravada.product_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (erroProduto || !produtoData) {
    await supabase
      .from("sales")
      .update({
        status: vendaAtual.status,
        estoque_devolvido: false,
      })
      .eq("id", vendaTravada.id)
      .eq("user_id", userId)

    return { success: false, message: "Não foi possível localizar o produto dessa venda." }
  }

  const novoEstoque = Number(produtoData.estoque) + Number(vendaTravada.quantidade)

  const { error: erroAtualizarEstoque } = await supabase
    .from("products")
    .update({ estoque: novoEstoque })
    .eq("id", vendaTravada.product_id)
    .eq("user_id", userId)

  if (erroAtualizarEstoque) {
    await supabase
      .from("sales")
      .update({
        status: vendaAtual.status,
        estoque_devolvido: false,
      })
      .eq("id", vendaTravada.id)
      .eq("user_id", userId)

    return { success: false, message: "Erro ao devolver o item ao estoque." }
  }

  try {
    await registrarMovimentoEstoque({
      productId: vendaTravada.product_id,
      userId,
      tipo: "cancelamento",
      quantidade: Number(vendaTravada.quantidade),
      motivo: "Cancelamento de venda",
      origem: "venda",
      referenciaId: vendaTravada.id,
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
    await supabase
      .from("products")
      .update({ estoque: produtoData.estoque })
      .eq("id", vendaTravada.product_id)
      .eq("user_id", userId)

    await supabase
      .from("sales")
      .update({
        status: vendaAtual.status,
        estoque_devolvido: false,
      })
      .eq("id", vendaTravada.id)
      .eq("user_id", userId)

    return {
      success: false,
      message:
        error?.message ||
        "Houve erro ao registrar a movimentação de cancelamento. Nenhuma alteração foi mantida.",
    }
  }

  return { success: true, message: "Venda cancelada e estoque devolvido com sucesso." }
}