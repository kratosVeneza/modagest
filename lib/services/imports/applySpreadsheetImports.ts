import { supabase } from "@/lib/supabase"
import { addStockQuick } from "@/lib/services/products/addStockQuick"
import { ItemComMatch } from "./matchImportedProducts"

type ItemComImportacao = ItemComMatch & {
  fornecedor?: string | null
}

type ApplySpreadsheetImportsParams = {
  userId: string
  itens: ItemComImportacao[]
  markup?: number
}

type ApplySpreadsheetImportsResult = {
  success: boolean
  message: string
  criados: number
  atualizados: number
  revisaoPendente: number
  erros: string[]
}

function gerarSkuBase(
  nome: string,
  categoria?: string | null,
  tipo?: string | null,
  index = 1
) {
  const nomeParte = (nome || "PRO").trim().slice(0, 3).toUpperCase() || "PRO"
  const categoriaParte = (categoria || "CT").trim().slice(0, 2).toUpperCase() || "CT"
  const tipoParte = (tipo || "TP").trim().slice(0, 2).toUpperCase() || "TP"
  const numero = String(index).padStart(3, "0")

  return `${nomeParte}-${categoriaParte}-${tipoParte}-${numero}`
}

async function gerarSkuUnico(
  userId: string,
  nome: string,
  categoria?: string | null,
  tipo?: string | null
) {
  let contador = 1

  while (contador < 9999) {
    const sku = gerarSkuBase(nome, categoria, tipo, contador)

    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("user_id", userId)
      .eq("sku", sku)
      .maybeSingle()

    if (!data) return sku

    contador++
  }

  return `PRO-CT-TP-${Date.now()}`
}

export async function applySpreadsheetImports({
  userId,
  itens,
  markup = 100,
}: ApplySpreadsheetImportsParams): Promise<ApplySpreadsheetImportsResult> {
  let criados = 0
  let atualizados = 0
  let revisaoPendente = 0
  const erros: string[] = []

  for (const item of itens) {
    try {
      if (item.acao === "revisar") {
        revisaoPendente++
        continue
      }

      const custo = Number(item.preco || 0)
      const precoVenda = custo * (1 + markup / 100)

      if (item.acao === "somar_estoque" && item.produtoExistenteId) {
        const resultado = await addStockQuick({
          productId: item.produtoExistenteId,
          userId,
          quantidade: Number(item.quantidade),
          custo,
          motivo: "Importação por planilha",
        })

        if (!resultado.success) {
          erros.push(`${item.nome}: ${resultado.message}`)
          continue
        }

        const { error: erroUpdateProduto } = await supabase
          .from("products")
          .update({
            custo,
            preco: precoVenda,
            marca: item.marca || null,
            fornecedor: item.fornecedor || null,
            categoria: item.categoria || null,
            tipo: item.tipo || null,
          })
          .eq("id", item.produtoExistenteId)
          .eq("user_id", userId)

        if (erroUpdateProduto) {
          erros.push(
            `${item.nome}: estoque somado, mas houve erro ao atualizar os dados do produto.`
          )
          continue
        }

        atualizados++
        continue
      }

      if (item.acao === "criar_produto") {
        const sku = await gerarSkuUnico(
          userId,
          item.nome,
          item.categoria,
          item.tipo
        )

        const { data: novoProduto, error: erroInsert } = await supabase
          .from("products")
          .insert({
            user_id: userId,
            sku,
            nome: item.nome,
            marca: item.marca || null,
            fornecedor: item.fornecedor || null,
            categoria: item.categoria || null,
            tipo: item.tipo || null,
            unidade: "un",
            cor: item.cor || null,
            tamanho: item.tamanho || null,
            estoque: 0,
            estoque_minimo: 0,
            custo,
            preco: precoVenda,
          })
          .select("id")
          .single()

        if (erroInsert || !novoProduto) {
          erros.push(`${item.nome}: erro ao criar produto.`)
          continue
        }

        const resultadoEntrada = await addStockQuick({
          productId: Number(novoProduto.id),
          userId,
          quantidade: Number(item.quantidade),
          custo,
          motivo: "Importação por planilha",
        })

        if (!resultadoEntrada.success) {
          erros.push(`${item.nome}: produto criado, mas houve erro ao lançar estoque.`)
          continue
        }

        criados++
      }
    } catch (error) {
      console.error(error)
      erros.push(`${item.nome}: erro inesperado ao importar.`)
    }
  }

  const success = erros.length === 0

  return {
    success,
    message: success
      ? "Importação aplicada com sucesso."
      : "Importação concluída com algumas pendências.",
    criados,
    atualizados,
    revisaoPendente,
    erros,
  }
}
