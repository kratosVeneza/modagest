"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import AnimatedModal from "../../components/AnimatedModal"
import TableSkeleton from "../../components/TableSkeleton"
import HelpTooltip from "../../components/HelpTooltip"
import HelpBanner from "../../components/InfoBanner"
import { addStockQuick } from "@/lib/services/products/addStockQuick"
import { getStoreSettings } from "@/lib/settings/getStoreSettings"
import { canUseTaxFeatures, shouldRequireFiscalFields } from "@/lib/tax/canUseTaxFeatures"
import { getTaxRules, type TaxRule } from "@/lib/tax/getTaxRules"
import { suggestNcmByProductName } from "@/lib/tax/suggestNcmByProductName"
import type { StoreSettings } from "@/lib/settings/types"

type Produto = {
  id: number
  sku: string
  nome: string
  marca: string | null
  categoria: string | null
  tipo: string | null
  unidade: string | null
  cor: string | null
  tamanho: string | null
  estoque: number
  estoque_minimo: number
  custo: number
  preco: number
  user_id: string

  ncm?: string | null
  cest?: string | null
  origem?: string | null
  categoria_fiscal?: string | null
  tax_rule_id?: number | null
  usa_imposto_manual?: boolean
  cbs_aliquota_manual?: number | null
  ibs_aliquota_manual?: number | null
}

type ErrosFormulario = {
  nome?: string
  categoria?: string
  tipo?: string
  estoque?: string
  custo?: string
  preco?: string
}

const categorias = [
  "Roupas",
  "Calçados",
  "Acessórios",
  "Suplementos",
  "Equipamentos",
]

const unidades = ["un", "par", "caixa", "sachê", "kit"]

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [nome, setNome] = useState("")
  const [marca, setMarca] = useState("")
  const [categoria, setCategoria] = useState("")
  const [tipo, setTipo] = useState("")
  const [unidade, setUnidade] = useState("un")
  const [cor, setCor] = useState("")
  const [tamanho, setTamanho] = useState("")
  const [estoque, setEstoque] = useState("")
  const [estoqueMinimo, setEstoqueMinimo] = useState("")
  const [custo, setCusto] = useState("")
  const [preco, setPreco] = useState("")
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null)
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [mensagem, setMensagem] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [erros, setErros] = useState<ErrosFormulario>({})
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null)
const [mostrarTributacao, setMostrarTributacao] = useState(false)
const [taxRules, setTaxRules] = useState<TaxRule[]>([])

const [ncm, setNcm] = useState("")
const [cest, setCest] = useState("")
const [origem, setOrigem] = useState("")
const [categoriaFiscal, setCategoriaFiscal] = useState("")
const [taxRuleId, setTaxRuleId] = useState("")
const [usaImpostoManual, setUsaImpostoManual] = useState(false)
const [cbsAliquotaManual, setCbsAliquotaManual] = useState("")
const [ibsAliquotaManual, setIbsAliquotaManual] = useState("")

const [sugestoesNcm, setSugestoesNcm] = useState<
  { codigo: string; descricao: string; score: number }[]
>([])
const [buscandoNcm, setBuscandoNcm] = useState(false)

useEffect(() => {
  if (nome.length < 3) {
    setSugestoesNcm([])
    return
  }

  const delay = setTimeout(() => {
    buscarNcm()
  }, 500)

  return () => clearTimeout(delay)
}, [nome])
  // 🔥 ENTRADA RÁPIDA
const [modalEntradaAberto, setModalEntradaAberto] = useState(false)
const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
const [quantidadeEntrada, setQuantidadeEntrada] = useState("")
const [custoEntrada, setCustoEntrada] = useState("")
const [salvandoEntrada, setSalvandoEntrada] = useState(false)


  useEffect(() => {
  carregarDadosIniciais()
}, [])

async function carregarDadosIniciais() {
  setCarregando(true)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMensagem("Você precisa estar logado.")
    setCarregando(false)
    return
  }

  const settings = await getStoreSettings(user.id)
  setStoreSettings(settings)
  setMostrarTributacao(canUseTaxFeatures(settings))

  if (canUseTaxFeatures(settings)) {
    try {
      const rules = await getTaxRules()
      setTaxRules(rules)
    } catch {
      setTaxRules([])
    }
  } else {
    setTaxRules([])
  }

  await carregarProdutos()
}

  async function carregarProdutos() {
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

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false })

    if (error) {
      setMensagem("Erro ao carregar produtos.")
      setCarregando(false)
      return
    }

    setProdutos((data ?? []) as Produto[])
    setCarregando(false)
  }

  function gerarSku(
    nomeProduto: string,
    categoriaProduto: string,
    tipoProduto: string
  ) {
    const nomeParte = nomeProduto.trim().slice(0, 3).toUpperCase() || "PRO"
    const categoriaParte =
      categoriaProduto.trim().slice(0, 2).toUpperCase() || "CT"
    const tipoParte = tipoProduto.trim().slice(0, 2).toUpperCase() || "TP"
    const numero = String(produtos.length + 1).padStart(3, "0")

    return `${nomeParte}-${categoriaParte}-${tipoParte}-${numero}`
  }

  function limparFormulario() {
  setNome("")
  setMarca("")
  setCategoria("")
  setTipo("")
  setUnidade("un")
  setCor("")
  setTamanho("")
  setEstoque("")
  setEstoqueMinimo("")
  setCusto("")
  setPreco("")
  setIdEmEdicao(null)
  setErros({})
  setNcm("")
setCest("")
setOrigem("")
setCategoriaFiscal("")
setTaxRuleId("")
setUsaImpostoManual(false)
setCbsAliquotaManual("")
setIbsAliquotaManual("")
setSugestoesNcm([])
} 

  function abrirNovoModal() {
    limparFormulario()
    setMensagem("")
    setModalAberto(true)
  }

  function fecharModal() {
    limparFormulario()
    setMensagem("")
    setModalAberto(false)
  }

  function validarFormulario() {
  const novosErros: ErrosFormulario = {}

  if (!nome.trim()) novosErros.nome = "Informe o nome do produto."
  if (!categoria.trim()) novosErros.categoria = "Selecione a categoria."
  if (!tipo.trim()) novosErros.tipo = "Informe o tipo do produto."
  if (!estoque || Number(estoque) < 0) novosErros.estoque = "Informe um estoque válido."
  if (!custo || Number(custo) <= 0) novosErros.custo = "Informe um custo válido."
  if (!preco || Number(preco) <= 0) novosErros.preco = "Informe um preço válido."

  if (preco && custo && Number(preco) < Number(custo)) {
    novosErros.preco = "O preço de venda não deve ser menor que o custo."
  }

  if (storeSettings && shouldRequireFiscalFields(storeSettings)) {
  if (!ncm.trim()) {
    novosErros.nome = novosErros.nome || ""
    setMensagem("Informe o NCM do produto.")
    setErros(novosErros)
    return false
  }

  if (!usaImpostoManual && !taxRuleId) {
    setMensagem("Selecione uma regra tributária para o produto.")
    setErros(novosErros)
    return false
  }

  if (usaImpostoManual) {
    if (cbsAliquotaManual === "" || ibsAliquotaManual === "") {
      setMensagem("Informe as alíquotas manuais do produto.")
      setErros(novosErros)
      return false
    }
  }
}

  setErros(novosErros)

  if (Object.keys(novosErros).length > 0) {
    setMensagem("Corrija os campos obrigatórios destacados.")
    return false
  }

  return true
}

  async function salvarProduto() {
    setMensagem("")
    setErros({})

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!validarFormulario()) {
  return
}

    const payload = {
  nome,
  marca: marca || null,
  categoria,
  tipo,
  unidade,
  cor: cor || null,
  tamanho: tamanho || null,
  estoque: Number(estoque),
  estoque_minimo: Number(estoqueMinimo || 0),
  custo: Number(custo),
  preco: Number(preco),

  ncm: mostrarTributacao ? ncm || null : null,
  cest: mostrarTributacao ? cest || null : null,
  origem: mostrarTributacao ? origem || null : null,
  categoria_fiscal: mostrarTributacao ? categoriaFiscal || null : null,
  tax_rule_id:
    mostrarTributacao && !usaImpostoManual && taxRuleId
      ? Number(taxRuleId)
      : null,
  usa_imposto_manual: mostrarTributacao ? usaImpostoManual : false,
  cbs_aliquota_manual:
    mostrarTributacao && usaImpostoManual
      ? Number(cbsAliquotaManual || 0)
      : null,
  ibs_aliquota_manual:
    mostrarTributacao && usaImpostoManual
      ? Number(ibsAliquotaManual || 0)
      : null,
}

    if (idEmEdicao) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", idEmEdicao)
        .eq("user_id", user.id)

      if (error) {
  console.log("ERRO AO ATUALIZAR PRODUTO:", error)
  setMensagem(error.message || "Erro ao atualizar produto.")
  return
}

      fecharModal()
      await carregarProdutos()
      return
    }

    const { error } = await supabase.from("products").insert([
      {
        sku: gerarSku(nome, categoria, tipo),
        ...payload,
        user_id: user.id,
      },
    ])

    if (error) {
  console.log("ERRO AO CADASTRAR PRODUTO:", error)
  setMensagem(error.message || "Erro ao cadastrar produto.")
  return
}

    fecharModal()
    await carregarProdutos()
  }

  function editarProduto(produto: Produto) {
    setIdEmEdicao(produto.id)
    setNome(produto.nome)
    setMarca(produto.marca || "")
    setCategoria(produto.categoria || "")
    setTipo(produto.tipo || "")
    setUnidade(produto.unidade || "un")
    setCor(produto.cor || "")
    setTamanho(produto.tamanho || "")
    setEstoque(String(produto.estoque))
    setEstoqueMinimo(String(produto.estoque_minimo ?? 0))
    setCusto(String(produto.custo ?? 0))
    setPreco(String(produto.preco))
    setNcm(produto.ncm || "")
setCest(produto.cest || "")
setOrigem(produto.origem || "")
setCategoriaFiscal(produto.categoria_fiscal || "")
setTaxRuleId(produto.tax_rule_id ? String(produto.tax_rule_id) : "")
setUsaImpostoManual(Boolean(produto.usa_imposto_manual))
setCbsAliquotaManual(
  produto.cbs_aliquota_manual !== null && produto.cbs_aliquota_manual !== undefined
    ? String(produto.cbs_aliquota_manual)
    : ""
)
setIbsAliquotaManual(
  produto.ibs_aliquota_manual !== null && produto.ibs_aliquota_manual !== undefined
    ? String(produto.ibs_aliquota_manual)
    : ""
)
    setModalAberto(true)
  }

  async function excluirProduto(id: number) {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      setMensagem("Erro ao excluir produto.")
      return
    }

    await carregarProdutos()
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    if (!termo) return produtos

    return produtos.filter((p) => {
      return (
        p.nome.toLowerCase().includes(termo) ||
        p.sku.toLowerCase().includes(termo) ||
        (p.marca || "").toLowerCase().includes(termo) ||
        (p.categoria || "").toLowerCase().includes(termo) ||
        (p.tipo || "").toLowerCase().includes(termo) ||
        (p.cor || "").toLowerCase().includes(termo) ||
        (p.tamanho || "").toLowerCase().includes(termo)
      )
    })
  }, [produtos, busca])

  const marcasSugestao = useMemo(() => {
  return [...new Set(produtos.map((p) => (p.marca || "").trim()).filter(Boolean))]
}, [produtos])

const categoriasSugestao = useMemo(() => {
  return [...new Set([...categorias, ...produtos.map((p) => (p.categoria || "").trim())].filter(Boolean))]
}, [produtos])

const tiposSugestao = useMemo(() => {
  return [...new Set(produtos.map((p) => (p.tipo || "").trim()).filter(Boolean))]
}, [produtos])

const coresSugestao = useMemo(() => {
  return [...new Set(produtos.map((p) => (p.cor || "").trim()).filter(Boolean))]
}, [produtos])

const tamanhosSugestao = useMemo(() => {
  return [...new Set(produtos.map((p) => (p.tamanho || "").trim()).filter(Boolean))]
}, [produtos])

const unidadesSugestao = useMemo(() => {
  return [...new Set([...unidades, ...produtos.map((p) => (p.unidade || "").trim())].filter(Boolean))]
}, [produtos])

  const custoPreview = Number(custo || 0)
const precoPreview = Number(preco || 0)
const lucroPreview = precoPreview - custoPreview
const margemPreview = precoPreview > 0 ? (lucroPreview / precoPreview) * 100 : 0
const markupPreview = custoPreview > 0 ? (lucroPreview / custoPreview) * 100 : 0

async function buscarNcm() {
  if (!nome.trim()) {
    setMensagem("Digite o nome do produto para sugerir o NCM.")
    return
  }

  try {
    setBuscandoNcm(true)
    const sugestoes = await suggestNcmByProductName({
  nome,
  categoria,
  tipo,
})
    setSugestoesNcm(sugestoes)

    if (sugestoes.length === 0) {
      setMensagem("Nenhuma sugestão de NCM encontrada para esse nome.")
    }
  } catch (error) {
    console.error(error)
    setMensagem("Erro ao buscar sugestões de NCM.")
  } finally {
    setBuscandoNcm(false)
  }
}

function selecionarNcm(item: { codigo: string; descricao: string }) {
  setNcm(item.codigo)

  if (!categoriaFiscal.trim()) {
    setCategoriaFiscal(item.descricao)
  }

  setSugestoesNcm([])
}

function abrirModalEntrada(produto: Produto) {
  setProdutoSelecionado(produto)
  setQuantidadeEntrada("")
  setCustoEntrada(produto.custo ? String(produto.custo) : "")
  setModalEntradaAberto(true)
}

function fecharModalEntrada() {
  setProdutoSelecionado(null)
  setQuantidadeEntrada("")
  setCustoEntrada("")
  setModalEntradaAberto(false)
}

async function salvarEntradaRapida() {
  if (!produtoSelecionado) return

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const quantidade = Number(quantidadeEntrada)
  const custo = custoEntrada ? Number(custoEntrada) : null

  if (quantidade <= 0) {
    alert("Informe uma quantidade válida.")
    return
  }

  setSalvandoEntrada(true)

  const resultado = await addStockQuick({
  productId: produtoSelecionado.id,
  userId: user.id,
  quantidade: Number(quantidade),
  custo: Number(custo || 0),
  motivo: "Entrada rápida pelo cadastro de produtos",
})

  setSalvandoEntrada(false)

  if (!resultado.success) {
    alert(resultado.message)
    return
  }

  fecharModalEntrada()
  await carregarProdutos()
}

  return (
    <div>
      <h2 className="page-title">Produtos</h2>
      <p className="page-subtitle">
        Cadastro e controle de produtos, marcas, categorias, custo e estoque.
      </p>

      <HelpBanner
        title="Como usar a página de Produtos"
        text="Cadastre aqui seus produtos com custo, preço, estoque e estoque mínimo. O sistema calcula lucro, margem e markup para ajudar na precificação e alerta quando o estoque estiver baixo."
      />

      {mensagem && !modalAberto && <p style={{ marginTop: 16 }}>{mensagem}</p>}

      <div className="page-actions">
        <button onClick={abrirNovoModal} className="btn btn-primary">
          + Novo produto
        </button>
      </div>

      <div className="table-toolbar">
        <input
          placeholder="Buscar por nome, SKU, marca, categoria ou tipo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ maxWidth: "420px" }}
        />
        <span className="info-muted">{produtosFiltrados.length} produto(s)</span>
      </div>

      <div className="data-table-wrap">
        <table style={tabela}>
          <thead>
            <tr>
              <th style={th}>SKU</th>
              <th style={th}>Produto</th>
              <th style={th}>Marca</th>
              <th style={th}>Categoria</th>
              <th style={th}>Tipo</th>
              <th style={th}>Unidade</th>
              <th style={th}>Estoque</th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Mínimo
                  <HelpTooltip text="Quantidade mínima para o sistema alertar necessidade de reposição." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Status
                  <HelpTooltip text="Mostra se o estoque está adequado ou abaixo do mínimo definido." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Custo
                  <HelpTooltip text="Valor que você paga para ter o produto em estoque." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Preço
                  <HelpTooltip text="Valor de venda do produto para o cliente." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Lucro
                  <HelpTooltip text="Diferença entre o preço de venda e o custo do produto." />
                </span>
              </th>
              <th style={th}>
                <span style={tituloComAjuda}>
                  Margem
                  <HelpTooltip text="Percentual do preço de venda que realmente vira lucro." />
                </span>
              </th>
              <th style={th}>
  <span style={tituloComAjuda}>
    Markup
    <HelpTooltip text="Percentual do lucro em relação ao custo do produto." />
  </span>
</th>

{mostrarTributacao && <th style={th}>Tributação</th>}

<th style={th}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {carregando ? (
              <TableSkeleton rows={6} cols={mostrarTributacao ? 16 : 15} />
            ) : produtosFiltrados.length > 0 ? (
              produtosFiltrados.map((p) => {
                const preco = Number(p.preco)
                const custo = Number(p.custo || 0)
                const lucro = preco - custo
                const margem = preco > 0 ? (lucro / preco) * 100 : 0
                const markup = custo > 0 ? (lucro / custo) * 100 : 0
                const estoqueBaixo =
                  Number(p.estoque) <= Number(p.estoque_minimo || 0)

                return (
                  <tr key={p.id}>
  <td style={td}>{p.sku}</td>
  <td style={td}>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <strong>{p.nome}</strong>
      {(p.cor || p.tamanho) && (
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {[p.cor, p.tamanho].filter(Boolean).join(" • ")}
        </span>
      )}
    </div>
  </td>
  <td style={td}>{p.marca || "-"}</td>
  <td style={td}>{p.categoria || "-"}</td>
  <td style={td}>{p.tipo || "-"}</td>
  <td style={td}>{p.unidade || "-"}</td>
  <td style={td}>{p.estoque}</td>
  <td style={td}>{p.estoque_minimo ?? 0}</td>
  <td style={td}>
    <span
      className={
        estoqueBaixo
          ? "status-pill status-red"
          : "status-pill status-green"
      }
    >
      {estoqueBaixo ? "Baixo" : "OK"}
    </span>
  </td>
  <td style={td}>R$ {custo.toFixed(2)}</td>
  <td style={td}>R$ {preco.toFixed(2)}</td>
  <td style={td}>R$ {lucro.toFixed(2)}</td>
  <td style={td}>{margem.toFixed(1)}%</td>
  <td style={td}>{markup.toFixed(1)}%</td>

  {mostrarTributacao && (
    <td style={td}>
      {p.usa_imposto_manual
        ? "Manual"
        : p.tax_rule_id
        ? "Configurada"
        : "Pendente"}
    </td>
  )}

  <td style={td}>
    <div style={acoesTabela}>
      <button
        onClick={() => editarProduto(p)}
        className="btn btn-success btn-sm"
      >
        Editar
      </button>

      <button
        onClick={() => excluirProduto(p.id)}
        className="btn btn-danger btn-sm"
      >
        Excluir
      </button>

      <button
        onClick={() => abrirModalEntrada(p)}
        className="btn btn-primary btn-sm"
      >
        + Entrada
      </button>
    </div>
  </td>
</tr>
                )
              })
            ) : (
              <tr>
                <td style={tdVazio} colSpan={mostrarTributacao ? 16 : 15}>
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatedModal
        open={modalAberto}
        onClose={fecharModal}
        title={idEmEdicao ? "Editar produto" : "Novo produto"}
        footer={
          <>
            <button onClick={fecharModal} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={salvarProduto} className="btn btn-primary">
              {idEmEdicao ? "Salvar alterações" : "Cadastrar produto"}
            </button>
          </>
        }
      >
        <>
          {mensagem && <p style={{ marginTop: 0 }}>{mensagem}</p>}

          <div style={{ marginBottom: 14, fontSize: 14, color: "#6b7280" }}>
            Preencha os dados do produto. Use custo e preço corretamente para acompanhar lucro, margem e markup.
          </div>

          <div className="grid-2">
            <div>
  <label style={labelAjuda}>
    Nome do produto
    <HelpTooltip text="Nome principal do produto que será exibido no sistema." />
  </label>
  <input
    placeholder="Nome do produto"
    value={nome}
    onChange={(e) => setNome(e.target.value)}
    style={erros.nome ? inputErroStyle : undefined}
  />
  {erros.nome && <div style={textoErroStyle}>{erros.nome}</div>}
</div>

            <div>
  <label style={labelAjuda}>
    Marca
    <HelpTooltip text="Marca do produto, útil para organização e relatórios." />
  </label>
  <input
    list="marcas-sugestao"
    placeholder="Marca"
    value={marca}
    onChange={(e) => setMarca(e.target.value)}
  />
  <datalist id="marcas-sugestao">
    {marcasSugestao.map((item) => (
      <option key={item} value={item} />
    ))}
  </datalist>
</div>

           <div>
  <label style={labelAjuda}>
    Categoria
    <HelpTooltip text="Categoria geral do produto, como roupas, acessórios ou calçados." />
  </label>
  <select
    value={categoria}
    onChange={(e) => setCategoria(e.target.value)}
    style={erros.categoria ? inputErroStyle : undefined}
  >
    <option value="">Selecione a categoria</option>
    {categoriasSugestao.map((item) => (
      <option key={item} value={item}>
        {item}
      </option>
    ))}
  </select>
  {erros.categoria && <div style={textoErroStyle}>{erros.categoria}</div>}
</div>

            <div>
  <label style={labelAjuda}>
    Tipo do produto
    <HelpTooltip text="Tipo específico do item, como camiseta, tênis, relógio, gel ou pochete." />
  </label>
  <input
    list="tipos-sugestao"
    placeholder="Tipo do produto"
    value={tipo}
    onChange={(e) => setTipo(e.target.value)}
    style={erros.tipo ? inputErroStyle : undefined}
  />
  <datalist id="tipos-sugestao">
    {tiposSugestao.map((item) => (
      <option key={item} value={item} />
    ))}
  </datalist>
  {erros.tipo && <div style={textoErroStyle}>{erros.tipo}</div>}
</div>

            <div>
  <label style={labelAjuda}>
    Unidade
    <HelpTooltip text="Forma de controle da quantidade, como unidade, par, caixa, sachê ou kit." />
  </label>
  <select value={unidade} onChange={(e) => setUnidade(e.target.value)}>
    {unidadesSugestao.map((item) => (
      <option key={item} value={item}>
        {item}
      </option>
    ))}
  </select>
</div>

            <div>
  <label style={labelAjuda}>
    Estoque
    <HelpTooltip text="Quantidade atual disponível desse produto no sistema." />
  </label>
  <input
    placeholder="Estoque"
    type="number"
    value={estoque}
    onChange={(e) => setEstoque(e.target.value)}
    style={erros.estoque ? inputErroStyle : undefined}
  />
  {erros.estoque && <div style={textoErroStyle}>{erros.estoque}</div>}
</div>

            <div>
              <label style={labelAjuda}>
                Estoque mínimo
                <HelpTooltip text="Quando o estoque ficar igual ou abaixo desse valor, o sistema alertará reposição." />
              </label>
              <input
                placeholder="Estoque mínimo"
                type="number"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
              />
            </div>

           <div>
  <label style={labelAjuda}>
    Custo
    <HelpTooltip text="Valor pago para comprar ou repor esse produto." />
  </label>
  <input
    placeholder="Custo"
    type="number"
    step="0.01"
    value={custo}
    onChange={(e) => setCusto(e.target.value)}
    style={erros.custo ? inputErroStyle : undefined}
  />
  {erros.custo && <div style={textoErroStyle}>{erros.custo}</div>}
</div>


            <div>
  <label style={labelAjuda}>
    Preço de venda
    <HelpTooltip text="Valor cobrado do cliente na venda desse produto." />
  </label>
  <input
    placeholder="Preço de venda"
    type="number"
    step="0.01"
    value={preco}
    onChange={(e) => setPreco(e.target.value)}
    style={erros.preco ? inputErroStyle : undefined}
  />
  {erros.preco && <div style={textoErroStyle}>{erros.preco}</div>}
</div>

            <div>
  <label style={labelAjuda}>
    Cor
    <HelpTooltip text="Cor do produto, quando isso for relevante para a venda." />
  </label>
  <input
    list="cores-sugestao"
    placeholder="Cor (opcional)"
    value={cor}
    onChange={(e) => setCor(e.target.value)}
  />
  <datalist id="cores-sugestao">
    {coresSugestao.map((item) => (
      <option key={item} value={item} />
    ))}
  </datalist>
</div>
            <div>
  <label style={labelAjuda}>
    Tamanho
    <HelpTooltip text="Tamanho do produto, quando isso for relevante para controle e venda." />
  </label>
  <input
    list="tamanhos-sugestao"
    placeholder="Tamanho (opcional)"
    value={tamanho}
    onChange={(e) => setTamanho(e.target.value)}
  />
  <datalist id="tamanhos-sugestao">
    {tamanhosSugestao.map((item) => (
      <option key={item} value={item} />
    ))}
  </datalist>
</div>
          </div>

          {mostrarTributacao && (
  <div
    style={{
      marginTop: 12,
      padding: "14px",
      borderRadius: "14px",
      border: "1px solid #e5e7eb",
      background: "#f8fafc",
    }}
  >
    <div
      style={{
        marginBottom: 10,
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      Tributação do produto
    </div>

    <div className="grid-2">
      <div>
  <label style={labelAjuda}>
    NCM
    <HelpTooltip text="Classificação fiscal do produto para cálculo tributário." />
  </label>
  <input
    placeholder="Ex: 6109.10.00"
    value={ncm}
    onChange={(e) => {
  const value = e.target.value
  setNome(value)

  if (value.length >= 3) {
    buscarNcm()
  } else {
    setSugestoesNcm([])
  }
}}
  />

  <div
    style={{
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginTop: 10,
      flexWrap: "wrap",
    }}
  >
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={buscarNcm}
      disabled={buscandoNcm}
    >
      {buscandoNcm ? "Buscando..." : "Sugerir NCM"}
    </button>

    <span style={{ fontSize: 12, color: "#6b7280" }}>
      Busca assistida com base local da NCM
    </span>
  </div>

  {sugestoesNcm.length > 0 && (
    <div
      style={{
        marginTop: 10,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {sugestoesNcm.map((item, index) => (
        <button
          key={`${item.codigo}-${index}`}
          type="button"
          onClick={() => selecionarNcm(item)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "12px 14px",
            border: "none",
            borderBottom: "1px solid #e5e7eb",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <div style={{ fontWeight: 700 }}>{item.codigo}</div>
          <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>
            {item.descricao}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            Relevância: {item.score}
          </div>
        </button>
      ))}
    </div>
  )}
</div>

<div>
  <label style={labelAjuda}>
    CEST
          <HelpTooltip text="Código CEST, quando aplicável ao produto." />
        </label>
        <input
          placeholder="Opcional"
          value={cest}
          onChange={(e) => setCest(e.target.value)}
        />
      </div>

      <div>
        <label style={labelAjuda}>
          Origem
          <HelpTooltip text="Origem do produto, se quiser controlar essa informação." />
        </label>
        <input
          placeholder="Ex: nacional"
          value={origem}
          onChange={(e) => setOrigem(e.target.value)}
        />
      </div>

      <div>
        <label style={labelAjuda}>
          Categoria fiscal
          <HelpTooltip text="Categoria fiscal usada para organização tributária." />
        </label>
        <input
          placeholder="Ex: vestuário"
          value={categoriaFiscal}
          onChange={(e) => setCategoriaFiscal(e.target.value)}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelAjuda}>
          Regra tributária
          <HelpTooltip text="Selecione a regra de CBS/IBS para este produto." />
        </label>
        <select
          value={taxRuleId}
          onChange={(e) => setTaxRuleId(e.target.value)}
          disabled={usaImpostoManual}
        >
          <option value="">Selecione uma regra</option>
          {taxRules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.nome}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div style={{ marginTop: 14 }}>
      <label style={labelAjuda}>
        <input
          type="checkbox"
          checked={usaImpostoManual}
          onChange={(e) => setUsaImpostoManual(e.target.checked)}
          style={{ marginRight: 10 }}
        />
        Usar imposto manual neste produto
      </label>
    </div>

    {usaImpostoManual && (
      <div className="grid-2" style={{ marginTop: 14 }}>
        <div>
          <label style={labelAjuda}>
            CBS manual (%)
            <HelpTooltip text="Alíquota manual de CBS para este produto." />
          </label>
          <input
            type="number"
            step="0.0001"
            placeholder="Ex: 0.9"
            value={cbsAliquotaManual}
            onChange={(e) => setCbsAliquotaManual(e.target.value)}
          />
        </div>

        <div>
          <label style={labelAjuda}>
            IBS manual (%)
            <HelpTooltip text="Alíquota manual de IBS para este produto." />
          </label>
          <input
            type="number"
            step="0.0001"
            placeholder="Ex: 0.1"
            value={ibsAliquotaManual}
            onChange={(e) => setIbsAliquotaManual(e.target.value)}
          />
        </div>
      </div>
    )}
  </div>
)}

          <div
            style={{
              marginTop: 12,
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                marginBottom: 10,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              
              Prévia da precificação
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "10px",
              }}
            >
              <div style={previewItem}>
                <span style={previewLabelComAjuda}>
                  Lucro
                  <HelpTooltip text="Diferença entre o preço de venda e o custo do produto." />
                </span>
                <strong>R$ {lucroPreview.toFixed(2)}</strong>
              </div>

              <div style={previewItem}>
                <span style={previewLabelComAjuda}>
                  Margem
                  <HelpTooltip text="Percentual do preço de venda que realmente vira lucro." />
                </span>
                <strong>{margemPreview.toFixed(1)}%</strong>
              </div>

              <div style={previewItem}>
                <span style={previewLabelComAjuda}>
                  Markup
                  <HelpTooltip text="Percentual do lucro em relação ao custo do produto." />
                </span>
                <strong>{markupPreview.toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </>
      </AnimatedModal>
      {/* 🔥 MODAL ENTRADA RÁPIDA */}
<AnimatedModal
  open={modalEntradaAberto}
  onClose={fecharModalEntrada}
  title="Entrada rápida de estoque"
  footer={
    <>
      <button onClick={fecharModalEntrada} className="btn btn-secondary">
        Cancelar
      </button>
      <button
        onClick={salvarEntradaRapida}
        className="btn btn-primary"
        disabled={salvandoEntrada}
      >
        {salvandoEntrada ? "Salvando..." : "Adicionar ao estoque"}
      </button>
    </>
  }
>
  <>
    {produtoSelecionado && (
      <div style={{ marginBottom: 16 }}>
        <strong>{produtoSelecionado.nome}</strong>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Estoque atual: {produtoSelecionado.estoque}
        </div>
      </div>
    )}

    <div className="grid-2">
      <div>
        <label>Quantidade</label>
        <input
          type="number"
          placeholder="Ex: 10"
          value={quantidadeEntrada}
          onChange={(e) => setQuantidadeEntrada(e.target.value)}
        />
      </div>

      <div>
        <label>Custo (opcional)</label>
        <input
          type="number"
          step="0.01"
          placeholder="Ex: 50.00"
          value={custoEntrada}
          onChange={(e) => setCustoEntrada(e.target.value)}
        />
      </div>
    </div>
  </>
</AnimatedModal>
    </div>
  )
}

const acoesTabela = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
}

const tabela = {
  width: "100%",
  borderCollapse: "collapse" as const,
}

const th = {
  textAlign: "left" as const,
  borderBottom: "1px solid #d1d5db",
  padding: "12px",
}

const td = {
  borderBottom: "1px solid #e5e7eb",
  padding: "12px",
}

const tdVazio = {
  borderBottom: "1px solid #e5e7eb",
  padding: "20px",
  textAlign: "center" as const,
  color: "#6b7280",
}

const previewItem = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "4px",
  padding: "10px 12px",
  borderRadius: "10px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
}

const previewLabelComAjuda = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: "12px",
  color: "#64748b",
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

const inputErroStyle = {
  border: "1px solid #ef4444",
  boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.10)",
}

const textoErroStyle = {
  marginTop: "6px",
  fontSize: "12px",
  color: "#dc2626",
}