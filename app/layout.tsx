"use client"

import "./globals.css"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import HeaderLoja from "./components/HeaderLoja"
import UserProfile from "./components/UserProfile"
import ThemeToggle from "./components/ThemeToggle"
import PageTransition from "./components/PageTransition"
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Wallet,
  Users,
  ClipboardList,
  Store,
  LogOut,
} from "lucide-react"

const menuGroups = [
  {
    title: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operação",
    items: [
      { href: "/produtos", label: "Produtos", icon: Package },
      { href: "/estoque", label: "Estoque", icon: Boxes },
      { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
      { href: "/vendas", label: "Vendas", icon: Wallet },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/financeiro", label: "Financeiro", icon: ClipboardList },
      { href: "/historico-vendas", label: "Histórico de Vendas", icon: ClipboardList },
      { href: "/loja", label: "Minha Loja", icon: Store },
    ],
  },
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
        <div className="app-shell">
          <aside className="sidebar">
            <div className="logo-box">
              <div className="logo-badge">M</div>
              <div>
                <h2 className="logo-title">ModaGest</h2>
                <p className="logo-subtitle">Gestão para lojas</p>
              </div>
            </div>

            <nav className="sidebar-nav">
              {menuGroups.map((group) => (
                <div key={group.title} style={{ marginBottom: "18px" }}>
                  <p
                    style={{
                      margin: "0 0 10px 6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "#94a3b8",
                    }}
                  >
                    {group.title}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {group.items.map((item) => {
                      const ativo = pathname === item.href
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`menu-link ${ativo ? "menu-link-active" : ""}`}
                        >
                          <span className="menu-icon">
                            <Icon size={18} strokeWidth={2.2} />
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}

              <button onClick={sair} className="menu-link-danger">
                <span className="menu-icon">
                  <LogOut size={18} strokeWidth={2.2} />
                </span>
                <span>Sair</span>
              </button>
            </nav>
          </aside>

          <main className="main-area">
            <header className="soft-card top-bar">
              <div className="top-bar-content">
                <div className="top-bar-left">
                  <HeaderLoja />
                  <p className="top-bar-subtitle">
                    Painel de gestão da sua operação
                  </p>
                </div>

                <div className="top-bar-actions">
                  <ThemeToggle />
                  <UserProfile />
                </div>
              </div>
            </header>

            <section>
              <PageTransition>{children}</PageTransition>
            </section>
          </main>
        </div>
      </body>
    </html>
  )
}