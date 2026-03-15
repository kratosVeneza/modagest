"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function UserProfile() {
  const [email, setEmail] = useState("carregando...")

  useEffect(() => {
    carregarUsuario()
  }, [])

  async function carregarUsuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      setEmail("usuário")
      return
    }

    setEmail(user.email)
  }

  const iniciais = useMemo(() => {
    if (!email || email === "carregando..." || email === "usuário") return "U"
    return email.slice(0, 2).toUpperCase()
  }, [email])

  return (
    <div className="user-profile">
      <div className="user-avatar">{iniciais}</div>

      <div className="user-info">
        <span className="user-greeting">Bem-vindo</span>
        <strong className="user-email">{email}</strong>
      </div>
    </div>
  )
}