import { useState } from 'react'
import { motion } from 'framer-motion'

function App() {
  const [repoUrl, setRepoUrl] = useState('')

  const handleAnalyze = () => {
    // Wired up to POST /api/analyze in Phase 1
    console.log('Analyze:', repoUrl)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
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

        <form
          className="mt-10 flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            handleAnalyze()
          }}
        >
          <input
            type="url"
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
      </motion.div>
    </main>
  )
}

export default App
