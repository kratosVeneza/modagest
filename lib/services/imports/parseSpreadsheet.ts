import * as XLSX from "xlsx"

export type ItemImportado = {
  nome: string
  marca: string | null
  categoria: string | null
  tipo: string | null
  cor: string | null
  tamanho: string | null
  quantidade: number
  custo: number
  preco: number | null
}

function normalizarTexto(valor: unknown) {
  if (valor === null || valor === undefined) return ""
  return String(valor).trim()
}

function normalizarNumero(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return 0

  if (typeof valor === "number") return valor

  const texto = String(valor)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")

  const numero = Number(texto)
  return Number.isNaN(numero) ? 0 : numero
}

function pegarCampo(linha: Record<string, unknown>, opcoes: string[]) {
  const chaves = Object.keys(linha)

  for (const opcao of opcoes) {
    const chaveEncontrada = chaves.find(
      (chave) => chave.trim().toLowerCase() === opcao.trim().toLowerCase()
    )

    if (chaveEncontrada) {
      return linha[chaveEncontrada]
    }
  }

  return null
}

export async function parseSpreadsheet(file: File): Promise<ItemImportado[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })

  const primeiraAba = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[primeiraAba]

  const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  })

  const itens: ItemImportado[] = linhas
    .map((linha) => {
      const nome = normalizarTexto(
        pegarCampo(linha, ["nome", "produto", "nome do produto", "descricao"])
      )

      const marca = normalizarTexto(pegarCampo(linha, ["marca"]))
      const categoria = normalizarTexto(pegarCampo(linha, ["categoria"]))
      const tipo = normalizarTexto(pegarCampo(linha, ["tipo"]))
      const cor = normalizarTexto(pegarCampo(linha, ["cor"]))
      const tamanho = normalizarTexto(pegarCampo(linha, ["tamanho", "tam"]))

      const quantidade = normalizarNumero(
        pegarCampo(linha, ["quantidade", "qtd"])
      )

      const custo = normalizarNumero(
        pegarCampo(linha, [
          "custo",
          "valor compra",
          "valor de compra",
          "custo unitario",
        ])
      )

      const preco = normalizarNumero(
        pegarCampo(linha, [
          "preco",
          "preço",
          "valor venda",
          "preco de venda",
        ])
      )

      return {
        nome,
        marca: marca || null,
        categoria: categoria || null,
        tipo: tipo || null,
        cor: cor || null,
        tamanho: tamanho || null,
        quantidade,
        custo,
        preco: preco > 0 ? preco : null,
      }
    })
    .filter((item) => item.nome && item.quantidade > 0)

  return itens
}

