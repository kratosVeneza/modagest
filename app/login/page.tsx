"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [mensagem, setMensagem] = useState("")
  const router = useRouter()

  async function entrar() {
  setMensagem("")

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  })

  if (error) {
    setMensagem(error.message)
    return
  }

  router.push("/dashboard")
}

  async function cadastrar() {
  setMensagem("")

  const { error } = await supabase.auth.signUp({
    email,
    password: senha
  })

  if (error) {
    setMensagem(error.message)
    return
  }

  setMensagem("Conta criada com sucesso. Agora tente entrar.")
}

  return (
    <div style={container}>
      <div style={box}>
        <h2>Login</h2>
        <p>Entre no ModaGest</p>

        <input
          style={input}
          type="email"
          placeholder="Seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={input}
          type="password"
          placeholder="Sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <div style={acoes}>
          <button onClick={entrar} style={botaoAzul}>
            Entrar
          </button>

          <button onClick={cadastrar} style={botaoCinza}>
            Criar conta
          </button>
        </div>

        {mensagem && <p style={{ marginTop: "16px" }}>{mensagem}</p>}
      </div>
    </div>
  )
}

const container = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f3f4f6"
}

const box = {
  width: "100%",
  maxWidth: "420px",
  background: "white",
  padding: "32px",
  borderRadius: "12px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
}

const input = {
  width: "100%",
  padding: "12px",
  marginTop: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box" as const
}

const acoes = {
  display: "flex",
  gap: "10px",
  marginTop: "16px"
}

const botaoAzul = {
  flex: 1,
  padding: "12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
}

const botaoCinza = {
  flex: 1,
  padding: "12px",
  background: "#6b7280",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
}