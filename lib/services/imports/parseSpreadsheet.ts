import * as XLSX from "xlsx"

export type ItemImportado = {
  sku?: string | null
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
  sku: [
    "sku",
    "codigo",
    "código",
    "cod",
    "ref",
    "referencia",
    "referência",
    "codigo sku",
    "código sku",
  ],
  nome: [
    "nome",
    "produto",
    "item",
    "descricao",
    "descrição",
    "nome do produto",
    "modelo",
    "modelo do produto",
    "descricao do produto",
    "descrição do produto",
  ],
  marca: [
    "marca",
    "fabricante",
  ],
  fornecedor: [
    "fornecedor",
    "distribuidor",
    "vendor",
  ],
  categoria: [
    "categoria",
    "grupo",
    "linha",
    "secao",
    "seção",
    "departamento",
  ],
  tipo: [
    "tipo",
    "subcategoria",
    "classe",
    "estilo",
  ],
  cor: [
    "cor",
    "cor do produto",
    "color",
  ],
  tamanho: [
    "tamanho",
    "tam",
    "numeração",
    "numeracao",
    "numero",
    "número",
    "size",
  ],
  quantidade: [
    "quantidade",
    "qtd",
    "qtde",
    "qnt",
    "quant",
    "estoque",
    "unidades",
    "unidade",
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
    "valor",
    "valor item",
    "valor do item",
    "preco",
    "preço",
  ],
  preco: [
    "preco",
    "preço",
    "valor venda",
    "preco de venda",
    "preço de venda",
    "valor unitario venda",
    "valor unitário venda",
    "valor final",
    "preco final",
    "preço final",
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

function pegarCampo(linha: Record<string, unknown>, aliases: string[]) {
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
      const sku = normalizarTexto(detectarCampo(linha, "sku"))
      const nome = normalizarTexto(detectarCampo(linha, "nome"))
      const marca = normalizarTexto(detectarCampo(linha, "marca"))
      const fornecedor = normalizarTexto(detectarCampo(linha, "fornecedor"))
      const categoria = normalizarTexto(detectarCampo(linha, "categoria"))
      const tipo = normalizarTexto(detectarCampo(linha, "tipo"))
      const cor = normalizarTexto(detectarCampo(linha, "cor"))
      const tamanho = normalizarTexto(detectarCampo(linha, "tamanho"))

      let quantidade = normalizarNumero(detectarCampo(linha, "quantidade"))

      if (!quantidade || quantidade <= 0) {
        quantidade = 1
      }

      const custoDetectado = normalizarNumero(detectarCampo(linha, "custo"))
      const precoDetectado = normalizarNumero(detectarCampo(linha, "preco"))

      const custo = custoDetectado > 0 ? custoDetectado : precoDetectado
      const preco = precoDetectado > 0 ? precoDetectado : null

      return {
        sku: sku || null,
        nome,
        marca: marca || null,
        fornecedor: fornecedor || null,
        categoria: categoria || null,
        tipo: tipo || null,
        cor: cor || null,
        tamanho: tamanho || null,
        quantidade,
        custo,
        preco,
      }
    })
    .filter((item) => item.nome)

  return itens
}
