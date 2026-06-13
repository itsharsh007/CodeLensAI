import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AnalysisResult } from '../types'
import MapView from './MapView'
import GuardView from './GuardView'
import MorphView from './MorphView'

type Tab = 'map' | 'guard' | 'morph'

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'map', label: 'Map', hint: 'Architecture' },
  { id: 'guard', label: 'Guard', hint: 'Threat model' },
  { id: 'morph', label: 'Morph', hint: 'Refactors' },
]

function downloadJson(result: AnalysisResult) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.repoName.replace('/', '-')}-report.json`
  a.click()
  URL.revokeObjectURL(url)
}

function toMarkdown(result: AnalysisResult): string {
  const lines: string[] = []
  const repo = result.repoName

  lines.push(`# CodeLens AI Report — ${repo}`)
  lines.push(`> Generated ${new Date(result.createdAt).toUTCString()}`)
  lines.push('')

  // Architecture
  if (result.architecture) {
    lines.push('## 🗺️ Architecture')
    lines.push(result.architecture.summary)
    lines.push('')
    lines.push('### Components')
    for (const c of result.architecture.components)
      lines.push(`- **${c.name}** — ${c.responsibility}`)
    lines.push('')
    lines.push('### Data Flows')
    for (const f of result.architecture.dataFlows) lines.push(`- ${f}`)
    lines.push('')
  }

  // Security
  if (result.security) {
    lines.push(`## 🛡️ Security (Risk Score: ${result.security.riskScore}/100)`)
    lines.push('')
    lines.push('### Threats')
    for (const t of result.security.threats)
      lines.push(`- **[${t.severity.toUpperCase()}] ${t.id} — ${t.strideCategory}** (${t.component})\n  - Vector: ${t.vector}\n  - Mitigation: ${t.mitigation}`)
    lines.push('')
    lines.push('### Findings')
    for (const f of result.security.findings)
      lines.push(`- **[${f.severity.toUpperCase()}]** \`${f.file}:${f.line}\` — ${f.issue}\n  - Fix: ${f.recommendation}`)
    lines.push('')
  }

  // Refactors
  if (result.refactor) {
    lines.push('## 🔬 Refactors')
    for (const s of result.refactor.smells) {
      lines.push(`### ${s.id} — ${s.issue}`)
      lines.push(`**File:** \`${s.file}\``)
      lines.push(`**Rationale:** ${s.rationale}`)
      lines.push('```')
      lines.push('// Before')
      lines.push(s.originalSnippet)
      lines.push('```')
      lines.push('```')
      lines.push('// After')
      lines.push(s.refactoredSnippet)
      lines.push('```')
      lines.push('')
    }
  }

  return lines.join('\n')
}

function downloadMarkdown(result: AnalysisResult) {
  const blob = new Blob([toMarkdown(result)], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.repoName.replace('/', '-')}-report.md`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Results({
  result,
  readOnly,
}: {
  result: AnalysisResult
  readOnly: boolean
}) {
  const [tab, setTab] = useState<Tab>('map')
  const [shareCopied, setShareCopied] = useState(false)

  const share = async () => {
    const url = `${window.location.origin}/r/${result.id}`
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1800)
    } catch {
      window.prompt('Copy this share link:', url)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-6xl px-6 pb-20"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 py-6">
        <div>
          <h2 className="font-mono text-lg font-semibold text-neutral-900">{result.repoName}</h2>
          {result.architecture && (
            <p className="mt-1 max-w-3xl text-sm text-neutral-600">
              {result.architecture.summary}
            </p>
          )}
          {readOnly && (
            <span className="mt-2 inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
              Shared report · read-only
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadJson(result)}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-accent hover:text-accent"
            >
              ↓ JSON
            </button>
            <button
              onClick={() => downloadMarkdown(result)}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-accent hover:text-accent"
            >
              ↓ Markdown
            </button>
            <button
              onClick={share}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-accent hover:text-accent"
            >
              {shareCopied ? '✓ Link copied' : 'Share'}
            </button>
          </div>
        )}
      </header>

      <div className="mb-6 flex gap-1 rounded-xl border border-neutral-200 bg-white p-1">
        {TABS.map(({ id, label, hint }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === id ? 'text-white' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {tab === id && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-lg bg-accent"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">
              {label} <span className="hidden font-normal opacity-70 sm:inline">· {hint}</span>
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'map' && <MapView result={result} />}
          {tab === 'guard' && <GuardView result={result} />}
          {tab === 'morph' && <MorphView result={result} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
