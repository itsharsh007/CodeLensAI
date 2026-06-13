import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fetchRepoFiles, parseRepoUrl, RepoError } from './github.js'
import { buildGraph } from './graph.js'
import {
  analyzeArchitecture,
  analyzeRefactors,
  analyzeSecurity,
  buildCodeContext,
} from './analysis.js'
import { cacheResult, getById, getByRepoUrl, newReportId } from './cache.js'
import type { AnalysisResult } from './types.js'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

// Allow local dev + production client (set CLIENT_URL env var on Render)
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
    ],
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/analyze', async (req, res) => {
  const { repoUrl } = req.body ?? {}
  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    res.status(400).json({ error: 'Missing repoUrl in request body.' })
    return
  }

  try {
    const { owner, repo } = parseRepoUrl(repoUrl)
    const canonicalUrl = `https://github.com/${owner}/${repo}`

    const cached = getByRepoUrl(canonicalUrl)
    if (cached) {
      res.json(cached)
      return
    }

    const { files } = await fetchRepoFiles(owner, repo)
    const graph = buildGraph(files)
    const repoName = `${owner}/${repo}`
    const context = buildCodeContext(files, graph)

    // Sequential calls to stay within Groq free-tier TPM limits
    const settled = async <T>(fn: () => Promise<T>): Promise<PromiseSettledResult<T>> => {
      try { return { status: 'fulfilled', value: await fn() } }
      catch (reason) { return { status: 'rejected', reason } }
    }
    const architecture = await settled(() => analyzeArchitecture(repoName, context))
    const security     = await settled(() => analyzeSecurity(repoName, context))
    const refactor     = await settled(() => analyzeRefactors(repoName, context))

    const aiErrors: AnalysisResult['aiErrors'] = {}
    if (architecture.status === 'rejected') {
      aiErrors.architecture = String(architecture.reason?.message ?? architecture.reason)
      console.error('[analyze] architecture call failed:', architecture.reason)
    }
    if (security.status === 'rejected') {
      aiErrors.security = String(security.reason?.message ?? security.reason)
      console.error('[analyze] security call failed:', security.reason)
    }
    if (refactor.status === 'rejected') {
      aiErrors.refactor = String(refactor.reason?.message ?? refactor.reason)
      console.error('[analyze] refactor call failed:', refactor.reason)
    }

    const result: AnalysisResult = {
      id: newReportId(),
      repoUrl: canonicalUrl,
      repoName,
      createdAt: new Date().toISOString(),
      graph,
      files: files.map((f) => ({ path: f.path })),
      architecture: architecture.status === 'fulfilled' ? architecture.value : null,
      security: security.status === 'fulfilled' ? security.value : null,
      refactor: refactor.status === 'fulfilled' ? refactor.value : null,
      aiErrors,
    }

    cacheResult(result)
    res.json(result)
  } catch (err) {
    if (err instanceof RepoError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    console.error('[analyze] unexpected error:', err)
    res.status(500).json({ error: 'Analysis failed unexpectedly. Check server logs.' })
  }
})

app.get('/api/report/:id', (req, res) => {
  const result = getById(req.params.id)
  if (!result) {
    res.status(404).json({ error: 'Report not found or expired (reports live for 10 minutes).' })
    return
  }
  res.json(result)
})

app.listen(PORT, () => {
  console.log(`CodeLens AI server listening on http://localhost:${PORT}`)
})
