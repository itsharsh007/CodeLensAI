import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript'
import ts from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript'
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python'
import { githubGist } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import type { AnalysisResult, Smell } from '../types'
import { diffLines } from '../diff'

SyntaxHighlighter.registerLanguage('javascript', js)
SyntaxHighlighter.registerLanguage('typescript', ts)
SyntaxHighlighter.registerLanguage('python', python)

function detectLang(file: string): string {
  if (file.endsWith('.py')) return 'python'
  if (file.endsWith('.ts') || file.endsWith('.tsx')) return 'typescript'
  return 'javascript'
}

type ViewMode = 'diff' | 'code'

export default function MorphView({ result }: { result: AnalysisResult }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fileFilter, setFileFilter] = useState<string>('all')
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

  const uniqueFiles = [...new Set(refactor.smells.map((s) => s.file))]
  const filtered = fileFilter === 'all' ? refactor.smells : refactor.smells.filter((s) => s.file === fileFilter)
  const totalLines = refactor.smells.reduce(
    (acc, s) => acc + s.originalSnippet.split('\n').length,
    0,
  )

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="grid grid-cols-3 gap-4 rounded-xl border border-neutral-200 bg-white p-4">
        <Stat label="Smells found" value={refactor.smells.length} />
        <Stat label="Files affected" value={uniqueFiles.length} />
        <Stat label="Lines reviewed" value={totalLines} />
      </div>

      {/* File filter */}
      {uniqueFiles.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <FileChip label="All files" active={fileFilter === 'all'} onClick={() => setFileFilter('all')} />
          {uniqueFiles.map((f) => (
            <FileChip
              key={f}
              label={f.split('/').pop() ?? f}
              title={f}
              active={fileFilter === f}
              onClick={() => setFileFilter(fileFilter === f ? 'all' : f)}
            />
          ))}
        </div>
      )}

      {/* Smell list */}
      <div className="space-y-3">
        {filtered.map((smell, i) => (
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
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-500">
                  #{i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{smell.issue}</p>
                  <p className="mt-0.5 font-mono text-xs text-neutral-500">{smell.file}</p>
                </div>
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
              {selectedId === smell.id && (
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
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold tabular-nums text-neutral-900">{value}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{label}</div>
    </div>
  )
}

function FileChip({
  label,
  title,
  active,
  onClick,
}: {
  label: string
  title?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-full border px-2.5 py-0.5 font-mono text-xs transition ${
        active
          ? 'border-accent bg-accent text-white'
          : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
      }`}
    >
      {label}
    </button>
  )
}

function SmellDetail({ smell }: { smell: Smell }) {
  const rows = useMemo(() => diffLines(smell.originalSnippet, smell.refactoredSnippet), [smell])
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('diff')
  const lang = detectLang(smell.file)

  const copyRefactored = async () => {
    try {
      await navigator.clipboard.writeText(smell.refactoredSnippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="border-t border-neutral-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2">
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-0.5">
          <ViewTab active={viewMode === 'diff'} onClick={() => setViewMode('diff')}>Diff</ViewTab>
          <ViewTab active={viewMode === 'code'} onClick={() => setViewMode('code')}>Code</ViewTab>
        </div>
        <button
          onClick={copyRefactored}
          className="rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-accent hover:text-accent"
        >
          {copied ? '✓ Copied' : 'Copy refactored'}
        </button>
      </div>

      {viewMode === 'diff' ? (
        <>
          <div className="grid grid-cols-2 border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            <div className="border-r border-neutral-200 px-4 py-2">Original</div>
            <div className="px-4 py-2">Refactored</div>
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
        </>
      ) : (
        <div className="grid grid-cols-2 divide-x divide-neutral-200">
          <div>
            <div className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Original
            </div>
            <SyntaxHighlighter
              language={lang}
              style={githubGist}
              customStyle={{ margin: 0, fontSize: '12px', background: '#fafafa', padding: '16px' }}
              wrapLongLines
            >
              {smell.originalSnippet}
            </SyntaxHighlighter>
          </div>
          <div>
            <div className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Refactored
            </div>
            <SyntaxHighlighter
              language={lang}
              style={githubGist}
              customStyle={{ margin: 0, fontSize: '12px', background: '#f0fdf4', padding: '16px' }}
              wrapLongLines
            >
              {smell.refactoredSnippet}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Why this is better
        </h4>
        <p className="mt-1 text-sm text-neutral-700">{smell.rationale}</p>
      </div>
    </div>
  )
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-medium transition ${
        active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
      }`}
    >
      {children}
    </button>
  )
}
