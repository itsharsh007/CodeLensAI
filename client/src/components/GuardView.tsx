import { useState } from 'react'
import { motion } from 'framer-motion'
import type { AnalysisResult, Severity, StrideCategory, Threat } from '../types'
import { SeverityBadge } from './Badge'

const STRIDE_ORDER: StrideCategory[] = [
  'Spoofing',
  'Tampering',
  'Repudiation',
  'InfoDisclosure',
  'DoS',
  'ElevationOfPrivilege',
]

const STRIDE_LABELS: Record<StrideCategory, string> = {
  Spoofing: 'Spoofing',
  Tampering: 'Tampering',
  Repudiation: 'Repudiation',
  InfoDisclosure: 'Information Disclosure',
  DoS: 'Denial of Service',
  ElevationOfPrivilege: 'Elevation of Privilege',
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low']

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#059669',
}

function riskColor(score: number): string {
  if (score >= 70) return '#dc2626'
  if (score >= 40) return '#d97706'
  return '#059669'
}

function riskLabel(score: number): string {
  if (score >= 70) return 'High Risk'
  if (score >= 40) return 'Moderate Risk'
  return 'Low Risk'
}

function RiskGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const r = 80
  const cx = 100
  const cy = 95
  const angle = Math.PI * (1 - clamped / 100)
  const needleX = cx + r * 0.72 * Math.cos(angle)
  const needleY = cy - r * 0.72 * Math.sin(angle)

  const arc = (from: number, to: number, color: string) => {
    const a1 = Math.PI * (1 - from / 100)
    const a2 = Math.PI * (1 - to / 100)
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy - r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2)
    const y2 = cy - r * Math.sin(a2)
    return (
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={14}
        strokeLinecap="round"
      />
    )
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={200} height={110} viewBox="0 0 200 110">
        {arc(0, 38, '#059669')}
        {arc(40, 68, '#d97706')}
        {arc(70, 100, '#dc2626')}
        <motion.line
          x1={cx}
          y1={cy}
          initial={{ x2: cx - r * 0.72, y2: cy }}
          animate={{ x2: needleX, y2: needleY }}
          transition={{ type: 'spring', stiffness: 60, damping: 12, delay: 0.2 }}
          stroke="#171717"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="#171717" />
      </svg>
      <div className="-mt-2 text-center">
        <div className="text-4xl font-bold tabular-nums" style={{ color: riskColor(clamped) }}>
          {clamped}
          <span className="text-lg text-neutral-400">/100</span>
        </div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-widest" style={{ color: riskColor(clamped) }}>
          {riskLabel(clamped)}
        </div>
      </div>
    </div>
  )
}

function SeverityBar({ findings }: { findings: AnalysisResult['security'] }) {
  if (!findings) return null
  const counts = SEVERITY_ORDER.map((sev) => ({
    sev,
    count: findings.findings.filter((f) => f.severity === sev).length,
  }))
  const total = counts.reduce((s, c) => s + c.count, 0)
  if (total === 0) return null

  return (
    <div className="w-full">
      <div className="mb-2 flex h-2.5 overflow-hidden rounded-full bg-neutral-100">
        {counts.map(({ sev, count }) =>
          count > 0 ? (
            <motion.div
              key={sev}
              initial={{ width: 0 }}
              animate={{ width: `${(count / total) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
              style={{ backgroundColor: SEVERITY_COLORS[sev] }}
            />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {counts.map(({ sev, count }) => (
          <div key={sev} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
            <span className="font-semibold text-neutral-700">{count}</span>
            <span className="capitalize text-neutral-500">{sev}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function downloadReport(result: AnalysisResult) {
  const payload = {
    repo: result.repoName,
    analyzedAt: result.createdAt,
    riskScore: result.security?.riskScore,
    threats: result.security?.threats,
    findings: result.security?.findings,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.repoName.replace('/', '-')}-security-report.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function GuardView({ result }: { result: AnalysisResult }) {
  const security = result.security
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')
  const [strideFilter, setStrideFilter] = useState<StrideCategory | 'all'>('all')
  const [expandedThreat, setExpandedThreat] = useState<string | null>(null)

  if (!security) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
        <p className="text-sm font-medium text-neutral-700">Security analysis unavailable</p>
        <p className="mt-1 text-sm text-neutral-500">
          {result.aiErrors.security ?? 'The AI security call did not return a result.'}
        </p>
      </div>
    )
  }

  const filteredFindings = security.findings.filter(
    (f) => severityFilter === 'all' || f.severity === severityFilter,
  )

  const filteredThreats = security.threats.filter(
    (t) => strideFilter === 'all' || t.strideCategory === strideFilter,
  )

  const grouped = STRIDE_ORDER.map((category) => ({
    category,
    threats: filteredThreats.filter((t) => t.strideCategory === category),
  })).filter((g) => g.threats.length > 0)

  const known = new Set<string>(STRIDE_ORDER)
  const uncategorized = filteredThreats.filter((t) => !known.has(t.strideCategory))

  return (
    <div className="space-y-6">
      {/* Score + stats card */}
      <div className="flex flex-col items-center gap-6 rounded-xl border border-neutral-200 bg-white px-8 py-6 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <h3 className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Risk Score
          </h3>
          <RiskGauge score={security.riskScore} />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Findings breakdown
            </h3>
            <SeverityBar findings={security} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {SEVERITY_ORDER.map((sev) => {
              const count = security.findings.filter((f) => f.severity === sev).length
              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(severityFilter === sev ? 'all' : sev)}
                  className={`rounded-lg border px-3 py-2 transition ${
                    severityFilter === sev
                      ? 'border-current bg-neutral-900 text-white'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="text-xl font-bold tabular-nums" style={{ color: severityFilter === sev ? 'white' : SEVERITY_COLORS[sev] }}>
                    {count}
                  </div>
                  <div className="mt-0.5 text-xs capitalize text-neutral-500">{sev}</div>
                </button>
              )
            })}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => downloadReport(result)}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-accent hover:text-accent"
            >
              ↓ Export JSON report
            </button>
          </div>
        </div>
      </div>

      {/* Threats */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            Threat model <span className="font-normal text-neutral-400">(STRIDE)</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="All" active={strideFilter === 'all'} onClick={() => setStrideFilter('all')} />
            {STRIDE_ORDER.filter((cat) => security.threats.some((t) => t.strideCategory === cat)).map((cat) => (
              <FilterChip
                key={cat}
                label={STRIDE_LABELS[cat].split(' ')[0]}
                active={strideFilter === cat}
                onClick={() => setStrideFilter(strideFilter === cat ? 'all' : cat)}
              />
            ))}
          </div>
        </div>
        {filteredThreats.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white py-8 text-center text-sm text-neutral-500">
            No threats match this filter.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ category, threats }) => (
              <ThreatGroup
                key={category}
                title={STRIDE_LABELS[category]}
                threats={threats}
                expandedId={expandedThreat}
                onToggle={setExpandedThreat}
              />
            ))}
            {uncategorized.length > 0 && (
              <ThreatGroup
                title="Other"
                threats={uncategorized}
                expandedId={expandedThreat}
                onToggle={setExpandedThreat}
              />
            )}
          </div>
        )}
      </section>

      {/* Findings */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            Code findings <span className="font-normal text-neutral-400">({filteredFindings.length})</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="All" active={severityFilter === 'all'} onClick={() => setSeverityFilter('all')} />
            {SEVERITY_ORDER.filter((sev) => security.findings.some((f) => f.severity === sev)).map((sev) => (
              <FilterChip
                key={sev}
                label={sev}
                active={severityFilter === sev}
                color={SEVERITY_COLORS[sev]}
                onClick={() => setSeverityFilter(severityFilter === sev ? 'all' : sev)}
              />
            ))}
          </div>
        </div>
        {filteredFindings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white py-8 text-center text-sm text-neutral-500">
            No findings match this filter.
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredFindings.map((finding, i) => (
              <motion.li
                key={`${finding.file}-${finding.line}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <span className="font-mono text-xs text-neutral-500">
                    {finding.file}:{finding.line}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-neutral-900">{finding.issue}</p>
                <p className="mt-1 text-sm text-neutral-600">
                  <span className="font-medium text-emerald-700">Fix:</span>{' '}
                  {finding.recommendation}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function FilterChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string
  active: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition ${
        active
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
      }`}
      style={active && color ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {label}
    </button>
  )
}

function ThreatGroup({
  title,
  threats,
  expandedId,
  onToggle,
}: {
  title: string
  threats: Threat[]
  expandedId: string | null
  onToggle: (id: string | null) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title} · {threats.length}
      </div>
      <div className="divide-y divide-neutral-100">
        {threats.map((threat) => (
          <div key={threat.id}>
            <button
              onClick={() => onToggle(expandedId === threat.id ? null : threat.id)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50"
            >
              <SeverityBadge severity={threat.severity} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-neutral-500">{threat.component}</p>
                <p className="mt-0.5 text-sm text-neutral-800">{threat.vector}</p>
              </div>
              <span className={`shrink-0 text-neutral-400 transition-transform ${expandedId === threat.id ? 'rotate-90' : ''}`}>›</span>
            </button>
            {expandedId === threat.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-neutral-100 bg-emerald-50 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Mitigation</p>
                <p className="mt-1 text-sm text-emerald-900">{threat.mitigation}</p>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
