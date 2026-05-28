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

const PROMPT = `You are a savvy shopping assistant that finds cheaper alternatives ("dupes") for products.

Look at the product in the image. Then:
1. Identify the product as specifically as you can (brand + model if visible).
2. Use web search to find its current typical retail price.
3. Use web search to find 3 to 5 REAL, currently-available cheaper alternatives that serve the same purpose. Prefer well-known products and retailers. Each must be genuinely cheaper than the original.
4. For each alternative include a real product/store URL you found via search.

Respond with ONLY a JSON object (no prose, no markdown fences) of exactly this shape:
{
  "product": { "name": string, "category": string, "estPrice": number, "currency": string, "note": string },
  "alternatives": [
    { "name": string, "price": number, "currency": string, "store": string, "url": string, "savingsPct": number, "why": string }
  ]
}
Rules:
- prices are numbers only (no currency symbols). currency is a 3-letter code like "USD".
- savingsPct is an integer percentage saved versus the original estPrice.
- "why" is one short sentence on why it's a good cheaper swap.
- If you cannot identify the product, set product.name to "Unknown" and return an empty alternatives array.`

function extractJson(text) {
  if (!text) return null
  let t = text.trim()
  // strip markdown code fences if present
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  // grab the outermost JSON object
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first === -1 || last === -1) return null
  const slice = t.slice(first, last + 1)
  try {
    return JSON.parse(slice)
  } catch {
    return null
  }
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
      url: typeof a.url === 'string' ? a.url : '',
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
    if (!ai) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to dupe/.env and restart.' })
    }
    const { imageBase64, mimeType } = req.body || {}
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 is required.' })
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
            { text: PROMPT },
          ],
        },
      ],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
      },
    })

    const text = response.text || ''
    const parsed = extractJson(text)
    if (!parsed) {
      return res.status(502).json({ error: 'Could not read a result from the model. Try a clearer photo.' })
    }

    const result = normalize(parsed)

    // grounding source URLs, if any
    const sources = []
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    for (const c of chunks) {
      const uri = c?.web?.uri
      const title = c?.web?.title
      if (uri) sources.push({ uri, title: title || uri })
    }

    res.json({ ...result, sources })
  } catch (err) {
    const raw = err?.message || String(err)
    console.error('[dupe] analyze error:', raw)
    const status = err?.status || /\b(\d{3})\b/.exec(raw)?.[1]
    if (String(status) === '429') {
      return res.status(429).json({
        error: 'Gemini quota exceeded for this API key (free-tier limit reached). Wait a minute and retry, or use a key with available quota.',
      })
    }
    if (String(status) === '401' || String(status) === '403') {
      return res.status(401).json({ error: 'Gemini rejected the API key. Check GEMINI_API_KEY in dupe/.env.' })
    }
    res.status(500).json({ error: 'Analysis failed. Please try again.' })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true, hasKey: !!API_KEY }))

app.listen(PORT, () => {
  console.log(`[dupe] server listening on http://localhost:${PORT}`)
})
