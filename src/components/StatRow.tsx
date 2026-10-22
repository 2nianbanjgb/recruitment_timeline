import { cardClass } from './ui'

export interface StatItem {
  label: string
  value: number
  tone?: 'accent' | 'warn' | 'success' | 'muted' | 'info'
}

const TONE_TEXT = {
  accent: 'text-accent',
  warn: 'text-warn',
  success: 'text-success',
  muted: 'text-ink-muted',
  info: 'text-info',
} as const

export function StatRow({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(item => (
        <div key={item.label} className={`${cardClass} px-4 py-3`}>
          <p className="text-xs text-ink-muted">{item.label}</p>
          <p className={`mt-1 text-2xl font-semibold tnum ${TONE_TEXT[item.tone ?? 'accent']}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
