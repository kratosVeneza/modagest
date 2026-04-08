import { ItemImportado } from "./parseSpreadsheet"

type Produto = {
  id: number
  nome: string
  cor: string | null
  tamanho: string | null
}

export type ItemComMatch = ItemImportado & {
  produtoExistenteId?: number | null
  produtoExistenteNome?: string | null
  acao: "somar_estoque" | "criar_produto" | "revisar"
}

function normalizar(texto: string | null) {
  return (texto || "").trim().toLowerCase()
}

export function matchImportedProducts(
  itens: ItemImportado[],
  produtos: Produto[]
): ItemComMatch[] {
  return itens.map((item) => {
    const nomeItem = normalizar(item.nome)
    const corItem = normalizar(item.cor)
    const tamanhoItem = normalizar(item.tamanho)

    const produtoExato = produtos.find((p) => {
      return (
        normalizar(p.nome) === nomeItem &&
        normalizar(p.cor) === corItem &&
        normalizar(p.tamanho) === tamanhoItem
      )
    })

    if (produtoExato) {
      return {
        ...item,
        produtoExistenteId: produtoExato.id,
        produtoExistenteNome: produtoExato.nome,
        acao: "somar_estoque",
      }
    }

    const produtoParecido = produtos.find((p) => {
      return normalizar(p.nome) === nomeItem
    })

    if (produtoParecido) {
      return {
        ...item,
        produtoExistenteId: produtoParecido.id,
        produtoExistenteNome: produtoParecido.nome,
        acao: "revisar",
      }
    }

    return {
      ...item,
      produtoExistenteId: null,
      produtoExistenteNome: null,
      acao: "criar_produto",
    }
  })
}