import { ProductTaxData } from "@/lib/tax/getProductTaxContext"
import { TaxRule } from "@/lib/tax/getTaxRules"

type TaxCalculationInput = {
  valorUnitario: number
  quantidade: number
  product: ProductTaxData
  taxRule?: TaxRule | null
}

type TaxCalculationResult = {
  baseCalculo: number
  cbsAliquotaAplicada: number
  ibsAliquotaAplicada: number
  percentualReducaoAplicado: number
  valorCBS: number
  valorIBS: number
  valorTotalImpostos: number
  valorLiquido: number
  cst: string | null
  cclasstrib: string | null
  nomeRegra: string | null
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const { valorUnitario, quantidade, product, taxRule } = input

  const baseCalculo = round2(valorUnitario * quantidade)

  let cbsAliquota = 0
  let ibsAliquota = 0
  let percentualReducao = 0
  let cst: string | null = null
  let cclasstrib: string | null = null
  let nomeRegra: string | null = null

  if (product.usa_imposto_manual) {
    cbsAliquota = Number(product.cbs_aliquota_manual || 0)
    ibsAliquota = Number(product.ibs_aliquota_manual || 0)
    nomeRegra = "Manual do produto"
  } else if (taxRule) {
    cbsAliquota = Number(taxRule.cbs_aliquota || 0)
    ibsAliquota = Number(taxRule.ibs_aliquota || 0)
    percentualReducao = Number(taxRule.percentual_reducao || 0)
    cst = taxRule.cst || null
    cclasstrib = taxRule.cclasstrib || null
    nomeRegra = taxRule.nome

    if (taxRule.tipo === "aliquota_zero") {
      cbsAliquota = 0
      ibsAliquota = 0
    }

    if (taxRule.tipo === "reducao_percentual" && percentualReducao > 0) {
      const fator = (100 - percentualReducao) / 100
      cbsAliquota = cbsAliquota * fator
      ibsAliquota = ibsAliquota * fator
    }
  }

  const valorCBS = round2(baseCalculo * (cbsAliquota / 100))
  const valorIBS = round2(baseCalculo * (ibsAliquota / 100))
  const valorTotalImpostos = round2(valorCBS + valorIBS)
  const valorLiquido = round2(baseCalculo - valorTotalImpostos)

  return {
    baseCalculo,
    cbsAliquotaAplicada: cbsAliquota,
    ibsAliquotaAplicada: ibsAliquota,
    percentualReducaoAplicado: percentualReducao,
    valorCBS,
    valorIBS,
    valorTotalImpostos,
    valorLiquido,
    cst,
    cclasstrib,
    nomeRegra,
  }
}