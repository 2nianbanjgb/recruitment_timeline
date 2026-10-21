import type { Stage, Status } from '../types'
import { STAGES, STAGE_LABELS, STATUSES, STATUS_LABELS } from '../types'
import { chipActive, chipBase, chipIdle, fieldClass } from './ui'
import { IconSearch } from './icons'

export type RangeFilter = 'all' | 'upcoming' | 'past'

export interface Filters {
  query: string
  statuses: Status[]
  stages: Stage[]
  range: RangeFilter
}

export const DEFAULT_FILTERS: Filters = { query: '', statuses: [], stages: [], range: 'all' }

const RANGE_LABELS: Record<RangeFilter, string> = {
  all: '全部',
  upcoming: '未开始',
  past: '已过去',
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value]
}

export interface FilterBarProps {
  filters: Filters
  shown: number
  total: number
  onChange: (next: Filters) => void
  onReset: () => void
}

export function FilterBar({ filters, shown, total, onChange, onReset }: FilterBarProps) {
  const dirty =
    filters.query.trim() !== '' ||
    filters.statuses.length > 0 ||
    filters.stages.length > 0 ||
    filters.range !== 'all'

  return (
    <div className="rounded-2xl border border-line bg-panel p-3.5">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={filters.query}
          onChange={event => onChange({ ...filters, query: event.target.value })}
          placeholder="搜索公司、岗位或备注"
          className={`${fieldClass} pl-9`}
          aria-label="搜索日程"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {STATUSES.map(status => (
          <button
            key={status}
            type="button"
            aria-pressed={filters.statuses.includes(status)}
            onClick={() => onChange({ ...filters, statuses: toggle(filters.statuses, status) })}
            className={`${chipBase} ${filters.statuses.includes(status) ? chipActive : chipIdle}`}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
        <span aria-hidden="true" className="mx-1 self-center text-ink-faint">
          |
        </span>
        {STAGES.map(stage => (
          <button
            key={stage}
            type="button"
            aria-pressed={filters.stages.includes(stage)}
            onClick={() => onChange({ ...filters, stages: toggle(filters.stages, stage) })}
            className={`${chipBase} ${filters.stages.includes(stage) ? chipActive : chipIdle}`}
          >
            {STAGE_LABELS[stage]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-panel-soft p-1">
          {(['all', 'upcoming', 'past'] as const).map(range => (
            <button
              key={range}
              type="button"
              onClick={() => onChange({ ...filters, range })}
              aria-pressed={filters.range === range}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filters.range === range ? 'bg-panel text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {RANGE_LABELS[range]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-faint">
          <span className="tnum">
            {shown} / {total} 场
          </span>
          {dirty ? (
            <button type="button" onClick={onReset} className="text-accent hover:underline">
              清空筛选
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
