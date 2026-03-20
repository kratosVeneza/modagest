"use client"

import Link from "next/link"
import { Lock } from "lucide-react"

type FeatureBlockedCardProps = {
  title?: string
  description?: string
}

export default function FeatureBlockedCard({
  title = "Recurso indisponível no seu plano",
  description = "Faça upgrade para liberar esta funcionalidade no seu SaaS.",
}: FeatureBlockedCardProps) {
  return (
    <div style={card}>
      <div style={iconWrap}>
        <Lock size={20} />
      </div>

      <h3 style={titleStyle}>{title}</h3>
      <p style={descStyle}>{description}</p>

      <div style={actions}>
        <Link href="/meu-plano" style={primaryBtn}>
          Ver meu plano
        </Link>

        <Link href="/planos" style={secondaryBtn}>
          Ver planos
        </Link>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 24,
  maxWidth: 560,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
}

const iconWrap: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: "#eff6ff",
  color: "#2563eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 14,
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: "#0f172a",
}

const descStyle: React.CSSProperties = {
  marginTop: 10,
  marginBottom: 18,
  color: "#64748b",
  lineHeight: 1.6,
}

const actions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
}

const primaryBtn: React.CSSProperties = {
  textDecoration: "none",
  background: "#2563eb",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
}

const secondaryBtn: React.CSSProperties = {
  textDecoration: "none",
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
}