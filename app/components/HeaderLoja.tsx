"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function HeaderLoja() {
  const [nomeLoja, setNomeLoja] = useState("Painel do Sistema")

  useEffect(() => {
    carregarLoja()
  }, [])

  async function carregarLoja() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from("stores")
      .select("nome_loja")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) return

    if (data?.nome_loja) {
      setNomeLoja(data.nome_loja)
    }
  }

  return <h1 className="page-title">{nomeLoja}</h1>
}