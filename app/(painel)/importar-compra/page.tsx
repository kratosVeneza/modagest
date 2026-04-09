"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import HelpBanner from "../../components/InfoBanner"
import {
  parseSpreadsheet,
  type ItemImportado,
} from "@/lib/services/imports/parseSpreadsheet" 
import {
  matchImportedProducts,
  type ItemComMatch,
} from "@/lib/services/imports/matchImportedProducts"
import { applySpreadsheetImports } from "@/lib/services/imports/applySpreadsheetImports"


export default function ImportarCompra() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [itens, setItens] = useState<ItemComMatch[]>([])
  const [mensagem, setMensagem] = useState("")
  const [processando, setProcessando] = useState(false)

  const [aplicando, setAplicando] = useState(false)
  const [avisoQuantidade, setAvisoQuantidade] = useState(false)
const [resultadoImportacao, setResultadoImportacao] = useState<{
  criados: number
  atualizados: number
  revisaoPendente: number
  erros: string[]
} | null>(null)
const [markup, setMarkup] = useState(100)


  async function lerPlanilha() {
    setMensagem("")
    setItens([])

    if (!arquivo) {
      setMensagem("Selecione uma planilha primeiro.")
      return
    }

    try {
      setProcessando(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMensagem("Você precisa estar logado.")
        setProcessando(false)
        return
      }

      const { data: produtosBanco, error: erroProdutos } = await supabase
        .from("products")
        .select("id, nome, cor, tamanho")
        .eq("user_id", user.id)

      if (erroProdutos) {
        setMensagem("Erro ao carregar produtos cadastrados.")
        setProcessando(false)
        return
      }

      const itensLidos: ItemImportado[] = await parseSpreadsheet(arquivo)

// 👇 detectar se veio sem quantidade
const semQuantidade = itensLidos.some((item) => item.quantidade === 1)
setAvisoQuantidade(semQuantidade)

      if (itensLidos.length === 0) {
        setMensagem("Nenhum item válido foi encontrado na planilha.")
        setProcessando(false)
        return
      }

      const itensComMatch = matchImportedProducts(
        itensLidos,
        (produtosBanco ?? []) as {
          id: number
          nome: string
          cor: string | null
          tamanho: string | null
        }[]
      )

      setItens(itensComMatch)
      setMensagem(`Importação analisada: ${itensComMatch.length} item(ns).`)
      setProcessando(false)
    } catch (error) {
      console.error(error)
      setMensagem("Erro ao ler a planilha. Verifique o arquivo.")
      setProcessando(false)
    }
  }

  async function confirmarImportacao() {
  setMensagem("")
  setResultadoImportacao(null)

  if (itens.length === 0) {
    setMensagem("Nenhum item para importar.")
    return
  }

  try {
    setAplicando(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      setAplicando(false)
      return
    }

    const resultado = await applySpreadsheetImports({
  userId: user.id,
  itens,
  markup,
})

    setResultadoImportacao({
      criados: resultado.criados,
      atualizados: resultado.atualizados,
      revisaoPendente: resultado.revisaoPendente,
      erros: resultado.erros,
    })

    setMensagem(resultado.message)
    setAplicando(false)
  } catch (error) {
    console.error(error)
    setMensagem("Erro ao aplicar a importação.")
    setAplicando(false)
  }
}

  return (
    <div>
      <h2 className="page-title">Importar compra</h2>
      <p className="page-subtitle">
        Envie uma planilha de compras para o sistema ler os itens e sugerir o que fazer.
      </p>

      <HelpBanner
        title="Como funciona a importação"
        text="O sistema lê a planilha, compara com os produtos já cadastrados e sugere se deve somar ao estoque, criar um novo produto ou revisar manualmente."
      />

      {mensagem && <p style={{ marginTop: 16 }}>{mensagem}</p>}

      {avisoQuantidade && (
  <div
    style={{
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      background: "#fef3c7",
      border: "1px solid #fde68a",
      color: "#92400e",
      fontSize: 14,
      fontWeight: 500,
    }}
  >
    ⚠️ A planilha não possui coluna de quantidade. Foi considerado <strong>1 unidade</strong> para cada item.
  </div>
)}

      <div
  style={{
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#fff",
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  }}
>
  <input
    type="file"
    accept=".xlsx,.xls,.csv"
    onChange={(e) => setArquivo(e.target.files?.[0] || null)}
  />

  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
    Margem de lucro (%)
  </label>

  <input
    type="number"
    value={markup}
    onChange={(e) => setMarkup(Number(e.target.value))}
    placeholder="Ex: 100 = dobra o preço"
    style={{
      width: 120,
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #e5e7eb",
    }}
  />

  <span style={{ fontSize: 11, color: "#64748b" }}>
    O preço de venda será calculado automaticamente
  </span>
</div>


  <button
    onClick={lerPlanilha}
    className="btn btn-primary"
    disabled={processando}
  >
    {processando ? "Lendo planilha..." : "Ler planilha"}
  </button>

  <button
    onClick={confirmarImportacao}
    className="btn btn-success"
    disabled={aplicando || itens.length === 0}
  >
    {aplicando ? "Aplicando importação..." : "Confirmar importação"}
  </button>
</div>

{itens.length > 0 && (
  <div
    style={{
      marginTop: 10,
      fontSize: 13,
      color: "#334155",
      background: "#f8fafc",
      padding: 10,
      borderRadius: 8,
      border: "1px solid #e2e8f0",
    }}
  >
    💡 Os preços de venda já estão sendo calculados com base na margem de {markup}%.
  </div>
)}

      {arquivo && (
        <div style={{ marginBottom: 16, fontSize: 14, color: "#475569" }}>
          <strong>Arquivo selecionado:</strong> {arquivo.name}
        </div>
      )}

      {resultadoImportacao && (
  <div
    style={{
      marginBottom: 16,
      padding: 16,
      borderRadius: 14,
      border: "1px solid #dbeafe",
      background: "#eff6ff",
      color: "#1e3a8a",
    }}
  >
    <div style={{ fontWeight: 700, marginBottom: 8 }}>
      Resumo da importação aplicada
    </div>

    

    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
      <span><strong>Criados:</strong> {resultadoImportacao.criados}</span>
      <span><strong>Estoque atualizado:</strong> {resultadoImportacao.atualizados}</span>
      <span><strong>Pendentes para revisão:</strong> {resultadoImportacao.revisaoPendente}</span>
      <span><strong>Erros:</strong> {resultadoImportacao.erros.length}</span>
    </div>

    {resultadoImportacao.erros.length > 0 && (
      <div style={{ marginTop: 12 }}>
        <strong>Itens com erro:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {resultadoImportacao.erros.map((erro, index) => (
            <li key={`${erro}-${index}`}>{erro}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}

      <div className="data-table-wrap">
        <table style={tabela}>
          <thead>
  <tr>
    <th style={th}>Nome</th>
    <th style={th}>Marca</th>
    <th style={th}>Categoria</th>
    <th style={th}>Tipo</th>
    <th style={th}>Cor</th>
    <th style={th}>Tamanho</th>
    <th style={th}>Quantidade</th>
    <th style={th}>Custo</th>
    <th style={th}>Preço venda</th>
    <th style={th}>Produto encontrado</th>
    <th style={th}>Ação</th>
  </tr>
</thead>
<tbody>
  {itens.length > 0 ? (
    itens.map((item, index) => (
      <tr key={`${item.nome}-${index}`}>
        <td style={td}>{item.nome}</td>
        <td style={td}>{item.marca || "-"}</td>
        <td style={td}>{item.categoria || "-"}</td>
        <td style={td}>{item.tipo || "-"}</td>
        <td style={td}>{item.cor || "-"}</td>
        <td style={td}>{item.tamanho || "-"}</td>
        <td style={td}>{item.quantidade}</td>
        <td style={td}>
          R$ {Number(item.preco || 0).toFixed(2)}
        </td>
        <td style={td}>
          R$ {(Number(item.preco || 0) * (1 + markup / 100)).toFixed(2)}
        </td>
        <td style={td}>{item.produtoExistenteNome || "-"}</td>
        <td style={td}>
          <span
            className={
              item.acao === "somar_estoque"
                ? "status-pill status-green"
                : item.acao === "criar_produto"
                ? "status-pill status-blue"
                : "status-pill status-yellow"
            }
          >
            {item.acao === "somar_estoque"
              ? "Somar estoque"
              : item.acao === "criar_produto"
              ? "Criar produto"
              : "Revisar"}
          </span>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td style={tdVazio} colSpan={11}>
        Nenhum item carregado ainda.
      </td>
    </tr>
  )}
</tbody>
        </table>
      </div>
    </div>
  )
}

const tabela = {
  width: "100%",
  borderCollapse: "collapse" as const,
  marginTop: 20,
}

const th = {
  borderBottom: "1px solid #ddd",
  padding: "10px",
  textAlign: "left" as const,
}

const td = {
  borderBottom: "1px solid #eee",
  padding: "10px",
  verticalAlign: "top" as const,
}

const tdVazio = {
  borderBottom: "1px solid #eee",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
}