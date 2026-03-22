"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Chrome, Mail, Lock, UserPlus, LogIn, ArrowLeft } from "lucide-react"
import { ensureProfile } from "@/lib/ensureProfile"
import { ensureSubscription } from "@/lib/ensureSubscription"

type Modo = "entrar" | "criar"

type LoginPageClientProps = {
  initialPlan?: string | null
}

export default function LoginPageClient({
  initialPlan,
}: LoginPageClientProps) {
  const router = useRouter()

  const [modo, setModo] = useState<Modo>("entrar")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState("")
  const [erro, setErro] = useState("")

  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null)

  useEffect(() => {
    verificarSessao()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const planoStorage = localStorage.getItem("modagest_selected_plan")

    if (planoStorage && ["essencial", "profissional", "premium"].includes(planoStorage)) {
      setPlanoSelecionado(planoStorage)
      return
    }

    if (initialPlan && ["essencial", "profissional", "premium"].includes(initialPlan)) {
      setPlanoSelecionado(initialPlan)
      return
    }

    setPlanoSelecionado(null)
  }, [initialPlan])

  async function verificarSessao() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      router.push("/dashboard")
    }
  }

  const titulo = useMemo(() => {
    return modo === "entrar" ? "Entrar na sua conta" : "Criar sua conta"
  }, [modo])

  const subtitulo = useMemo(() => {
    return modo === "entrar"
      ? "Acesse sua conta com email e senha ou continue com Google."
      : "Crie sua conta para começar a usar o sistema."
  }, [modo])

  function limparPlanoSelecionado() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("modagest_selected_plan")
    }
    setPlanoSelecionado(null)
  }

  function nomePlano(plan: string | null) {
    if (plan === "essencial") return "Essencial"
    if (plan === "premium") return "Premium"
    if (plan === "profissional") return "Profissional"
    return ""
  }

  async function entrarComEmail(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setMensagem("")
    setErro("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setCarregando(false)
      setErro(error.message || "Não foi possível entrar.")
      return
    }

    const result = await ensureProfile({
      trialDays: 7,
      selectedPlan: planoSelecionado || undefined,
    })

    const subscriptionResult = await ensureSubscription({
      trialDays: 7,
      selectedPlan: planoSelecionado || undefined,
    })

    if (!subscriptionResult.ok) {
      setCarregando(false)
      setErro(subscriptionResult.error || "Não foi possível criar a assinatura.")
      return
    }

    if (!result.ok) {
      setCarregando(false)
      setErro(result.error || "Não foi possível criar o perfil.")
      return
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("modagest_selected_plan")
    }

    setCarregando(false)
    router.push("/dashboard")
  }

  async function criarConta(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setMensagem("")
    setErro("")

    if (senha.length < 6) {
      setCarregando(false)
      setErro("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    if (senha !== confirmarSenha) {
      setCarregando(false)
      setErro("As senhas não coincidem.")
      return
    }

    const redirectPlanSuffix = planoSelecionado ? `?plan=${planoSelecionado}` : ""

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/login${redirectPlanSuffix}`,
      },
    })

    if (error) {
      setCarregando(false)
      setErro(error.message || "Não foi possível criar a conta.")
      return
    }

    if (data.session) {
      const result = await ensureProfile({
        trialDays: 7,
        selectedPlan: planoSelecionado || undefined,
      })

      const subscriptionResult = await ensureSubscription({
        trialDays: 7,
        selectedPlan: planoSelecionado || undefined,
      })

      if (!subscriptionResult.ok) {
        setCarregando(false)
        setErro(subscriptionResult.error || "Não foi possível criar a assinatura.")
        return
      }

      if (!result.ok) {
        setCarregando(false)
        setErro(result.error || "Não foi possível criar o perfil.")
        return
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("modagest_selected_plan")
      }

      setCarregando(false)
      router.push("/dashboard")
      return
    }

    setCarregando(false)
    setMensagem("Conta criada com sucesso. Verifique seu email para confirmar o cadastro.")
    setSenha("")
    setConfirmarSenha("")

    if (typeof window !== "undefined") {
      localStorage.removeItem("modagest_selected_plan")
    }
  }

  async function entrarComGoogle() {
    setCarregando(true)
    setMensagem("")
    setErro("")

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })

    setCarregando(false)

    if (error) {
      setErro(error.message || "Não foi possível entrar com Google.")
    }
  }

  async function onSubmit(e: React.FormEvent) {
    if (modo === "entrar") {
      await entrarComEmail(e)
      return
    }

    await criarConta(e)
  }

  return (
    <div style={pagina}>
      <div style={colunaEsquerda}>
        <div style={heroCard}>
          <div style={logo}>M</div>
          <h1 style={heroTitulo}>ModaGest</h1>
          <p style={heroTexto}>
            Controle produtos, estoque, vendas, financeiro e relatórios em um só lugar.
          </p>

          <div style={listaBox}>
            <div style={listaItem}>• Cadastro de produtos e estoque</div>
            <div style={listaItem}>• Vendas com recebimento parcial</div>
            <div style={listaItem}>• Financeiro e fluxo de caixa</div>
            <div style={listaItem}>• Relatórios e lucratividade</div>
          </div>
        </div>
      </div>

      <div style={colunaDireita}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div
            style={{
              marginBottom: 18,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={linkTopo}
              onClick={limparPlanoSelecionado}
            >
              <ArrowLeft size={16} />
              Voltar para a página inicial
            </Link>

            <Link
              href="/planos"
              style={linkTopoSecundario}
              onClick={limparPlanoSelecionado}
            >
              Ver planos
            </Link>
          </div>

          <div style={formCard}>
            <div style={tabs}>
              <button
                type="button"
                onClick={() => {
                  setModo("entrar")
                  setMensagem("")
                  setErro("")
                }}
                style={{
                  ...tabBtn,
                  ...(modo === "entrar" ? tabBtnAtivo : {}),
                }}
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  setModo("criar")
                  setMensagem("")
                  setErro("")
                }}
                style={{
                  ...tabBtn,
                  ...(modo === "criar" ? tabBtnAtivo : {}),
                }}
              >
                Criar conta
              </button>
            </div>

            <h2 style={tituloStyle}>{titulo}</h2>
            <p style={subtituloStyle}>{subtitulo}</p>

            {planoSelecionado && (
              <div style={planoSelecionadoBox}>
                <span style={planoSelecionadoLabel}>Plano selecionado</span>
                <strong style={planoSelecionadoValor}>
                  {nomePlano(planoSelecionado)}
                </strong>
              </div>
            )}

            {erro && <div style={erroBox}>{erro}</div>}
            {mensagem && <div style={sucessoBox}>{mensagem}</div>}

            <button
              type="button"
              onClick={entrarComGoogle}
              disabled={carregando}
              style={googleBtn}
            >
              <Chrome size={18} />
              Continuar com Google
            </button>

            <div style={divisor}>
              <span style={divisorLinha} />
              <span style={divisorTexto}>ou</span>
              <span style={divisorLinha} />
            </div>

            <form onSubmit={onSubmit} style={formStyle}>
              <div>
                <label style={labelStyle}>Email</label>
                <div style={inputWrap}>
                  <Mail size={18} color="#64748b" />
                  <input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Senha</label>
                <div style={inputWrap}>
                  <Lock size={18} color="#64748b" />
                  <input
                    type="password"
                    placeholder="Sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              {modo === "criar" && (
                <div>
                  <label style={labelStyle}>Confirmar senha</label>
                  <div style={inputWrap}>
                    <Lock size={18} color="#64748b" />
                    <input
                      type="password"
                      placeholder="Repita sua senha"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              <button type="submit" disabled={carregando} style={submitBtn}>
                {modo === "entrar" ? <LogIn size={18} /> : <UserPlus size={18} />}
                {carregando
                  ? "Aguarde..."
                  : modo === "entrar"
                  ? "Entrar"
                  : "Criar conta"}
              </button>
            </form>

            <p style={rodapeTexto}>
              {modo === "entrar"
                ? "Ainda não tem conta? Clique em “Criar conta”."
                : "Já tem conta? Clique em “Entrar”."}
            </p>

            <p style={rodapePlanos}>
              Ainda está conhecendo o sistema?{" "}
              <Link
                href="/planos"
                style={linkPlanos}
                onClick={limparPlanoSelecionado}
              >
                Ver planos
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const pagina: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "1.1fr 1fr",
  background: "#f8fafc",
}

const colunaEsquerda: React.CSSProperties = {
  padding: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #0f172a, #1e293b)",
}

const colunaDireita: React.CSSProperties = {
  padding: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const heroCard: React.CSSProperties = {
  width: "100%",
  maxWidth: "520px",
  color: "#fff",
}

const logo: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 20,
  background: "linear-gradient(135deg, #60a5fa, #2563eb)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  fontWeight: 800,
  marginBottom: 20,
  boxShadow: "0 12px 30px rgba(37,99,235,0.30)",
}

const heroTitulo: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 800,
  margin: "0 0 12px 0",
}

const heroTexto: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.82)",
  margin: 0,
}

const listaBox: React.CSSProperties = {
  marginTop: 28,
  display: "grid",
  gap: 12,
}

const listaItem: React.CSSProperties = {
  fontSize: 15,
  color: "rgba(255,255,255,0.88)",
}

const formCard: React.CSSProperties = {
  width: "100%",
  maxWidth: "460px",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 24,
  padding: 28,
  boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
}

const linkTopo: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
  color: "#2563eb",
  fontWeight: 700,
  fontSize: 14,
}

const linkTopoSecundario: React.CSSProperties = {
  textDecoration: "none",
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 14,
}

const tabs: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 22,
}

const tabBtn: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  color: "#0f172a",
}

const tabBtnAtivo: React.CSSProperties = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#2563eb",
}

const tituloStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  margin: "0 0 8px 0",
  color: "#0f172a",
}

const subtituloStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "#64748b",
  margin: "0 0 18px 0",
}

const planoSelecionadoBox: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
}

const planoSelecionadoLabel: React.CSSProperties = {
  fontSize: 13,
  color: "#2563eb",
  fontWeight: 700,
}

const planoSelecionadoValor: React.CSSProperties = {
  fontSize: 14,
  color: "#1d4ed8",
}

const erroBox: React.CSSProperties = {
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px 14px",
  borderRadius: 12,
  marginBottom: 14,
  fontSize: 14,
  fontWeight: 600,
}

const sucessoBox: React.CSSProperties = {
  background: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #a7f3d0",
  padding: "12px 14px",
  borderRadius: 12,
  marginBottom: 14,
  fontSize: 14,
  fontWeight: 600,
}

const googleBtn: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  fontWeight: 700,
  cursor: "pointer",
}

const divisor: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "18px 0",
}

const divisorLinha: React.CSSProperties = {
  height: 1,
  background: "#e5e7eb",
  flex: 1,
}

const divisorTexto: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
}

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 600,
  color: "#0f172a",
}

const inputWrap: React.CSSProperties = {
  height: 52,
  border: "1px solid #dbe3ee",
  borderRadius: 14,
  padding: "0 14px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#fff",
}

const inputStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  width: "100%",
  fontSize: 15,
  color: "#0f172a",
  background: "transparent",
}

const submitBtn: React.CSSProperties = {
  height: 52,
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(37,99,235,0.25)",
}

const rodapeTexto: React.CSSProperties = {
  marginTop: 18,
  marginBottom: 8,
  textAlign: "center",
  color: "#64748b",
  fontSize: 14,
}

const rodapePlanos: React.CSSProperties = {
  margin: 0,
  textAlign: "center",
  color: "#64748b",
  fontSize: 14,
}

const linkPlanos: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 700,
  textDecoration: "none",
}