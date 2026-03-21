"use client"

import Link from "next/link"
import Image from "next/image"
import {
  BarChart3,
  Boxes,
  ShoppingCart,
  Wallet,
  Users,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"

const funcionalidades = [
  {
    icon: <Boxes size={20} />,
    titulo: "Produtos e estoque",
    texto: "Cadastre produtos, controle estoque mínimo e acompanhe itens em falta.",
  },
  {
    icon: <ShoppingCart size={20} />,
    titulo: "Pedidos e reposição",
    texto: "Registre encomendas, acompanhe recebimento e evite compras duplicadas.",
  },
  {
    icon: <Wallet size={20} />,
    titulo: "Vendas e recebimentos",
    texto: "Venda com pagamento parcial, múltiplas formas de recebimento e saldo em aberto.",
  },
  {
    icon: <BarChart3 size={20} />,
    titulo: "Dashboard e relatórios",
    texto: "Veja lucratividade, recebimentos, despesas e desempenho da operação.",
  },
  {
    icon: <Users size={20} />,
    titulo: "Clientes",
    texto: "Cadastre clientes e acompanhe histórico de vendas e recebimentos.",
  },
  {
    icon: <ShieldCheck size={20} />,
    titulo: "Gestão profissional",
    texto: "Tenha mais controle financeiro e visão clara do seu negócio em um só lugar.",
  },
]

const planos = [
  {
    nome: "Essencial",
    preco: "R$ 39/mês",
    destaque: false,
    itens: ["Produtos", "Estoque", "Pedidos", "Clientes"],
  },
  {
    nome: "Profissional",
    preco: "R$ 89/mês",
    destaque: true,
    itens: ["Tudo do Essencial", "Financeiro", "Dashboard", "Relatórios"],
  },
  {
    nome: "Premium",
    preco: "R$ 179/mês",
    destaque: false,
    itens: ["Tudo do Profissional", "Recursos avançados futuros", "Suporte prioritário"],
  },
]

export default function HomePage() {
  return (
    <div style={pagina}>
      <header style={header}>
        <div style={logoWrap}>
          <Image
            src="/images/logo.png"
            alt="Logo Modagest"
            width={180}
            height={52}
            style={{ height: "auto", width: "auto", maxWidth: "180px" }}
            priority
          />
        </div>

        <nav style={nav}>
          <Link href="/planos" style={navLink}>
            Planos
          </Link>
          <Link href="/login" style={navLink}>
            Entrar
          </Link>
          <Link href="/login" style={ctaHeader}>
            Teste grátis
          </Link>
        </nav>
      </header>

      <section style={hero}>
        <div style={heroTexto}>
          <div style={badge}>7 dias grátis para testar</div>

          <h1 style={heroTitulo}>
            Controle vendas, estoque, financeiro e relatórios em um só lugar.
          </h1>

          <p style={heroDesc}>
            O Modagest foi criado para ajudar pequenas e médias lojas a organizar
            a operação, ganhar clareza nos números e vender com mais controle.
          </p>

          <div style={heroAcoes}>
            <Link href="/login" style={botaoPrimario}>
              Começar teste grátis
            </Link>

            <Link href="/planos" style={botaoSecundario}>
              Ver planos
            </Link>
          </div>

          <div style={heroLista}>
            <span>• Sem cartão para começar</span>
            <span>• 7 dias grátis</span>
            <span>• Painel completo</span>
          </div>
        </div>

        <div style={heroVisual}>
          <div style={heroBannerBox}>
            <Image
              src="/images/banner1.png"
              alt="Painel do Modagest"
              fill
              style={heroBannerImage}
              priority
            />
          </div>
        </div>
      </section>

      <section style={secao}>
        <h2 style={secaoTitulo}>Tudo que sua loja precisa para operar melhor</h2>
        <p style={secaoSub}>
          Organize a operação e acompanhe o financeiro sem planilhas confusas.
        </p>

        <div style={gridFunc}>
          {funcionalidades.map((item) => (
            <div key={item.titulo} style={funcCard}>
              <div style={funcIcon}>{item.icon}</div>
              <h3 style={funcTitulo}>{item.titulo}</h3>
              <p style={funcTexto}>{item.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={secao}>
        <h2 style={secaoTitulo}>Planos simples para começar</h2>
        <p style={secaoSub}>Escolha o plano ideal e teste grátis por 7 dias.</p>

        <div style={gridPlanos}>
          {planos.map((plano) => (
            <div
              key={plano.nome}
              style={{
                ...planoCard,
                ...(plano.destaque ? planoCardDestaque : {}),
              }}
            >
              {plano.destaque && <div style={tagDestaque}>Mais escolhido</div>}

              <h3 style={planoNome}>{plano.nome}</h3>
              <div style={planoPreco}>{plano.preco}</div>

              <div style={planoLista}>
                {plano.itens.map((item) => (
                  <div key={item} style={planoItem}>
                    <CheckCircle2 size={16} />
                    {item}
                  </div>
                ))}
              </div>

              <Link href="/login" style={botaoPlano}>
                Testar agora
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section style={secao}>
  <div style={vitrineTopo}>
    <div>
      <h2 style={secaoTitulo}>Veja o sistema em ação</h2>
      <p style={secaoSub}>
        Dashboards, relatórios, vendas, financeiro e organização da operação em uma interface moderna.
      </p>
    </div>

    <div style={miniBadge}>
      Gestão visual e prática
    </div>
  </div>

  <div style={gridBanners}>
    <div style={{ ...bannerCard, ...bannerGrande }}>
      <Image
        src="/images/banner2.png"
        alt="Painel de gestão Modagest"
        fill
        style={bannerImage}
      />
    </div>

    <div style={bannerColuna}>
      <div style={bannerCard}>
        <Image
          src="/images/banner3.png"
          alt="Controle financeiro e relatórios"
          fill
          style={bannerImage}
        />
      </div>

      <div style={bannerCard}>
        <Image
          src="/images/banner4.png"
          alt="Controle de vendas e operação"
          fill
          style={bannerImage}
        />
      </div>
    </div>
  </div>
</section>

<section style={secao}>
  <div style={beneficiosBox}>
    <div style={beneficioCard}>
      <h3 style={beneficioNumero}>+ organização</h3>
      <p style={beneficioTexto}>
        Centralize produtos, estoque, vendas, clientes e relatórios em um só sistema.
      </p>
    </div>

    <div style={beneficioCard}>
      <h3 style={beneficioNumero}>+ controle</h3>
      <p style={beneficioTexto}>
        Acompanhe entradas, saídas, recebimentos, pendências e indicadores do negócio.
      </p>
    </div>

    <div style={beneficioCard}>
      <h3 style={beneficioNumero}>+ clareza</h3>
      <p style={beneficioTexto}>
        Tome decisões melhores com dashboard, relatórios e visão do que está funcionando.
      </p>
    </div>
  </div>
</section>


      <section style={ctaFinal}>
        <h2 style={{ margin: 0, fontSize: 34 }}>Pronto para testar?</h2>
        <p style={{ margin: "10px 0 0 0", color: "rgba(255,255,255,0.85)" }}>
          Crie sua conta e experimente o Modagest por 7 dias.
        </p>

        <div style={{ marginTop: 20 }}>
          <Link href="/login" style={ctaFinalBtn}>
            Criar conta grátis
          </Link>
        </div>
      </section>
    </div>
  )
}

const pagina: React.CSSProperties = {
  background: "#f8fafc",
  minHeight: "100vh",
}

const header: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "22px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
}

const logoWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
}

const nav: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
}

const navLink: React.CSSProperties = {
  textDecoration: "none",
  color: "#0f172a",
  fontWeight: 700,
}

const ctaHeader: React.CSSProperties = {
  textDecoration: "none",
  background: "#2563eb",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 800,
}

const hero: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "40px 24px 30px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 28,
  alignItems: "center",
}

const heroTexto: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
}

const badge: React.CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#2563eb",
  fontWeight: 800,
  fontSize: 13,
  marginBottom: 16,
}

const heroTitulo: React.CSSProperties = {
  fontSize: 52,
  lineHeight: 1.08,
  fontWeight: 900,
  margin: 0,
  color: "#0f172a",
}

const heroDesc: React.CSSProperties = {
  marginTop: 18,
  fontSize: 18,
  lineHeight: 1.7,
  color: "#475569",
  maxWidth: 680,
}

const heroAcoes: React.CSSProperties = {
  display: "flex",
  gap: 14,
  marginTop: 24,
  flexWrap: "wrap",
}

const botaoPrimario: React.CSSProperties = {
  textDecoration: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 800,
}

const botaoSecundario: React.CSSProperties = {
  textDecoration: "none",
  background: "#fff",
  color: "#0f172a",
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 800,
  border: "1px solid #e5e7eb",
}

const heroLista: React.CSSProperties = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  marginTop: 18,
  color: "#64748b",
  fontSize: 14,
}

const heroVisual: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const heroBannerBox: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 560,
  aspectRatio: "16 / 10",
  borderRadius: 24,
  overflow: "hidden",
  background: "#ffffff",
  boxShadow: "0 25px 60px rgba(15,23,42,0.12)",
}

const heroBannerImage: React.CSSProperties = {
  objectFit: "contain",
}

const secao: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "34px 24px",
}

const secaoTitulo: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  color: "#0f172a",
  margin: 0,
}

const secaoSub: React.CSSProperties = {
  marginTop: 10,
  color: "#64748b",
  fontSize: 16,
}

const gridFunc: React.CSSProperties = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
}

const funcCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 12px 30px rgba(15,23,42,0.04)",
}

const funcIcon: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#eff6ff",
  color: "#2563eb",
  marginBottom: 12,
}

const funcTitulo: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  color: "#0f172a",
}

const funcTexto: React.CSSProperties = {
  marginTop: 10,
  color: "#64748b",
  lineHeight: 1.6,
}

const gridPlanos: React.CSSProperties = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
}

const planoCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 24,
  padding: 24,
  position: "relative",
}

const planoCardDestaque: React.CSSProperties = {
  border: "1px solid #93c5fd",
  boxShadow: "0 18px 40px rgba(37,99,235,0.10)",
}

const tagDestaque: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  background: "#eff6ff",
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 800,
  padding: "6px 10px",
  borderRadius: 999,
}

const planoNome: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 900,
  color: "#0f172a",
}

const planoPreco: React.CSSProperties = {
  marginTop: 10,
  fontSize: 32,
  fontWeight: 900,
  color: "#111827",
}

const planoLista: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 18,
  marginBottom: 22,
}

const planoItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#334155",
  fontSize: 14,
}

const botaoPlano: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  width: "100%",
  textAlign: "center",
  padding: "14px 16px",
  borderRadius: 14,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
}

const ctaFinal: React.CSSProperties = {
  maxWidth: 1200,
  margin: "20px auto 0",
  padding: "40px 24px 60px",
  textAlign: "center",
  background: "linear-gradient(135deg, #0f172a, #1e293b)",
  borderRadius: 28,
  color: "#fff",
}

const ctaFinalBtn: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  background: "#fff",
  color: "#0f172a",
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 800,
}
const vitrineTopo: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 20,
}

const miniBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#2563eb",
  fontWeight: 800,
  fontSize: 13,
}

const gridBanners: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: 18,
  alignItems: "stretch",
}

const bannerColuna: React.CSSProperties = {
  display: "grid",
  gap: 18,
}

const bannerCard: React.CSSProperties = {
  position: "relative",
  width: "100%",
  minHeight: 240,
  borderRadius: 24,
  overflow: "hidden",
  background: "#ffffff",
  boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
}

const bannerGrande: React.CSSProperties = {
  minHeight: 500,
}

const bannerImage: React.CSSProperties = {
  objectFit: "contain",
}

const beneficiosBox: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
}

const beneficioCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 24,
  boxShadow: "0 12px 30px rgba(15,23,42,0.04)",
}

const beneficioNumero: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 900,
  color: "#2563eb",
}

const beneficioTexto: React.CSSProperties = {
  marginTop: 12,
  color: "#64748b",
  lineHeight: 1.7,
  fontSize: 15,
}

