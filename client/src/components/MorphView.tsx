import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AnalysisResult, Smell } from '../types'
import { diffLines } from '../diff'

export default function MorphView({ result }: { result: AnalysisResult }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const refactor = result.refactor

  if (!refactor) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
        <p className="text-sm font-medium text-neutral-700">Refactor analysis unavailable</p>
        <p className="mt-1 text-sm text-neutral-500">
          {result.aiErrors.refactor ?? 'The AI refactor call did not return a result.'}
        </p>
      </div>
    )
  }

  if (refactor.smells.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center text-sm text-neutral-500">
        No significant code smells found. Nice codebase!
      </div>
    )
  }

  const selected = refactor.smells.find((s) => s.id === selectedId)

  return (
    <div className="space-y-3">
      {refactor.smells.map((smell, i) => (
        <motion.div
          key={smell.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
        >
          <button
            onClick={() => setSelectedId(selectedId === smell.id ? null : smell.id)}
            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-neutral-50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">{smell.issue}</p>
              <p className="mt-0.5 font-mono text-xs text-neutral-500">{smell.file}</p>
            </div>
            <span
              className={`shrink-0 text-neutral-400 transition-transform ${
                selectedId === smell.id ? 'rotate-90' : ''
              }`}
            >
              ›
            </span>
          </button>
          <AnimatePresence initial={false}>
            {selected?.id === smell.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <SmellDetail smell={smell} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}

function SmellDetail({ smell }: { smell: Smell }) {
  const rows = useMemo(
    () => diffLines(smell.originalSnippet, smell.refactoredSnippet),
    [smell],
  )
  const [copied, setCopied] = useState(false)

  const copyRefactored = async () => {
    try {
      await navigator.clipboard.writeText(smell.refactoredSnippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API unavailable (e.g. http) — select-and-copy fallback not worth it here
    }
  }

  return (
    <div className="border-t border-neutral-200">
      <div className="grid grid-cols-2 border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        <div className="border-r border-neutral-200 px-4 py-2">Original</div>
        <div className="flex items-center justify-between px-4 py-2">
          <span>Refactored</span>
          <button
            onClick={copyRefactored}
            className="rounded-md border border-neutral-300 px-2 py-1 font-sans text-[11px] font-medium normal-case tracking-normal text-neutral-600 transition hover:border-accent hover:text-accent"
          >
            {copied ? '✓ Copied' : 'Copy refactored code'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed font-mono text-xs leading-5">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td
                  className={`w-1/2 whitespace-pre-wrap break-all border-r border-neutral-200 px-4 align-top ${
                    row.kind === 'removed' || row.kind === 'changed'
                      ? 'bg-red-50 text-red-900'
                      : row.left === null
                        ? 'bg-neutral-50'
                        : 'text-neutral-700'
                  }`}
                >
                  {row.left ?? ''}
                </td>
                <td
                  className={`w-1/2 whitespace-pre-wrap break-all px-4 align-top ${
                    row.kind === 'added' || row.kind === 'changed'
                      ? 'bg-emerald-50 text-emerald-900'
                      : row.right === null
                        ? 'bg-neutral-50'
                        : 'text-neutral-700'
                  }`}
                >
                  {row.right ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Why this is better
        </h4>
        <p className="mt-1 text-sm text-neutral-700">{smell.rationale}</p>
      </div>
    </div>
  )
}
