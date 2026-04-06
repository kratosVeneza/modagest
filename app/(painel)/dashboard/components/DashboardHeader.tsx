"use client"

type Props = {
  title: string
  subtitle: string
}

export default function DashboardHeader({ title, subtitle }: Props) {
  return (
    <div style={wrapper}>
      <h1 style={titleStyle}>{title}</h1>
      <p style={subtitleStyle}>{subtitle}</p>
    </div>
  )
}

const wrapper: React.CSSProperties = {
  marginBottom: 20,
}

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  color: "#111827",
  marginBottom: 4,
}

const subtitleStyle: React.CSSProperties = {
  color: "#6b7280",
} 

