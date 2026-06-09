import Anthropic from '@anthropic-ai/sdk'

// NOTE: the spec named claude-sonnet-4-20250514, which is deprecated and retires
// on 2026-06-15. claude-sonnet-4-6 is its official drop-in replacement.
const DEFAULT_MODEL = 'claude-sonnet-4-6'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in server/.env — AI lenses are unavailable.')
  }
  if (!client) client = new Anthropic()
  return client
}

/**
 * Single LLM entry point. Swap the provider (Gemini/Groq/OpenAI/...) by replacing
 * the body of this function — nothing else in the codebase touches an AI SDK.
 */
export async function callLLM(prompt: string, maxTokens = 8192): Promise<string> {
  const response = await getClient().messages.create({
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
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
