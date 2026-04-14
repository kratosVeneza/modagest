"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Option = {
  value: string
  label: string
}

type SearchableSelectProps = {
  label: string
  placeholder: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  help?: React.ReactNode
}

export default function SearchableSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  error,
  help,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selectedLabel = useMemo(() => {
    return options.find((item) => item.value === value)?.label || ""
  }, [options, value])

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options

    return options.filter((item) =>
      item.label.toLowerCase().includes(term)
    )
  }, [options, query])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery("")
    }
  }, [open])

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "6px",
        }}
      >
        {label}
        {help}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          minHeight: 44,
          borderRadius: 12,
          border: error ? "1px solid #ef4444" : "1px solid #cbd5e1",
          background: disabled ? "#f8fafc" : "#fff",
          color: value ? "#111827" : "#6b7280",
          padding: "10px 12px",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {selectedLabel || placeholder}
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
            <input
              autoFocus
              placeholder="Pesquisar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value)
                    setOpen(false)
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    background: item.value === value ? "#f8fafc" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              ))
            ) : (
              <div
                style={{
                  padding: "12px",
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                Nenhuma opção encontrada.
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}