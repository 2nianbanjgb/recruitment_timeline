import { describe, expect, it } from 'vitest'
import { NOTIFICATION_GRACE_MS, dueNotifications, notificationTrigger } from '../lib/notify'
import { BASE_TIME, localDate, makeEvent } from './fixtures'

const MINUTE = 60_000

describe('触发时刻', () => {
  it('提前提醒 = 开始时间 - 提前量', () => {
    const event = makeEvent({ startAt: '2026-10-24T14:00', remindBeforeMin: 30 })
    const start = new Date(2026, 9, 24, 14, 0, 0).getTime()
    expect(notificationTrigger(event, 'remind')).toBe(start - 30 * MINUTE)
    expect(notificationTrigger(event, 'start')).toBe(start)
  })

  it('不提醒时为 null', () => {
    expect(notificationTrigger(makeEvent({ remindBeforeMin: 0 }), 'remind')).toBeNull()
  })

  it('全天事件按当天 09:00 减提前量，没有开场提醒', () => {
    const event = makeEvent({ allDay: true, startAt: '2026-10-24', remindBeforeMin: 1440 })
    expect(notificationTrigger(event, 'remind')).toBe(new Date(2026, 9, 23, 9, 0, 0).getTime())
    expect(notificationTrigger(event, 'start')).toBeNull()
  })
})

describe('到点筛选', () => {
  it('到点即发出，且 key 稳定', () => {
    const event = makeEvent({ startAt: localDate(BASE_TIME + 30 * MINUTE) + 'T09:30', remindBeforeMin: 30 })
    const triggerAt = notificationTrigger(event, 'remind')!
    const due = dueNotifications([event], triggerAt, {})
    expect(due).toHaveLength(1)
    expect(due[0]).toMatchObject({ kind: 'remind', triggerAt })
    expect(due[0]?.key).toBe(`${event.id}:remind:${triggerAt}`)
  })

  it('已记录发过的 key 不重复发', () => {
    const event = makeEvent({ startAt: '2026-10-24T14:00', remindBeforeMin: 30 })
    const triggerAt = notificationTrigger(event, 'remind')!
    const due = dueNotifications([event], triggerAt, { [`${event.id}:remind:${triggerAt}`]: triggerAt })
    expect(due).toHaveLength(0)
  })

  it('超过 1 小时的过期触发点不再补发', () => {
    const event = makeEvent({ startAt: '2026-10-24T14:00', remindBeforeMin: 30 })
    const start = new Date(2026, 9, 24, 14, 0, 0).getTime()
    expect(dueNotifications([event], start + NOTIFICATION_GRACE_MS + MINUTE, {})).toHaveLength(0)
  })

  it('只处理未结束的场次', () => {
    const event = makeEvent({ startAt: '2026-10-24T14:00', status: 'finished' })
    const triggerAt = notificationTrigger(event, 'remind')!
    expect(dueNotifications([event], triggerAt, {})).toHaveLength(0)
  })

  it('开场提醒在开始时刻触发', () => {
    const event = makeEvent({ startAt: '2026-10-24T14:00', remindBeforeMin: 0 })
    const start = new Date(2026, 9, 24, 14, 0, 0).getTime()
    const due = dueNotifications([event], start, {})
    expect(due).toHaveLength(1)
    expect(due[0]?.kind).toBe('start')
    expect(due[0]?.title).toContain('开始了')
  })

  it('按触发时间排序', () => {
    const later = makeEvent({ id: 'later', startAt: '2026-10-24T17:50', remindBeforeMin: 0 })
    const earlier = makeEvent({ id: 'earlier', startAt: '2026-10-24T18:10', remindBeforeMin: 30 })
    const due = dueNotifications([later, earlier], new Date(2026, 9, 24, 18, 0, 0).getTime(), {})
    expect(due.map(item => `${item.event.id}:${item.kind}`)).toEqual([
      'earlier:remind',
      'later:start',
    ])
  })
})
