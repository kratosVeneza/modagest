import Link from "next/link"

const atalhos = [
  {
    titulo: "Dashboard",
    descricao: "Acompanhe faturamento, pedidos, estoque e vendas recentes.",
    href: "/dashboard",
    icone: "📊",
  },
  {
    titulo: "Produtos",
    descricao: "Cadastre produtos, acompanhe estoque e edite informações.",
    href: "/produtos",
    icone: "📦",
  },
  {
    titulo: "Vendas",
    descricao: "Registre vendas com cliente, produto e resumo automático.",
    href: "/vendas",
    icone: "💰",
  },
  {
    titulo: "Pedidos",
    descricao: "Controle reposição, fornecedores e entrada no estoque.",
    href: "/pedidos",
    icone: "🛒",
  },
  {
    titulo: "Clientes",
    descricao: "Cadastre clientes e vincule cada venda ao comprador.",
    href: "/clientes",
    icone: "👥",
  },
  {
    titulo: "Financeiro",
    descricao: "Veja faturamento, ticket médio e exporte relatórios.",
    href: "/financeiro",
    icone: "💳",
  },
]

export default function Home() {
  return (
    <div>
      <section style={heroBox}>
        <div>
          <span style={badge}>Sistema online</span>
          <h1 style={heroTitle}>Bem-vindo ao ModaGest</h1>
          <p style={heroSubtitle}>
            Um painel simples e profissional para controlar produtos, vendas,
            pedidos, clientes e financeiro da sua loja.
          </p>
        </div>

        <div style={heroActions}>
          <Link href="/dashboard" className="btn btn-primary">
            Ir para o Dashboard
          </Link>

          <Link href="/vendas" className="btn btn-secondary">
            Registrar venda
          </Link>
        </div>
      </section>

      <section className="grid-3" style={{ marginTop: "24px" }}>
        <div className="section-card">
          <h3 style={cardTitle}>Gestão de estoque</h3>
          <p className="info-muted">
            Cadastre produtos, acompanhe níveis de estoque e receba reposições
            pelos pedidos.
          </p>
        </div>

        <div className="section-card">
          <h3 style={cardTitle}>Controle comercial</h3>
          <p className="info-muted">
            Registre vendas, associe clientes e acompanhe o histórico completo
            da operação.
          </p>
        </div>

        <div className="section-card">
          <h3 style={cardTitle}>Visão financeira</h3>
          <p className="info-muted">
            Veja faturamento, ticket médio, últimas vendas e exporte relatórios
            em CSV.
          </p>
        </div>
      </section>

      <section style={{ marginTop: "28px" }}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>Atalhos rápidos</h2>
            <p className="info-muted" style={{ margin: 0 }}>
              Acesse rapidamente os módulos principais do sistema.
            </p>
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: "16px" }}>
          {atalhos.map((atalho) => (
            <Link key={atalho.href} href={atalho.href} style={atalhoCard}>
              <div style={atalhoIcone}>{atalho.icone}</div>

              <div>
                <h3 style={atalhoTitulo}>{atalho.titulo}</h3>
                <p style={atalhoDescricao}>{atalho.descricao}</p>
              </div>

              <span style={atalhoAcessar}>Acessar →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

const heroBox = {
  background: "linear-gradient(135deg, #111827 0%, #1d4ed8 100%)",
  color: "white",
  borderRadius: "20px",
  padding: "28px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
}

const badge = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.14)",
  fontSize: "12px",
  fontWeight: 700,
  marginBottom: "14px",
}

const heroTitle = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.1,
}

const heroSubtitle = {
  marginTop: "12px",
  maxWidth: "640px",
  color: "rgba(255,255,255,0.88)",
  fontSize: "15px",
  lineHeight: 1.6,
}

const heroActions = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap" as const,
}

const cardTitle = {
  marginTop: 0,
  marginBottom: "10px",
}

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap" as const,
}

const sectionTitle = {
  margin: 0,
  fontSize: "24px",
}

const atalhoCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  boxShadow: "0 6px 24px rgba(15, 23, 42, 0.06)",
  padding: "20px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "14px",
}

const atalhoIcone = {
  width: "52px",
  height: "52px",
  borderRadius: "14px",
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
}

const atalhoTitulo = {
  margin: 0,
  fontSize: "18px",
  color: "#111827",
}

const atalhoDescricao = {
  margin: "8px 0 0 0",
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: 1.5,
}

const atalhoAcessar = {
  marginTop: "auto",
  fontSize: "14px",
  fontWeight: 700,
  color: "#1d4ed8",
}