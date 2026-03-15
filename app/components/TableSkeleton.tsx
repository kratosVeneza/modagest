"use client"

export default function TableSkeleton({
  rows = 6,
  cols = 7,
}: {
  rows?: number
  cols?: number
}) {
  const linhas = Array.from({ length: rows })
  const colunas = Array.from({ length: cols })

  return (
    <>
      {linhas.map((_, i) => (
        <tr key={i}>
          {colunas.map((_, j) => (
            <td key={j} style={{ padding: "12px" }}>
              <div className="skeleton-row" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}