"use client"

import Link from "next/link"

const planos = [
  {
    nome: "Essencial",
    preco: "R$ 39/mês",
    descricao: "Para lojas pequenas começarem com organização.",
    recursos: [
      "Produtos e estoque",
      "Vendas",
      "Clientes",
      "Visão básica da operação",
    ],
    destaque: false,
  },
  {
    nome: "Profissional",
    preco: "R$ 89/mês",
    descricao: "Plano ideal para crescer com controle financeiro e relatórios.",
    recursos: [
      "Tudo do Essencial",
      "Financeiro completo",
      "Dashboard avançado",
      "Relatórios",
    ],
    destaque: true,
  },
  {
    nome: "Premium",
    preco: "R$ 179/mês",
    descricao: "Para operações mais robustas e recursos futuros avançados.",
    recursos: [
      "Tudo do Profissional",
      "Alertas inteligentes",
      "Recursos premium futuros",
      "Suporte prioritário",
    ],
    destaque: false,
  },
]

export default function PlanosPage() {
  return (
    <div style={pagina}>
      <div style={header}>
        <h1 style={titulo}>Escolha o plano ideal para sua operação</h1>
        <p style={subtitulo}>
          Comece com trial grátis e evolua conforme sua loja cresce.
        </p>
      </div>

      <div style={grid}>
        {planos.map((plano) => (
          <div
            key={plano.nome}
            style={{
              ...card,
              ...(plano.destaque ? cardDestaque : {}),
            }}
          >
            {plano.destaque && <div style={badge}>Mais escolhido</div>}

            <h2 style={nomePlano}>{plano.nome}</h2>
            <p style={preco}>{plano.preco}</p>
            <p style={descricao}>{plano.descricao}</p>

            <div style={lista}>
              {plano.recursos.map((item) => (
                <div key={item} style={itemLista}>
                  • {item}
                </div>
              ))}
            </div>

            <button style={botao}>Escolher plano</button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/dashboard" style={{ color: "#2563eb", fontWeight: 700 }}>
          Voltar ao sistema
        </Link>
      </div>
    </div>
  )
}

const pagina: React.CSSProperties = {
  padding: "32px",
}

const header: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "28px",
}

const titulo: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  margin: 0,
}

const subtitulo: React.CSSProperties = {
  color: "#64748b",
  marginTop: 10,
  fontSize: 16,
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 24,
  padding: 24,
  position: "relative",
  boxShadow: "0 12px 35px rgba(15,23,42,0.05)",
}

const cardDestaque: React.CSSProperties = {
  border: "1px solid #93c5fd",
  boxShadow: "0 14px 40px rgba(37,99,235,0.12)",
}

const badge: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  fontSize: 12,
  fontWeight: 800,
  background: "#eff6ff",
  color: "#2563eb",
  padding: "6px 10px",
  borderRadius: 999,
}

const nomePlano: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: "0 0 8px 0",
}

const preco: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: "#111827",
  margin: "0 0 8px 0",
}

const descricao: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.6,
  marginBottom: 16,
}

const lista: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 22,
}

const itemLista: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 14,
}

const botao: React.CSSProperties = {
  width: "100%",
  height: 46,
  border: "none",
  borderRadius: 14,
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
}