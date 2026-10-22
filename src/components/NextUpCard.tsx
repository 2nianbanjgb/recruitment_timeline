import type { RecruitEvent } from '../types'
import { MODE_LABELS, STAGE_LABELS } from '../types'
import { formatFullRange } from '../lib/date'
import { useCompanyColor } from '../store/useCompanyColors'
import { btnPrimary, btnSecondary } from './ui'
import { Countdown } from './Countdown'
import { CopyButton } from './CopyButton'
import {
  IconBuilding,
  IconClock,
  IconEdit,
  IconExternal,
  IconKey,
  IconMapPin,
  IconPlus,
  IconVideo,
} from './icons'

export interface NextUpCardProps {
  event: RecruitEvent | null
  now: number
  onEdit: (event: RecruitEvent) => void
  onAdd: () => void
  onViewAll: () => void
  overdueCount: number
  totalCount: number
}

export function NextUpCard({
  event,
  now,
  onEdit,
  onAdd,
  onViewAll,
  overdueCount,
  totalCount,
}: NextUpCardProps) {
  const colorOf = useCompanyColor()
  const companyTint = event ? colorOf(event.company) : null

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <div
        aria-hidden="true"
        className="animate-glow pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl"
      />

      {event ? (
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              下一场
            </span>
            <span className="rounded-full bg-panel-soft px-2.5 py-1">{STAGE_LABELS[event.stage]}</span>
            {event.role ? <span className="truncate">{event.role}</span> : null}
          </div>

          <div className="mt-4 flex items-start gap-3">
            <span
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold"
              style={{
                background: companyTint?.soft,
                color: companyTint?.accent,
              }}
              aria-hidden="true"
            >
              {event.company.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {event.company}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">距开始</p>
            </div>
          </div>

          <div className="mt-1">
            <Countdown event={event} now={now} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <IconClock className="h-4 w-4" />
              {formatFullRange(event)}
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              {event.mode === 'online' ? <IconVideo className="h-4 w-4" /> : <IconBuilding className="h-4 w-4" />}
              {MODE_LABELS[event.mode]}
            </span>

            {event.link ? (
              <a
                href={event.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 whitespace-nowrap text-accent hover:underline"
              >
                {event.mode === 'online' ? '会议链接' : '通知链接'}
                <IconExternal className="h-3.5 w-3.5" />
              </a>
            ) : null}

            {event.mode === 'onsite' && event.location ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <IconMapPin className="h-4 w-4 shrink-0" />
                <span className="max-w-[20rem] truncate" title={event.location}>
                  {event.location}
                </span>
                <CopyButton
                  value={event.location}
                  label={`复制地址「${event.location}」`}
                  successMessage="已复制地址"
                />
              </span>
            ) : null}

            {event.mode === 'online' && event.passcode ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <IconKey className="h-4 w-4" />
                口令
                <span className="rounded bg-panel-soft px-1.5 py-0.5 font-mono text-sm text-ink">
                  {event.passcode}
                </span>
                <CopyButton
                  value={event.passcode}
                  label={`复制口令「${event.passcode}」`}
                  successMessage="已复制口令"
                />
              </span>
            ) : null}
          </div>

          {event.note ? (
            <p className="mt-4 line-clamp-2 rounded-xl bg-panel-soft px-3 py-2 text-sm text-ink-muted">
              {event.note}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={() => onEdit(event)}>
              <IconEdit className="h-4 w-4" />
              编辑这场
            </button>
            <button type="button" className={btnSecondary} onClick={onViewAll}>
              查看全部
            </button>
            {overdueCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-warn/25 bg-warn/10 px-3 py-2 text-xs text-warn">
                有 {overdueCount} 场已过期未标记状态
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-start gap-4 py-6">
          <div>
            <p className="text-xs font-medium text-accent">下一场</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {totalCount > 0 ? '暂时没有待进行的安排' : '还没有录入任何安排'}
            </h2>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              {totalCount > 0
                ? '剩下的场次都已标记结果，或时间已经过去。可以新增一场，或在全部事件里回顾。'
                : '把已经收到的笔试、面试时间录进来，这里就会显示倒计时。'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={onAdd}>
              <IconPlus className="h-4 w-4" />
              新增日程
            </button>
            {totalCount > 0 ? (
              <button type="button" className={btnSecondary} onClick={onViewAll}>
                查看全部
              </button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}
