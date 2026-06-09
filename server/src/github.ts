import { Octokit } from '@octokit/rest'
import type { RepoFile } from './types.js'

const SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py']
const SKIP_DIRS = ['node_modules/', 'dist/', 'build/', 'vendor/', '.next/', 'out/', 'coverage/']
const MAX_FILES = 50
const MAX_FILE_BYTES = 200_000 // skip generated/bundled monsters

export class RepoError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const trimmed = repoUrl.trim()
  // Accept https://github.com/owner/repo(.git)(/...) or bare owner/repo
  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i,
  )
  const bareMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/)
  const m = urlMatch ?? bareMatch
  if (!m) {
    throw new RepoError(400, 'Invalid repo URL. Expected https://github.com/owner/repo')
  }
  return { owner: m[1], repo: m[2] }
}

function isSourceFile(path: string): boolean {
  if (SKIP_DIRS.some((dir) => path.includes(dir))) return false
  if (path.endsWith('.d.ts') || path.endsWith('.min.js')) return false
  return SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext))
}

function mapOctokitError(err: unknown): RepoError {
  const status = (err as { status?: number }).status
  if (status === 404) {
    return new RepoError(404, 'Repo not found — it may be private or the URL is wrong.')
  }
  if (status === 403 || status === 429) {
    return new RepoError(
      429,
      'GitHub rate limit reached. Add a GITHUB_TOKEN to server/.env or try again later.',
    )
  }
  if (status === 401) {
    return new RepoError(401, 'GitHub token is invalid. Check GITHUB_TOKEN in server/.env.')
  }
  return new RepoError(502, `GitHub request failed: ${(err as Error).message ?? 'unknown error'}`)
}

export async function fetchRepoFiles(
  owner: string,
  repo: string,
): Promise<{ files: RepoFile[]; defaultBranch: string }> {
  const octokit = new Octokit(
    process.env.GITHUB_TOKEN ? { auth: process.env.GITHUB_TOKEN } : {},
  )

  let defaultBranch: string
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo })
    defaultBranch = data.default_branch
  } catch (err) {
    throw mapOctokitError(err)
  }

  let tree
  try {
    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: '1',
    })
    tree = data.tree
  } catch (err) {
    throw mapOctokitError(err)
  }

  const candidates = tree
    .filter(
      (item) =>
        item.type === 'blob' &&
        item.path !== undefined &&
        item.sha !== undefined &&
        isSourceFile(item.path) &&
        (item.size ?? 0) <= MAX_FILE_BYTES,
    )
    // Prefer shallow paths so the 50-file budget covers the core of the repo
    .sort((a, b) => {
      const depthA = a.path!.split('/').length
      const depthB = b.path!.split('/').length
      return depthA - depthB || a.path!.localeCompare(b.path!)
    })
    .slice(0, MAX_FILES)

  if (candidates.length === 0) {
    throw new RepoError(422, 'No JavaScript, TypeScript, or Python source files found in this repo.')
  }

  const files = await Promise.all(
    candidates.map(async (item) => {
      try {
        const { data } = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: item.sha!,
        })
        const content = Buffer.from(data.content, 'base64').toString('utf8')
        return { path: item.path!, content }
      } catch (err) {
        throw mapOctokitError(err)
      }
    }),
  )

  return { files, defaultBranch }
}
