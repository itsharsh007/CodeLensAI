import { randomBytes } from 'node:crypto'
import type { AnalysisResult } from './types.js'

const TTL_MS = 10 * 60 * 1000 // 10 minutes

interface Entry {
  result: AnalysisResult
  expiresAt: number
}

// Two views over the same entries: by repoUrl (analyze dedupe) and by id (share links)
const byRepoUrl = new Map<string, Entry>()
const byId = new Map<string, Entry>()

function sweep() {
  const now = Date.now()
  for (const [key, entry] of byRepoUrl) if (entry.expiresAt <= now) byRepoUrl.delete(key)
  for (const [key, entry] of byId) if (entry.expiresAt <= now) byId.delete(key)
}

setInterval(sweep, 60_000).unref()

export function newReportId(): string {
  return randomBytes(4).toString('hex')
}

export function cacheResult(result: AnalysisResult): void {
  const entry: Entry = { result, expiresAt: Date.now() + TTL_MS }
  byRepoUrl.set(result.repoUrl, entry)
  byId.set(result.id, entry)
}

export function getByRepoUrl(repoUrl: string): AnalysisResult | null {
  const entry = byRepoUrl.get(repoUrl)
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.result
}

export function getById(id: string): AnalysisResult | null {
  const entry = byId.get(id)
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.result
}
