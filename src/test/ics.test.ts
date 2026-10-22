import { describe, expect, it } from 'vitest'
import { escapeIcsText, foldLine, formatTrigger, generateIcs, toIcsDate, toIcsUtc } from '../lib/ics'
import { localDate } from './fixtures'
import { makeEvent } from './fixtures'

const CRLF = '\r\n'

function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '')
}

function physicalLines(ics: string): string[] {
  return ics.split(CRLF).filter(line => line.length > 0)
}

function parseStamp(stamp: string): number {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(stamp)
  if (!match) throw new Error(`无法解析时间戳 ${stamp}`)
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  )
}

describe('文本转义', () => {
  it('转义反斜杠、分号、逗号与换行', () => {
    expect(escapeIcsText('a,b;c\\d\nline')).toBe('a\\,b\\;c\\\\d\\nline')
  })

  it('普通文本保持不变', () => {
    expect(escapeIcsText('【字节跳动】笔试')).toBe('【字节跳动】笔试')
  })
})

describe('折行', () => {
  it('短行不折', () => {
    expect(foldLine('SUMMARY:short')).toBe('SUMMARY:short')
  })

  it('长行按 75 字节折行且可无损还原', () => {
    const line = 'X'.repeat(200)
    const folded = foldLine(line)
    expect(folded).toContain(CRLF)
    for (const physical of folded.split(CRLF)) {
      expect(new TextEncoder().encode(physical).length).toBeLessThanOrEqual(75)
    }
    expect(folded.replace(/\r\n /g, '')).toBe(line)
  })

  it('中文不会在多字节字符中间被切开', () => {
    const line = `DESCRIPTION:${'秋招笔试面试提醒'.repeat(12)}`
    const folded = foldLine(line)
    expect(folded).not.toContain('\uFFFD')
    expect(folded.replace(/\r\n /g, '')).toBe(line)
  })
})

describe('时间戳', () => {
  it('UTC 时间戳可还原同一时刻', () => {
    const date = new Date(2026, 9, 24, 14, 30, 0)
    expect(parseStamp(toIcsUtc(date))).toBe(date.getTime())
  })

  it('日期戳使用本地日期', () => {
    expect(toIcsDate(new Date(2026, 0, 5))).toBe('20260105')
  })
})

describe('提醒时长', () => {
  it('覆盖分钟 / 小时 / 天', () => {
    expect(formatTrigger(15)).toBe('-PT15M')
    expect(formatTrigger(30)).toBe('-PT30M')
    expect(formatTrigger(60)).toBe('-PT1H')
    expect(formatTrigger(90)).toBe('-PT1H30M')
    expect(formatTrigger(1440)).toBe('-P1D')
    expect(formatTrigger(1500)).toBe('-P1DT1H')
  })
})

describe('日历生成', () => {
  it('包含日历头与 CRLF 换行', () => {
    const ics = generateIcs([makeEvent()], new Date(2026, 9, 21, 9, 0, 0))
    expect(ics.startsWith(`BEGIN:VCALENDAR${CRLF}`)).toBe(true)
    expect(ics.endsWith(`END:VCALENDAR${CRLF}`)).toBe(true)
    expect(ics).toContain(`VERSION:2.0${CRLF}`)
    expect(ics).toContain('X-WR-CALNAME:秋招日程')
    expect(ics).not.toMatch(/(?<!\r)\n/)
  })

  it('定时事件的起止时间与提醒正确', () => {
    const event = makeEvent({ startAt: '2026-10-24T14:00', durationMin: 90, remindBeforeMin: 30 })
    const ics = generateIcs([event], new Date(2026, 9, 21, 9, 0, 0))
    const lines = physicalLines(ics)

    const startLine = lines.find(line => line.startsWith('DTSTART:'))
    const endLine = lines.find(line => line.startsWith('DTEND:'))
    expect(startLine).toBeDefined()
    expect(endLine).toBeDefined()

    const startStamp = startLine!.slice('DTSTART:'.length)
    const endStamp = endLine!.slice('DTEND:'.length)
    expect(parseStamp(startStamp)).toBe(new Date(2026, 9, 24, 14, 0, 0).getTime())
    expect(parseStamp(endStamp)).toBe(new Date(2026, 9, 24, 15, 30, 0).getTime())

    expect(ics).toContain('TRIGGER:-PT30M')
    expect(ics).toContain('ACTION:DISPLAY')
    expect(ics).toContain('SUMMARY:【字节跳动】笔试')
    expect(ics).toContain('UID:ev-1@recruitment-timeline')
  })

  it('不提醒时不生成 VALARM', () => {
    const ics = generateIcs([makeEvent({ remindBeforeMin: 0 })], new Date())
    expect(ics).not.toContain('BEGIN:VALARM')
  })

  it('全天事件使用 DATE 值并在当日 09:00 绝对提醒', () => {
    const event = makeEvent({ allDay: true, startAt: '2026-10-24', remindBeforeMin: 1440 })
    const ics = generateIcs([event], new Date(2026, 9, 21, 9, 0, 0))

    expect(ics).toContain('DTSTART;VALUE=DATE:20261024')
    expect(ics).toContain('DTEND;VALUE=DATE:20261025')

    const line = physicalLines(ics).find(item => item.startsWith('TRIGGER;VALUE=DATE-TIME:'))
    expect(line).toBeDefined()
    const stamp = line!.slice('TRIGGER;VALUE=DATE-TIME:'.length)
    expect(parseStamp(stamp)).toBe(new Date(2026, 9, 23, 9, 0, 0).getTime())
  })

  it('多个事件与描述内容', () => {
    const first = makeEvent({ id: 'a', note: '带 2 台设备' })
    const second = makeEvent({
      id: 'b',
      company: '腾讯',
      stage: 'interview',
      mode: 'onsite',
      location: '上海张江',
      startAt: localDate(new Date(2026, 9, 26).getTime()) + 'T10:00',
    })
    const ics = generateIcs([first, second], new Date(2026, 9, 21, 9, 0, 0))
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics).toContain('LOCATION:上海张江')
    expect(unfold(ics)).toContain('备注：带 2 台设备')
    expect(unfold(ics)).toContain('SUMMARY:【腾讯】面试')
  })

  it('线上会议带着作答口令，线下带着地址与通知链接', () => {
    const online = makeEvent({
      id: 'online',
      link: 'https://meeting.example.com/abc',
      passcode: '8848',
    })
    const onsite = makeEvent({
      id: 'onsite',
      company: '美团',
      mode: 'onsite',
      location: '北京望京 · 美团总部',
      link: 'https://notice.example.com/1',
    })
    const ics = unfold(generateIcs([online, onsite], new Date(2026, 9, 21, 9, 0, 0)))

    expect(ics).toContain('链接：https://meeting.example.com/abc')
    expect(ics).toContain('作答口令：8848')
    expect(ics).toContain('地址：北京望京 · 美团总部')
    expect(ics).toContain('通知链接：https://notice.example.com/1')
  })
})
