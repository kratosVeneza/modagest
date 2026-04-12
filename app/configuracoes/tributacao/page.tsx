"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { getStoreSettings } from "@/lib/settings/getStoreSettings"
import { updateStoreSettings } from "@/lib/settings/updateStoreSettings"

type ModoTributario = "controle_simples" | "reforma_2026"

export default function ConfiguracaoTributariaPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [usarModuloTributario, setUsarModuloTributario] = useState(false)
  const [modoTributario, setModoTributario] =
    useState<ModoTributario>("controle_simples")
  const [exigirConfigFiscalProduto, setExigirConfigFiscalProduto] =
    useState(false)
  const [calcularImpostoNaVenda, setCalcularImpostoNaVenda] =
    useState(false)

  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const currentUserId = session?.user?.id || null
        setUserId(currentUserId)

        if (!currentUserId) {
          setMensagem("Usuário não autenticado.")
          return
        }

        const settings = await getStoreSettings(currentUserId)

        setUsarModuloTributario(settings.usar_modulo_tributario)
        setModoTributario(settings.modo_tributario)
        setExigirConfigFiscalProduto(settings.exigir_config_fiscal_produto)
        setCalcularImpostoNaVenda(settings.calcular_imposto_na_venda)
      } catch (error) {
        setMensagem(
          error instanceof Error
            ? error.message
            : "Erro ao carregar configurações."
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  function selecionarControleSimples() {
    setUsarModuloTributario(false)
    setModoTributario("controle_simples")
    setExigirConfigFiscalProduto(false)
    setCalcularImpostoNaVenda(false)
  }

  function selecionarReforma2026() {
    setUsarModuloTributario(true)
    setModoTributario("reforma_2026")
    setExigirConfigFiscalProduto(false)
    setCalcularImpostoNaVenda(true)
  }

  async function handleSave() {
    if (!userId) return

    setSaving(true)
    setMensagem("")

    try {
      await updateStoreSettings({
        userId,
        usar_modulo_tributario: usarModuloTributario,
        modo_tributario: modoTributario,
        exigir_config_fiscal_produto: exigirConfigFiscalProduto,
        calcular_imposto_na_venda: calcularImpostoNaVenda,
      })

      setMensagem("Configurações tributárias salvas com sucesso.")
    } catch (error) {
      setMensagem(
        error instanceof Error ? error.message : "Erro ao salvar configurações."
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando configurações...</div>
  }

  return (
    <div style={{ padding: 24, maxWidth: 920 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Tributação
      </h1>

      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Escolha se deseja usar o sistema apenas para controle ou com cálculo
        tributário da reforma.
      </p>

      <div style={cardStyle}>
        <h2 style={titleStyle}>Como deseja usar o sistema?</h2>

        <div style={optionBoxStyle(modoTributario === "controle_simples")}>
          <label style={{ display: "block", cursor: "pointer" }}>
            <input
              type="radio"
              name="modo"
              checked={modoTributario === "controle_simples"}
              onChange={selecionarControleSimples}
              style={{ marginRight: 10 }}
            />
            <strong>Controle simples</strong>
          </label>

          <p style={descStyle}>
            Ideal para quem quer apenas controlar estoque, compras, vendas e
            financeiro, sem cálculo de impostos.
          </p>
        </div>

        <div style={optionBoxStyle(modoTributario === "reforma_2026")}>
          <label style={{ display: "block", cursor: "pointer" }}>
            <input
              type="radio"
              name="modo"
              checked={modoTributario === "reforma_2026"}
              onChange={selecionarReforma2026}
              style={{ marginRight: 10 }}
            />
            <strong>Reforma tributária 2026</strong>
          </label>

          <p style={descStyle}>
            Ativa o módulo tributário para configurar regras fiscais no produto
            e calcular impostos na venda.
          </p>
        </div>

        {modoTributario === "reforma_2026" && (
          <div
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={exigirConfigFiscalProduto}
                onChange={(e) =>
                  setExigirConfigFiscalProduto(e.target.checked)
                }
                style={{ marginRight: 10 }}
              />
              Exigir configuração fiscal no cadastro de produto
            </label>

            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={calcularImpostoNaVenda}
                onChange={(e) => setCalcularImpostoNaVenda(e.target.checked)}
                style={{ marginRight: 10 }}
              />
              Calcular impostos automaticamente na venda
            </label>
          </div>
        )}

        <button onClick={handleSave} disabled={saving} style={buttonStyle}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>

        {mensagem && <p style={{ marginTop: 16 }}>{mensagem}</p>}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
}

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 20,
}

const descStyle: React.CSSProperties = {
  color: "#6b7280",
  marginTop: 8,
  marginLeft: 24,
}

const checkboxLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 14,
  cursor: "pointer",
}

const buttonStyle: React.CSSProperties = {
  marginTop: 20,
  background: "#111827",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  cursor: "pointer",
  fontWeight: 600,
}

function optionBoxStyle(active: boolean): React.CSSProperties {
  return {
    border: active ? "2px solid #111827" : "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    background: active ? "#f9fafb" : "#fff",
  }
}