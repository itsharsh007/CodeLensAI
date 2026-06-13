import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_MODEL = 'gemini-2.0-flash'

let client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in server/.env — AI lenses are unavailable.')
  }
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return client
}

export async function callLLM(prompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    generationConfig: { responseMimeType: 'application/json' },
  })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export function parseStrictJson<T>(raw: string): T {
  let text = raw.trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) text = fenced[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model output')
  }
  return JSON.parse(text.slice(start, end + 1)) as T
}

export async function structuredCall<T>(prompt: string): Promise<T> {
  const first = await callLLM(prompt)
  try {
    return parseStrictJson<T>(first)
  } catch {
    const retry = await callLLM(
      `${prompt}\n\nIMPORTANT: your previous answer was not valid JSON. Respond with a single valid JSON object only — no prose, no markdown fences.`,
    )
    return parseStrictJson<T>(retry)
  }
}
