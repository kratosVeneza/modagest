"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import HelpTooltip from "../../components/HelpTooltip"
import HelpBanner from "../../components/InfoBanner"
import { createSale } from "@/lib/services/sales/createSale"

type Produto = {
  id: number
  nome: string
  sku: string
  estoque: number
  preco: number
  user_id: string
  unidade?: string | null
  marca?: string | null
  categoria?: string | null
  cor?: string | null
  tamanho?: string | null
}

type Cliente = {
  id: number
  nome: string
}

const formasPagamento = [
  "Dinheiro",
  "Pix",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
]

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function montarDataISO(dataInput: string) {
  if (!dataInput) {
    return new Date().toISOString()
  }

  return new Date(`${dataInput}T12:00:00-03:00`).toISOString()
}

function montarNomeProduto(produto: Produto) {
  return [produto.nome, produto.cor, produto.tamanho, produto.sku]
    .filter(Boolean)
    .join(" • ")
}

export default function Vendas() {
  const router = useRouter()

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtoId, setProdutoId] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [quantidade, setQuantidade] = useState("")
  const [dataVenda, setDataVenda] = useState(hojeInputDate())
  const [mensagem, setMensagem] = useState("")
  const [mensagemSucesso, setMensagemSucesso] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [valorRecebidoInicial, setValorRecebidoInicial] = useState("")
  const [formaPagamentoInicial, setFormaPagamentoInicial] = useState("Pix")
  const [observacaoPagamentoInicial, setObservacaoPagamentoInicial] = useState("")
  const [buscaProduto, setBuscaProduto] = useState("")
  const [precoUnitarioEditavel, setPrecoUnitarioEditavel] = useState("")
  const [descontoPercentual, setDescontoPercentual] = useState("")

  useEffect(() => {
    carregarProdutos()
    carregarClientes()
  }, [])

  async function carregarProdutos() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, nome, sku, estoque, preco, user_id, unidade, marca, categoria, cor, tamanho")
      .eq("user_id", user.id)
      .gt("estoque", 0)
      .order("nome", { ascending: true })

    if (error) {
      setMensagem("Erro ao carregar produtos.")
      return
    }

    setProdutos((data ?? []) as Produto[])
  }

  async function carregarClientes() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from("customers")
      .select("id, nome")
      .eq("user_id", user.id)
      .order("nome", { ascending: true })

    if (!error) {
      setClientes((data ?? []) as Cliente[])
    }
  }

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLowerCase()

    return produtos.filter((produto) => {
      if (Number(produto.estoque) <= 0) return false

      if (!termo) return true

      return (
        produto.nome.toLowerCase().includes(termo) ||
        (produto.sku || "").toLowerCase().includes(termo) ||
        (produto.cor || "").toLowerCase().includes(termo) ||
        (produto.tamanho || "").toLowerCase().includes(termo) ||
        (produto.marca || "").toLowerCase().includes(termo) ||
        (produto.categoria || "").toLowerCase().includes(termo)
      )
    })
  }, [produtos, buscaProduto])

  const produtoSelecionado = useMemo(() => {
    return produtos.find((p) => p.id === Number(produtoId)) || null
  }, [produtos, produtoId])

  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => c.id === Number(clienteId)) || null
  }, [clientes, clienteId])

  const quantidadeNumero = Number(quantidade || 0)

  const valorUnitarioBase = produtoSelecionado ? Number(produtoSelecionado.preco) : 0
  const valorUnitario = Number(precoUnitarioEditavel || 0)

  const subtotalVenda = valorUnitario * (quantidadeNumero > 0 ? quantidadeNumero : 0)

  const descontoCalculado = useMemo(() => {
    const percentual = Number(descontoPercentual || 0)

    if (percentual <= 0) return 0
    if (percentual > 100) return subtotalVenda

    return subtotalVenda * (percentual / 100)
  }, [descontoPercentual, subtotalVenda])

  const valorTotal = Math.max(subtotalVenda - descontoCalculado, 0)
  const recebidoInicial = Number(valorRecebidoInicial || 0)
  const saldoRestante = valorTotal - recebidoInicial

  const estoqueRestante =
    produtoSelecionado && quantidadeNumero > 0
      ? produtoSelecionado.estoque - quantidadeNumero
      : produtoSelecionado?.estoque ?? 0

  function selecionarProduto(produto: Produto) {
    setProdutoId(String(produto.id))
    setPrecoUnitarioEditavel(String(Number(produto.preco).toFixed(2)))
  }

  function limparProdutoSelecionado() {
    setProdutoId("")
    setPrecoUnitarioEditavel("")
  }

  async function registrarVenda() {
    setMensagem("")
    setMensagemSucesso("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!produtoId || !quantidade) {
      setMensagem("Selecione um produto e informe a quantidade.")
      return
    }

    if (!dataVenda) {
      setMensagem("Informe a data da venda.")
      return
    }

    const produto = produtos.find((p) => p.id === Number(produtoId))

    if (!produto) {
      setMensagem("Produto não encontrado.")
      return
    }

    const qtd = Number(quantidade)
    const desconto = Number(descontoPercentual || 0)
    const valorUnitarioFinal = Number(precoUnitarioEditavel || 0)

    if (qtd <= 0) {
      setMensagem("Informe uma quantidade válida.")
      return
    }

    if (qtd > produto.estoque) {
      setMensagem("Estoque insuficiente para essa venda.")
      return
    }

    if (valorUnitarioFinal <= 0) {
      setMensagem("Informe um preço unitário válido.")
      return
    }

    if (desconto < 0 || desconto > 100) {
      setMensagem("Informe um desconto válido entre 0% e 100%.")
      return
    }

    if (recebidoInicial < 0) {
      setMensagem("O valor recebido inicial não pode ser negativo.")
      return
    }

    if (recebidoInicial > valorTotal) {
      setMensagem("O valor recebido inicial não pode ser maior que o valor total final da venda.")
      return
    }

    setSalvando(true)

    const resultado = await createSale({
      userId: user.id,
      productId: produto.id,
      customerId: clienteId ? Number(clienteId) : null,
      quantidade: qtd,
      valorUnitario: valorUnitarioFinal,
      valorTotal,
      dataVendaIso: montarDataISO(dataVenda),
      valorRecebidoInicial: recebidoInicial,
      formaPagamentoInicial,
      observacaoPagamentoInicial: observacaoPagamentoInicial || null,
      valorOriginal: subtotalVenda,
      descontoPercentual: desconto,
      descontoValor: descontoCalculado,
    })

    if (!resultado.success) {
      setSalvando(false)
      setMensagem(resultado.message)
      return
    }

    if (resultado.warning) {
      setMensagem(resultado.warning)
    }

    setProdutoId("")
    setClienteId("")
    setQuantidade("")
    setDataVenda(hojeInputDate())
    setValorRecebidoInicial("")
    setFormaPagamentoInicial("Pix")
    setObservacaoPagamentoInicial("")
    setBuscaProduto("")
    setPrecoUnitarioEditavel("")
    setDescontoPercentual("")
    setSalvando(false)
    setMensagem("")
    setMensagemSucesso("Venda cadastrada")

    setTimeout(() => {
      setMensagemSucesso("")
    }, 2500)

    await carregarProdutos()
  }

  return (
    <div>
      <h2 className="page-title">Vendas</h2>
      <p className="page-subtitle">
        Registre vendas, pagamentos iniciais e baixe o estoque automaticamente.
      </p>

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <button
          onClick={() => router.push("/assistente-ia")}
          className="btn btn-secondary"
        >
          🤖 Usar IA para lançar operação
        </button>
      </div>

      <HelpBanner
        title="Como usar a página de Vendas"
        text="Registre aqui a venda do produto, a data real em que ela aconteceu e, se quiser, o valor já recebido do cliente. Você pode lançar pagamento total ou parcial. O estoque é baixado automaticamente."
      />

      {mensagem && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            fontWeight: 600,
          }}
        >
          {mensagem}
        </div>
      )}

      {mensagemSucesso && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            fontWeight: 600,
          }}
        >
          {mensagemSucesso}
        </div>
      )}

      <div className="grid-2" style={{ marginTop: "20px", alignItems: "start" }}>
        <div className="section-card">
          <h3 style={{ marginTop: 0 }}>Nova venda</h3>

          <div style={{ marginBottom: 14, fontSize: 14, color: "#6b7280" }}>
            Preencha os dados da venda. Use a data real da operação mesmo que esteja cadastrando depois.
          </div>

          <div className="grid-2">
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelAjuda}>
                Buscar produto
                <HelpTooltip text="Digite nome, SKU, cor, tamanho, marca ou categoria para encontrar o produto com mais facilidade." />
              </label>
              <input
                type="text"
                placeholder="Digite para buscar produto..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelAjuda}>
                Seleção de produto
                <HelpTooltip text="Clique em um produto da lista abaixo. Só aparecem produtos com estoque disponível." />
              </label>

              {produtoSelecionado && (
                <div style={produtoSelecionadoBox}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{montarNomeProduto(produtoSelecionado)}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                      Estoque: {produtoSelecionado.estoque} • Preço cadastrado: R$ {Number(produtoSelecionado.preco).toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={limparProdutoSelecionado}
                  >
                    Trocar
                  </button>
                </div>
              )}

              <div style={listaProdutos}>
                {produtosFiltrados.length === 0 ? (
                  <div style={listaVazia}>
                    Nenhum produto com estoque encontrado para essa busca.
                  </div>
                ) : (
                  produtosFiltrados.map((produto) => {
                    const selecionado = Number(produtoId) === produto.id

                    return (
                      <button
                        key={produto.id}
                        type="button"
                        onClick={() => selecionarProduto(produto)}
                        style={{
                          ...cardProduto,
                          ...(selecionado ? cardProdutoSelecionado : {}),
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              {produto.nome}
                            </div>

                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                              {[produto.cor, produto.tamanho, produto.sku].filter(Boolean).join(" • ")}
                            </div>

                            {(produto.marca || produto.categoria) && (
                              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                                {[produto.marca, produto.categoria].filter(Boolean).join(" • ")}
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: "right", minWidth: 120 }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              R$ {Number(produto.preco).toFixed(2)}
                            </div>
                            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                              Estoque: {produto.estoque}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div>
              <label style={labelAjuda}>
                Cliente
                <HelpTooltip text="Selecione o cliente da venda. Esse campo é opcional." />
              </label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Cliente (opcional)</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelAjuda}>
                Quantidade
                <HelpTooltip text="Informe quantas unidades foram vendidas nessa operação." />
              </label>
              <input
                type="number"
                placeholder="Quantidade"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Preço unitário da venda
                <HelpTooltip text="Você pode manter o preço cadastrado ou editar para um valor diferente nesta venda." />
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Preço unitário"
                value={precoUnitarioEditavel}
                onChange={(e) => setPrecoUnitarioEditavel(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Desconto (%)
                <HelpTooltip text="Desconto aplicado sobre o subtotal da venda." />
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 10"
                value={descontoPercentual}
                onChange={(e) => setDescontoPercentual(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Data da venda
                <HelpTooltip text="Use a data real em que a venda aconteceu. Isso mantém o dashboard e os relatórios corretos." />
              </label>
              <input
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Valor recebido agora
                <HelpTooltip text="Informe quanto o cliente já pagou agora. Pode ser o valor total ou apenas um sinal." />
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Valor recebido agora (opcional)"
                value={valorRecebidoInicial}
                onChange={(e) => setValorRecebidoInicial(e.target.value)}
              />
            </div>

            <div>
              <label style={labelAjuda}>
                Forma de pagamento
                <HelpTooltip text="Escolha a forma usada nesse recebimento inicial, como Pix, dinheiro ou cartão." />
              </label>
              <select
                value={formaPagamentoInicial}
                onChange={(e) => setFormaPagamentoInicial(e.target.value)}
              >
                {formasPagamento.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelAjuda}>
                Observação do pagamento
                <HelpTooltip text="Use para anotar algo importante, como sinal, primeira parcela ou acordo com o cliente." />
              </label>
              <input
                placeholder="Observação do pagamento (opcional)"
                value={observacaoPagamentoInicial}
                onChange={(e) => setObservacaoPagamentoInicial(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: "18px" }}>
            <button
              onClick={registrarVenda}
              className="btn btn-primary"
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Registrar venda"}
            </button>
          </div>
        </div>

        <div className="section-card">
          <h3 style={{ marginTop: 0 }}>Resumo da venda</h3>

          <div style={resumoLinha}>
            <span className="info-muted" style={tituloComAjuda}>
              Produto
              <HelpTooltip text="Produto selecionado para essa venda." />
            </span>
            <strong>
              {produtoSelecionado ? montarNomeProduto(produtoSelecionado) : "-"}
            </strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">SKU</span>
            <strong>{produtoSelecionado?.sku || "-"}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Cliente</span>
            <strong>{clienteSelecionado?.nome || "Sem cliente"}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted" style={tituloComAjuda}>
              Data da venda
              <HelpTooltip text="Data que será usada nos relatórios e no dashboard." />
            </span>
            <strong>{dataVenda || "-"}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Preço cadastrado</span>
            <strong>R$ {valorUnitarioBase.toFixed(2)}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Preço unitário usado</span>
            <strong>R$ {valorUnitario.toFixed(2)}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Quantidade</span>
            <strong>{quantidadeNumero > 0 ? quantidadeNumero : 0}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Subtotal</span>
            <strong>R$ {subtotalVenda.toFixed(2)}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted">Desconto</span>
            <strong>
              {Number(descontoPercentual || 0).toFixed(2)}% • R$ {descontoCalculado.toFixed(2)}
            </strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted" style={tituloComAjuda}>
              Estoque atual
              <HelpTooltip text="Quantidade disponível antes de registrar a venda." />
            </span>
            <strong>{produtoSelecionado?.estoque ?? 0}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted" style={tituloComAjuda}>
              Estoque após venda
              <HelpTooltip text="Quantidade que restará no estoque depois que a venda for registrada." />
            </span>
            <strong
              style={{
                color:
                  produtoSelecionado && estoqueRestante < 0 ? "#991b1b" : undefined,
              }}
            >
              {produtoSelecionado ? estoqueRestante : 0}
            </strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted" style={tituloComAjuda}>
              Recebido agora
              <HelpTooltip text="Valor pago neste momento pelo cliente." />
            </span>
            <strong>R$ {recebidoInicial.toFixed(2)}</strong>
          </div>

          <div style={resumoLinha}>
            <span className="info-muted" style={tituloComAjuda}>
              Saldo em aberto
              <HelpTooltip text="Valor que ainda falta receber dessa venda depois do pagamento inicial." />
            </span>
            <strong>R$ {Math.max(saldoRestante, 0).toFixed(2)}</strong>
          </div>

          <div className="summary-box" style={totalBox}>
            <span style={tituloComAjuda}>
              Total final da venda
              <HelpTooltip text="Subtotal menos desconto, considerando o preço unitário usado nesta venda." />
            </span>
            <strong style={{ fontSize: "22px" }}>
              R$ {valorTotal.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}

const resumoLinha = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
}

const totalBox = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}

const labelAjuda = {
  display: "flex",
  alignItems: "center",
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "6px",
}

const tituloComAjuda = {
  display: "inline-flex",
  alignItems: "center",
}

const produtoSelecionadoBox = {
  marginBottom: 12,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
}

const listaProdutos = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
  maxHeight: 320,
  overflowY: "auto" as const,
  paddingRight: 4,
}

const listaVazia = {
  padding: "14px 12px",
  borderRadius: 10,
  border: "1px dashed #cbd5e1",
  color: "#64748b",
  fontSize: 14,
  background: "#f8fafc",
}

const cardProduto = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
}

const cardProdutoSelecionado = {
  border: "1px solid #3b82f6",
  background: "#eff6ff",
}