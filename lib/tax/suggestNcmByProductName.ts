import { supabase } from "@/lib/supabase"

export type NcmSuggestion = {
  codigo: string
  descricao: string
  score: number
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
  camiseta: ["camiseta", "camisa", "tshirt", "blusa"],
  conjunto: ["conjunto", "kit roupa", "vestuario"],
  meia: ["meia", "meia esportiva"],
  tenis: ["tenis", "calcado", "sapato esportivo"],
  short: ["short", "bermuda", "calcao"],
  fitness: ["fitness", "esportivo", "academia"],
  dry: ["dry fit", "fibra sintetica", "tecido sintetico"],
  chave: ["chave", "ferramenta manual", "ferramenta"],
  fenda: ["fenda", "chave de fenda", "parafuso", "aparafusar"],
  martelo: ["martelo", "ferramenta manual"],
  alicate: ["alicate", "ferramenta manual"],
  gel: ["gel", "suplemento", "energetico"],
  garrafa: ["garrafa", "squeeze", "recipiente"],
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((word) => word && !stopWords.has(word))
}

function expandTerms(productName: string) {
  const words = tokenize(productName)
  const expanded = new Set<string>(words)

  for (const word of words) {
    const synonyms = synonymMap[word]
    if (synonyms) {
      for (const item of synonyms) {
        const normalized = normalizeText(item)
        if (normalized) expanded.add(normalized)
      }
    }
  }

  return Array.from(expanded)
}

function isFinalNcmCode(codigo: string) {
  const clean = codigo.replace(/\D/g, "")
  return clean.length === 8
}

function scoreSuggestion(
  nomeOriginal: string,
  termosExpandidos: string[],
  codigo: string,
  descricao: string
) {
  const original = normalizeText(nomeOriginal)
  const desc = normalizeText(descricao)

  let score = 0

  if (isFinalNcmCode(codigo)) score += 20

  if (desc.includes(original) && original.length >= 4) {
    score += 50
  }

  const originalTokens = tokenize(nomeOriginal)

  for (const token of originalTokens) {
    if (desc.includes(token)) {
      score += 15
    }
  }

  for (const termo of termosExpandidos) {
    if (desc.includes(termo)) {
      score += 4
    }
  }

  if (desc.startsWith(original)) {
    score += 15
  }

  if (originalTokens.length === 1 && originalTokens[0].length <= 3) {
    score -= 10
  }

  return score
}

export async function suggestNcmByProductName(nome: string) {
  const nomeNormalizado = normalizeText(nome)

  if (!nomeNormalizado || nomeNormalizado.length < 3) return []

  const termos = expandTerms(nome)

  const orQuery = termos
    .map((termo) => `descricao.ilike.%${termo}%`)
    .join(",")

  const { data, error } = await supabase
    .from("ncm_catalog")
    .select("codigo, descricao")
    .or(orQuery)
    .limit(120)

  if (error) {
    throw new Error("Não foi possível buscar sugestões de NCM.")
  }

  const ranked = (data || [])
    .map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      score: scoreSuggestion(nome, termos, item.codigo, item.descricao),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  const finais = ranked.filter((item) => isFinalNcmCode(item.codigo))

  return (finais.length > 0 ? finais : ranked).slice(0, 5)
}