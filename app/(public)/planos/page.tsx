"use client"

import Link from "next/link"
import { CheckCircle2, ArrowLeft, BadgeCheck, Crown, Rocket } from "lucide-react"

const planos = [
  {
    nome: "Essencial",
    preco: "R$ 39/mês",
    descricao: "Ideal para lojas pequenas que querem sair do caderno e começar a organizar a operação.",
    destaque: false,
    icone: <BadgeCheck size={22} />,
    itens: [
      "Cadastro de produtos",
      "Controle de estoque",
      "Cadastro de clientes",
      "Registro de pedidos",
      "Registro de vendas",
    ],
  },
  {
    nome: "Profissional",
    preco: "R$ 89/mês",
    descricao: "Plano mais indicado para quem quer controle financeiro e visão real do negócio.",
    destaque: true,
    icone: <Rocket size={22} />,
    itens: [
      "Tudo do Essencial",
      "Financeiro completo",
      "Recebimentos parciais",
      "Dashboard avançado",
      "Relatórios gerenciais",
      "Lucratividade por produto",
    ],
  },
  {
    nome: "Premium",
    preco: "R$ 179/mês",
    descricao: "Para operações mais robustas e futuras funções premium do sistema.",
    destaque: false,
    icone: <Crown size={22} />,
    itens: [
      "Tudo do Profissional",
      "Recursos premium futuros",
      "Prioridade em suporte",
      "Melhor escalabilidade",
      "Base para multiusuários",
    ],
  },
]

export default function PlanosPage() {
  return (
    <div style={pagina}>
      <header style={header}>
        <div style={topoLinks}>
          <Link href="/" style={linkVoltar}>
            <ArrowLeft size={16} />
            Voltar para a página inicial
          </Link>

          <Link href="/login" style={linkEntrar}>
            Entrar
          </Link>
        </div>

        <div style={headerConteudo}>
          <div style={badge}>7 dias grátis para testar</div>
          <h1 style={titulo}>Escolha o plano ideal para sua loja</h1>
          <p style={subtitulo}>
            Comece hoje mesmo com teste grátis, conheça o sistema por dentro e escolha
            o plano que combina com o momento do seu negócio.
          </p>
        </div>
      </header>

      <section style={secaoPlanos}>
        <div style={gridPlanos}>
          {planos.map((plano) => (
            <div
              key={plano.nome}
              style={{
                ...cardPlano,
                ...(plano.destaque ? cardPlanoDestaque : {}),
              }}
            >
              {plano.destaque && <div style={tagDestaque}>Mais escolhido</div>}

              <div style={iconePlano}>{plano.icone}</div>
              <h2 style={nomePlano}>{plano.nome}</h2>
              <div style={precoPlano}>{plano.preco}</div>
              <p style={descricaoPlano}>{plano.descricao}</p>

              <div style={listaRecursos}>
                {plano.itens.map((item) => (
                  <div key={item} style={itemRecurso}>
                    <CheckCircle2 size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                style={{
                  ...botaoPlano,
                  ...(plano.destaque ? botaoPlanoDestaque : {}),
                }}
              >
                Escolher plano
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section style={secaoFaq}>
        <div style={faqBox}>
          <h3 style={faqTitulo}>Como funciona o teste grátis?</h3>
          <p style={faqTexto}>
            Você cria sua conta, entra no sistema e pode testar o ModaGest por 7 dias.
            Assim você conhece a operação, o dashboard, o financeiro e os relatórios
            antes de assinar.
          </p>
        </div>

        <div style={faqBox}>
          <h3 style={faqTitulo}>Preciso de cartão para começar?</h3>
          <p style={faqTexto}>
            Não. A ideia é deixar a entrada simples, para o usuário conhecer a solução
            e ver valor antes da assinatura.
          </p>
        </div>

        <div style={faqBox}>
          <h3 style={faqTitulo}>Posso mudar de plano depois?</h3>
          <p style={faqTexto}>
            Sim. A estrutura do sistema já está sendo preparada para upgrade e mudança
            de plano conforme a loja crescer.
          </p>
        </div>
      </section>

      <section style={ctaFinal}>
        <h2 style={{ margin: 0, fontSize: 34 }}>Pronto para começar?</h2>
        <p style={ctaTexto}>
          Crie sua conta, teste por 7 dias e veja como o ModaGest pode organizar sua loja.
        </p>

        <div style={ctaAcoes}>
          <Link href="/login" style={botaoCtaPrincipal}>
            Criar conta grátis
          </Link>

          <Link href="/" style={botaoCtaSecundario}>
            Voltar para a landing page
          </Link>
        </div>
      </section>
    </div>
  )
}

const pagina: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f8fafc",
  paddingBottom: 50,
}

const header: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "28px 24px 12px",
}

const topoLinks: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 28,
}

const linkVoltar: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
  color: "#2563eb",
  fontWeight: 700,
  fontSize: 14,
}

const linkEntrar: React.CSSProperties = {
  textDecoration: "none",
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 14,
}

const headerConteudo: React.CSSProperties = {
  textAlign: "center",
  maxWidth: 820,
  margin: "0 auto",
}

const badge: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#2563eb",
  fontWeight: 800,
  fontSize: 13,
  marginBottom: 16,
}

const titulo: React.CSSProperties = {
  margin: 0,
  fontSize: 46,
  fontWeight: 900,
  lineHeight: 1.1,
  color: "#0f172a",
}

const subtitulo: React.CSSProperties = {
  marginTop: 18,
  fontSize: 18,
  lineHeight: 1.7,
  color: "#64748b",
}

const secaoPlanos: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "28px 24px",
}

const gridPlanos: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 20,
}

const cardPlano: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 28,
  padding: 26,
  position: "relative",
  boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  display: "flex",
  flexDirection: "column",
}

const cardPlanoDestaque: React.CSSProperties = {
  border: "1px solid #93c5fd",
  boxShadow: "0 20px 50px rgba(37,99,235,0.12)",
  transform: "translateY(-4px)",
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

const iconePlano: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#eff6ff",
  color: "#2563eb",
  marginBottom: 14,
}

const nomePlano: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: 900,
  color: "#0f172a",
}

const precoPlano: React.CSSProperties = {
  marginTop: 10,
  fontSize: 34,
  fontWeight: 900,
  color: "#111827",
}

const descricaoPlano: React.CSSProperties = {
  marginTop: 10,
  color: "#64748b",
  lineHeight: 1.7,
  fontSize: 15,
  minHeight: 78,
}

const listaRecursos: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 18,
  marginBottom: 26,
  flex: 1,
}

const itemRecurso: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#334155",
  fontSize: 14,
}

const botaoPlano: React.CSSProperties = {
  display: "inline-block",
  width: "100%",
  textAlign: "center",
  textDecoration: "none",
  padding: "14px 16px",
  borderRadius: 14,
  background: "#0f172a",
  color: "#fff",
  fontWeight: 800,
}

const botaoPlanoDestaque: React.CSSProperties = {
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
}

const secaoFaq: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "8px 24px 28px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 18,
}

const faqBox: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 22,
}

const faqTitulo: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  color: "#0f172a",
}

const faqTexto: React.CSSProperties = {
  marginTop: 10,
  color: "#64748b",
  lineHeight: 1.7,
  fontSize: 15,
}

const ctaFinal: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "34px 24px 0",
  textAlign: "center",
}

const ctaTexto: React.CSSProperties = {
  marginTop: 12,
  color: "#64748b",
  fontSize: 17,
}

const ctaAcoes: React.CSSProperties = {
  marginTop: 22,
  display: "flex",
  justifyContent: "center",
  gap: 14,
  flexWrap: "wrap",
}

const botaoCtaPrincipal: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 800,
}

const botaoCtaSecundario: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 800,
}