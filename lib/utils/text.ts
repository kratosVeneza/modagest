const formasPagamentoPadrao = [
  "Dinheiro",
  "Pix",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
]

export function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizarCor(valor: string) {
  const v = normalizarTexto(valor)

  if (v === "preto" || v === "preta" || v === "pretos" || v === "pretas") return "preto"
  if (v === "branco" || v === "branca" || v === "brancos" || v === "brancas") return "branco"
  if (v === "rosa" || v === "rosinha") return "rosa"
  if (v === "azul marinho" || v === "marinho") return "marinho"
  if (v === "cinza" || v === "chumbo" || v === "grafite") return "cinza"

  return v
}

export function normalizarTamanho(valor: string) {
  const v = normalizarTexto(valor)

  if (v === "pp") return "pp"
  if (v === "p" || v === "pequeno") return "p"
  if (v === "m" || v === "medio" || v === "médio") return "m"
  if (v === "g" || v === "grande") return "g"
  if (v === "gg" || v === "extra grande" || v === "xg" || v === "xgg") return "gg"

  return v
}

export function gerarVariacoesPalavra(valor: string) {
  const base = normalizarTexto(valor)
  if (!base) return []

  const variacoes = new Set<string>()
  variacoes.add(base)

  if (base.endsWith("s")) {
    variacoes.add(base.slice(0, -1))
  } else {
    variacoes.add(`${base}s`)
  }

  if (base.endsWith("o")) {
    variacoes.add(base.slice(0, -1) + "a")
    variacoes.add(base.slice(0, -1) + "os")
    variacoes.add(base.slice(0, -1) + "as")
  }

  if (base.endsWith("a")) {
    variacoes.add(base.slice(0, -1) + "o")
    variacoes.add(base.slice(0, -1) + "os")
    variacoes.add(base.slice(0, -1) + "as")
  }

  return [...variacoes]
}

export function contemAlgumaVariacao(texto: string, valor: string) {
  const textoNormalizado = normalizarTexto(texto)
  const variacoes = gerarVariacoesPalavra(valor)

  return variacoes.some((item) => textoNormalizado.includes(item))
}

export function numeroPorExtensoParaNumero(texto: string) {
  const mapa: Record<string, number> = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
  }

  return mapa[normalizarTexto(texto)] || null
}

export function extrairQuantidade(texto: string) {
  const numeroDireto = texto.match(/\b(\d+)\b/)
  if (numeroDireto) return Number(numeroDireto[1])

  const palavras = texto.split(" ")
  for (const palavra of palavras) {
    const convertido = numeroPorExtensoParaNumero(palavra)
    if (convertido) return convertido
  }

  return 1
}

export function identificarFormaPagamento(texto: string) {
  const t = normalizarTexto(texto)

  if (t.includes("pix")) return "Pix"
  if (t.includes("dinheiro")) return "Dinheiro"
  if (t.includes("debito") || t.includes("débito")) return "Cartão de débito"
  if (t.includes("credito") || t.includes("crédito")) return "Cartão de crédito"
  if (t.includes("transferencia") || t.includes("transferência")) return "Transferência"

  return "Pix" // padrão
}

export function limparInicioDeVenda(texto: string) {
  return texto
    .replace(
      /^(hoje\s+)?(vendi|efetuei uma venda de|efetuei uma venda|efetuei venda de|efetuei venda|fiz uma venda de|fiz uma venda|fiz venda de|fiz venda|realizei uma venda de|realizei uma venda|realizei venda de|realizei venda|registrei uma venda de|registrei uma venda|registrei venda de|registrei venda)\s*/i,
      ""
    )
    .trim()
}

export function normalizarNomePessoa(valor: string) {
  return normalizarTexto(valor)
    .replace(/\b(sr|sra|senhor|senhora|dona|seu)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function similarityBasica(a: string, b: string) {
  const aa = normalizarNomePessoa(a)
  const bb = normalizarNomePessoa(b)

  if (!aa || !bb) return 0
  if (aa === bb) return 1
  if (aa.includes(bb) || bb.includes(aa)) return 0.9

  const palavrasA = aa.split(" ").filter(Boolean)
  const palavrasB = bb.split(" ").filter(Boolean)

  const emComum = palavrasA.filter((p) => palavrasB.includes(p)).length
  const base = Math.max(palavrasA.length, palavrasB.length)

  return base > 0 ? emComum / base : 0
}
