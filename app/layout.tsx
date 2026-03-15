"use client"

import "./globals.css"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import HeaderLoja from "./components/HeaderLoja"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f5f6fa" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <aside
            style={{
              width: "250px",
              background: "#111827",
              color: "white",
              padding: "24px",
              boxSizing: "border-box",
            }}
          >
            <h2 style={{ marginTop: 0 }}>ModaGest</h2>
            <p style={{ fontSize: "14px", color: "#cbd5e1" }}>
              Gestão para lojas
            </p>

            <nav style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "32px" }}>
              <Link href="/" style={linkStyle}>Início</Link>
              <Link href="/dashboard" style={linkStyle}>Dashboard</Link>
              <Link href="/produtos" style={linkStyle}>Produtos</Link>
              <Link href="/vendas" style={linkStyle}>Vendas</Link>
              <Link href="/pedidos" style={linkStyle}>Pedidos</Link>
              <Link href="/loja" style={linkStyle}>Minha Loja</Link>
              <Link href="/financeiro" style={linkStyle}>Financeiro</Link>
              <Link href="/historico-vendas" style={linkStyle}>Histórico de Vendas</Link>
              <Link href="/clientes" style={linkStyle}>Clientes</Link>
              <Link href="/login" style={linkStyle}>Login</Link>
            </nav>
          </aside>

          <main style={{ flex: 1, padding: "32px" }}>
            <header
              style={{
                background: "white",
                padding: "16px 24px",
                borderRadius: "12px",
                marginBottom: "24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <HeaderLoja />
            </header>

            <section
              style={{
                background: "white",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                minHeight: "300px",
              }}
            >
              {children}
            </section>
          </main>
        </div>
      </body>
    </html>
  );
}

const linkStyle = {
  color: "white",
  textDecoration: "none",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#1f2937",
};