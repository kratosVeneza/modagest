"use client"

export default function TableSkeleton({ rows = 6 }: { rows?: number }) {
  const linhas = Array.from({ length: rows })

  return (
    <tbody>
      {linhas.map((_, i) => (
        <tr key={i}>
          <td colSpan={10}>
            <div className="skeleton-row" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}