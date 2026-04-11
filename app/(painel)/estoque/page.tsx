"use client"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Produto = {
  id: number
  nome: string
  sku: string
  marca: string | null
  categoria: string | null
  tipo: string | null
  unidade: string | null
  estoque: number
}

type Movimento = {
  id: number
  tipo: string
  origem: string | null
  quantidade: number
  motivo: string
  created_at: string
  nomeProduto: string
  skuProduto: string
  marca: string
  categoria: string
  tipoProduto: string
  unidade: string
  estoqueApos: number
}

export default function Estoque() {
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [busca, setBusca] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [filtroOrigem, setFiltroOrigem] = useState("Todos")

  useEffect(() => {
    carregarMovimentos()
  }, [])

  async function carregarMovimentos() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: movimentosData } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    const { data: produtosData } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)

    const mapa = new Map<number, Produto>()
    ;(produtosData || []).forEach((p) => mapa.set(p.id, p))

    const lista = (movimentosData || []).map((m: any) => {
      const p = mapa.get(m.product_id)

      return {
        id: m.id,
        tipo: m.tipo,
        origem: m.origem,
        quantidade: m.quantidade,
        motivo: m.motivo || "-",
        created_at: m.created_at,
        nomeProduto: p?.nome || "Produto removido",
        skuProduto: p?.sku || "-",
        marca: p?.marca || "-",
        categoria: p?.categoria || "-",
        tipoProduto: p?.tipo || "-",
        unidade: p?.unidade || "un",
        estoqueApos: m.estoque_apos ?? 0,
      }
    })

    setMovimentos(lista)
  }

  function formatarTipo(tipo: string) {
    if (tipo === "entrada") return "Entrada"
    if (tipo === "saida") return "Saída"
    if (tipo === "ajuste") return "Ajuste"
    if (tipo === "cancelamento") return "Cancelamento"
    return tipo
  }

  function formatarOrigem(origem: string | null) {
    if (!origem) return "-"
    if (origem === "venda") return "Venda"
    if (origem === "importacao") return "Importação"
    if (origem === "ia") return "IA 🤖"
    if (origem === "manual") return "Manual"
    return origem
  }

  function corTipo(tipo: string) {
    if (tipo === "entrada") return "status-green"
    if (tipo === "saida") return "status-red"
    if (tipo === "ajuste") return "status-yellow"
    if (tipo === "cancelamento") return "status-blue"
    return "status-gray"
  }

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase()

    return movimentos.filter((m) => {
      const texto = [
        m.nomeProduto,
        m.skuProduto,
        m.marca,
        m.categoria,
        m.tipoProduto,
        m.motivo,
      ]
        .join(" ")
        .toLowerCase()

      const okBusca = !termo || texto.includes(termo)
      const okTipo = filtroTipo === "Todos" || m.tipo === filtroTipo
      const okOrigem = filtroOrigem === "Todos" || m.origem === filtroOrigem

      return okBusca && okTipo && okOrigem
    })
  }, [movimentos, busca, filtroTipo, filtroOrigem])

  return (
    <div>
      <h2 className="page-title">Movimentação de Estoque</h2>

      <div className="table-toolbar" style={{ marginTop: 20 }}>
        <input
          placeholder="Buscar produto, SKU, marca, motivo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="Todos">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
          <option value="ajuste">Ajuste</option>
          <option value="cancelamento">Cancelamento</option>
        </select>

        <select value={filtroOrigem} onChange={(e) => setFiltroOrigem(e.target.value)}>
          <option value="Todos">Todas origens</option>
          <option value="venda">Venda</option>
          <option value="importacao">Importação</option>
          <option value="ia">IA</option>
          <option value="manual">Manual</option>
        </select>

        <span>{filtrados.length} movimentações</span>
      </div>

      <div className="data-table-wrap">
        <table style={tabela}>
          <thead>
            <tr>
              <th style={th}>Produto</th>
              <th style={th}>Tipo</th>
              <th style={th}>Origem</th>
              <th style={th}>Qtd</th>
              <th style={th}>Estoque após</th>
              <th style={th}>Motivo</th>
              <th style={th}>Data</th>
            </tr>
          </thead>

          <tbody>
            {filtrados.map((m) => (
              <tr key={m.id}>
                <td style={td}>
                  <strong>{m.nomeProduto}</strong>
                  <div style={{ fontSize: 12 }}>{m.skuProduto}</div>
                </td>

                <td style={td}>
                  <span className={`status-pill ${corTipo(m.tipo)}`}>
                    {formatarTipo(m.tipo)}
                  </span>
                </td>

                <td style={td}>{formatarOrigem(m.origem)}</td>

                <td style={td}>
                  {m.tipo === "saida" ? "-" : "+"}
                  {m.quantidade}
                </td>

                <td style={td}>{m.estoqueApos}</td>

                <td style={td}>{m.motivo}</td>

                <td style={td}>
                  {new Date(m.created_at).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
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
}
