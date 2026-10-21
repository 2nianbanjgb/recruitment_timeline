import type { RecruitEvent } from '../types'
import { countdownDisplay } from '../lib/date'

const TONE_GRADIENT = {
  normal: 'from-accent to-fuchsia-500',
  urgent: 'from-amber-500 to-rose-500',
  live: 'from-emerald-500 to-teal-400',
  over: 'from-ink-faint to-ink-faint',
} as const

export interface CountdownProps {
  event: RecruitEvent
  now: number
  compact?: boolean
}

/** 天 / 时粒度的倒计时；不足 1 小时与进行中改用文案。 */
export function Countdown({ event, now, compact }: CountdownProps) {
  const display = countdownDisplay(event, now)

  if (display.text) {
    return (
      <p
        className={
          compact
            ? 'text-sm font-semibold tnum text-ink-muted'
            : 'text-3xl font-semibold tracking-tight text-ink sm:text-4xl'
        }
      >
        {display.text}
      </p>
    )
  }

  const gradient = TONE_GRADIENT[display.tone]

  return (
    <div className={compact ? 'flex items-baseline gap-1' : 'flex flex-wrap items-baseline gap-x-3 gap-y-1'}>
      {display.parts.map((part, index) => (
        <span key={part.unit} className="flex items-baseline gap-1.5">
          <span
            className={
              compact
                ? 'text-sm font-semibold tnum text-ink'
                : `bg-linear-to-br ${gradient} bg-clip-text text-6xl font-semibold tracking-tight tnum text-transparent sm:text-7xl`
            }
          >
            {part.value}
          </span>
          <span className={compact ? 'text-[11px] text-ink-faint' : 'text-lg font-medium text-ink-muted'}>
            {part.unit}
          </span>
          {!compact && index < display.parts.length - 1 ? (
            <span className="mx-1 text-2xl font-light text-ink-faint">·</span>
          ) : null}
        </span>
      ))}
    </div>
  )
}
