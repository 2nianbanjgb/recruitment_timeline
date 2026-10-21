import type { RecruitEvent } from '../types'
import { useEvents } from '../store/useEvents'
import {
  eventEnd,
  eventStart,
  eventsOnDay,
  formatDayShort,
  formatDayWithWeekday,
  groupByDay,
  isOverdue,
  nextEvent,
  relativeDayLabel,
  upcomingWeekRange,
} from '../lib/date'
import { EmptyState } from '../components/EmptyState'
import { EventRow } from '../components/EventCard'
import { NextUpCard } from '../components/NextUpCard'
import { StatRow } from '../components/StatRow'
import { IconPlus, IconSparkle } from '../components/icons'
import { btnSecondary } from '../components/ui'

export interface DashboardViewProps {
  now: number
  onAdd: () => void
  onEdit: (event: RecruitEvent) => void
  onNavigateAll: () => void
}

export function DashboardView({ now, onAdd, onEdit, onNavigateAll }: DashboardViewProps) {
  const { events } = useEvents()
  const nowDate = new Date(now)
  const nextUp = nextEvent(events, now)

  const upcoming = events.filter(event => event.status === 'pending' && eventEnd(event).getTime() > now)
  const writtenCount = upcoming.filter(
    event => event.stage === 'written' || event.stage === 'assessment',
  ).length
  const interviewCount = upcoming.filter(event => event.stage === 'interview').length
  const finishedCount = events.filter(event => event.status !== 'pending').length

  const todayEvents = eventsOnDay(events, nowDate)
  // 「今天起 7 天」= 今天到下周同一星期（含），共 8 个自然日，看 lib/date.ts 里的实现。
  const week = upcomingWeekRange(now)
  const weekEvents = events.filter(event => {
    const start = eventStart(event).getTime()
    return start >= week.start && start < week.end
  })
  const weekGroups = groupByDay(weekEvents)
  const overdue = events.filter(event => isOverdue(event, now))

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">总览</h1>
          <p className="mt-0.5 text-xs text-ink-faint">
            {formatDayWithWeekday(nowDate)} · 今天 {todayEvents.length} 场 · 共 {events.length} 场记录
          </p>
        </div>
        <span className="hidden sm:inline-flex">
          <button type="button" className={btnSecondary} onClick={onAdd}>
            <IconPlus className="h-4 w-4" />
            新增
          </button>
        </span>
      </header>

      <NextUpCard
        event={nextUp}
        now={now}
        onEdit={onEdit}
        onAdd={onAdd}
        onViewAll={onNavigateAll}
        overdueCount={overdue.length}
        totalCount={events.length}
      />

      <StatRow
        items={[
          { label: '待测评/笔试', value: writtenCount, tone: 'accent' },
          { label: '待面试', value: interviewCount, tone: 'warn' },
          { label: '近 7 天', value: weekEvents.length, tone: 'success' },
          { label: '已出结果', value: finishedCount, tone: 'muted' },
        ]}
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">今日安排</h2>
            <span className="text-[11px] text-ink-faint">今天</span>
          </div>
          {todayEvents.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                compact
                icon={<IconSparkle className="h-5 w-5" />}
                title="今天没有安排"
                description="可以趁现在补录通知，或者安心准备下一场。"
              />
            </div>
          ) : (
            <div className="mt-2 flex flex-col">
              {todayEvents.map(event => (
                <EventRow key={event.id} event={event} now={now} onClick={() => onEdit(event)} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">近 7 天</h2>
            <button type="button" onClick={onNavigateAll} className="text-[11px] text-accent hover:underline">
              全部事件
            </button>
          </div>
          {weekGroups.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                compact
                icon={<IconSparkle className="h-5 w-5" />}
                title="近 7 天还没有安排"
                description="收到笔试或面试通知后，随手记一场。"
                action={
                  <button
                    type="button"
                    onClick={onAdd}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    新增一场
                  </button>
                }
              />
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-3">
              {weekGroups.map(group => (
                <div key={group.key}>
                  <div className="flex items-baseline justify-between px-2">
                    <p className="text-xs font-medium text-ink">{relativeDayLabel(group.date, nowDate)}</p>
                    <span className="text-[11px] text-ink-faint">{formatDayShort(group.date)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-col">
                    {group.events.map(event => (
                      <EventRow key={event.id} event={event} now={now} onClick={() => onEdit(event)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {overdue.length > 0 ? (
        <section className="rounded-2xl border border-warn/25 bg-warn/5 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-warn">
              已过期但还没标记结果（{overdue.length}）
            </h2>
            <button
              type="button"
              onClick={onNavigateAll}
              className="text-[11px] text-accent hover:underline"
            >
              去处理
            </button>
          </div>
          <div className="mt-2 flex flex-col">
            {overdue.slice(0, 4).map(event => (
              <EventRow key={event.id} event={event} now={now} onClick={() => onEdit(event)} />
            ))}
          </div>
          <p className="mt-2 px-2 text-[11px] text-ink-faint">
            过期的场次不会进入「下一场」，但会一直留在这里，直到标记为已通过 / 未通过 / 已放弃。
          </p>
        </section>
      ) : null}
    </div>
  )
}
