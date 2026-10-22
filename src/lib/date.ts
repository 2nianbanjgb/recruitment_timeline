import type { RecruitEvent } from '../types'

export const MINUTE = 60_000
export const HOUR = 3_600_000
const DAY = 86_400_000

export const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

const START_AT_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/

export interface ParsedStart {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  hasTime: boolean
}

/** 解析本地墙钟时间，非法输入返回 null。 */
export function parseStartAt(value: string): ParsedStart | null {
  const match = START_AT_RE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = match[4] ? Number(match[4]) : 0
  const minute = match[5] ? Number(match[5]) : 0
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null

  // 拒绝 2 月 30 日这类会被 Date 静默进位的日期。
  const probe = new Date(year, month - 1, day)
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return null
  }

  return { year, month, day, hour, minute, hasTime: Boolean(match[4]) }
}

export function parseLocalDate(value: string): Date {
  const parsed = parseStartAt(value)
  if (!parsed) return new Date(Number.NaN)
  return new Date(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, 0, 0)
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  )
}

export function eventStart(event: RecruitEvent): Date {
  const date = parseLocalDate(event.startAt)
  if (Number.isNaN(date.getTime())) return date
  return event.allDay ? startOfDay(date) : date
}

export function eventEnd(event: RecruitEvent): Date {
  const start = eventStart(event)
  if (Number.isNaN(start.getTime())) return start
  if (event.allDay) return addDays(startOfDay(start), 1)
  return new Date(start.getTime() + Math.max(1, event.durationMin) * MINUTE)
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

/** 周一为一周起点。 */
export function startOfWeek(date: Date): Date {
  const base = startOfDay(date)
  const offset = (base.getDay() + 6) % 7
  return addDays(base, -offset)
}

/** 6 行 × 7 列的月历矩阵（周一起始）。 */
export function monthMatrix(year: number, month: number): Date[][] {
  const gridStart = startOfWeek(new Date(year, month, 1))
  const weeks: Date[][] = []
  for (let week = 0; week < 6; week += 1) {
    const row: Date[] = []
    for (let day = 0; day < 7; day += 1) {
      row.push(addDays(gridStart, week * 7 + day))
    }
    weeks.push(row)
  }
  return weeks
}

export function diffCalendarDays(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b - a) / DAY)
}

export function formatTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year} 年 ${month + 1} 月`
}

export function formatDayWithWeekday(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAY_SHORT[date.getDay()]}`
}

export function formatDayShort(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatFullRange(event: RecruitEvent): string {
  const start = eventStart(event)
  if (Number.isNaN(start.getTime())) return '时间无效'
  if (event.allDay) return `${formatDayWithWeekday(start)} · 全天`
  const end = eventEnd(event)
  const tail = isSameDay(start, end) ? formatTime(end) : `次日 ${formatTime(end)}`
  return `${formatDayWithWeekday(start)} ${formatTime(start)}–${tail}`
}

export function relativeDayLabel(date: Date, now: Date): string {
  const diff = diffCalendarDays(now, date)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff === -1) return '昨天'
  if (diff === -2) return '前天'
  return formatDayWithWeekday(date)
}

export type CountdownTone = 'normal' | 'urgent' | 'live' | 'over'

export interface CountdownPart {
  value: string
  unit: string
}

export interface CountdownDisplay {
  parts: CountdownPart[]
  text: string | null
  tone: CountdownTone
}

/**
 * 大倒计时只到「天 / 时」：≥1 天显示「N 天 M 小时」，<1 天显示「M 小时」，
 * 不足 1 小时与进行中/已结束改用文案表达。
 */
export function countdownDisplay(event: RecruitEvent, now: number): CountdownDisplay {
  const start = eventStart(event)
  const end = eventEnd(event)
  if (Number.isNaN(start.getTime())) return { parts: [], text: '时间无效', tone: 'over' }

  if (event.allDay) {
    const diff = diffCalendarDays(new Date(now), start)
    if (diff > 0) return { parts: [{ value: String(diff), unit: '天' }], text: null, tone: diff <= 2 ? 'urgent' : 'normal' }
    if (diff === 0) return { parts: [], text: '今天截止', tone: 'urgent' }
    return { parts: [], text: '已截止', tone: 'over' }
  }

  const startMs = start.getTime()
  const endMs = end.getTime()
  if (now >= endMs) return { parts: [], text: '已结束', tone: 'over' }
  if (now >= startMs) return { parts: [], text: '进行中', tone: 'live' }

  const remain = startMs - now
  if (remain < HOUR) return { parts: [], text: '不到 1 小时', tone: 'urgent' }

  const hours = Math.floor(remain / HOUR)
  if (hours < 24) {
    return { parts: [{ value: String(hours), unit: '小时' }], text: null, tone: hours <= 3 ? 'urgent' : 'normal' }
  }

  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  const parts: CountdownPart[] = [{ value: String(days), unit: '天' }]
  if (restHours > 0) parts.push({ value: String(restHours), unit: '小时' })
  return { parts, text: null, tone: 'normal' }
}

export function countdownText(display: CountdownDisplay): string {
  if (display.text) return display.text
  return display.parts.map(part => `${part.value} ${part.unit}`).join(' ')
}

/**
 * 「今天起 7 天」的时间窗：今天 00:00 起，到下周同一星期当天结束，
 * 共 8 个自然日（含今天）。
 */
export function upcomingWeekRange(now: number): { start: number; end: number } {
  const start = startOfDay(new Date(now))
  return { start: start.getTime(), end: addDays(start, 8).getTime() }
}

export function isOverdue(event: RecruitEvent, now: number): boolean {
  if (event.status === 'finished') return false
  if (event.allDay) return diffCalendarDays(new Date(now), eventStart(event)) < 0
  return now >= eventEnd(event).getTime()
}

export function sortByStart(events: readonly RecruitEvent[]): RecruitEvent[] {
  return [...events].sort((a, b) => {
    const delta = eventStart(a).getTime() - eventStart(b).getTime()
    if (delta !== 0) return delta
    return a.company.localeCompare(b.company, 'zh-CN')
  })
}

export function nextEvent(events: readonly RecruitEvent[], now: number): RecruitEvent | null {
  const candidates = events.filter(
    event => event.status !== 'finished' && eventEnd(event).getTime() > now,
  )
  return sortByStart(candidates)[0] ?? null
}

export function eventsOnDay(events: readonly RecruitEvent[], day: Date): RecruitEvent[] {
  return sortByStart(events.filter(event => isSameDay(eventStart(event), day)))
}

export interface DayGroup {
  key: string
  date: Date
  events: RecruitEvent[]
}

export function groupByDay(events: readonly RecruitEvent[]): DayGroup[] {
  const groups = new Map<string, DayGroup>()
  for (const event of sortByStart(events)) {
    const start = eventStart(event)
    if (Number.isNaN(start.getTime())) continue
    const key = dayKey(start)
    const existing = groups.get(key)
    if (existing) {
      existing.events.push(event)
    } else {
      groups.set(key, { key, date: startOfDay(start), events: [event] })
    }
  }
  return [...groups.values()]
}
