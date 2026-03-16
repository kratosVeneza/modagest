import jsPDF from "jspdf"

type HeaderParams = {
  doc: jsPDF
  titulo: string
  nomeLoja?: string
  logoDataUrl?: string | null
}

export async function montarCabecalhoPDF({
  doc,
  titulo,
  nomeLoja,
  logoDataUrl,
}: HeaderParams) {
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 14, 12, 22, 22)
    } catch {
      // se a imagem falhar, segue sem logo
    }
  }

  const xTexto = logoDataUrl ? 42 : 14

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(nomeLoja || "ModaGest", xTexto, 20)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(14)
  doc.text(titulo, xTexto, 28)

  doc.setFontSize(10)
  doc.text(
    `Emitido em: ${new Date().toLocaleString("pt-BR")}`,
    xTexto,
    35
  )

  doc.setDrawColor(220, 220, 220)
  doc.line(14, 40, 196, 40)

  return 46
}