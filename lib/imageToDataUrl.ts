export async function imageUrlToDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null

  try {
    const response = await fetch(url)
    const blob = await response.blob()

    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}