import type { AnalysisResult } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function parseResponse(res: Response): Promise<AnalysisResult> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new Error(`Server returned an unreadable response (HTTP ${res.status}).`)
  }
  if (!res.ok) {
    const message = (body as { error?: string }).error ?? `Request failed (HTTP ${res.status}).`
    throw new Error(message)
  }
  return body as AnalysisResult
}

export async function analyzeRepo(repoUrl: string): Promise<AnalysisResult> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl }),
    })
  } catch {
    throw new Error('Cannot reach the CodeLens server. Is it running on port 3001?')
  }
  return parseResponse(res)
}

export async function fetchReport(id: string): Promise<AnalysisResult> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/report/${encodeURIComponent(id)}`)
  } catch {
    throw new Error('Cannot reach the CodeLens server. Is it running on port 3001?')
  }
  return parseResponse(res)
}
