import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { EventInput, Mode, RecruitEvent, Stage, Status } from '../types'
import {
  MODES,
  MODE_LABELS,
  REMIND_OPTIONS,
  STAGES,
  STAGE_LABELS,
  STATUSES,
  STATUS_LABELS,
} from '../types'
import { dayKey } from '../lib/date'
import { btnPrimary, btnSecondary, chipActive, chipBase, chipIdle, fieldClass, labelClass } from './ui'
import { IconClose } from './icons'

export interface EventFormProps {
  open: boolean
  initial: RecruitEvent | null
  defaultDate?: string
  defaultRemindMin: number
  onClose: () => void
  onSubmit: (input: EventInput) => void
}

export function EventForm({
  open,
  initial,
  defaultDate,
  defaultRemindMin,
  onClose,
  onSubmit,
}: EventFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const companyRef = useRef<HTMLInputElement>(null)

  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [stage, setStage] = useState<Stage>('written')
  const [status, setStatus] = useState<Status>('pending')
  const [allDay, setAllDay] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [durationMin, setDurationMin] = useState(60)
  const [mode, setMode] = useState<Mode>('online')
  const [link, setLink] = useState('')
  const [passcode, setPasscode] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [remindBeforeMin, setRemindBeforeMin] = useState(defaultRemindMin)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal 默认把焦点放在对话框本身，这里交给公司输入框。
      window.setTimeout(() => companyRef.current?.focus(), 0)
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    setError(null)
    if (initial) {
      const hasTime = initial.startAt.includes('T')
      setCompany(initial.company)
      setRole(initial.role)
      setStage(initial.stage)
      setStatus(initial.status)
      setAllDay(initial.allDay)
      setDate(initial.startAt.slice(0, 10))
      setTime(hasTime ? initial.startAt.slice(11, 16) : '10:00')
      setDurationMin(initial.durationMin)
      setMode(initial.mode)
      setLink(initial.link)
      setPasscode(initial.passcode)
      setLocation(initial.location)
      setNote(initial.note)
      setRemindBeforeMin(initial.remindBeforeMin)
      return
    }
    setCompany('')
    setRole('')
    setStage('written')
    setStatus('pending')
    setAllDay(false)
    setDate(defaultDate ?? dayKey(new Date()))
    setTime('10:00')
    setDurationMin(60)
    setMode('online')
    setLink('')
    setPasscode('')
    setLocation('')
    setNote('')
    setRemindBeforeMin(defaultRemindMin)
  }, [open, initial, defaultDate, defaultRemindMin])

  const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault()
    const name = company.trim()
    if (!name) {
      setError('请填写公司名称')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('请选择日期')
      return
    }
    if (!allDay && !/^\d{2}:\d{2}$/.test(time)) {
      setError('请选择开始时间')
      return
    }

    onSubmit({
      company: name,
      role: role.trim(),
      stage,
      status,
      allDay,
      startAt: allDay ? date : `${date}T${time}`,
      durationMin: Math.min(600, Math.max(5, durationMin || 60)),
      mode,
      link: link.trim(),
      passcode: passcode.trim(),
      location: location.trim(),
      note: note.trim(),
      remindBeforeMin,
    })
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="event-form-title"
      onCancel={event => {
        event.preventDefault()
        onClose()
      }}
      className="text-ink"
    >
      <form
        onSubmit={handleSubmit}
        className="animate-pop max-h-[92dvh] w-[min(94vw,620px)] overflow-y-auto rounded-2xl border border-line bg-panel shadow-2xl"
      >
        <div className="p-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="event-form-title" className="text-base font-semibold text-ink">
              {initial ? '编辑安排' : '新增安排'}
            </h2>
            <p className="mt-0.5 text-xs text-ink-faint">公司、阶段和时间是核心信息，其余可以之后再补。</p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-faint transition hover:bg-panel-soft hover:text-ink"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>
                公司 <span className="text-danger">*</span>
              </span>
              <input
                ref={companyRef}
                type="text"
                value={company}
                onChange={event => setCompany(event.target.value)}
                placeholder="例如：字节跳动"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>岗位</span>
              <input
                type="text"
                value={role}
                onChange={event => setRole(event.target.value)}
                placeholder="例如：后端开发"
                className={fieldClass}
              />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>阶段</span>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(item => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={stage === item}
                  onClick={() => setStage(item)}
                  className={`${chipBase} ${stage === item ? chipActive : chipIdle}`}
                >
                  {STAGE_LABELS[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>日期</span>
              <input
                type="date"
                value={date}
                onChange={event => setDate(event.target.value)}
                className={fieldClass}
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>
                {allDay ? '截止日（全天）' : '开始时间'}
                <label className="ml-2 inline-flex cursor-pointer items-center gap-1.5 align-middle text-[11px] text-ink-faint">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={event => setAllDay(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="relative h-4 w-7 rounded-full bg-line-strong transition after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition peer-checked:bg-accent-solid peer-checked:after:translate-x-3" />
                  全天
                </label>
              </span>
              {allDay ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-2 text-sm text-ink-faint">
                  全天事件会在当天 09:00 提醒
                </p>
              ) : (
                <input
                  type="time"
                  value={time}
                  onChange={event => setTime(event.target.value)}
                  className={fieldClass}
                  step={300}
                />
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>时长（分钟）</span>
              <input
                type="number"
                min={5}
                max={600}
                step={5}
                value={durationMin}
                onChange={event => setDurationMin(Number(event.target.value))}
                className={fieldClass}
                disabled={allDay}
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>形式</span>
              <div className="flex items-center gap-1 rounded-xl border border-line bg-panel-soft p-1">
                {MODES.map(item => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={mode === item}
                    onClick={() => setMode(item)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      mode === item ? 'bg-panel text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {MODE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {mode === 'online' ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>会议链接</span>
                <input
                  type="url"
                  value={link}
                  onChange={event => setLink(event.target.value)}
                  placeholder="https://..."
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>
                  作答口令
                  <span className="ml-1.5 text-[11px] font-normal text-ink-faint">
                    会议密码 / 入会口令，没有可以留空
                  </span>
                </span>
                <input
                  type="text"
                  value={passcode}
                  onChange={event => setPasscode(event.target.value)}
                  placeholder="例如：8848"
                  className={`${fieldClass} max-w-[16rem] font-mono`}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>地址</span>
                <input
                  type="text"
                  value={location}
                  onChange={event => setLocation(event.target.value)}
                  placeholder="例如：上海张江 · 3 号楼"
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>
                  通知链接
                  <span className="ml-1.5 text-[11px] font-normal text-ink-faint">
                    邮件或官网的通知原文，方便回看
                  </span>
                </span>
                <input
                  type="url"
                  value={link}
                  onChange={event => setLink(event.target.value)}
                  placeholder="https://..."
                  className={fieldClass}
                />
              </label>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>提醒</span>
              <select
                value={remindBeforeMin}
                onChange={event => setRemindBeforeMin(Number(event.target.value))}
                className={fieldClass}
              >
                {REMIND_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>状态</span>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(item => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={status === item}
                    onClick={() => setStatus(item)}
                    className={`${chipBase} ${status === item ? chipActive : chipIdle}`}
                  >
                    {STATUS_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>备注</span>
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              rows={3}
              placeholder="考察范围、面试官、需要准备的材料……"
              className={`${fieldClass} resize-y`}
            />
          </label>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        </div>

        <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-panel px-5 py-4">
          <p className="max-w-[18rem] text-[11px] leading-relaxed text-ink-faint">
            页面内的提醒只在本页打开时生效。想关掉页面也提醒，可在设置里导出 .ics 到手机日历。
          </p>
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>
              取消
            </button>
            <button type="submit" className={btnPrimary}>
              {initial ? '保存修改' : '添加'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
