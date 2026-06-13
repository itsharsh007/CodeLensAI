import { structuredCall } from './llm.js'
import type {
  ArchitectureReport,
  DependencyGraph,
  RefactorReport,
  RepoFile,
  SecurityReport,
} from './types.js'

const PER_FILE_CHAR_LIMIT = 300
const TOTAL_CHAR_BUDGET = 3_000

/** Compact code context: file list + truncated contents within a total budget. */
function buildCodeContext(files: RepoFile[], graph: DependencyGraph): string {
  const fileList = files.map((f) => f.path).join('\n')
  const edgeList = graph.edges.map((e) => `${e.source} -> ${e.target}`).join('\n')

  let budget = TOTAL_CHAR_BUDGET
  const chunks: string[] = []
  for (const file of files) {
    if (budget <= 0) break
    const slice = file.content.slice(0, Math.min(PER_FILE_CHAR_LIMIT, budget))
    budget -= slice.length
    chunks.push(`--- FILE: ${file.path} ---\n${slice}`)
  }

  return [
    `FILES (${files.length}):`,
    fileList,
    '',
    'IMPORT GRAPH (local imports between fetched files):',
    edgeList || '(no local imports resolved)',
    '',
    'FILE CONTENTS (truncated):',
    ...chunks,
  ].join('\n')
}

const JSON_ONLY =
  'Respond with a single valid JSON object only. No prose, no explanations, no markdown fences.'

export async function analyzeArchitecture(
  repoName: string,
  context: string,
): Promise<ArchitectureReport> {
  const prompt = `You are a senior software architect analyzing the GitHub repository "${repoName}".

${context}

Analyze the architecture and return JSON with exactly this shape:
{
  "summary": "2-4 sentence overview of what this codebase does and how it is structured",
  "components": [{ "name": "logical component name", "responsibility": "one sentence" }],
  "dataFlows": ["short sentence describing one data flow, e.g. 'HTTP request -> router -> controller -> DB'"]
}

Include 3-8 components and 2-6 dataFlows. ${JSON_ONLY}`
  return structuredCall<ArchitectureReport>(prompt, 800)
}

export async function analyzeSecurity(
  repoName: string,
  context: string,
): Promise<SecurityReport> {
  const prompt = `You are a security engineer performing a STRIDE threat-model review of the GitHub repository "${repoName}".

${context}

Return JSON with exactly this shape:
{
  "riskScore": <integer 0-100, overall risk for this codebase>,
  "threats": [{
    "id": "T1",
    "strideCategory": "Spoofing" | "Tampering" | "Repudiation" | "InfoDisclosure" | "DoS" | "ElevationOfPrivilege",
    "component": "affected component or file",
    "vector": "how the attack works",
    "severity": "critical" | "high" | "medium" | "low",
    "mitigation": "concrete fix"
  }],
  "findings": [{
    "severity": "critical" | "high" | "medium" | "low",
    "file": "path/from/the/file/list",
    "line": <best-guess line number, integer>,
    "issue": "specific code-level issue",
    "recommendation": "concrete fix"
  }]
}

Include 4-10 threats covering multiple STRIDE categories, and up to 10 concrete findings
referencing real files from the list. Be specific to THIS codebase, not generic. ${JSON_ONLY}`
  return structuredCall<SecurityReport>(prompt, 1200)
}

export async function analyzeRefactors(
  repoName: string,
  context: string,
): Promise<RefactorReport> {
  const prompt = `You are a staff engineer reviewing the GitHub repository "${repoName}" for code smells.

${context}

Find the ~10 most impactful code smells and return JSON with exactly this shape:
{
  "smells": [{
    "id": "S1",
    "file": "path/from/the/file/list",
    "issue": "short description of the smell",
    "originalSnippet": "the exact problematic code, copied from the file (keep under 40 lines)",
    "refactoredSnippet": "your improved version of that code",
    "rationale": "2-3 sentences on why the refactor is better"
  }]
}

Rules: originalSnippet must be real code from the files above (verbatim). Keep snippets focused —
the smallest unit that demonstrates the smell. Order by impact, most impactful first. ${JSON_ONLY}`
  return structuredCall<RefactorReport>(prompt, 1200)
}

export { buildCodeContext }
