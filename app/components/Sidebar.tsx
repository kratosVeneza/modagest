"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Boxes,
  ShoppingCart,
  DollarSign,
  Users,
  CreditCard,
  FileText,
  Store,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

type StoreData = {
  nome_loja?: string | null
}

type MenuItem = {
  label: string
  href: string
  icon: React.ReactNode
  tour?: string
}

type MenuSection = {
  title: string
  items: MenuItem[]
}

const COLLAPSE_KEY = "modagest_sidebar_collapsed"

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [nomeLoja, setNomeLoja] = useState("ModaGest")

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSE_KEY)
    if (saved === "true") {
      setCollapsed(true)
    }
  }, [])

  useEffect(() => {
    carregarLoja()
  }, [])

  async function carregarLoja() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from("stores")
      .select("nome_loja")
      .eq("user_id", user.id)
      .maybeSingle()

    const loja = (data ?? null) as StoreData | null
    if (loja?.nome_loja) {
      setNomeLoja(loja.nome_loja)
    }
  }

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSE_KEY, String(next))
  }

  async function sair() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const sections: MenuSection[] = [
    {
      title: "VISÃO GERAL",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: <LayoutDashboard size={18} strokeWidth={2} />,
          tour: "tour-menu-dashboard",
        },
        {
          label: "Lucratividade",
          href: "/relatorios/lucratividade",
          icon: <BarChart3 size={18} strokeWidth={2} />,
          tour: "tour-menu-relatorios",
        },
      ],
    },
    {
      title: "OPERAÇÃO",
      items: [
        {
          label: "Produtos",
          href: "/produtos",
          icon: <Package size={18} strokeWidth={2} />,
          tour: "tour-menu-produtos",
        },
        {
          label: "Estoque",
          href: "/estoque",
          icon: <Boxes size={18} strokeWidth={2} />,
        },
        {
          label: "Pedidos",
          href: "/pedidos",
          icon: <ShoppingCart size={18} strokeWidth={2} />,
          tour: "tour-menu-pedidos",
        },
        {
          label: "Vendas",
          href: "/vendas",
          icon: <DollarSign size={18} strokeWidth={2} />,
          tour: "tour-menu-vendas",
        },
      ],
    },
    {
      title: "GESTÃO",
      items: [
        {
          label: "Clientes",
          href: "/clientes",
          icon: <Users size={18} strokeWidth={2} />,
        },
        {
          label: "Financeiro",
          href: "/financeiro",
          icon: <CreditCard size={18} strokeWidth={2} />,
          tour: "tour-menu-financeiro",
        },
        {
          label: "Histórico de Vendas",
          href: "/historico-vendas",
          icon: <FileText size={18} strokeWidth={2} />,
        },
        {
          label: "Minha Loja",
          href: "/loja",
          icon: <Store size={18} strokeWidth={2} />,
        },
      ],
    },
  ]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside
      style={{
        width: collapsed ? 88 : 270,
        minWidth: collapsed ? 88 : 270,
        transition: "all 0.25s ease",
        background:
          "linear-gradient(180deg, #0f172a 0%, #111827 45%, #0b1220 100%)",
        color: "#fff",
        minHeight: "100vh",
        padding: "18px 14px",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        position: "sticky",
        top: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "linear-gradient(135deg, #60a5fa, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
              color: "#fff",
              flexShrink: 0,
              boxShadow: "0 10px 25px rgba(37,99,235,0.28)",
            }}
          >
            M
          </div>

          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 17,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {nomeLoja || "ModaGest"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.68)",
                }}
              >
                Gestão para lojas
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            title="Recolher menu"
            style={collapseButton}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggleSidebar}
          title="Expandir menu"
          style={{ ...collapseButton, alignSelf: "center", marginBottom: 18 }}
        >
          <ChevronRight size={16} />
        </button>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          flex: 1,
          overflowY: "auto",
          paddingRight: 2,
        }}
      >
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.42)",
                  letterSpacing: 0.8,
                  marginBottom: 10,
                  padding: "0 10px",
                }}
              >
                {section.title}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {section.items.map((item) => {
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={item.tour}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: 12,
                      minHeight: 46,
                      padding: collapsed ? "0 0" : "0 14px",
                      borderRadius: 14,
                      color: active ? "#ffffff" : "rgba(255,255,255,0.82)",
                      textDecoration: "none",
                      background: active
                        ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                        : "transparent",
                      border: active
                        ? "1px solid rgba(255,255,255,0.10)"
                        : "1px solid transparent",
                      boxShadow: active
                        ? "0 12px 28px rgba(37,99,235,0.28)"
                        : "none",
                      transition: "all 0.2s ease",
                      fontWeight: active ? 700 : 600,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: active ? 1 : 0.92,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          onClick={sair}
          style={{
            width: "100%",
            height: 46,
            border: "none",
            borderRadius: 14,
            background: "linear-gradient(135deg, #dc2626, #b91c1c)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 12,
            padding: collapsed ? "0" : "0 14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 12px 28px rgba(220,38,38,0.22)",
          }}
        >
          <LogOut size={18} strokeWidth={2} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}

const collapseButton: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
}
