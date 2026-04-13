import { supabase } from "@/lib/supabase"

export type NcmSuggestion = {
  codigo: string
  descricao: string
  score: number
}

type SuggestNcmInput = {
  nome: string
  categoria?: string
  tipo?: string
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const stopWords = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "para",
  "com",
  "sem",
  "e",
  "a",
  "o",
  "as",
  "os",
])

const synonymMap: Record<string, string[]> = {
  camiseta: ["camiseta", "camisa", "tshirt", "blusa", "t shirt"],
  conjunto: ["conjunto", "kit roupa", "vestuario", "conjunto feminino", "conjunto masculino"],
  meia: ["meia", "meia esportiva", "meiao"],
  tenis: ["tenis", "calcado", "sapato esportivo"],
  short: ["short", "bermuda", "calcao"],
  top: ["top", "top fitness", "blusa"],
  legging: ["legging", "calca", "calca esportiva"],
  fitness: ["fitness", "esportivo", "academia"],
  corrida: ["corrida", "running", "esportivo"],
  dry: ["dry fit", "fibra sintetica", "tecido sintetico"],
  chave: ["chave", "ferramenta", "ferramenta manual"],
  fenda: ["fenda", "chave de fenda", "aparafusar", "parafuso"],
  phillips: ["phillips", "estrela", "parafuso"],
  alicate: ["alicate", "ferramenta manual"],
  martelo: ["martelo", "ferramenta manual"],
  ferramenta: ["ferramenta", "utensilio manual", "metal"],
  gel: ["gel", "suplemento", "energetico", "carboidrato"],
  squeeze: ["squeeze", "garrafa", "recipiente"],
  garrafa: ["garrafa", "squeeze", "recipiente"],
  relogio: ["relogio", "smartwatch", "cronometro"],
  oculos: ["oculos", "acessorio esportivo"],
}

const categoryTermsMap: Record<string, string[]> = {
  roupas: [
    "vestuario",
    "roupa",
    "camiseta",
    "blusa",
    "calca",
    "short",
    "top",
    "legging",
    "conjunto",
    "malha",
    "fibras texteis",
  ],
  calcados: [
    "calcado",
    "tenis",
    "sapato",
    "esportivo",
  ],
  acessorios: [
    "acessorio",
    "meia",
    "oculos",
    "relogio",
    "garrafa",
    "squeeze",
    "bolsa",
    "pochete",
  ],
  suplementos: [
    "suplemento",
    "gel",
    "energetico",
    "carboidrato",
    "nutricao",
  ],
  equipamentos: [
    "equipamento",
    "ferramenta",
    "utensilio",
    "metal",
    "manual",
  ],
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((word) => word && !stopWords.has(word))
}

function expandTerms(nome: string, categoria?: string, tipo?: string) {
  const baseWords = [
    ...tokenize(nome),
    ...tokenize(categoria || ""),
    ...tokenize(tipo || ""),
  ]

  const expanded = new Set<string>(baseWords)

  for (const word of baseWords) {
    const synonyms = synonymMap[word]
    if (synonyms) {
      for (const synonym of synonyms) {
        expanded.add(normalizeText(synonym))
      }
    }
  }

  const categoriaNormalizada = normalizeText(categoria || "")
  const categoryTerms = categoryTermsMap[categoriaNormalizada]
  if (categoryTerms) {
    for (const term of categoryTerms) {
      expanded.add(normalizeText(term))
    }
  }

  return Array.from(expanded).filter(Boolean)
}

function isFinalNcmCode(codigo: string) {
  const clean = codigo.replace(/\D/g, "")
  return clean.length === 8
}

function scoreSuggestion(
  input: SuggestNcmInput,
  termos: string[],
  codigo: string,
  descricao: string
) {
  const nomeNormalizado = normalizeText(input.nome)
  const tipoNormalizado = normalizeText(input.tipo || "")
  const categoriaNormalizada = normalizeText(input.categoria || "")
  const desc = normalizeText(descricao)

  let score = 0

  if (isFinalNcmCode(codigo)) score += 20

  if (nomeNormalizado && desc.includes(nomeNormalizado)) {
    score += 60
  }

  const nomeTokens = tokenize(input.nome)
  for (const token of nomeTokens) {
    if (desc.includes(token)) score += 15
  }

  if (tipoNormalizado && desc.includes(tipoNormalizado)) {
    score += 20
  }

  for (const termo of termos) {
    if (desc.includes(termo)) score += 4
  }

  if (categoriaNormalizada === "roupas") {
    if (
      desc.includes("vestuario") ||
      desc.includes("malha") ||
      desc.includes("camiseta") ||
      desc.includes("fibras texteis")
    ) {
      score += 20
    }
  }

  if (categoriaNormalizada === "calcados") {
    if (desc.includes("calcado") || desc.includes("tenis") || desc.includes("sapato")) {
      score += 20
    }
  }

  if (categoriaNormalizada === "acessorios") {
    if (
      desc.includes("acessorio") ||
      desc.includes("meia") ||
      desc.includes("oculos") ||
      desc.includes("relogio")
    ) {
      score += 20
    }
  }

  if (categoriaNormalizada === "suplementos") {
    if (
      desc.includes("suplemento") ||
      desc.includes("energetico") ||
      desc.includes("carboidrato")
    ) {
      score += 20
    }
  }

  if (categoriaNormalizada === "equipamentos") {
    if (
      desc.includes("ferramenta") ||
      desc.includes("manual") ||
      desc.includes("metal")
    ) {
      score += 20
    }
  }

  if (desc.startsWith(nomeNormalizado)) {
    score += 10
  }

  return score
}

export async function suggestNcmByProductName(input: SuggestNcmInput) {
  const nomeNormalizado = normalizeText(input.nome)

  if (!nomeNormalizado || nomeNormalizado.length < 3) return []

  const termos = expandTerms(input.nome, input.categoria, input.tipo)

  const orQuery = termos
    .map((termo) => `descricao.ilike.%${termo}%`)
    .join(",")

  const { data, error } = await supabase
    .from("ncm_catalog")
    .select("codigo, descricao")
    .or(orQuery)
    .limit(150)

  if (error) {
    throw new Error("Não foi possível buscar sugestões de NCM.")
  }

  const ranked = (data || [])
    .map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      score: scoreSuggestion(input, termos, item.codigo, item.descricao),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const finais = ranked.filter((item) => isFinalNcmCode(item.codigo))

  return (finais.length > 0 ? finais : ranked).slice(0, 5)
}