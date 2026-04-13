// scripts/importNcmCatalog.ts
import fs from "node:fs/promises"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

type NcmJsonFile = {
  Data_Ultima_Atualizacao_NCM?: string
  Ato?: string
  Nomenclaturas?: Array<{
    Codigo?: string
    Descricao?: string
    Data_Inicio?: string
    Data_Fim?: string
    Tipo_Ato_Ini?: string
    Numero_Ato_Ini?: string
    Ano_Ato_Ini?: string
  }>
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.")
}

const supabase = createClient(supabaseUrl, supabaseServiceRole)

function deriveParts(codigo: string) {
  const clean = (codigo || "").replace(/\D/g, "")

  return {
    capitulo: clean.slice(0, 2) || null,
    posicao: clean.slice(0, 4) || null,
    subposicao: clean.slice(0, 6) || null,
    item: clean.slice(0, 7) || null,
    subitem: clean.slice(0, 8) || null,
  }
}

function isLeafCode(codigo: string) {
  const clean = codigo.replace(/\D/g, "")
  return clean.length >= 8
}

async function main() {
  const filePath = path.resolve("data/ncm.json")
  const raw = await fs.readFile(filePath, "utf8")
  const parsed = JSON.parse(raw) as NcmJsonFile

  const ato = parsed.Ato || "Classif/Receita Federal"
  const nomenclaturas = parsed.Nomenclaturas || []

  if (!Array.isArray(nomenclaturas) || nomenclaturas.length === 0) {
    throw new Error("Arquivo JSON sem Nomenclaturas válidas.")
  }

  const rows = nomenclaturas
    .filter((item) => item.Codigo && item.Descricao)
    .map((item) => {
      const codigo = String(item.Codigo).trim()
      const descricao = String(item.Descricao).trim()
      const parts = deriveParts(codigo)

      return {
        codigo,
        descricao,
        descricao_concatenada: `${codigo} ${descricao}`,
        ato_legal: ato,
        ...parts,
        vigente: true,
        fonte: "Classif/Receita Federal",
        updated_at: new Date().toISOString(),
      }
    })

  const chunkSize = 500

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    const { error } = await supabase
      .from("ncm_catalog")
      .upsert(chunk, { onConflict: "codigo" })

    if (error) {
      throw error
    }

    console.log(`Importados ${Math.min(i + chunk.length, rows.length)} de ${rows.length}`)
  }

  const leafRows = rows.filter((row) => isLeafCode(row.codigo))
  console.log(`Total geral importado: ${rows.length}`)
  console.log(`Códigos finais/mais específicos: ${leafRows.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})