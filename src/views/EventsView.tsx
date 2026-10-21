import { useEffect, useMemo, useState } from 'react'
import type { RecruitEvent, Status } from '../types'
import { useEvents } from '../store/useEvents'
import { conflictIds } from '../lib/conflict'
import { eventEnd, sortByStart } from '../lib/date'
import { generateIcs } from '../lib/ics'
import { dateSlug, downloadText } from '../lib/download'
import { EventCard } from '../components/EventCard'
import { DEFAULT_FILTERS, FilterBar, type Filters } from '../components/FilterBar'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { IconDownload, IconPlus, IconSparkle } from '../components/icons'
import { btnSecondary } from '../components/ui'

export interface EventsViewProps {
  now: number
  onAdd: () => void
  onEdit: (event: RecruitEvent) => void
  onDelete: (event: RecruitEvent) => void
  onStatus: (event: RecruitEvent, status: Status) => void
  focusId: string | null
}

export function EventsView({ now, onAdd, onEdit, onDelete, onStatus, focusId }: EventsViewProps) {
  const { events } = useEvents()
  const { toast } = useToast()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const conflicts = conflictIds(events)

  // 从通知点进来时，清掉筛选保证目标可见。
  useEffect(() => {
    if (focusId) setFilters(DEFAULT_FILTERS)
  }, [focusId])

  useEffect(() => {
    if (!focusId) return
    const timer = window.setTimeout(() => {
      document.getElementById(`event-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [focusId])

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return events.filter(event => {
      if (query) {
        const haystack = `${event.company} ${event.role} ${event.note}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) return false
      if (filters.stages.length > 0 && !filters.stages.includes(event.stage)) return false
      const end = eventEnd(event).getTime()
      if (filters.range === 'upcoming' && end <= now) return false
      if (filters.range === 'past' && end > now) return false
      return true
    })
  }, [events, filters, now])

  const sorted = useMemo(() => {
    const list = sortByStart(filtered)
    return sortDir === 'desc' ? list.reverse() : list
  }, [filtered, sortDir])

  const exportIcs = () => {
    if (sorted.length === 0) {
      toast('当前筛选下没有日程可导出')
      return
    }
    downloadText(`秋招日程-${dateSlug(new Date())}.ics`, generateIcs(sorted), 'text/calendar')
    toast(`已导出 ${sorted.length} 场到 .ics，可直接导入手机日历`)
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">全部事件</h1>
          <p className="mt-0.5 text-xs text-ink-faint">
            共 {events.length} 场记录 · 按时间{sortDir === 'asc' ? '正序' : '倒序'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setSortDir(current => (current === 'asc' ? 'desc' : 'asc'))}
          >
            时间{sortDir === 'asc' ? '正序' : '倒序'}
          </button>
          <button type="button" className={btnSecondary} onClick={exportIcs}>
            <IconDownload className="h-4 w-4" />
            导出当前列表
          </button>
          <span className="hidden sm:inline-flex">
            <button type="button" className={btnSecondary} onClick={onAdd}>
              <IconPlus className="h-4 w-4" />
              新增
            </button>
          </span>
        </div>
      </header>

      <FilterBar
        filters={filters}
        shown={filtered.length}
        total={events.length}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {sorted.length === 0 ? (
        events.length === 0 ? (
          <EmptyState
            icon={<IconSparkle className="h-5 w-5" />}
            title="还没有任何安排"
            description="笔试和面试时间录进来之后，这里会按时间排好，状态也能随时更新。"
            action={
              <button
                type="button"
                onClick={onAdd}
                className="text-sm font-medium text-accent hover:underline"
              >
                新增第一场
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={<IconSparkle className="h-5 w-5" />}
            title="没有符合筛选条件的安排"
            description="换个关键词，或者清空筛选看看全部记录。"
            action={
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-sm font-medium text-accent hover:underline"
              >
                清空筛选
              </button>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map(event => (
            <div key={event.id} id={`event-${event.id}`}>
              <EventCard
                event={event}
                now={now}
                conflict={conflicts.has(event.id)}
                highlight={event.id === focusId}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatus={onStatus}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
