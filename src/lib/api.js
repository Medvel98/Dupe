// Convert a data URL (data:image/jpeg;base64,XXXX) into { mimeType, base64 }
export function splitDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
  if (!m) return { mimeType: 'image/jpeg', base64: dataUrl }
  return { mimeType: m[1], base64: m[2] }
}

export async function analyzeImage(dataUrl) {
  const { mimeType, base64 } = splitDataUrl(dataUrl)
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  })
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('The server returned an unexpected response.')
  }
  if (!res.ok) throw new Error(data?.error || 'Analysis failed.')
  return data
}
