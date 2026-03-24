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
  product_id: number | null
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

type Produto = {
  id: number
  nome: string
  sku: string
  estoque: number
  custo: number
  preco: number
  user_id: string
}

export default function RelatoriosPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<SalePayment[]>([])
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])

  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)

  const [loadingAccess, setLoadingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    validarAcesso()
  }, [])

  useEffect(() => {
    if (hasAccess) {
      carregarResumo()
    }
  }, [hasAccess])

  async function validarAcesso() {
    const result = await getMyPlanAccess("relatorios_avancados")
    setHasAccess(result.hasAccess)
    setLoadingAccess(false)
  }

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

    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("id, product_id, valor_total, status, created_at, user_id")
      .eq("user_id", user.id)

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("sale_payments")
     .select("id, sale_id, valor, created_at, user_id")
      .eq("user_id", user.id)

    const { data: transactionsData, error: transactionsError } = await supabase
      .from("financial_transactions")
      .select("id, type, amount, status, created_at, user_id")
      .eq("user_id", user.id)

      const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, nome, sku, estoque, custo, preco, user_id")
      .eq("user_id", user.id)

    if (salesError || paymentsError || transactionsError || productsError) {
      setMensagem("Erro ao carregar o centro de relatórios.")
      setCarregando(false)
      return
    }

    setSales((salesData ?? []) as Sale[])
    setPayments((paymentsData ?? []) as SalePayment[])
    setTransactions((transactionsData ?? []) as FinancialTransaction[])
    setProdutos((productsData ?? []) as Produto[])
    setCarregando(false)
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

    const idsProdutosVendidos = new Set(
  vendasAtivas
    .map((sale: any) => sale.product_id)
    .filter(Boolean)
)

const produtosComEstoque = produtos.filter((produto) => Number(produto.estoque) > 0)

const produtosSemVendaComEstoque = produtosComEstoque.filter(
  (produto) => !idsProdutosVendidos.has(produto.id)
)

const valorProdutosSemVendaComEstoque = produtosSemVendaComEstoque.reduce(
  (acc, produto) => acc + Number(produto.estoque || 0) * Number(produto.custo || 0),
  0
)

    return {
  totalVendas,
  totalRecebimentos,
  totalDespesasPagas,
  totalDespesasPendentes,
  totalProdutosComEstoque: produtosComEstoque.length,
  produtosSemVendaComEstoque: produtosSemVendaComEstoque.length,
  valorProdutosSemVendaComEstoque,
}
  }, [sales, payments, transactions])

  const cards = [
    {
      href: "/relatorios/lucratividade",
      titulo: "Lucratividade",
      descricao: "Veja faturamento, custo, lucro bruto e margem por produto.",
      icon: <BarChart3 size={20} />,
      destaque: "Mais estratégico",
    },
    {
      href: "/relatorios/vendas",
      titulo: "Vendas",
      descricao: "Analise o que foi vendido, quantidade, cliente e total por período.",
      icon: <DollarSign size={20} />,
      destaque: "Operação comercial",
    },
    {
      href: "/relatorios/recebimentos",
      titulo: "Recebimentos",
      descricao: "Acompanhe o dinheiro que entrou, por forma de pagamento e data.",
      icon: <Wallet size={20} />,
      destaque: "Fluxo de entrada",
    },
    {
      href: "/relatorios/despesas",
      titulo: "Despesas",
      descricao: "Controle gastos pagos e pendentes.",
      icon: <Receipt size={20} />,
      destaque: "Controle de custos",
    },
  ]

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

  return (
    <div>
      <h2 className="page-title">Centro de Relatórios</h2>

      <p className="page-subtitle">
        Acesse relatórios separados para analisar vendas, recebimentos, despesas e lucratividade.
      </p>

      <HelpBanner
        title="Como usar os Relatórios"
        text="Esta área reúne os principais relatórios do sistema. Use lucratividade para entender quais produtos dão mais retorno, vendas para acompanhar a operação comercial, recebimentos para ver o que entrou no caixa e despesas para controlar seus custos."
      />

      {mensagem && <p>{mensagem}</p>}

      <div
  style={{
    marginBottom: 24,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  }}
>
        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Total vendido
            <HelpTooltip text="Soma do valor total das vendas ativas registradas no sistema." />
          </h3>
          <p>R$ {resumo.totalVendas.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Total recebido
            <HelpTooltip text="Soma dos pagamentos já recebidos das vendas ativas." />
          </h3>
          <p>R$ {resumo.totalRecebimentos.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Despesas pagas
            <HelpTooltip text="Soma das despesas que já foram marcadas como pagas no financeiro." />
          </h3>
          <p>R$ {resumo.totalDespesasPagas.toFixed(2)}</p>
        </div>

        <div className="section-card">
          <h3 style={tituloComAjuda}>
            Despesas pendentes
            <HelpTooltip text="Soma das despesas ainda pendentes no financeiro." />
          </h3>
          <p>R$ {resumo.totalDespesasPendentes.toFixed(2)}</p>
        </div>

        <div className="section-card">
  <h3 style={tituloComAjuda}>
    Produtos em estoque
    <HelpTooltip text="Quantidade de produtos que ainda possuem estoque maior que zero." />
  </h3>
  <p>{resumo.totalProdutosComEstoque}</p>
</div>

<div className="section-card">
  <h3 style={tituloComAjuda}>
    Valor parado no estoque
    <HelpTooltip text="Soma do custo dos produtos que ainda têm estoque, mas nunca foram vendidos." />
  </h3>
  <p>R$ {resumo.valorProdutosSemVendaComEstoque.toFixed(2)}</p>
</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 18,
        }}
      >
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              className="section-card"
              style={{
                height: "100%",
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#eff6ff",
                    color: "#2563eb",
                  }}
                >
                  {card.icon}
                </div>

                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#2563eb",
                    background: "#eff6ff",
                    padding: "6px 10px",
                    borderRadius: 999,
                  }}
                >
                  {card.destaque}
                </span>
              </div>

              <h3 style={{ marginTop: 0, marginBottom: 8 }}>{card.titulo}</h3>

              <p
                style={{
                  marginTop: 0,
                  marginBottom: 18,
                  color: "#6b7280",
                  lineHeight: 1.55,
                  fontSize: 14,
                }}
              >
                {card.descricao}
              </p>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#2563eb",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Abrir relatório
                <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {carregando && (
        <div className="section-card" style={{ marginTop: 20 }}>
          Carregando centro de relatórios...
        </div>
      )}
    </div>
  )
}

const tituloComAjuda: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
}