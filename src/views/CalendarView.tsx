import { useState } from 'react'
import type { RecruitEvent, Status } from '../types'
import { useEvents } from '../store/useEvents'
import { conflictIds } from '../lib/conflict'
import { dayKey, eventsOnDay } from '../lib/date'
import { DayPanel } from '../components/DayPanel'
import { MonthCalendar } from '../components/MonthCalendar'
import { IconPlus } from '../components/icons'
import { btnSecondary } from '../components/ui'

export interface CalendarViewProps {
  now: number
  onAdd: (date?: string) => void
  onEdit: (event: RecruitEvent) => void
  onDelete: (event: RecruitEvent) => void
  onStatus: (event: RecruitEvent, status: Status) => void
}

export function CalendarView({ now, onAdd, onEdit, onDelete, onStatus }: CalendarViewProps) {
  const { events } = useEvents()
  const nowDate = new Date(now)
  const [cursor, setCursor] = useState(() => new Date(nowDate.getFullYear(), nowDate.getMonth(), 1))
  const [selected, setSelected] = useState(() => new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()))

  const conflicts = conflictIds(events)
  const selectedEvents = eventsOnDay(events, selected)
  const todayKey = dayKey(nowDate)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">日历</h1>
          <p className="mt-0.5 text-xs text-ink-faint">点某一天查看当天全部安排，也可以直接给那天新增一场。</p>
        </div>
        <button
          type="button"
          className={`hidden sm:inline-flex ${btnSecondary}`}
          onClick={() => onAdd(dayKey(selected))}
        >
          <IconPlus className="h-4 w-4" />
          给这天新增
        </button>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
        <MonthCalendar
          year={cursor.getFullYear()}
          month={cursor.getMonth()}
          events={events}
          selectedKey={dayKey(selected)}
          todayKey={todayKey}
          onSelectDay={day => setSelected(day)}
          onChangeMonth={delta => {
            setCursor(previous => new Date(previous.getFullYear(), previous.getMonth() + delta, 1))
          }}
          onToday={() => {
            const today = new Date()
            setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
            setSelected(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
          }}
        />

        <div className="lg:sticky lg:top-6">
          <DayPanel
            day={selected}
            now={now}
            events={selectedEvents}
            conflicts={conflicts}
            onAdd={day => onAdd(dayKey(day))}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatus={onStatus}
          />
        </div>
      </div>
    </div>
  )
}
