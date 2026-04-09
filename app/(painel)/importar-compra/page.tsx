"use client"

import { useMemo, useState } from "react"
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

type ItemImportacaoUI = ItemComMatch & {
  fornecedor?: string | null
}

export default function ImportarCompra() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [itens, setItens] = useState<ItemImportacaoUI[]>([])
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

  const [itensSelecionados, setItensSelecionados] = useState<number[]>([])

  const [marcaLote, setMarcaLote] = useState("")
  const [fornecedorLote, setFornecedorLote] = useState("")
  const [categoriaLote, setCategoriaLote] = useState("")
  const [tipoLote, setTipoLote] = useState("")

  const todosSelecionados = useMemo(() => {
    return itens.length > 0 && itensSelecionados.length === itens.length
  }, [itens, itensSelecionados])

  async function lerPlanilha() {
    setMensagem("")
    setItens([])
    setItensSelecionados([])
    setResultadoImportacao(null)

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

      const itensPreparados: ItemImportacaoUI[] = itensComMatch.map((item) => ({
        ...item,
        marca: item.marca || "",
        fornecedor: "",
        categoria: item.categoria || "",
        tipo: item.tipo || "",
      }))

      setItens(itensPreparados)
      setMensagem(`Importação analisada: ${itensPreparados.length} item(ns).`)
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

  function alternarSelecionarTodos(checked: boolean) {
    if (checked) {
      setItensSelecionados(itens.map((_, index) => index))
      return
    }

    setItensSelecionados([])
  }

  function alternarSelecaoItem(index: number, checked: boolean) {
    if (checked) {
      setItensSelecionados((prev) =>
        prev.includes(index) ? prev : [...prev, index]
      )
      return
    }

    setItensSelecionados((prev) => prev.filter((i) => i !== index))
  }

  function atualizarCampoItem(
    index: number,
    campo: keyof ItemImportacaoUI,
    valor: string
  ) {
    setItens((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    )
  }

  function aplicarPreenchimentoEmLote() {
    if (itensSelecionados.length === 0) {
      setMensagem("Selecione pelo menos um item para preencher.")
      return
    }

    if (
      !marcaLote.trim() &&
      !fornecedorLote.trim() &&
      !categoriaLote.trim() &&
      !tipoLote.trim()
    ) {
      setMensagem("Preencha pelo menos um campo antes de aplicar.")
      return
    }

    setItens((prev) =>
      prev.map((item, index) => {
        if (!itensSelecionados.includes(index)) return item

        return {
          ...item,
          marca: marcaLote.trim() || item.marca,
          fornecedor: fornecedorLote.trim() || item.fornecedor,
          categoria: categoriaLote.trim() || item.categoria,
          tipo: tipoLote.trim() || item.tipo,
        }
      })
    )

    setMensagem("Campos aplicados aos itens selecionados.")
  }

  function limparSelecao() {
    setItensSelecionados([])
  }

  return (
    <div>
      <h2 className="page-title">Importar compra</h2>
      <p className="page-subtitle">
        Envie uma planilha de compras para o sistema ler os itens e sugerir o
        que fazer.
      </p>

      <HelpBanner
        title="Como funciona a importação"
        text="O sistema lê a planilha, compara com os produtos já cadastrados e sugere se deve somar ao estoque, criar um novo produto ou revisar manualmente."
      />

      {mensagem && <p style={{ marginTop: 16 }}>{mensagem}</p>}

      {avisoQuantidade && (
        <div style={alertaQuantidade}>
          ⚠️ A planilha não possui coluna de quantidade. Foi considerado{" "}
          <strong>1 unidade</strong> para cada item.
        </div>
      )}

      <div style={blocoUpload}>
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
            style={inputPequeno}
          />

          <span style={{ fontSize: 11, color: "#64748b" }}>
            Ex.: 100 = dobra o preço de custo
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
        <div style={avisoMarkup}>
          💡 Os preços de venda já estão sendo calculados com base na margem de{" "}
          {markup}%.
        </div>
      )}

      {arquivo && (
        <div style={{ marginBottom: 16, fontSize: 14, color: "#475569" }}>
          <strong>Arquivo selecionado:</strong> {arquivo.name}
        </div>
      )}

      {itens.length > 0 && (
        <div style={painelLote}>
          <div style={painelLoteHeader}>
            <div>
              <div style={painelTitulo}>Preencher itens selecionados</div>
              <div style={painelSubtitulo}>
                Selecione os produtos e aplique marca, fornecedor, categoria e
                tipo de uma só vez.
              </div>
            </div>

            <div style={badgeSelecao}>
              {itensSelecionados.length} selecionado(s)
            </div>
          </div>

          <div style={gridCamposLote}>
            <div style={campoBox}>
              <label style={labelCampo}>Marca</label>
              <input
                type="text"
                value={marcaLote}
                onChange={(e) => setMarcaLote(e.target.value)}
                placeholder="Ex: Moda Run"
                style={inputPadrao}
              />
            </div>

            <div style={campoBox}>
              <label style={labelCampo}>Fornecedor</label>
              <input
                type="text"
                value={fornecedorLote}
                onChange={(e) => setFornecedorLote(e.target.value)}
                placeholder="Ex: Fornecedor X"
                style={inputPadrao}
              />
            </div>

            <div style={campoBox}>
              <label style={labelCampo}>Categoria</label>
              <input
                type="text"
                value={categoriaLote}
                onChange={(e) => setCategoriaLote(e.target.value)}
                placeholder="Ex: Roupas, Acessórios, Consumo"
                style={inputPadrao}
              />
            </div>

            <div style={campoBox}>
              <label style={labelCampo}>Tipo</label>
              <input
                type="text"
                value={tipoLote}
                onChange={(e) => setTipoLote(e.target.value)}
                placeholder="Ex: Camiseta, Conjunto, Jaqueta"
                style={inputPadrao}
              />
            </div>
          </div>

          <div style={acoesLote}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={aplicarPreenchimentoEmLote}
            >
              Aplicar aos selecionados
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={limparSelecao}
            >
              Limpar seleção
            </button>
          </div>
        </div>
      )}

      {resultadoImportacao && (
        <div style={boxResultado}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Resumo da importação aplicada
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
            <span>
              <strong>Criados:</strong> {resultadoImportacao.criados}
            </span>
            <span>
              <strong>Estoque atualizado:</strong> {resultadoImportacao.atualizados}
            </span>
            <span>
              <strong>Pendentes para revisão:</strong>{" "}
              {resultadoImportacao.revisaoPendente}
            </span>
            <span>
              <strong>Erros:</strong> {resultadoImportacao.erros.length}
            </span>
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
              <th style={th}>
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  onChange={(e) => alternarSelecionarTodos(e.target.checked)}
                />
              </th>
              <th style={th}>Nome</th>
              <th style={th}>Marca</th>
              <th style={th}>Fornecedor</th>
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
                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={itensSelecionados.includes(index)}
                      onChange={(e) =>
                        alternarSelecaoItem(index, e.target.checked)
                      }
                    />
                  </td>

                  <td style={td}>{item.nome}</td>

                  <td style={td}>
                    <input
                      type="text"
                      value={item.marca || ""}
                      onChange={(e) =>
                        atualizarCampoItem(index, "marca", e.target.value)
                      }
                      placeholder="Marca"
                      style={inputTabela}
                    />
                  </td>

                  <td style={td}>
                    <input
                      type="text"
                      value={item.fornecedor || ""}
                      onChange={(e) =>
                        atualizarCampoItem(index, "fornecedor", e.target.value)
                      }
                      placeholder="Fornecedor"
                      style={inputTabela}
                    />
                  </td>

                  <td style={td}>
                    <input
                      type="text"
                      value={item.categoria || ""}
                      onChange={(e) =>
                        atualizarCampoItem(index, "categoria", e.target.value)
                      }
                      placeholder="Categoria"
                      style={inputTabela}
                    />
                  </td>

                  <td style={td}>
                    <input
                      type="text"
                      value={item.tipo || ""}
                      onChange={(e) =>
                        atualizarCampoItem(index, "tipo", e.target.value)
                      }
                      placeholder="Tipo"
                      style={inputTabela}
                    />
                  </td>

                  <td style={td}>{item.cor || "-"}</td>
                  <td style={td}>{item.tamanho || "-"}</td>
                  <td style={td}>{item.quantidade}</td>

                  <td style={td}>R$ {Number(item.preco || 0).toFixed(2)}</td>

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
                <td style={tdVazio} colSpan={13}>
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
  whiteSpace: "nowrap" as const,
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

const blocoUpload = {
  marginTop: 20,
  marginBottom: 20,
  padding: 16,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
  alignItems: "center" as const,
}

const inputPequeno = {
  width: 140,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
}

const avisoMarkup = {
  marginTop: 10,
  fontSize: 13,
  color: "#334155",
  background: "#f8fafc",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
}

const alertaQuantidade = {
  marginTop: 12,
  padding: 12,
  borderRadius: 10,
  background: "#fef3c7",
  border: "1px solid #fde68a",
  color: "#92400e",
  fontSize: 14,
  fontWeight: 500,
}

const painelLote = {
  marginBottom: 18,
  padding: 16,
  border: "1px solid #dbeafe",
  background: "#f8fbff",
  borderRadius: 14,
}

const painelLoteHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 14,
}

const painelTitulo = {
  fontSize: 16,
  fontWeight: 700,
  color: "#0f172a",
}

const painelSubtitulo = {
  marginTop: 4,
  fontSize: 13,
  color: "#475569",
}

const badgeSelecao = {
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
}

const gridCamposLote = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
}

const campoBox = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
}

const labelCampo = {
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
}

const inputPadrao = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  outline: "none",
}

const inputTabela = {
  width: "100%",
  minWidth: 120,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  outline: "none",
}

const acoesLote = {
  marginTop: 14,
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
}

const boxResultado = {
  marginBottom: 16,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#1e3a8a",
}
