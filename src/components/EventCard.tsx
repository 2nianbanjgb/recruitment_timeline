import type { RecruitEvent, Status } from '../types'
import { MODE_LABELS, STAGE_LABELS, STATUSES, STATUS_LABELS } from '../types'
import { STATUS_STYLES, companyColor } from '../lib/colors'
import {
  countdownDisplay,
  countdownText,
  eventStart,
  formatFullRange,
  formatTime,
  isOverdue,
} from '../lib/date'
import { btnDangerIcon, btnIcon } from './ui'
import { Menu } from './Menu'
import {
  IconAlert,
  IconChevronDown,
  IconEdit,
  IconMapPin,
  IconTrash,
  IconVideo,
} from './icons'

export interface EventCardProps {
  event: RecruitEvent
  now: number
  conflict?: boolean
  highlight?: boolean
  onEdit: (event: RecruitEvent) => void
  onDelete: (event: RecruitEvent) => void
  onStatus: (event: RecruitEvent, status: Status) => void
}

export function EventCard({
  event,
  now,
  conflict,
  highlight,
  onEdit,
  onDelete,
  onStatus,
}: EventCardProps) {
  const color = companyColor(event.company)
  const style = STATUS_STYLES[event.status]
  const overdue = isOverdue(event, now)
  const display = countdownDisplay(event, now)

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-panel p-3.5 transition hover:shadow-[var(--shadow-soft)] sm:p-4 ${
        highlight ? 'border-accent ring-2 ring-accent/25' : 'border-line hover:border-line-strong'
      } ${overdue ? 'opacity-80' : ''}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-3.5 left-0 w-[3px] rounded-r-full"
        style={{ background: color.accent }}
      />

      <div className="flex items-start gap-3 pl-2">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
          style={{ background: color.soft, color: color.accent }}
          aria-hidden="true"
        >
          {event.company.slice(0, 1)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="max-w-full truncate text-sm font-semibold text-ink">{event.company}</h3>
            <span className="rounded-md bg-panel-soft px-1.5 py-0.5 text-[11px] text-ink-muted">
              {STAGE_LABELS[event.stage]}
            </span>
            <Menu
              label={`更改「${event.company}」的状态`}
              trigger={
                <>
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {STATUS_LABELS[event.status]}
                  <IconChevronDown className="h-3 w-3 opacity-60" />
                </>
              }
              triggerClassName={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition hover:brightness-105 ${style.pill}`}
              items={STATUSES.map(status => ({
                label: STATUS_LABELS[status],
                active: status === event.status,
                onSelect: () => onStatus(event, status),
              }))}
            />
            {conflict ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-1.5 py-0.5 text-[11px] text-danger">
                <IconAlert className="h-3 w-3" />
                时间冲突
              </span>
            ) : null}
            {overdue ? (
              <span className="rounded-md bg-muted/10 px-1.5 py-0.5 text-[11px] text-muted">已过期</span>
            ) : null}
          </div>

          <p className="mt-1 truncate text-xs text-ink-muted">
            {formatFullRange(event)}
            {event.role ? ` · ${event.role}` : ''}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
            <span className="inline-flex min-w-0 items-center gap-1">
              {event.mode === 'online' ? (
                <IconVideo className="h-3.5 w-3.5" />
              ) : (
                <IconMapPin className="h-3.5 w-3.5" />
              )}
              <span className="truncate">
                {MODE_LABELS[event.mode]}
                {event.mode === 'onsite' && event.location ? ` · ${event.location}` : ''}
              </span>
            </span>
            {event.mode === 'online' && event.link ? (
              <a
                href={event.link}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                会议链接
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`text-xs font-medium tnum ${
              display.tone === 'urgent'
                ? 'text-warn'
                : display.tone === 'over'
                  ? 'text-ink-faint'
                  : display.tone === 'live'
                    ? 'text-success'
                    : 'text-ink-muted'
            }`}
          >
            {countdownText(display)}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={btnIcon}
              aria-label={`编辑「${event.company}」`}
              onClick={() => onEdit(event)}
            >
              <IconEdit className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={btnDangerIcon}
              aria-label={`删除「${event.company}」`}
              onClick={() => onDelete(event)}
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export interface EventRowProps {
  event: RecruitEvent
  now: number
  onClick?: () => void
}

/** 时间线里的一行：时间 + 公司 + 阶段 + 相对时间。 */
export function EventRow({ event, now, onClick }: EventRowProps) {
  const color = companyColor(event.company)
  const style = STATUS_STYLES[event.status]
  const display = countdownDisplay(event, now)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-panel-soft"
    >
      <span className="w-11 shrink-0 text-right text-xs tnum text-ink-faint">
        {event.allDay ? '全天' : formatTime(eventStart(event))}
      </span>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color.accent }} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{event.company}</span>
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${style.pill}`}>
            {STAGE_LABELS[event.stage]}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
          {event.role || MODE_LABELS[event.mode]}
        </span>
      </span>
      <span className="shrink-0 text-[11px] tnum text-ink-muted">{countdownText(display)}</span>
    </button>
  )
}
