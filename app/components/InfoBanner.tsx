"use client"

type HelpBannerProps = {
  title: string
  text: string
}

export default function HelpBanner({ title, text }: HelpBannerProps) {
  return (
    <div
      style={{
        marginTop: 16,
        marginBottom: 20,
        padding: "14px 16px",
        borderRadius: 14,
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        color: "#1e3a8a",
      }}
    >
      <strong style={{ display: "block", marginBottom: 6 }}>{title}</strong>
      <span style={{ fontSize: 14, lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}