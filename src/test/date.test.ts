import { describe, expect, it } from 'vitest'
import {
  countdownDisplay,
  countdownText,
  dayKey,
  eventEnd,
  formatFullRange,
  groupByDay,
  isOverdue,
  monthMatrix,
  nextEvent,
  relativeDayLabel,
  startOfWeek,
  upcomingWeekRange,
} from '../lib/date'
import { BASE_TIME, localDate, localInput, makeEvent } from './fixtures'

const HOUR = 3_600_000
const DAY = 86_400_000

describe('倒计时（天 / 时粒度）', () => {
  it('3 天 4 小时显示两段', () => {
    const event = makeEvent({ startAt: localInput(BASE_TIME + 3 * DAY + 4 * HOUR) })
    const display = countdownDisplay(event, BASE_TIME)
    expect(display.parts).toEqual([
      { value: '3', unit: '天' },
      { value: '4', unit: '小时' },
    ])
    expect(display.text).toBeNull()
    expect(countdownText(display)).toBe('3 天 4 小时')
  })

  it('整 72 小时只显示天数', () => {
    const event = makeEvent({ startAt: localInput(BASE_TIME + 72 * HOUR) })
    expect(countdownText(countdownDisplay(event, BASE_TIME))).toBe('3 天')
  })

  it('不足 1 天只显示小时', () => {
    const event = makeEvent({ startAt: localInput(BASE_TIME + 5 * HOUR) })
    expect(countdownText(countdownDisplay(event, BASE_TIME))).toBe('5 小时')
  })

  it('不足 1 小时用文案', () => {
    const event = makeEvent({ startAt: localInput(BASE_TIME + 59 * 60_000) })
    const display = countdownDisplay(event, BASE_TIME)
    expect(display.text).toBe('不到 1 小时')
    expect(display.tone).toBe('urgent')
  })

  it('进行中与已结束', () => {
    const live = makeEvent({ startAt: localInput(BASE_TIME - 10 * 60_000), durationMin: 60 })
    expect(countdownDisplay(live, BASE_TIME).text).toBe('进行中')
    expect(countdownDisplay(live, BASE_TIME).tone).toBe('live')

    const done = makeEvent({ startAt: localInput(BASE_TIME - 2 * HOUR), durationMin: 60 })
    expect(countdownDisplay(done, BASE_TIME).text).toBe('已结束')
    expect(countdownDisplay(done, BASE_TIME).tone).toBe('over')
  })

  it('全天事件按日历天计算', () => {
    const today = makeEvent({ allDay: true, startAt: localDate(BASE_TIME) })
    expect(countdownDisplay(today, BASE_TIME).text).toBe('今天截止')

    const tomorrow = makeEvent({ allDay: true, startAt: localDate(BASE_TIME + DAY) })
    expect(countdownText(countdownDisplay(tomorrow, BASE_TIME))).toBe('1 天')

    const yesterday = makeEvent({ allDay: true, startAt: localDate(BASE_TIME - DAY) })
    expect(countdownDisplay(yesterday, BASE_TIME).text).toBe('已截止')
  })
})

describe('时间区间与分日', () => {
  it('跨天事件结束时间落到次日', () => {
    const event = makeEvent({ startAt: localDate(BASE_TIME) + 'T23:30', durationMin: 90 })
    const end = eventEnd(event)
    expect(end.getHours()).toBe(1)
    expect(end.getDate()).toBe(new Date(BASE_TIME).getDate() + 1)
    expect(formatFullRange(event)).toContain('次日 01:00')
  })

  it('全天事件结束于次日零点', () => {
    const event = makeEvent({ allDay: true, startAt: '2026-10-24' })
    const end = eventEnd(event)
    expect(dayKey(end)).toBe('2026-10-25')
    expect(formatFullRange(event)).toContain('全天')
  })

  it('groupByDay 按天分组并保持时间顺序', () => {
    const late = makeEvent({ id: 'b', startAt: '2026-10-24T18:00' })
    const early = makeEvent({ id: 'a', startAt: '2026-10-24T09:00' })
    const other = makeEvent({ id: 'c', startAt: '2026-10-25T10:00' })
    const groups = groupByDay([late, other, early])
    expect(groups).toHaveLength(2)
    expect(groups[0]?.events.map(event => event.id)).toEqual(['a', 'b'])
    expect(groups[1]?.key).toBe('2026-10-25')
  })
})

describe('月历矩阵', () => {
  it('2026 年 10 月从 9 月 28 日（周一）开始，共 42 格', () => {
    const weeks = monthMatrix(2026, 9)
    expect(weeks).toHaveLength(6)
    expect(weeks[0]?.[0] && dayKey(weeks[0][0])).toBe('2026-09-28')
    expect(dayKey(weeks[5]![6]!)).toBe('2026-11-08')
    expect(weeks.flat()).toHaveLength(42)
  })

  it('2 月与跨年也能对齐', () => {
    const weeks = monthMatrix(2027, 1)
    expect(weeks[0]?.[0]?.getDay()).toBe(1)
    expect(weeks).toHaveLength(6)
  })

  it('周起点是周一', () => {
    expect(dayKey(startOfWeek(new Date(2026, 9, 25)))).toBe('2026-10-19')
  })
})

describe('过期与下一场', () => {
  it('未结束且已结束才算过期', () => {
    const ended = makeEvent({ startAt: localInput(BASE_TIME - 3 * HOUR) })
    expect(isOverdue(ended, BASE_TIME)).toBe(true)
    expect(isOverdue({ ...ended, status: 'finished' }, BASE_TIME)).toBe(false)
    expect(isOverdue({ ...ended, status: 'in_progress' }, BASE_TIME)).toBe(true)
    expect(isOverdue(makeEvent({ startAt: localInput(BASE_TIME + HOUR) }), BASE_TIME)).toBe(false)
  })

  it('下一场取最早的未结束场次', () => {
    const later = makeEvent({ id: 'later', startAt: localInput(BASE_TIME + 2 * DAY) })
    const sooner = makeEvent({ id: 'sooner', startAt: localInput(BASE_TIME + DAY) })
    const finished = makeEvent({
      id: 'finished',
      startAt: localInput(BASE_TIME + HOUR),
      status: 'finished',
    })
    const ended = makeEvent({ id: 'ended', startAt: localInput(BASE_TIME - 5 * HOUR) })
    expect(nextEvent([later, finished, sooner, ended], BASE_TIME)?.id).toBe('sooner')
    expect(nextEvent([finished, ended], BASE_TIME)).toBeNull()
  })

  it('相对日期标签', () => {
    const now = new Date(BASE_TIME)
    expect(relativeDayLabel(now, now)).toBe('今天')
    expect(relativeDayLabel(new Date(BASE_TIME + DAY), now)).toBe('明天')
    expect(relativeDayLabel(new Date(BASE_TIME + 2 * DAY), now)).toBe('后天')
  })

  it('「今天起 7 天」包含今天与下周同一星期', () => {
    const { start, end } = upcomingWeekRange(BASE_TIME) // 2026-10-21 周三
    expect(start).toBe(new Date(2026, 9, 21, 0, 0, 0, 0).getTime())
    expect(end).toBe(new Date(2026, 9, 29, 0, 0, 0, 0).getTime())
    expect(end - start).toBe(8 * DAY)
    expect(new Date(BASE_TIME).getTime() >= start && new Date(BASE_TIME).getTime() < end).toBe(true)
    expect(new Date(2026, 9, 28, 23, 59).getTime() < end).toBe(true)
  })
})
