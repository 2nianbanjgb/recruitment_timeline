import type { RecruitEvent, Status } from '../types'
import { formatDayWithWeekday, relativeDayLabel } from '../lib/date'
import { EventCard } from './EventCard'
import { EmptyState } from './EmptyState'
import { IconPlus, IconSparkle } from './icons'
import { btnGhost } from './ui'

export interface DayPanelProps {
  day: Date
  now: number
  events: RecruitEvent[]
  conflicts: Set<string>
  onAdd: (day: Date) => void
  onEdit: (event: RecruitEvent) => void
  onDelete: (event: RecruitEvent) => void
  onStatus: (event: RecruitEvent, status: Status) => void
}

export function DayPanel({ day, now, events, conflicts, onAdd, onEdit, onDelete, onStatus }: DayPanelProps) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">{formatDayWithWeekday(day)}</h2>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {relativeDayLabel(day, new Date(now))} · {events.length} 场安排
          </p>
        </div>
        <button type="button" className={btnGhost} onClick={() => onAdd(day)}>
          <IconPlus className="h-4 w-4" />
          新增
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {events.length === 0 ? (
          <EmptyState
            compact
            icon={<IconSparkle className="h-5 w-5" />}
            title="这天还没有安排"
            description="收到笔试或面试通知后，随手记在这里。"
            action={
              <button
                type="button"
                onClick={() => onAdd(day)}
                className="text-sm font-medium text-accent hover:underline"
              >
                添加一场
              </button>
            }
          />
        ) : (
          events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              now={now}
              conflict={conflicts.has(event.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatus={onStatus}
            />
          ))
        )}
      </div>
    </section>
  )
}
