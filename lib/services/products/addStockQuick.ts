import { supabase } from "@/lib/supabase"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"

type AddStockQuickParams = {
  productId: number
  userId: string
  quantidade: number
  custo?: number
  motivo?: string
}

export async function addStockQuick({
  productId,
  userId,
  quantidade,
  custo,
  motivo,
}: AddStockQuickParams) {
  if (quantidade <= 0) {
    return { success: false, message: "Quantidade inválida." }
  }

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
  const custoAtual = Number(produto.custo || 0)
  const quantidadeEntrada = Number(quantidade)
  const custoEntrada = Number(custo || 0)

  const novoEstoque = estoqueAtual + quantidadeEntrada

  let novoCusto = custoAtual

  if (custoEntrada > 0) {
    const custoTotalAtual = estoqueAtual * custoAtual
    const custoTotalEntrada = quantidadeEntrada * custoEntrada
    novoCusto = (custoTotalAtual + custoTotalEntrada) / novoEstoque
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
    return { success: false, message: "Erro ao atualizar estoque." }
  }

  await registrarMovimentoEstoque({
    productId,
    userId,
    tipo: "entrada",
    quantidade: quantidadeEntrada,
    motivo:
      motivo ||
      (custoEntrada > 0
        ? `Entrada com custo R$ ${custoEntrada.toFixed(2)}`
        : "Entrada rápida de estoque"),
  })

  return { success: true }
}