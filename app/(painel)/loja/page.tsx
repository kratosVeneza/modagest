"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LojaPage() {
  const [nomeLoja, setNomeLoja] = useState("")
  const [responsavel, setResponsavel] = useState("")
  const [telefone, setTelefone] = useState("")
  const [cidade, setCidade] = useState("")
  const [storeId, setStoreId] = useState<number | null>(null)
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarLoja()
  }, [])

  async function carregarLoja() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      setMensagem("Erro ao carregar dados da loja.")
      return
    }

    if (data) {
      setStoreId(data.id)
      setNomeLoja(data.nome_loja || "")
      setResponsavel(data.responsavel || "")
      setTelefone(data.telefone || "")
      setCidade(data.cidade || "")
    }
  }

  async function salvarLoja() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!nomeLoja) {
      setMensagem("Informe o nome da loja.")
      return
    }

    if (storeId) {
      const { error } = await supabase
        .from("stores")
        .update({
          nome_loja: nomeLoja,
          responsavel: responsavel,
          telefone: telefone,
          cidade: cidade,
        })
        .eq("id", storeId)
        .eq("user_id", user.id)

      if (error) {
        setMensagem("Erro ao atualizar loja.")
        return
      }

      setMensagem("Loja atualizada com sucesso.")
      return
    }

    const { data, error } = await supabase
      .from("stores")
      .insert([
        {
          user_id: user.id,
          nome_loja: nomeLoja,
          responsavel: responsavel,
          telefone: telefone,
          cidade: cidade,
        },
      ])
      .select()
      .single()

    if (error) {
      setMensagem("Erro ao cadastrar loja.")
      return
    }

    setStoreId(data.id)
    setMensagem("Loja cadastrada com sucesso.")
  }

  return (
    <div>
      <h2>Minha Loja</h2>
      <p>Cadastre os dados principais da sua loja.</p>

      <div style={box}>
        <div style={grid}>
          <input
            style={input}
            placeholder="Nome da loja"
            value={nomeLoja}
            onChange={(e) => setNomeLoja(e.target.value)}
          />

          <input
            style={input}
            placeholder="Responsável"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />

          <input
            style={input}
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />

          <input
            style={input}
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
        </div>

        <button onClick={salvarLoja} style={botao}>
          {storeId ? "Salvar alterações" : "Cadastrar loja"}
        </button>

        {mensagem && <p style={{ marginTop: "16px" }}>{mensagem}</p>}
      </div>
    </div>
  )
}

const box = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
  marginTop: "20px",
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
  marginBottom: "16px",
}

const input = {
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
}

const botao = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
}