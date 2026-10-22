import type { RecruitEvent } from '../types'
import { companyColor } from '../lib/colors'
import { dayKey, eventStart, formatMonthTitle, monthMatrix } from '../lib/date'
import { btnIcon, btnSecondary } from './ui'
import { IconChevronLeft, IconChevronRight } from './icons'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

export interface MonthCalendarProps {
  year: number
  month: number
  events: RecruitEvent[]
  selectedKey: string | null
  todayKey: string
  onSelectDay: (day: Date) => void
  onChangeMonth: (delta: number) => void
  onToday: () => void
}

export function MonthCalendar({
  year,
  month,
  events,
  selectedKey,
  todayKey,
  onSelectDay,
  onChangeMonth,
  onToday,
}: MonthCalendarProps) {
  const weeks = monthMatrix(year, month)
  const byDay = new Map<string, RecruitEvent[]>()
  for (const event of events) {
    const key = dayKey(eventStart(event))
    const bucket = byDay.get(key)
    if (bucket) bucket.push(event)
    else byDay.set(key, [event])
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className={btnIcon} aria-label="上个月" onClick={() => onChangeMonth(-1)}>
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-28 text-center text-base font-semibold text-ink">
            {formatMonthTitle(year, month)}
          </h2>
          <button type="button" className={btnIcon} aria-label="下个月" onClick={() => onChangeMonth(1)}>
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button type="button" className={btnSecondary} onClick={onToday}>
          回到今天
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        <div className="grid grid-cols-7 border-b border-line bg-panel-soft">
          {WEEKDAY_LABELS.map(label => (
            <div key={label} className="py-2 text-center text-[11px] font-medium text-ink-muted">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-line">
          {weeks.flat().map(day => {
            const key = dayKey(day)
            const dayEvents = byDay.get(key) ?? []
            const inMonth = day.getMonth() === month
            const isToday = key === todayKey
            const isSelected = key === selectedKey
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDay(day)}
                aria-label={`${day.getMonth() + 1}月${day.getDate()}日，${dayEvents.length} 场安排`}
                aria-pressed={isSelected}
                className={`relative flex min-h-[72px] flex-col gap-1.5 bg-panel p-1.5 text-left transition hover:bg-panel-soft sm:min-h-[96px] sm:p-2 ${
                  isSelected ? 'ring-2 ring-inset ring-accent' : ''
                }`}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] tnum ${
                      isToday
                        ? 'bg-accent-solid font-semibold text-white'
                        : inMonth
                          ? 'text-ink'
                          : 'text-ink-faint'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {isToday ? <span className="text-[10px] text-accent">今天</span> : null}
                </span>

                {/* 桌面端：公司小条，顶部边框用公司色区分 */}
                <span className="hidden flex-col gap-0.5 sm:flex">
                  {dayEvents.slice(0, 3).map(event => (
                    <span
                      key={event.id}
                      className="truncate rounded border-t-2 bg-panel-soft px-1.5 py-[3px] text-[11px] leading-tight text-ink-muted"
                      style={{ borderTopColor: companyColor(event.company).accent }}
                      title={event.company}
                    >
                      {event.company}
                    </span>
                  ))}
                  {dayEvents.length > 3 ? (
                    <span className="px-1 text-[10px] text-ink-faint">+{dayEvents.length - 3}</span>
                  ) : null}
                </span>

                {/* 移动端：圆点，同样按公司色 */}
                <span className="mt-auto flex flex-wrap gap-1 sm:hidden">
                  {dayEvents.slice(0, 4).map(event => (
                    <span
                      key={event.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: companyColor(event.company).accent }}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
