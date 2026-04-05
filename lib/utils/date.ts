export function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

export function montarDataISO(dataInput: string) {
  if (!dataInput) return new Date().toISOString()
  return new Date(`${dataInput}T12:00:00-03:00`).toISOString()
}
