import type { RecruitEvent } from '../types'
import { MODE_LABELS, STAGE_LABELS } from '../types'
import { MINUTE, eventEnd, eventStart, pad2 } from './date'

const CRLF = '\r\n'
const encoder = new TextEncoder()

/** RFC 5545 文本转义。 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * 按字节折行：首行 75 字节，续行「空格 + 最多 74 字节」，
 * 且不会把一个多字节字符切开。
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line

  const chunks: string[] = []
  let current = ''
  let currentBytes = 0
  let limit = 75

  for (const char of line) {
    const charBytes = encoder.encode(char).length
    if (currentBytes + charBytes > limit) {
      chunks.push(current)
      current = ''
      currentBytes = 0
      limit = 74
    }
    current += char
    currentBytes += charBytes
  }
  if (current) chunks.push(current)
  return chunks.join(`${CRLF} `)
}

export function toIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  )
}

export function toIcsDate(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
}

/** 提醒提前量 → 负向 ISO 8601 时长，例如 -PT30M / -PT2H / -P1D。 */
export function formatTrigger(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const mins = total % 60

  if (days > 0) {
    const parts: string[] = [`${days}D`]
    if (hours > 0) parts.push(`T${hours}H`)
    if (hours > 0 && mins > 0) parts[parts.length - 1] = `T${hours}H${mins}M`
    if (hours === 0 && mins > 0) parts.push(`T${mins}M`)
    return `-P${parts.join('')}`
  }
  if (hours > 0) return mins > 0 ? `-PT${hours}H${mins}M` : `-PT${hours}H`
  return `-PT${mins}M`
}

function describe(event: RecruitEvent): string[] {
  const lines: string[] = []
  if (event.role.trim()) lines.push(`岗位：${event.role.trim()}`)
  lines.push(`形式：${MODE_LABELS[event.mode]}`)
  if (event.mode === 'online' && event.link.trim()) lines.push(`链接：${event.link.trim()}`)
  if (event.mode === 'online' && event.passcode.trim()) lines.push(`作答口令：${event.passcode.trim()}`)
  if (event.mode === 'onsite' && event.location.trim()) lines.push(`地址：${event.location.trim()}`)
  if (event.mode === 'onsite' && event.link.trim()) lines.push(`通知链接：${event.link.trim()}`)
  if (event.note.trim()) lines.push(`备注：${event.note.trim()}`)
  return lines
}

function eventLines(event: RecruitEvent, stamp: string): string[] {
  const summary = `【${event.company}】${STAGE_LABELS[event.stage]}`
  const lines: string[] = ['BEGIN:VEVENT', `UID:${event.id}@recruitment-timeline`, `DTSTAMP:${stamp}`]

  if (event.allDay) {
    const start = eventStart(event)
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0, 0, 0)
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(start)}`, `DTEND;VALUE=DATE:${toIcsDate(next)}`)
  } else {
    lines.push(`DTSTART:${toIcsUtc(eventStart(event))}`, `DTEND:${toIcsUtc(eventEnd(event))}`)
  }

  lines.push(`SUMMARY:${escapeIcsText(summary)}`)
  const description = describe(event)
  if (description.length > 0) lines.push(`DESCRIPTION:${escapeIcsText(description.join('\n'))}`)
  const location = event.mode === 'online' ? '线上' : event.location.trim() || '地址待定'
  lines.push(`LOCATION:${escapeIcsText(location)}`, 'STATUS:CONFIRMED')

  if (event.remindBeforeMin > 0) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcsText(`${summary} 提醒`)}`)
    if (event.allDay) {
      // 全天事件在当日 09:00 提醒，用绝对时间触发，避免午夜触发。
      const start = eventStart(event)
      const base = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 9, 0, 0, 0)
      const trigger = new Date(base.getTime() - event.remindBeforeMin * MINUTE)
      lines.push(`TRIGGER;VALUE=DATE-TIME:${toIcsUtc(trigger)}`)
    } else {
      lines.push(`TRIGGER:${formatTrigger(event.remindBeforeMin)}`)
    }
    lines.push('END:VALARM')
  }

  lines.push('END:VEVENT')
  return lines
}

export function generateIcs(events: readonly RecruitEvent[], now: Date = new Date()): string {
  const stamp = toIcsUtc(now)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//recruitment-timeline//zh-CN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:秋招日程',
    'X-WR-TIMEZONE:Asia/Shanghai',
    ...events.flatMap(event => eventLines(event, stamp)),
    'END:VCALENDAR',
  ]
  return `${lines.map(foldLine).join(CRLF)}${CRLF}`
}
