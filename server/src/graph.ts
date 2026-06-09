import type { DependencyGraph, GraphNode, NodeType, RepoFile } from './types.js'

const JS_IMPORT_PATTERNS = [
  /import\s+[\w*{}\s,$]+\s+from\s+['"]([^'"]+)['"]/g, // import x from 'y'
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // dynamic import('y')
  /import\s+['"]([^'"]+)['"]/g, // side-effect import 'y'
  /export\s+[\w*{}\s,$]+\s+from\s+['"]([^'"]+)['"]/g, // export ... from 'y'
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // require('y')
]

const PY_IMPORT_PATTERNS = [
  /^\s*from\s+([.\w]+)\s+import\s+/gm, // from a.b import c
  /^\s*import\s+([\w.]+)/gm, // import a.b
]

function inferNodeType(path: string): NodeType {
  const file = path.split('/').pop() ?? path
  const lower = path.toLowerCase()

  if (
    /(^|[._-])(config|settings|rc)([._-]|\.)/.test(file.toLowerCase()) ||
    /\.(config|conf)\.[jt]sx?$/.test(file) ||
    /(vite|webpack|tailwind|eslint|babel|rollup|jest|vitest)\./.test(file.toLowerCase())
  ) {
    return 'config'
  }
  if (/\/(routes?|pages?|api|controllers?|views|endpoints?)\//.test(lower) || /router|route/.test(file.toLowerCase())) {
    return 'route'
  }
  if (
    /\/(components?|widgets|ui)\//.test(lower) ||
    ((path.endsWith('.tsx') || path.endsWith('.jsx')) && /^[A-Z]/.test(file))
  ) {
    return 'component'
  }
  if (/\/(utils?|lib|helpers?|hooks|common|shared|services?)\//.test(lower) || /^(utils?|helpers?)\./.test(file.toLowerCase())) {
    return 'util'
  }
  return 'other'
}

/** Resolve a relative JS/TS import specifier against the set of fetched file paths. */
function resolveJsImport(fromPath: string, spec: string, filePaths: Set<string>): string | null {
  if (!spec.startsWith('.')) return null // external package
  const dir = fromPath.split('/').slice(0, -1)
  const parts = spec.split('/')
  const stack = [...dir]
  for (const part of parts) {
    if (part === '.' || part === '') continue
    else if (part === '..') stack.pop()
    else stack.push(part)
  }
  const base = stack.join('/')
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
    // TS "NodeNext" style: import './x.js' resolving to x.ts
    base.replace(/\.js$/, '.ts'),
    base.replace(/\.jsx$/, '.tsx'),
  ]
  for (const candidate of candidates) {
    if (filePaths.has(candidate)) return candidate
  }
  return null
}

/** Resolve a Python import (absolute `a.b.c` or relative `.mod`) against fetched paths. */
function resolvePyImport(fromPath: string, spec: string, filePaths: Set<string>): string | null {
  let baseParts: string[]
  let moduleSpec = spec

  if (spec.startsWith('.')) {
    const dots = spec.match(/^\.+/)![0].length
    moduleSpec = spec.slice(dots)
    const dir = fromPath.split('/').slice(0, -1)
    baseParts = dir.slice(0, dir.length - (dots - 1))
  } else {
    baseParts = []
  }

  const modParts = moduleSpec ? moduleSpec.split('.') : []
  const base = [...baseParts, ...modParts].join('/')
  const candidates = [`${base}.py`, `${base}/__init__.py`]
  for (const candidate of candidates) {
    if (filePaths.has(candidate)) return candidate
  }
  return null
}

function extractSpecs(content: string, patterns: RegExp[]): string[] {
  const specs: string[] = []
  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(content)) !== null) {
      specs.push(match[1])
    }
  }
  return specs
}

export function buildGraph(files: RepoFile[]): DependencyGraph {
  const filePaths = new Set(files.map((f) => f.path))

  const nodes: GraphNode[] = files.map((f) => ({
    id: f.path,
    label: f.path.split('/').pop() ?? f.path,
    type: inferNodeType(f.path),
  }))

  const edgeSet = new Set<string>()
  for (const file of files) {
    const isPython = file.path.endsWith('.py')
    const specs = extractSpecs(file.content, isPython ? PY_IMPORT_PATTERNS : JS_IMPORT_PATTERNS)
    for (const spec of specs) {
      const target = isPython
        ? resolvePyImport(file.path, spec, filePaths)
        : resolveJsImport(file.path, spec, filePaths)
      if (target && target !== file.path) {
        edgeSet.add(`${file.path}\u0000${target}`)
      }
    }
  }

  const edges = [...edgeSet].map((key) => {
    const [source, target] = key.split('\u0000')
    return { source, target }
  })

  return { nodes, edges }
}
