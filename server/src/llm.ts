import Groq from 'groq-sdk'

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

let client: Groq | null = null

function getClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in server/.env — AI lenses are unavailable.')
  }
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
}

/** Single LLM entry point — swap provider by replacing this function only. */
export async function callLLM(prompt: string, maxTokens = 8192): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: process.env.GROQ_MODEL || DEFAULT_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.choices[0]?.message?.content ?? ''
}

/** Strip markdown fences / surrounding prose and parse the first JSON object. */
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

/** Run a structured call: parse strictly, retry once with a stern reminder on failure. */
export async function structuredCall<T>(prompt: string, maxTokens = 8192): Promise<T> {
  const first = await callLLM(prompt, maxTokens)
  try {
    return parseStrictJson<T>(first)
  } catch {
    const retry = await callLLM(
      `${prompt}\n\nIMPORTANT: your previous answer was not valid JSON. Respond with a single valid JSON object only — no prose, no markdown fences.`,
      maxTokens,
    )
    return parseStrictJson<T>(retry)
  }
}
