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

  if (!vendaAtual.estoque_devolvido) {
    const { data: produtoData, error: erroProduto } = await supabase
      .from("products")
      .select("id, nome, sku, marca, categoria, tipo, cor, tamanho, unidade, estoque")
      .eq("id", vendaAtual.product_id)
      .eq("user_id", userId)
      .maybeSingle()

    if (erroProduto || !produtoData) {
      return { success: false, message: "Não foi possível localizar o produto dessa venda." }
    }

    const novoEstoque = Number(produtoData.estoque) + Number(vendaAtual.quantidade)

    const { error: erroAtualizarEstoque } = await supabase
      .from("products")
      .update({ estoque: novoEstoque })
      .eq("id", vendaAtual.product_id)
      .eq("user_id", userId)

    if (erroAtualizarEstoque) {
      return { success: false, message: "Erro ao devolver o item ao estoque." }
    }

    try {
      await registrarMovimentoEstoque({
        productId: vendaAtual.product_id,
        userId,
        tipo: "cancelamento",
        quantidade: Number(vendaAtual.quantidade),
        motivo: "Cancelamento de venda",
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
          "Estoque devolvido, mas houve erro ao registrar a movimentação de cancelamento.",
      }
    }
  }

  const { error: erroVenda } = await supabase
    .from("sales")
    .update({
      status: "Cancelada",
      estoque_devolvido: true,
    })
    .eq("id", vendaAtual.id)
    .eq("user_id", userId)

  if (erroVenda) {
    return { success: false, message: "Erro ao cancelar a venda." }
  }

  return { success: true, message: "Venda cancelada e estoque devolvido com sucesso." }
}