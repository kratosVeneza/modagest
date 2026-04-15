"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { montarCabecalhoPDF } from "@/lib/pdfHeader"
import { imageUrlToDataUrl } from "@/lib/imageToDataUrl"

type Patient = {
  id: number
  nome: string
  telefone?: string | null
  email?: string | null
  data_inicio?: string | null
  ativo: boolean
}

type ProgressItem = {
  id: number
  patient_id: number
  data_registro: string
  titulo: string | null
  descricao: string
  observacoes: string | null
  profissional: string | null
  created_at: string
  patients?: {
    nome: string
  } | null
}

type Loja = {
  nome_loja?: string | null
  logo_url?: string | null
}

type StoreSettings = {
  professional_name?: string | null
  professional_registry?: string | null
  professional_registry_type?: string | null
}

export default function EvolucaoPage() {
    const [pacientes, setPacientes] = useState<Patient[]>([])
  const [evolucoes, setEvolucoes] = useState<ProgressItem[]>([])
  const [mensagem, setMensagem] = useState("")
  const [busca, setBusca] = useState("")
  const [nomeLoja, setNomeLoja] = useState("ModaGest")
  const [logoUrl, setLogoUrl] = useState("")
  const [dadosProfissional, setDadosProfissional] = useState<StoreSettings>({
    professional_name: "",
    professional_registry: "",
    professional_registry_type: "",
  })

  const [patientId, setPatientId] = useState("")
  const [dataRegistro, setDataRegistro] = useState("")
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [profissional, setProfissional] = useState("")

  useEffect(() => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, "0")
    const dia = String(hoje.getDate()).padStart(2, "0")
    setDataRegistro(`${ano}-${mes}-${dia}`)

    carregarDados()
  }, [])

  async function carregarDados() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

        const { data: lojaData } = await supabase
      .from("stores")
      .select("nome_loja, logo_url")
      .eq("user_id", user.id)
      .maybeSingle()

    const loja = (lojaData ?? null) as Loja | null

    if (loja?.nome_loja) setNomeLoja(loja.nome_loja)
    if (loja?.logo_url) setLogoUrl(loja.logo_url)

    const { data: settingsData } = await supabase
      .from("store_settings")
      .select("professional_name, professional_registry, professional_registry_type")
      .eq("user_id", user.id)
      .maybeSingle()

    setDadosProfissional((settingsData ?? {}) as StoreSettings)

       const { data: pacientesData, error: pacientesError } = await supabase
      .from("patients")
      .select("id, nome, telefone, email, data_inicio, ativo")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("nome", { ascending: true })

    if (pacientesError) {
      setMensagem("Erro ao carregar pacientes.")
      return
    }

    const { data: evolucoesData, error: evolucoesError } = await supabase
      .from("patient_progress")
      .select(`
        id,
        patient_id,
        data_registro,
        titulo,
        descricao,
        observacoes,
        profissional,
        created_at,
        patients (nome)
      `)
      .eq("user_id", user.id)
      .order("data_registro", { ascending: false })
      .order("created_at", { ascending: false })

    if (evolucoesError) {
      setMensagem("Erro ao carregar evolução dos pacientes.")
      return
    }

    setPacientes((pacientesData ?? []) as Patient[])
    setEvolucoes((evolucoesData ?? []) as unknown as ProgressItem[])
  }

  async function salvarEvolucao() {
    setMensagem("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensagem("Você precisa estar logado.")
      return
    }

    if (!patientId) {
      setMensagem("Selecione um paciente.")
      return
    }

    if (!dataRegistro) {
      setMensagem("Informe a data do registro.")
      return
    }

    if (!descricao.trim()) {
      setMensagem("Informe a descrição da evolução.")
      return
    }

    const { error } = await supabase.from("patient_progress").insert([
      {
        user_id: user.id,
        patient_id: Number(patientId),
        data_registro: dataRegistro,
        titulo: titulo.trim() || null,
        descricao: descricao.trim(),
        observacoes: observacoes.trim() || null,
        profissional: profissional.trim() || null,
      },
    ])

    if (error) {
      setMensagem(error.message || "Erro ao salvar evolução.")
      return
    }

    setPatientId("")
    setTitulo("")
    setDescricao("")
    setObservacoes("")
    setProfissional("")
    setMensagem("Evolução registrada com sucesso.")
    await carregarDados()
  }

    async function exportarPdfPaciente(patientIdSelecionado: number) {
    setMensagem("")

    const paciente = pacientes.find((p) => p.id === patientIdSelecionado)

    if (!paciente) {
      setMensagem("Paciente não encontrado.")
      return
    }

    const evolucoesPaciente = evolucoes
      .filter((e) => e.patient_id === patientIdSelecionado)
      .sort(
        (a, b) =>
          new Date(a.data_registro).getTime() - new Date(b.data_registro).getTime()
      )

    if (evolucoesPaciente.length === 0) {
      setMensagem("Esse paciente ainda não possui evolução registrada.")
      return
    }

    const doc = new jsPDF()
    const logoDataUrl = await imageUrlToDataUrl(logoUrl)

    const startY = await montarCabecalhoPDF({
      doc,
      titulo: "Relatório de Evolução do Paciente",
      nomeLoja,
      logoDataUrl,
    })

    let y = startY

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("Dados do paciente", 14, y)

    y += 8
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Nome: ${paciente.nome}`, 14, y)
    y += 6
    doc.text(`Telefone: ${paciente.telefone || "-"}`, 14, y)
    y += 6
    doc.text(`E-mail: ${paciente.email || "-"}`, 14, y)
    y += 6
    doc.text(
      `Data de entrada: ${
        paciente.data_inicio
          ? new Date(`${paciente.data_inicio}T12:00:00`).toLocaleDateString("pt-BR")
          : "-"
      }`,
      14,
      y
    )

    y += 10

    autoTable(doc, {
      startY: y,
      head: [["Data", "Título", "Descrição", "Observações", "Profissional"]],
      body: evolucoesPaciente.map((item) => [
        new Date(`${item.data_registro}T12:00:00`).toLocaleDateString("pt-BR"),
        item.titulo || "-",
        item.descricao,
        item.observacoes || "-",
        item.profissional || "-",
      ]),
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: {
        fillColor: [37, 99, 235],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 30 },
        2: { cellWidth: 58 },
        3: { cellWidth: 45 },
        4: { cellWidth: 28 },
      },
    })

    const finalY = (doc as any).lastAutoTable?.finalY || y + 20

    const assinaturaY = finalY + 20

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text("Assinatura do profissional:", 14, assinaturaY)

    doc.line(14, assinaturaY + 18, 100, assinaturaY + 18)

    const nomeProfissional = dadosProfissional.professional_name || "Profissional responsável"
    const tipoRegistro = dadosProfissional.professional_registry_type || "Registro"
    const numeroRegistro = dadosProfissional.professional_registry || "-"

    doc.text(nomeProfissional, 14, assinaturaY + 24)
    doc.text(`${tipoRegistro}: ${numeroRegistro}`, 14, assinaturaY + 30)

    const nomeArquivo = `evolucao_${paciente.nome.replace(/\s+/g, "_").toLowerCase()}.pdf`
    doc.save(nomeArquivo)
  }

  const evolucoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return evolucoes

    return evolucoes.filter((e) => {
      return (
        (e.patients?.nome || "").toLowerCase().includes(termo) ||
        (e.titulo || "").toLowerCase().includes(termo) ||
        e.descricao.toLowerCase().includes(termo) ||
        (e.profissional || "").toLowerCase().includes(termo)
      )
    })
  }, [evolucoes, busca])

  return (
    <div>
      <h2 className="page-title">Evolução</h2>
      <p className="page-subtitle">
        Registre a evolução clínica dos pacientes e mantenha histórico organizado.
      </p>

      {mensagem && <p>{mensagem}</p>}

      <div className="section-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Nova evolução</h3>

        <div className="grid-2">
          <div>
            <label>Paciente</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecione</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Data do registro</label>
            <input
              type="date"
              value={dataRegistro}
              onChange={(e) => setDataRegistro(e.target.value)}
            />
          </div>

          <div>
            <label>Título</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Reavaliação, sessão 1, retorno"
            />
          </div>

          <div>
            <label>Profissional</label>
            <input
              value={profissional}
              onChange={(e) => setProfissional(e.target.value)}
              placeholder="Nome do profissional"
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>Descrição da evolução</label>
            <textarea
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a evolução do paciente..."
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>Observações</label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações complementares"
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={salvarEvolucao} className="btn btn-primary">
            Salvar evolução
          </button>
        </div>
      </div>

      <div className="section-card">
        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Buscar por paciente, título, descrição ou profissional"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="data-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
                <tr>
                <th style={th}>Paciente</th>
                <th style={th}>Data</th>
                <th style={th}>Título</th>
                <th style={th}>Descrição</th>
                <th style={th}>Observações</th>
                <th style={th}>Profissional</th>
                <th style={th}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {evolucoesFiltradas.map((item) => (
                                <tr key={item.id}>
                  <td style={td}>{item.patients?.nome || "-"}</td>
                  <td style={td}>
                    {new Date(`${item.data_registro}T12:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={td}>{item.titulo || "-"}</td>
                  <td style={td}>{item.descricao}</td>
                  <td style={td}>{item.observacoes || "-"}</td>
                  <td style={td}>{item.profissional || "-"}</td>
                  <td style={td}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => exportarPdfPaciente(item.patient_id)}
                    >
                      Gerar PDF
                    </button>
                  </td>
                </tr>
              ))}

              {evolucoesFiltradas.length === 0 && (
                <tr>
                  <td style={td} colSpan={7}>
                    Nenhuma evolução encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const th = {
  textAlign: "left" as const,
  borderBottom: "1px solid #d1d5db",
  padding: "12px",
}

const td = {
  borderBottom: "1px solid #e5e7eb",
  padding: "12px",
  verticalAlign: "top" as const,
}