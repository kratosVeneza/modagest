"use client"

import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const temaSalvo = localStorage.getItem("modagest-theme")
    const darkAtivo = temaSalvo === "dark"

    setDark(darkAtivo)

    if (darkAtivo) {
      document.body.classList.add("dark")
    } else {
      document.body.classList.remove("dark")
    }
  }, [])

  function alternarTema() {
    const novoValor = !dark
    setDark(novoValor)

    if (novoValor) {
      document.body.classList.add("dark")
      localStorage.setItem("modagest-theme", "dark")
    } else {
      document.body.classList.remove("dark")
      localStorage.setItem("modagest-theme", "light")
    }
  }

  return (
    <button onClick={alternarTema} className="theme-toggle">
      {dark ? "☀️ Modo claro" : "🌙 Modo escuro"}
    </button>
  )
}