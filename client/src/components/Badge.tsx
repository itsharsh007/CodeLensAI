import type { Severity } from '../types'

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const style = SEVERITY_STYLES[severity] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style}`}
    >
      {severity}
    </span>
  )
}
