"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { getMyPlanAccess } from "@/lib/getMyPlanAccess"
import FeatureBlockedCard from "@/app/components/FeatureBlockedCard"

import {
  BarChart3,
  DollarSign,
  Wallet,
  Receipt,
  ArrowRight,
} from "lucide-react"

import HelpTooltip from "../../components/HelpTooltip"
import HelpBanner from "../../components/InfoBanner"

type Sale = {
  id: number
  valor_total: number
  status?: string
  created_at: string
  user_id: string
}

type SalePayment = {
  id: number
  sale_id: number
  valor: number
  created_at: string
  user_id: string
}

type FinancialTransaction = {
  id: number
  type: "entrada" | "saida"
  amount: number
  status: "pago" | "pendente"
  created_at: string
  user_id: string
}

export default function RelatoriosPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<SalePayment[]>([])
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)

  // 🔐 CONTROLE DE ACESSO
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    validarAcesso()
  }, [])

  async function validarAcesso() {
    const result = await getMyPlanAccess("relatorios_avancados")
    setHasAccess(result.hasAccess)
    setLoadingAccess(false)
  }

  useEffect(() => {
    if (hasAccess) {
      carregarResumo()
    }
  }, [hasAccess])

  async function carregarResumo() {
    setCarregando(true)
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      setCarregando(false)
      return
    }

    const { data: salesData } = await supabase
      .from("sales")
      .select("id, valor_total, status, created_at, user_id")
      .eq("user_id", user.id)

    const { data: paymentsData } = await supabase
      .from("sale_payments")
      .select("id, sale_id, valor, created_at, user_id")
      .eq("user_id", user.id)

    const { data: transactionsData } = await supabase
      .from("financial_transactions")
      .select("id, type, amount, status, created_at, user_id")
      .eq("user_id", user.id)

    setSales((salesData ?? []) as Sale[])
    setPayments((paymentsData ?? []) as SalePayment[])
    setTransactions((transactionsData ?? []) as FinancialTransaction[])

    setCarregando(false)
  }

  // 🔐 BLOQUEIO
  if (loadingAccess) {
    return <div style={{ padding: 24 }}>Verificando acesso...</div>
  }

  if (!hasAccess) {
    return (
      <div style={{ padding: 24 }}>
        <FeatureBlockedCard
          title="Relatórios são do plano Profissional"
          description="Atualize seu plano para acessar relatórios completos de vendas, recebimentos, despesas e lucratividade."
        />
      </div>
    )
  }

  const resumo = useMemo(() => {
    const vendasAtivas = sales.filter((sale) => sale.status !== "Cancelada")
    const idsVendasAtivas = new Set(vendasAtivas.map((sale) => sale.id))

    const totalVendas = vendasAtivas.reduce(
      (acc, sale) => acc + Number(sale.valor_total),
      0
    )

    const totalRecebimentos = payments
      .filter((payment) => idsVendasAtivas.has(payment.sale_id))
      .reduce((acc, payment) => acc + Number(payment.valor), 0)

    const totalDespesasPagas = transactions
      .filter((item) => item.type === "saida" && item.status === "pago")
      .reduce((acc, item) => acc + Number(item.amount), 0)

    const totalDespesasPendentes = transactions
      .filter((item) => item.type === "saida" && item.status === "pendente")
      .reduce((acc, item) => acc + Number(item.amount), 0)

    return {
      totalVendas,
      totalRecebimentos,
      totalDespesasPagas,
      totalDespesasPendentes,
    }
  }, [sales, payments, transactions])

  const cards = [
    {
      href: "/relatorios/lucratividade",
      titulo: "Lucratividade",
      descricao:
        "Veja faturamento, custo, lucro bruto e margem por produto.",
      icon: <BarChart3 size={20} />,
      destaque: "Mais estratégico",
    },
    {
      href: "/relatorios/vendas",
      titulo: "Vendas",
      descricao:
        "Analise o que foi vendido, quantidade, cliente e total por período.",
      icon: <DollarSign size={20} />,
      destaque: "Operação comercial",
    },
    {
      href: "/relatorios/recebimentos",
      titulo: "Recebimentos",
      descricao:
        "Acompanhe o dinheiro que entrou, por forma de pagamento e data.",
      icon: <Wallet size={20} />,
      destaque: "Fluxo de entrada",
    },
    {
      href: "/relatorios/despesas",
      titulo: "Despesas",
      descricao:
        "Controle gastos pagos e pendentes.",
      icon: <Receipt size={20} />,
      destaque: "Controle de custos",
    },
  ]

  return (
    <div>
      <h2 className="page-title">Centro de Relatórios</h2>

      <HelpBanner
        title="Como usar os Relatórios"
        text="Área avançada para análise completa do seu negócio."
      />

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="section-card">
          <h3>Total vendido</h3>
          <p>R$ {resumo.totalVendas.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3>Total recebido</h3>
          <p>R$ {resumo.totalRecebimentos.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3>Despesas pagas</h3>
          <p>R$ {resumo.totalDespesasPagas.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3>Despesas pendentes</h3>
          <p>R$ {resumo.totalDespesasPendentes.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="section-card">
              <h3>{card.titulo}</h3>
              <p>{card.descricao}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
