"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type MovimentoBruto = {
  id: number
  tipo: string
  quantidade: number
  motivo: string | null
  created_at: string
  products:
    | {
        nome: string
        sku: string
        marca: string | null
        categoria: string | null
        tipo: string | null
        unidade: string | null
      }
    | {
        nome: string
        sku: string
        marca: string | null
        categoria: string | null
        tipo: string | null
        unidade: string | null
      }[]
    | null
}

type Movimento = {
  id: number
  tipo: string
  quantidade: number
  motivo: string
  created_at: string
  nomeProduto: string
  skuProduto: string
  marca: string
  categoria: string
  tipoProduto: string
  unidade: string
}

export default function Estoque() {
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")

  useEffect(() => {
    carregarMovimentos()
  }, [])

  async function carregarMovimentos() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        id,
        tipo,
        quantidade,
        motivo,
        created_at,
        products (
          nome,
          sku,
          marca,
          categoria,
          tipo,
          unidade
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      setMensagem("Erro ao carregar movimentações de estoque.")
      return
    }

    const listaFormatada: Movimento[] = ((data ?? []) as MovimentoBruto[]).map((item) => {
      let produto = item.products

      if (Array.isArray(produto)) {
        produto = produto[0] ?? null
      }

      return {
        id: item.id,
        tipo: item.tipo,
        quantidade: item.quantidade,
        motivo: item.motivo || "-",
        created_at: item.created_at,
        nomeProduto: produto?.nome || "Produto removido",
        skuProduto: produto?.sku || "-",
        marca: produto?.marca || "-",
        categoria: produto?.categoria || "-",
        tipoProduto: produto?.tipo || "-",
        unidade: produto?.unidade || "un",
      }
    })

    setMovimentos(listaFormatada)
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleString("pt-BR")
  }

  function formatarTipo(tipo: string) {
    if (tipo === "entrada") return "Entrada"
    if (tipo === "saida") return "Saída"
    if (tipo === "cancelamento") return "Cancelamento"
    if (tipo === "ajuste") return "Ajuste"
    return tipo
  }

  const movimentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return movimentos.filter((item) => {
      const texto =
        [
          item.nomeProduto,
          item.skuProduto,
          item.marca,
          item.categoria,
          item.tipoProduto,
          item.motivo,
        ]
          .join(" ")
          .toLowerCase()

      const passouBusca = !termo || texto.includes(termo)
      const passouTipo = filtroTipo === "Todos" || item.tipo === filtroTipo

      return passouBusca && passouTipo
    })
  }, [movimentos, busca, filtroTipo])

  return (
    <div>
      <h2 className="page-title">Movimentação de Estoque</h2>
      <p className="page-subtitle">
        Histórico de entradas e saídas dos produtos.
      </p>

      {mensagem && <p>{mensagem}</p>}

      <div className="table-toolbar" style={{ marginTop: 20 }}>
        <input
          placeholder="Buscar por produto, SKU, marca, categoria, tipo ou motivo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ maxWidth: "420px" }}
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{ maxWidth: "220px" }}
        >
          <option value="Todos">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
          <option value="cancelamento">Cancelamento</option>
          <option value="ajuste">Ajuste</option>
        </select>

        <span className="info-muted">{movimentosFiltrados.length} movimentação(ões)</span>
      </div>

      <div className="data-table-wrap">
        <table style={tabela}>
          <thead>
            <tr>
              <th style={th}>Produto</th>
              <th style={th}>Detalhes</th>
              <th style={th}>Tipo</th>
              <th style={th}>Quantidade</th>
              <th style={th}>Motivo</th>
              <th style={th}>Data</th>
            </tr>
          </thead>

          <tbody>
            {movimentosFiltrados.map((m) => (
              <tr key={m.id}>
                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <strong>{m.nomeProduto}</strong>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{m.skuProduto}</span>
                  </div>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span>{m.marca}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {[m.categoria, m.tipoProduto, m.unidade].filter(Boolean).join(" • ")}
                    </span>
                  </div>
                </td>
                <td style={td}>
                  <span
                    className={
                      m.tipo === "entrada"
                        ? "status-pill status-green"
                        : m.tipo === "saida"
                        ? "status-pill status-red"
                        : m.tipo === "cancelamento"
                        ? "status-pill status-blue"
                        : "status-pill status-yellow"
                    }
                  >
                    {formatarTipo(m.tipo)}
                  </span>
                </td>
                <td style={td}>
                  {m.quantidade} {m.unidade}
                </td>
                <td style={td}>{m.motivo}</td>
                <td style={td}>{formatarData(m.created_at)}</td>
              </tr>
            ))}

            {movimentosFiltrados.length === 0 && (
              <tr>
                <td style={tdVazio} colSpan={6}>
                  Nenhuma movimentação encontrada.
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
