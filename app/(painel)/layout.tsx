"use client"

import "../globals.css"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import HeaderLoja from "../components/HeaderLoja"
import UserProfile from "../components/UserProfile"
import ThemeToggle from "../components/ThemeToggle"
import PageTransition from "../components/PageTransition"
import OnboardingTour from "../components/OnboardingTour"
import { ensureProfile } from "@/lib/ensureProfile"
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
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
} from "lucide-react"

const menuGroups = [
  {
    title: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
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
      { href: "/meu-plano", label: "Meu Plano", icon: Store },
      { href: "/meu-plano", label: "Meu Plano", icon: Store },
    ],
  },
]

export default function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuFechado, setMenuFechado] = useState(false)
  const [carregandoAuth, setCarregandoAuth] = useState(true)

  useEffect(() => {
    const salvo = localStorage.getItem("modagest-menu-fechado")
    setMenuFechado(salvo === "true")
  }, [])

  useEffect(() => {
    let mounted = true

    async function validarSessao() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (error || !session) {
        await supabase.auth.signOut()
        router.replace("/login")
        return
      }

      const planoStorage =
  typeof window !== "undefined"
    ? localStorage.getItem("modagest_selected_plan") || undefined
    : undefined

await ensureProfile({
  trialDays: 7,
  selectedPlan: planoStorage,
})

if (typeof window !== "undefined" && planoStorage) {
  localStorage.removeItem("modagest_selected_plan")
}
      setCarregandoAuth(false)
    }

    validarSessao()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (!session) {
        router.replace("/login")
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  async function sair() {
    await supabase.auth.signOut()
    router.replace("/")
  }

  function alternarMenu() {
    const novoValor = !menuFechado
    setMenuFechado(novoValor)
    localStorage.setItem("modagest-menu-fechado", String(novoValor))
  }

  if (carregandoAuth) {
    return (
      <html lang="pt-BR">
        <body style={{ padding: 32 }}>Carregando...</body>
      </html>
    )
  }

  return (
    <html lang="pt-BR">
      <body>
        <div className={`app-shell ${menuFechado ? "menu-collapsed" : ""}`}>
          <aside className={`sidebar ${menuFechado ? "sidebar-collapsed" : ""}`}>
            <div className="logo-box">
              <div className="logo-badge">M</div>

              {!menuFechado && (
                <div>
                  <h2 className="logo-title">ModaGest</h2>
                  <p className="logo-subtitle">Gestão para lojas</p>
                </div>
              )}

              <button
                type="button"
                onClick={alternarMenu}
                className="sidebar-toggle-btn"
                title={menuFechado ? "Abrir menu" : "Fechar menu"}
              >
                {menuFechado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>

            <nav className="sidebar-nav">
              {menuGroups.map((group) => (
                <div key={group.title} className="menu-group">
                  {!menuFechado && <p className="menu-group-title">{group.title}</p>}

                  <div className="menu-group-items">
                    {group.items.map((item) => {
                      const ativo =
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`menu-link ${ativo ? "menu-link-active" : ""} ${
                            menuFechado ? "menu-link-collapsed" : ""
                          }`}
                          title={menuFechado ? item.label : ""}
                        >
                          <span className="menu-icon">
                            <Icon size={18} strokeWidth={2.2} />
                          </span>
                          {!menuFechado && <span>{item.label}</span>}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={sair}
                className={`menu-link-danger ${menuFechado ? "menu-link-collapsed" : ""}`}
                title={menuFechado ? "Sair" : ""}
              >
                <span className="menu-icon">
                  <LogOut size={18} strokeWidth={2.2} />
                </span>
                {!menuFechado && <span>Sair</span>}
              </button>
            </nav>
          </aside>

          <main className="main-area">
            <header className="soft-card top-bar">
              <div className="top-bar-content">
                <div className="top-bar-left">
                  <HeaderLoja />
                  <p className="top-bar-subtitle">Painel de gestão da sua operação</p>
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

          <OnboardingTour />
        </div>
      </body>
    </html>
  )
}
