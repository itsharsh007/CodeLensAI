import { useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  type Edge,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { AnimatePresence, motion } from 'framer-motion'
import type { AnalysisResult, NodeType } from '../types'

const TYPE_COLORS: Record<NodeType, string> = {
  component: '#0d9488', // teal
  route: '#7c3aed', // violet
  util: '#2563eb', // blue
  config: '#d97706', // amber
  other: '#64748b', // slate
}

const TYPE_LABELS: Record<NodeType, string> = {
  component: 'Component',
  route: 'Route',
  util: 'Util',
  config: 'Config',
  other: 'Other',
}

/** Layered left-to-right layout: column = longest path from a root. */
function layoutNodes(result: AnalysisResult): Node[] {
  const { nodes, edges } = result.graph
  const incoming = new Map<string, number>()
  const outgoingAdj = new Map<string, string[]>()
  nodes.forEach((n) => incoming.set(n.id, 0))
  edges.forEach((e) => {
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1)
    outgoingAdj.set(e.source, [...(outgoingAdj.get(e.source) ?? []), e.target])
  })

  // Longest-path level assignment via Kahn-style BFS (cycles fall back to level 0)
  const level = new Map<string, number>()
  const indegree = new Map(incoming)
  const queue = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id)
  queue.forEach((id) => level.set(id, 0))
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const next of outgoingAdj.get(id) ?? []) {
      level.set(next, Math.max(level.get(next) ?? 0, (level.get(id) ?? 0) + 1))
      indegree.set(next, (indegree.get(next) ?? 1) - 1)
      if ((indegree.get(next) ?? 0) === 0) queue.push(next)
    }
  }

  const byLevel = new Map<number, string[]>()
  nodes.forEach((n) => {
    const l = level.get(n.id) ?? 0
    byLevel.set(l, [...(byLevel.get(l) ?? []), n.id])
  })

  const X_GAP = 260
  const Y_GAP = 70
  const positions = new Map<string, { x: number; y: number }>()
  for (const [l, ids] of byLevel) {
    ids.sort()
    ids.forEach((id, row) => {
      positions.set(id, { x: l * X_GAP, y: row * Y_GAP - (ids.length * Y_GAP) / 2 })
    })
  }

  return nodes.map((n) => ({
    id: n.id,
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: { label: n.label },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: {
      background: '#ffffff',
      border: `2px solid ${TYPE_COLORS[n.type]}`,
      borderRadius: 8,
      fontSize: 12,
      padding: '6px 10px',
      color: '#171717',
    },
  }))
}

export default function MapView({ result }: { result: AnalysisResult }) {
  const [selected, setSelected] = useState<string | null>(null)

  const nodes = useMemo(() => layoutNodes(result), [result])
  const edges: Edge[] = useMemo(
    () =>
      result.graph.edges.map((e) => ({
        id: `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { stroke: '#a3a3a3' },
      })),
    [result],
  )

  const selectedNode = result.graph.nodes.find((n) => n.id === selected)
  // Best-effort match between graph file node and AI architecture components
  const aiComponent = result.architecture?.components.find(
    (c) =>
      selectedNode &&
      (c.name.toLowerCase().includes(selectedNode.label.replace(/\.\w+$/, '').toLowerCase()) ||
        selectedNode.id.toLowerCase().includes(c.name.toLowerCase())),
  )

  if (result.graph.nodes.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-neutral-500">
        No source files were found to map.
      </div>
    )
  }

  return (
    <div className="relative h-[640px] overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_e, node) => setSelected(node.id)}
        onPaneClick={() => setSelected(null)}
        fitView
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e5e5" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const graphNode = result.graph.nodes.find((n) => n.id === node.id)
            return graphNode ? TYPE_COLORS[graphNode.type] : '#64748b'
          }}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute left-3 top-3 flex flex-wrap gap-3 rounded-lg border border-neutral-200 bg-white/90 px-3 py-2 text-xs backdrop-blur">
        {(Object.keys(TYPE_COLORS) as NodeType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLORS[type] }} />
            {TYPE_LABELS[type]}
          </span>
        ))}
      </div>

      {/* Side drawer */}
      <AnimatePresence>
        {selectedNode && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            className="absolute right-0 top-0 flex h-full w-80 flex-col gap-4 overflow-y-auto border-l border-neutral-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="break-all font-mono text-sm font-semibold text-neutral-900">
                {selectedNode.id}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-neutral-400 hover:text-neutral-700"
                aria-label="Close drawer"
              >
                ✕
              </button>
            </div>
            <span
              className="inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ background: TYPE_COLORS[selectedNode.type] }}
            >
              {TYPE_LABELS[selectedNode.type]}
            </span>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                AI summary
              </h4>
              {aiComponent ? (
                <p className="text-sm text-neutral-700">
                  <span className="font-medium">{aiComponent.name}.</span>{' '}
                  {aiComponent.responsibility}
                </p>
              ) : result.architecture ? (
                <p className="text-sm text-neutral-500">
                  No component-level summary for this file. Repo overview:{' '}
                  {result.architecture.summary}
                </p>
              ) : (
                <p className="text-sm text-neutral-400 italic">
                  AI architecture summary unavailable
                  {result.aiErrors.architecture ? ` — ${result.aiErrors.architecture}` : '.'}
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Dependencies
              </h4>
              <ul className="space-y-1 font-mono text-xs text-neutral-600">
                {result.graph.edges
                  .filter((e) => e.source === selectedNode.id)
                  .map((e) => (
                    <li key={e.target}>→ {e.target}</li>
                  ))}
                {result.graph.edges
                  .filter((e) => e.target === selectedNode.id)
                  .map((e) => (
                    <li key={e.source}>← {e.source}</li>
                  ))}
                {result.graph.edges.every(
                  (e) => e.source !== selectedNode.id && e.target !== selectedNode.id,
                ) && <li className="italic text-neutral-400">No local imports</li>}
              </ul>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
