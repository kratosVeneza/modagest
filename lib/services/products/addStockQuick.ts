import { supabase } from "@/lib/supabase"
import { registrarMovimentoEstoque } from "@/lib/stockMovements"

type AddStockQuickParams = {
  productId: number
  userId: string
  quantidade: number
  custo?: number
  motivo?: string
  origem?: "manual" | "importacao" | "ia" | "venda" | null
  referenciaId?: number | null
}

type AddStockQuickResult =
  | {
      success: true
      message: string
      estoqueAnterior: number
      estoqueAtual: number
      custoAnterior: number
      custoAtualizado: number
    }
  | {
      success: false
      message: string
    }

export async function addStockQuick({
  productId,
  userId,
  quantidade,
  custo,
  motivo,
  origem = "manual",
  referenciaId = null,
}: AddStockQuickParams): Promise<AddStockQuickResult> {
  if (quantidade <= 0) {
    return { success: false, message: "Quantidade inválida." }
  }

  const { data: produto, error: erroProduto } = await supabase
    .from("products")
    .select("id, nome, sku, marca, categoria, tipo, cor, tamanho, unidade, estoque, custo")
    .eq("id", productId)
    .eq("user_id", userId)
    .single()

  if (erroProduto || !produto) {
    return { success: false, message: "Produto não encontrado." }
  }

  const estoqueAnterior = Number(produto.estoque || 0)
  const custoAnterior = Number(produto.custo || 0)
  const quantidadeEntrada = Number(quantidade)
  const custoEntrada = Number(custo || 0)

  const novoEstoque = estoqueAnterior + quantidadeEntrada

  let novoCusto = custoAnterior

  if (custoEntrada > 0 && novoEstoque > 0) {
    const custoTotalAtual = estoqueAnterior * custoAnterior
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
    origem,
    referenciaId,
    estoqueApos: novoEstoque,
    productSnapshot: {
      nome: produto.nome,
      sku: produto.sku,
      marca: produto.marca,
      categoria: produto.categoria,
      tipo: produto.tipo,
      cor: produto.cor,
      tamanho: produto.tamanho,
      unidade: produto.unidade,
    },
  })

  return {
    success: true,
    message: "Estoque adicionado com sucesso.",
    estoqueAnterior,
    estoqueAtual: novoEstoque,
    custoAnterior,
    custoAtualizado: novoCusto,
  }
}