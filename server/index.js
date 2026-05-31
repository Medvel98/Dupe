import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'

const PORT = process.env.API_PORT || 3001
const API_KEY = process.env.GEMINI_API_KEY

if (!API_KEY) {
  console.warn('\n[dupe] GEMINI_API_KEY is not set. Copy .env.example to .env and add a free key from https://aistudio.google.com/apikey\n')
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null
const app = express()
app.use(cors())
app.use(express.json({ limit: '12mb' }))

const JSON_SHAPE = `{
  "product": { "name": string, "category": string, "estPrice": number, "currency": string, "note": string },
  "alternatives": [
    { "name": string, "price": number, "currency": string, "store": string, "savingsPct": number, "why": string }
  ]
}
Rules:
- prices are numbers only. currency is a 3-letter ISO code like "USD".
- savingsPct is an integer percentage saved versus the original estPrice.
- "why" is one short sentence on why it's a good cheaper swap.
- If you cannot identify the product, set product.name to "Unknown" and return an empty alternatives array.`

const IMAGE_PROMPT = `You are a savvy shopping assistant that finds cheaper alternatives ("dupes") for products.

Look at the product in the image. Then:
1. Identify the product as specifically as you can (brand + model if visible).
2. Use web search to find its current typical retail price.
3. Use web search to find 3 to 5 REAL, currently-available cheaper alternatives. Prefer well-known retailers. Each must genuinely cost less than the original.

Respond with ONLY a JSON object (no prose, no markdown fences) of exactly this shape:
${JSON_SHAPE}`

function textPrompt(productName) {
  return `You are a savvy shopping assistant that finds cheaper alternatives ("dupes") for products.

The product to research is: "${productName}"

1. Use web search to find its current typical retail price.
2. Use web search to find 3 to 5 REAL, currently-available cheaper alternatives. Prefer well-known retailers. Each must genuinely cost less than the original.

Respond with ONLY a JSON object (no prose, no markdown fences) of exactly this shape:
${JSON_SHAPE}`
}

function extractJson(text) {
  if (!text) return null
  let t = text.trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first === -1 || last === -1) return null
  try { return JSON.parse(t.slice(first, last + 1)) } catch { return null }
}

function normalize(data) {
  const product = data?.product || {}
  let alternatives = Array.isArray(data?.alternatives) ? data.alternatives : []
  alternatives = alternatives
    .map((a) => ({
      name: String(a.name || 'Alternative'),
      price: Number(a.price) || 0,
      currency: String(a.currency || product.currency || 'USD'),
      store: String(a.store || ''),
      savingsPct: Number(a.savingsPct) || 0,
      why: String(a.why || ''),
    }))
    .sort((a, b) => b.savingsPct - a.savingsPct)
  return {
    product: {
      name: String(product.name || 'Unknown'),
      category: String(product.category || ''),
      estPrice: Number(product.estPrice) || 0,
      currency: String(product.currency || 'USD'),
      note: String(product.note || ''),
    },
    alternatives,
  }
}

app.post('/api/analyze', async (req, res) => {
  try {
    if (!ai) return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to dupe/.env and restart.' })

    const { imageBase64, mimeType, productName } = req.body || {}
    if (!imageBase64 && !productName) return res.status(400).json({ error: 'Provide imageBase64 or productName.' })

    const parts = imageBase64
      ? [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
          { text: IMAGE_PROMPT },
        ]
      : [{ text: textPrompt(productName) }]

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: { tools: [{ googleSearch: {} }], temperature: 0.4 },
    })

    const parsed = extractJson(response.text || '')
    if (!parsed) return res.status(502).json({ error: 'Could not read a result from the model. Try a clearer photo.' })

    const result = normalize(parsed)
    const sources = []
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    for (const c of chunks) {
      const uri = c?.web?.uri
      if (uri) sources.push({ uri, title: c?.web?.title || uri })
    }

    res.json({ ...result, sources })
  } catch (err) {
    const raw = err?.message || String(err)
    console.error('[dupe] analyze error:', raw)
    const status = String(err?.status || /\b(\d{3})\b/.exec(raw)?.[1])
    if (status === '429') return res.status(429).json({ error: 'Gemini quota exceeded. Wait a moment and retry.' })
    if (status === '401' || status === '403') return res.status(401).json({ error: 'Invalid GEMINI_API_KEY.' })
    res.status(500).json({ error: 'Analysis failed. Please try again.' })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true, hasKey: !!API_KEY }))
app.listen(PORT, () => console.log(`[dupe] server listening on http://localhost:${PORT}`))
