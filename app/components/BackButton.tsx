"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

type Props = {
  href?: string
  label?: string
}

export default function BackButton({
  href = "/relatorios",
  label = "Voltar para relatórios",
}: Props) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(href)}
      style={botao}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}

const botao: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 16,
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "8px 12px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600,
}
