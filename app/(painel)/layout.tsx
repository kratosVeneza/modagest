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
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    const salvo = localStorage.getItem("modagest-menu-fechado")
    setMenuFechado(salvo === "true")
  }, [])

  // 🔐 PROTEÇÃO DE ROTA
  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error || !data.session) {
        await supabase.auth.signOut()
        router.push("/login")
        return
      }

      setLoadingAuth(false)
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push("/login")
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  // 🧠 GARANTE PERFIL
  useEffect(() => {
    async function garantirPerfil() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return

      await ensureProfile({ trialDays: 7 })
    }

    garantirPerfil()
  }, [])

  function alternarMenu() {
    const novoValor = !menuFechado
    setMenuFechado(novoValor)
    localStorage.setItem("modagest-menu-fechado", String(novoValor))
  }

  async function sair() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // 🔥 EVITA PISCAR TELA
  if (loadingAuth) {
    return <div style={{ padding: 40 }}>Carregando...</div>
  }

  return (
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

          <button onClick={alternarMenu} className="sidebar-toggle-btn">
            {menuFechado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuGroups.map((group) => (
            <div key={group.title} className="menu-group">
              {!menuFechado && <p className="menu-group-title">{group.title}</p>}

              {group.items.map((item) => {
                const Icon = item.icon
                const ativo =
                  pathname === item.href || pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`menu-link ${ativo ? "menu-link-active" : ""}`}
                  >
                    <Icon size={18} />
                    {!menuFechado && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}

          <button onClick={sair} className="menu-link-danger">
            <LogOut size={18} />
            {!menuFechado && <span>Sair</span>}
          </button>
        </nav>
      </aside>

      <main className="main-area">
        <header className="soft-card top-bar">
          <HeaderLoja />
          <div style={{ display: "flex", gap: 10 }}>
            <ThemeToggle />
            <UserProfile />
          </div>
        </header>

        <PageTransition>{children}</PageTransition>
      </main>

      <OnboardingTour />
    </div>
  )
}