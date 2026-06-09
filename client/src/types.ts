export type NodeType = 'component' | 'route' | 'util' | 'config' | 'other'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
}

export interface GraphEdge {
  source: string
  target: string
}

export interface DependencyGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface ArchitectureReport {
  summary: string
  components: { name: string; responsibility: string }[]
  dataFlows: string[]
}

export type StrideCategory =
  | 'Spoofing'
  | 'Tampering'
  | 'Repudiation'
  | 'InfoDisclosure'
  | 'DoS'
  | 'ElevationOfPrivilege'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface Threat {
  id: string
  strideCategory: StrideCategory
  component: string
  vector: string
  severity: Severity
  mitigation: string
}

export interface Finding {
  severity: Severity
  file: string
  line: number
  issue: string
  recommendation: string
}

export interface SecurityReport {
  riskScore: number
  threats: Threat[]
  findings: Finding[]
}

export interface Smell {
  id: string
  file: string
  issue: string
  originalSnippet: string
  refactoredSnippet: string
  rationale: string
}

export interface RefactorReport {
  smells: Smell[]
}

export interface AnalysisResult {
  id: string
  repoUrl: string
  repoName: string
  createdAt: string
  graph: DependencyGraph
  files: { path: string }[]
  architecture: ArchitectureReport | null
  security: SecurityReport | null
  refactor: RefactorReport | null
  aiErrors: { architecture?: string; security?: string; refactor?: string }
}
