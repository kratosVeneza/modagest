"use client"

import { useEffect, useState } from "react"

const TOUR_KEY = "modagest_onboarding_seen"

type Step = {
  title: string
  text: string
}

const steps: Step[] = [
  {
    title: "Bem-vindo ao ModaGest",
    text: "Este guia rápido vai mostrar a ordem ideal para usar o sistema e evitar erros no cadastro e no controle financeiro.",
  },
  {
    title: "1. Cadastre seus produtos",
    text: "Comece pela página Produtos. Cadastre nome, custo, preço, estoque e estoque mínimo. Isso é a base para vendas, lucro e alertas de reposição.",
  },
  {
    title: "2. Use Pedidos para reposição",
    text: "Quando for repor mercadoria, registre na página Pedidos. Assim você controla o que foi encomendado e o que já foi recebido no estoque.",
  },
  {
    title: "3. Registre as vendas",
    text: "Na página Vendas, escolha o produto, informe a quantidade, a data real da venda e, se quiser, o valor já recebido do cliente.",
  },
  {
    title: "4. Acompanhe pagamentos",
    text: "No Histórico de Vendas, acompanhe quanto já foi recebido, quanto está em aberto e adicione pagamentos posteriores, inclusive com data retroativa.",
  },
  {
    title: "5. Lance despesas no Financeiro",
    text: "No Financeiro, cadastre despesas e entradas extras, como marketing, frete, aluguel, internet e fornecedores. Isso mantém o caixa real e o saldo previsto corretos.",
  },
  {
    title: "6. Analise o Dashboard",
    text: "No Dashboard, acompanhe vendido, recebido, saldo em aberto, saldo atual, saldo previsto e alertas de estoque baixo.",
  },
  {
    title: "7. Use os Relatórios",
    text: "No Centro de Relatórios, consulte vendas, recebimentos, despesas e lucratividade por produto para tomar decisões melhores.",
  },
]

export default function OnboardingTour() {
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const alreadySeen = localStorage.getItem(TOUR_KEY)
    if (!alreadySeen) {
      setOpen(true)
    }
  }, [])

  function closeTour() {
    localStorage.setItem(TOUR_KEY, "true")
    setOpen(false)
    setStepIndex(0)
  }

  function nextStep() {
    if (stepIndex === steps.length - 1) {
      closeTour()
      return
    }
    setStepIndex((prev) => prev + 1)
  }

  function prevStep() {
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  function restartTour() {
    setStepIndex(0)
    setOpen(true)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={restartTour}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 999,
          border: "none",
          borderRadius: 999,
          padding: "12px 16px",
          background: "#2563eb",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
        }}
      >
        Ver guia do sistema
      </button>
    )
  }

  const step = steps[stepIndex]

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 20px 50px rgba(0,0,0,0.22)",
        }}
      >
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              Passo {stepIndex + 1} de {steps.length}
            </div>
            <h3 style={{ margin: 0, fontSize: 22 }}>{step.title}</h3>
          </div>

          <button
            type="button"
            onClick={closeTour}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 22,
              cursor: "pointer",
              color: "#64748b",
            }}
            aria-label="Fechar guia"
            title="Fechar guia"
          >
            ×
          </button>
        </div>

        <p
          style={{
            marginTop: 0,
            marginBottom: 22,
            color: "#334155",
            lineHeight: 1.6,
            fontSize: 15,
          }}
        >
          {step.text}
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                height: 8,
                flex: 1,
                borderRadius: 999,
                background: index <= stepIndex ? "#2563eb" : "#dbeafe",
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={prevStep}
            disabled={stepIndex === 0}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: stepIndex === 0 ? "#94a3b8" : "#0f172a",
              borderRadius: 12,
              padding: "10px 16px",
              cursor: stepIndex === 0 ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            Voltar
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={closeTour}
              style={{
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                borderRadius: 12,
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Pular guia
            </button>

            <button
              type="button"
              onClick={nextStep}
              style={{
                border: "none",
                background: "#2563eb",
                color: "#fff",
                borderRadius: 12,
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {stepIndex === steps.length - 1 ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
