import { supabase } from "@/lib/supabase"

type Params = {
  productId: number
  userId: string
  quantidade: number
  custo: number | null
  observacao?: string | null
}

export async function addStockQuick({
  productId,
  userId,
  quantidade,
  custo,
  observacao,
}: Params) {
  try {
    const { data: produto, error: erroProduto } = await supabase
      .from("products")
      .select("id, estoque, custo")
      .eq("id", productId)
      .eq("user_id", userId)
      .single()

    if (erroProduto || !produto) {
      return { success: false, message: "Produto não encontrado." }
    }

    const estoqueAtual = Number(produto.estoque || 0)
    const novoEstoque = estoqueAtual + Number(quantidade)

    const { error: erroUpdate } = await supabase
      .from("products")
      .update({
        estoque: novoEstoque,
        custo: custo ?? produto.custo,
      })
      .eq("id", productId)
      .eq("user_id", userId)

    if (erroUpdate) {
      return { success: false, message: "Erro ao atualizar estoque." }
    }

    await supabase.from("stock_movements").insert({
      product_id: productId,
      user_id: userId,
      tipo: "entrada",
      quantidade: Number(quantidade),
      custo: custo,
      observacao: observacao || "Entrada rápida",
      created_at: new Date().toISOString(),
    })

    return { success: true }
  } catch {
    return { success: false, message: "Erro inesperado ao lançar entrada." }
  }
}
