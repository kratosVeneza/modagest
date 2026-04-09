import * as XLSX from "xlsx"

export type ItemImportado = {
  nome: string
  marca: string | null
  fornecedor?: string | null
  categoria: string | null
  tipo: string | null
  cor: string | null
  tamanho: string | null
  quantidade: number
  custo: number
  preco: number | null
}

const MAPEAMENTO_COLUNAS = {
  nome: [
    "nome",
    "produto",
    "item",
    "descrição",
    "descricao",
    "nome do produto",
  ],
  marca: [
    "marca",
    "fabricante",
    "fornecedor",
  ],
  categoria: [
    "categoria",
    "grupo",
    "linha",
  ],
  tipo: [
    "tipo",
    "modelo",
    "subcategoria",
  ],
  cor: [
    "cor",
    "cor do produto",
  ],
  tamanho: [
    "tamanho",
    "tam",
    "numeração",
    "numeracao",
  ],
  quantidade: [
    "quantidade",
    "qtd",
    "qtde",
    "qnt",
    "quant",
  ],
  custo: [
    "custo",
    "valor compra",
    "valor de compra",
    "custo unitario",
    "custo unitário",
    "valor unitario",
    "valor unitário",
    "preco compra",
    "preço compra",
  ],
  preco: [
    "preco",
    "preço",
    "valor venda",
    "preco de venda",
    "preço de venda",
    "valor unitario venda",
    "valor unitário venda",
  ],
}

function normalizarCabecalho(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
}

function normalizarTexto(valor: unknown) {
  if (valor === null || valor === undefined) return ""
  return String(valor).trim()
}

function normalizarNumero(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return 0

  if (typeof valor === "number") return valor

  const textoOriginal = String(valor).trim()

  if (!textoOriginal) return 0

  const texto = textoOriginal
    .replace(/\s/g, "")
    .replace(/[R$r$\u00A0]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")

  const numero = Number(texto)
  return Number.isNaN(numero) ? 0 : numero
}

function pegarCampo(
  linha: Record<string, unknown>,
  aliases: string[]
) {
  const entradas = Object.entries(linha)

  for (const [chave, valor] of entradas) {
    const chaveNormalizada = normalizarCabecalho(chave)

    const encontrou = aliases.some(
      (alias) => chaveNormalizada === normalizarCabecalho(alias)
    )

    if (encontrou) {
      return valor
    }
  }

  return null
}

function detectarCampo(
  linha: Record<string, unknown>,
  tipo: keyof typeof MAPEAMENTO_COLUNAS
) {
  return pegarCampo(linha, MAPEAMENTO_COLUNAS[tipo])
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
      const nome = normalizarTexto(detectarCampo(linha, "nome"))
      const marca = normalizarTexto(detectarCampo(linha, "marca"))
      const categoria = normalizarTexto(detectarCampo(linha, "categoria"))
      const tipo = normalizarTexto(detectarCampo(linha, "tipo"))
      const cor = normalizarTexto(detectarCampo(linha, "cor"))
      const tamanho = normalizarTexto(detectarCampo(linha, "tamanho"))

      let quantidade = normalizarNumero(detectarCampo(linha, "quantidade"))

if (!quantidade || quantidade <= 0) {
  quantidade = 1
}
      const custo = normalizarNumero(detectarCampo(linha, "custo"))
      const preco = normalizarNumero(detectarCampo(linha, "preco"))

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
    .filter((item) => item.nome)

  return itens
}
