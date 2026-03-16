"use client"

import { useEffect, useState } from "react"
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
      }
    | {
        nome: string
        sku: string
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
}

export default function Estoque() {
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [mensagem, setMensagem] = useState("")

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
          sku
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

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600 }}>Movimentação de Estoque</h2>

      <p style={{ color: "#6b7280", marginBottom: 20 }}>
        Histórico de entradas e saídas de produtos
      </p>

      {mensagem && <p>{mensagem}</p>}

      <table style={tabela}>
        <thead>
          <tr>
            <th style={th}>Produto</th>
            <th style={th}>SKU</th>
            <th style={th}>Tipo</th>
            <th style={th}>Quantidade</th>
            <th style={th}>Motivo</th>
            <th style={th}>Data</th>
          </tr>
        </thead>

        <tbody>
          {movimentos.map((m) => (
            <tr key={m.id}>
              <td style={td}>{m.nomeProduto}</td>
              <td style={td}>{m.skuProduto}</td>
              <td style={td}>{formatarTipo(m.tipo)}</td>
              <td style={td}>{m.quantidade}</td>
              <td style={td}>{m.motivo}</td>
              <td style={td}>{formatarData(m.created_at)}</td>
            </tr>
          ))}

          {movimentos.length === 0 && (
            <tr>
              <td style={tdVazio} colSpan={6}>
                Nenhuma movimentação encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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

const tdVazio = {
  borderBottom: "1px solid #eee",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
}
