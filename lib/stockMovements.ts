import { supabase } from "@/lib/supabase"

type ProductSnapshot = {
  nome?: string | null
  sku?: string | null
  marca?: string | null
  categoria?: string | null
  tipo?: string | null
  cor?: string | null
  tamanho?: string | null
  unidade?: string | null
}

type RegistrarMovimentoEstoqueInput = {
  productId: number
  userId: string
  tipo: "entrada" | "saida" | "cancelamento" | "ajuste"
  quantidade: number
  motivo?: string
  origem?: "manual" | "venda" | "importacao" | "ia" | null
  referenciaId?: number | null
  estoqueApos?: number | null
  productSnapshot?: ProductSnapshot | null
}

export async function registrarMovimentoEstoque({
  productId,
  userId,
  tipo,
  quantidade,
  motivo,
  origem = null,
  referenciaId = null,
  estoqueApos = null,
  productSnapshot = null,
}: RegistrarMovimentoEstoqueInput) {
  let snapshot = productSnapshot

  if (!snapshot) {
    const { data: produto, error: erroProduto } = await supabase
      .from("products")
      .select("nome, sku, marca, categoria, tipo, cor, tamanho, unidade")
      .eq("id", productId)
      .eq("user_id", userId)
      .maybeSingle()

    if (erroProduto) {
      console.log("ERRO AO BUSCAR SNAPSHOT DO PRODUTO:", erroProduto)
    }

    snapshot = produto || null
  }

  const payload = {
    product_id: productId,
    user_id: userId,
    tipo,
    quantidade,
    motivo: motivo || null,
    origem,
    referencia_id: referenciaId,
    estoque_apos: estoqueApos,
    product_nome: snapshot?.nome || null,
    product_sku: snapshot?.sku || null,
    product_marca: snapshot?.marca || null,
    product_categoria: snapshot?.categoria || null,
    product_tipo: snapshot?.tipo || null,
    product_cor: snapshot?.cor || null,
    product_tamanho: snapshot?.tamanho || null,
    product_unidade: snapshot?.unidade || null,
  }

  const { data, error } = await supabase
    .from("stock_movements")
    .insert(payload)

  if (error) {
    console.log("ERRO AO REGISTRAR MOVIMENTO DE ESTOQUE:", error)
    throw new Error(error.message || "Erro ao registrar movimento de estoque.")
  }

  return data
}