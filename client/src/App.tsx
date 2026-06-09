import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { analyzeRepo, fetchReport } from './api'
import type { AnalysisResult } from './types'
import Loader from './components/Loader'
import Results from './components/Results'

type Phase =
  | { name: 'idle' }
  | { name: 'loading' }
  | { name: 'done'; result: AnalysisResult; readOnly: boolean }
  | { name: 'error'; message: string }

function sharedReportId(): string | null {
  const match = window.location.pathname.match(/^\/r\/([0-9a-f]+)$/i)
  return match ? match[1] : null
}

export default function App() {
  const [repoUrl, setRepoUrl] = useState('')
  const reportId = sharedReportId()
  const [phase, setPhase] = useState<Phase>(reportId ? { name: 'loading' } : { name: 'idle' })

  // Shared link: load the saved report read-only
  useEffect(() => {
    if (!reportId) return
    fetchReport(reportId)
      .then((result) => setPhase({ name: 'done', result, readOnly: true }))
      .catch((err: Error) => setPhase({ name: 'error', message: err.message }))
  }, [reportId])

  const analyze = async () => {
    if (!repoUrl.trim()) return
    setPhase({ name: 'loading' })
    try {
      const result = await analyzeRepo(repoUrl.trim())
      setPhase({ name: 'done', result, readOnly: false })
    } catch (err) {
      setPhase({ name: 'error', message: (err as Error).message })
    }
  }

  const reset = () => {
    if (reportId) window.history.pushState({}, '', '/')
    setPhase({ name: 'idle' })
    setRepoUrl('')
  }

  const showHero = phase.name === 'idle' || phase.name === 'error' || (phase.name === 'loading' && !reportId)

  return (
    <main className="min-h-screen">
      {phase.name === 'done' ? (
        <>
          <div className="border-b border-neutral-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
              <button onClick={reset} className="text-sm font-semibold tracking-tight">
                CodeLens<span className="text-accent"> AI</span>
              </button>
              <button onClick={reset} className="text-sm text-neutral-500 hover:text-neutral-900">
                Analyze another repo
              </button>
            </div>
          </div>
          <Results result={phase.result} readOnly={phase.readOnly} />
        </>
      ) : (
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
          {showHero && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full max-w-2xl text-center"
            >
              <h1 className="text-5xl font-semibold tracking-tight text-neutral-900">
                CodeLens<span className="text-accent"> AI</span>
              </h1>
              <p className="mt-4 text-lg text-neutral-500">
                See any GitHub repo through three lenses — architecture, threats, and refactors.
              </p>

              {phase.name !== 'loading' && (
                <form
                  className="mt-10 flex items-center gap-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void analyze()
                  }}
                >
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="h-12 flex-1 rounded-lg border border-neutral-300 bg-white px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  <button
                    type="submit"
                    disabled={!repoUrl.trim()}
                    className="h-12 rounded-lg bg-accent px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Analyze
                  </button>
                </form>
              )}

              {phase.name === 'error' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {phase.message}
                  {reportId && (
                    <button onClick={reset} className="ml-2 font-medium underline">
                      Start a new analysis
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {phase.name === 'loading' && <Loader done={false} />}
        </div>
      )}
    </main>
  )
}
