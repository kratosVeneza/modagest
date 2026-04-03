"use client"

import { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type ResultadoIA =
  | {
      tipo: "venda"
      produtoTexto: string
      clienteTexto: string
      quantidade: number
      valorRecebido: number
      formaPagamento: string
      observacao: string
      data: string
    }
  | {
      tipo: "cliente"
      nome: string
      telefone: string
      email: string
      cidade: string
    }
  | {
      tipo: "loja"
      nomeLoja: string
      responsavel: string
      telefone: string
      cidade: string
    }
  | {
      tipo: "desconhecido"
      texto: string
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

function interpretarTextoLivre(texto: string): ResultadoIA {
  const t = texto.trim()

  const lower = t.toLowerCase()

  if (lower.includes("minha loja se chama")) {
    const nomeLoja = t.split(/minha loja se chama/i)[1]?.trim() || ""
    return {
      tipo: "loja",
      nomeLoja,
      responsavel: "",
      telefone: "",
      cidade: "",
    }
  }

  if (lower.includes("cadastre cliente")) {
    const nome = t.split(/cadastre cliente/i)[1]?.trim() || ""
    return {
      tipo: "cliente",
      nome,
      telefone: "",
      email: "",
      cidade: "",
    }
  }

  if (lower.includes("vendi")) {
    const quantidadeMatch = lower.match(/vendi\s+(\d+)/i)
    const quantidade = Number(quantidadeMatch?.[1] || 1)

    let formaPagamento = "Pix"
    const formaEncontrada = formasPagamento.find((forma) =>
      lower.includes(forma.toLowerCase())
    )
    if (formaEncontrada) formaPagamento = formaEncontrada

    const recebidoMatch =
      lower.match(/recebi\s+(\d+[.,]?\d*)/i) ||
      lower.match(/recebido\s+(\d+[.,]?\d*)/i)

    const valorRecebido = recebidoMatch
      ? Number(recebidoMatch[1].replace(",", "."))
      : 0

    const clienteMatch =
      t.match(/para\s+([a-zà-ú0-9\s]+?)(?:,| e recebi| recebi|$)/i) || null

    const clienteTexto = clienteMatch?.[1]?.trim() || ""

    let produtoTexto = t
      .replace(/vendi\s+\d+/i, "")
      .replace(/para\s+[a-zà-ú0-9\s]+?($|,| e recebi| recebi)/i, "")
      .replace(/recebi\s+\d+[.,]?\d*/i, "")
      .replace(/dinheiro|pix|cartão de débito|cartão de crédito|transferência|outro/gi, "")
      .trim()

    produtoTexto = produtoTexto.replace(/\s+/g, " ").trim()

    return {
      tipo: "venda",
      produtoTexto,
      clienteTexto,
      quantidade,
      valorRecebido,
      formaPagamento,
      observacao: "",
      data: hojeInputDate(),
    }
  }

  return {
    tipo: "desconhecido",
    texto: t,
  }
}

export default function AssistenteIAPage() {
  const [texto, setTexto] = useState("")
  const [resultado, setResultado] = useState<ResultadoIA | null>(null)
  const [mensagem, setMensagem] = useState("")
  const [salvando, setSalvando] = useState(false)

  const titulo = useMemo(() => {
    if (!resultado) return "Assistente IA"
    if (resultado.tipo === "venda") return "Sugestão de venda"
    if (resultado.tipo === "cliente") return "Sugestão de cliente"
    if (resultado.tipo === "loja") return "Sugestão de loja"
    return "Texto não reconhecido"
  }, [resultado])

  function interpretar() {
    setMensagem("")
    if (!texto.trim()) {
      setMensagem("Digite uma instrução para a IA interpretar.")
      return
    }

    const resposta = interpretarTextoLivre(texto)
    setResultado(resposta)
  }

  async function confirmarAcao() {
    if (!resultado) return

    setMensagem("")
    setSalvando(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSalvando(false)
      setMensagem("Você precisa estar logado.")
      return
    }

    if (resultado.tipo === "cliente") {
      const { error } = await supabase.from("customers").insert([
        {
          user_id: user.id,
          nome: resultado.nome,
          telefone: resultado.telefone,
          email: resultado.email,
          cidade: resultado.cidade,
        },
      ])

      setSalvando(false)

      if (error) {
        setMensagem(error.message || "Erro ao cadastrar cliente.")
        return
      }

      setMensagem("Cliente cadastrado com sucesso.")
      setTexto("")
      setResultado(null)
      return
    }

    if (resultado.tipo === "loja") {
      const { data: lojaExistente } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (lojaExistente?.id) {
        const { error } = await supabase
          .from("stores")
          .update({
            nome_loja: resultado.nomeLoja,
            responsavel: resultado.responsavel,
            telefone: resultado.telefone,
            cidade: resultado.cidade,
          })
          .eq("id", lojaExistente.id)
          .eq("user_id", user.id)

        setSalvando(false)

        if (error) {
          setMensagem(error.message || "Erro ao atualizar loja.")
          return
        }

        setMensagem("Loja atualizada com sucesso.")
        setTexto("")
        setResultado(null)
        return
      }

      const { error } = await supabase.from("stores").insert([
        {
          user_id: user.id,
          nome_loja: resultado.nomeLoja,
          responsavel: resultado.responsavel,
          telefone: resultado.telefone,
          cidade: resultado.cidade,
        },
      ])

      setSalvando(false)

      if (error) {
        setMensagem(error.message || "Erro ao cadastrar loja.")
        return
      }

      setMensagem("Loja cadastrada com sucesso.")
      setTexto("")
      setResultado(null)
      return
    }

    if (resultado.tipo === "venda") {
      setSalvando(false)
      setMensagem(
        "Primeira versão pronta. A interpretação já funciona. Agora vamos conectar a sugestão com os produtos reais da sua base."
      )
      return
    }

    setSalvando(false)
    setMensagem("A IA não conseguiu entender esse texto.")
  }

  return (
    <div>
      <h2 className="page-title">Assistente IA</h2>
      <p className="page-subtitle">
        Digite o que deseja fazer. A IA interpreta e sugere o lançamento antes de salvar.
      </p>

      {mensagem && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            fontWeight: 600,
          }}
        >
          {mensagem}
        </div>
      )}

      <div className="section-card" style={{ marginTop: 20 }}>
        <div style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
          Exemplos:
          <br />
          • vendi 2 meias pretas para Arlene e recebi 30 no pix
          <br />
          • cadastre cliente Maria de Nazaré
          <br />
          • minha loja se chama Moda Run
        </div>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite aqui o que deseja que a IA faça..."
          style={{ minHeight: 120 }}
        />

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={interpretar} className="btn btn-primary">
            Interpretar com IA
          </button>

          <button
            onClick={() => {
              setTexto("")
              setResultado(null)
              setMensagem("")
            }}
            className="btn btn-secondary"
          >
            Limpar
          </button>
        </div>
      </div>

      {resultado && (
        <div className="section-card" style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>{titulo}</h3>

          <pre
            style={{
              background: "#0f172a",
              color: "#e5e7eb",
              padding: 16,
              borderRadius: 12,
              overflowX: "auto",
              fontSize: 13,
            }}
          >
            {JSON.stringify(resultado, null, 2)}
          </pre>

          {resultado.tipo !== "desconhecido" && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={confirmarAcao}
                className="btn btn-success"
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Confirmar ação"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
