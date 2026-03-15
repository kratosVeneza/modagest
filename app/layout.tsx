"use client"

import "./globals.css"
import PageTransition from "./components/PageTransition"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import HeaderLoja from "./components/HeaderLoja"
import UserProfile from "./components/UserProfile"
import ThemeToggle from "./components/ThemeToggle"
import {
  House,
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  ReceiptText,
  Users,
  Wallet,
  Store,
  LogIn,
  LogOut,
} from "lucide-react"

const menuItems = [
  { href: "/", label: "Início", icon: House },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/vendas", label: "Vendas", icon: Wallet },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/historico-vendas", label: "Histórico de Vendas", icon: ReceiptText },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: ClipboardList },
  { href: "/loja", label: "Minha Loja", icon: Store },
  { href: "/login", label: "Login", icon: LogIn },
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
              {menuItems.map((item) => {
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