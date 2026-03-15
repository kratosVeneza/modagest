"use client"

import "./globals.css"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import HeaderLoja from "./components/HeaderLoja"

const menuItems = [
  { href: "/", label: "Início", icon: "🏠" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/produtos", label: "Produtos", icon: "📦" },
  { href: "/vendas", label: "Vendas", icon: "💰" },
  { href: "/pedidos", label: "Pedidos", icon: "🛒" },
  { href: "/historico-vendas", label: "Histórico de Vendas", icon: "🧾" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/financeiro", label: "Financeiro", icon: "💳" },
  { href: "/loja", label: "Minha Loja", icon: "🏪" },
  { href: "/login", label: "Login", icon: "🔐" },
]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const pathname = usePathname()

  async function sair() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <html lang="pt-BR">
      <body>
        <div style={appShell}>
          <aside style={sidebar}>
            <div style={logoBox}>
              <div style={logoBadge}>M</div>
              <div>
                <h2 style={logoTitle}>ModaGest</h2>
                <p style={logoSubtitle}>Gestão para lojas</p>
              </div>
            </div>

            <nav style={nav}>
              {menuItems.map((item) => {
                const ativo = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      ...linkStyle,
                      ...(ativo ? linkStyleAtivo : {}),
                    }}
                  >
                    <span style={menuIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}

              <button onClick={sair} style={botaoSair}>
                <span style={menuIcon}>🚪</span>
                <span>Sair</span>
              </button>
            </nav>
          </aside>

          <main style={mainArea}>
            <header className="soft-card" style={topBar}>
              <div>
                <HeaderLoja />
                <p style={topBarSubtitle}>Painel de gestão da sua operação</p>
              </div>

              <div style={topBarRight}>
                <div style={onlineDot} />
                <span style={onlineText}>Sistema online</span>
              </div>
            </header>

            <section>{children}</section>
          </main>
        </div>
      </body>
    </html>
  )
}

const appShell = {
  display: "grid",
  gridTemplateColumns: "270px 1fr",
  minHeight: "100vh",
  background: "#f3f4f6",
} as const

const sidebar = {
  background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
  color: "white",
  padding: "24px 18px",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  position: "sticky",
  top: 0,
  height: "100vh",
} as const

const logoBox = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "28px",
  padding: "6px 4px 16px 4px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
} as const

const logoBadge = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "18px",
} as const

const logoTitle = {
  margin: 0,
  fontSize: "22px",
} as const

const logoSubtitle = {
  margin: "4px 0 0 0",
  fontSize: "13px",
  color: "#cbd5e1",
} as const

const nav = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
} as const

const linkStyle = {
  color: "#e5e7eb",
  textDecoration: "none",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.04)",
  fontSize: "14px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: "10px",
} as const

const linkStyleAtivo = {
  background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
  color: "white",
  boxShadow: "0 10px 20px rgba(37,99,235,0.22)",
} as const

const menuIcon = {
  fontSize: "16px",
  width: "20px",
  textAlign: "center" as const,
} as const

const botaoSair = {
  marginTop: "10px",
  color: "white",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  gap: "10px",
} as const

const mainArea = {
  padding: "24px",
} as const

const topBar = {
  padding: "20px 24px",
  marginBottom: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
} as const

const topBarSubtitle = {
  margin: "6px 0 0 0",
  color: "#6b7280",
  fontSize: "14px",
} as const

const topBarRight = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "8px 12px",
} as const

const onlineDot = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: "#22c55e",
} as const

const onlineText = {
  fontSize: "13px",
  color: "#374151",
  fontWeight: 600,
} as const