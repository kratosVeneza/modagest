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

const synonymMap: Record<string, string[]> = {
  camiseta: ["camiseta", "tshirt", "camisa", "blusa"],
  conjunto: ["conjunto", "kit", "roupa"],
  meia: ["meia", "meia esportiva"],
  tenis: ["tenis", "calcado", "sapato"],
  short: ["short", "bermuda"],
  fitness: ["fitness", "esportivo", "academia"],
  dry: ["dry fit", "sintetico"],
}

function expandTerms(productName: string) {
  const words = normalizeText(productName).split(" ")
  const expanded = new Set(words)

  for (const word of words) {
    const synonyms = synonymMap[word]
    if (synonyms) {
      synonyms.forEach((s) => expanded.add(s))
    }
  }

  return Array.from(expanded)
}

export async function suggestNcmByProductName(nome: string) {
  const termos = expandTerms(nome)

  const query = termos
    .map((t) => `descricao.ilike.%${t}%`)
    .join(",")

  const { data, error } = await supabase
    .from("ncm_catalog")
    .select("codigo, descricao")
    .or(query)
    .limit(30)

  if (error) throw error

  const ranked = (data || [])
    .map((item) => {
      let score = 0

      for (const t of termos) {
        if (item.descricao.toLowerCase().includes(t)) {
          score += 1
        }
      }

      return { ...item, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return ranked
}