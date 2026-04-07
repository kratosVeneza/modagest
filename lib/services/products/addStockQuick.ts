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
    const { data: produto, error } = await supabase
      .from("products")
      .select("id, estoque, custo")
      .eq("id", productId)
      .eq("user_id", userId)
      .single()

    if (error || !produto) {
      return { success: false, message: "Produto não encontrado." }
    }

    const estoqueAtual = Number(produto.estoque || 0)
    const custoAtual = Number(produto.custo || 0)

    const quantidadeEntrada = Number(quantidade)
    const custoEntrada = Number(custo || 0)

    const novoEstoque = estoqueAtual + quantidadeEntrada

    // 🔥 CÁLCULO DE CUSTO MÉDIO
    let novoCusto = custoAtual

    if (custoEntrada > 0 && quantidadeEntrada > 0) {
      const valorAtual = estoqueAtual * custoAtual
      const valorEntrada = quantidadeEntrada * custoEntrada

      const total = valorAtual + valorEntrada

      novoCusto = total / novoEstoque
    }

    const { error: erroUpdate } = await supabase
      .from("products")
      .update({
        estoque: novoEstoque,
        custo: novoCusto,
      })
      .eq("id", productId)
      .eq("user_id", userId)

    if (erroUpdate) {
      return { success: false, message: "Erro ao atualizar produto." }
    }

    await supabase.from("stock_movements").insert({
      product_id: productId,
      user_id: userId,
      tipo: "entrada",
      quantidade: quantidadeEntrada,
      custo: custoEntrada,
      observacao: observacao || "Entrada rápida",
      created_at: new Date().toISOString(),
    })

    return { success: true }
  } catch {
    return { success: false, message: "Erro inesperado." }
  }
}
