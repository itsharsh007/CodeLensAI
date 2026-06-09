import { motion } from 'framer-motion'
import type { AnalysisResult, StrideCategory, Threat } from '../types'
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

function riskColor(score: number): string {
  if (score >= 70) return '#dc2626' // red
  if (score >= 40) return '#d97706' // amber
  return '#059669' // green
}

function riskLabel(score: number): string {
  if (score >= 70) return 'High risk'
  if (score >= 40) return 'Moderate risk'
  return 'Low risk'
}

/** Semi-circular SVG gauge with a green→amber→red band. */
function RiskGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const r = 80
  const cx = 100
  const cy = 95
  const angle = Math.PI * (1 - clamped / 100) // PI (left, 0) → 0 (right, 100)
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
        <div className="text-3xl font-bold" style={{ color: riskColor(clamped) }}>
          {clamped}
        </div>
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {riskLabel(clamped)}
        </div>
      </div>
    </div>
  )
}

export default function GuardView({ result }: { result: AnalysisResult }) {
  const security = result.security

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

  const grouped = STRIDE_ORDER.map((category) => ({
    category,
    threats: security.threats.filter((t) => t.strideCategory === category),
  })).filter((g) => g.threats.length > 0)

  // Anything with an unexpected category still gets shown
  const known = new Set<string>(STRIDE_ORDER)
  const uncategorized = security.threats.filter((t) => !known.has(t.strideCategory))

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white py-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Overall risk score
        </h3>
        <RiskGauge score={security.riskScore} />
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">
          Threat model <span className="font-normal text-neutral-400">(STRIDE)</span>
        </h3>
        {security.threats.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white py-8 text-center text-sm text-neutral-500">
            No threats identified.
          </p>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ category, threats }) => (
              <ThreatGroup key={category} title={STRIDE_LABELS[category]} threats={threats} />
            ))}
            {uncategorized.length > 0 && <ThreatGroup title="Other" threats={uncategorized} />}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Findings</h3>
        {security.findings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white py-8 text-center text-sm text-neutral-500">
            No code-level findings.
          </p>
        ) : (
          <ul className="space-y-3">
            {security.findings.map((finding, i) => (
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

function ThreatGroup({ title, threats }: { title: string; threats: Threat[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title} · {threats.length}
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-xs text-neutral-400">
            <th className="px-4 py-2 font-medium">Severity</th>
            <th className="px-4 py-2 font-medium">Component</th>
            <th className="px-4 py-2 font-medium">Attack vector</th>
            <th className="px-4 py-2 font-medium">Mitigation</th>
          </tr>
        </thead>
        <tbody>
          {threats.map((threat) => (
            <tr key={threat.id} className="border-b border-neutral-100 align-top last:border-0">
              <td className="px-4 py-3">
                <SeverityBadge severity={threat.severity} />
              </td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-700">{threat.component}</td>
              <td className="px-4 py-3 text-neutral-700">{threat.vector}</td>
              <td className="px-4 py-3 text-neutral-600">{threat.mitigation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
