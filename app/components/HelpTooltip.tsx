"use client"

import { useEffect, useRef, useState } from "react"

type HelpTooltipProps = {
  text: string
}

export default function HelpTooltip({ text }: HelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <span
      ref={ref}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        marginLeft: 6,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Ajuda"
        title="Ajuda"
        style={{
          width: 18,
          height: 18,
          borderRadius: "999px",
          border: "none",
          background: "#2563eb",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        ?
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 26,
            left: 0,
            width: 240,
            background: "#111827",
            color: "#fff",
            padding: "10px 12px",
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.45,
            zIndex: 1000,
            boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
          }}
        >
          {text}
        </div>
      )}
    </span>
  )
}