"use client"

type Props = {
  value: string
  type: "up" | "down" | "neutral"
}

export default function TrendBadge({ value, type }: Props) {
  return (
    <span style={badge(type)}>
      {value}
    </span>
  )
}

const badge = (type: string): React.CSSProperties => ({
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background:
    type === "up"
      ? "#dcfce7"
      : type === "down"
      ? "#fee2e2"
      : "#f3f4f6",
  color:
    type === "up"
      ? "#166534"
      : type === "down"
      ? "#991b1b"
      : "#374151",
})
