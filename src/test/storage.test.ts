import { beforeEach, describe, expect, it } from 'vitest'
import {
  EVENTS_KEY,
  loadEvents,
  loadNotified,
  loadSettings,
  normalizeEvent,
  normalizeSettings,
  saveEvents,
  saveNotified,
  storageAvailable,
} from '../store/storage'
import { makeEvent } from './fixtures'

describe('事件归一化', () => {
  it('拒绝无效输入', () => {
    expect(normalizeEvent(null)).toBeNull()
    expect(normalizeEvent({})).toBeNull()
    expect(normalizeEvent({ company: '  ' })).toBeNull()
    expect(normalizeEvent({ company: '腾讯', startAt: '10/24' })).toBeNull()
    expect(normalizeEvent({ company: '腾讯', startAt: '2026-13-01T10:00' })).toBeNull()
  })

  it('只有日期时自动变成全天事件', () => {
    const event = normalizeEvent({ company: '腾讯', startAt: '2026-10-24' })
    expect(event?.allDay).toBe(true)
    expect(event?.startAt).toBe('2026-10-24')
  })

  it('全天事件丢弃时间部分', () => {
    const event = normalizeEvent({ company: '腾讯', startAt: '2026-10-24T14:00', allDay: true })
    expect(event?.startAt).toBe('2026-10-24')
  })

  it('修补越界字段', () => {
    const event = normalizeEvent({
      company: '腾讯',
      startAt: '2026-10-24T14:00',
      durationMin: 9999,
      remindBeforeMin: -40,
      status: 'unknown',
      stage: 'nope',
      mode: 'nope',
    })
    expect(event?.durationMin).toBe(600)
    expect(event?.remindBeforeMin).toBe(0)
    expect(event?.status).toBe('pending')
    expect(event?.stage).toBe('other')
    expect(event?.mode).toBe('onsite')
  })

  it('缺 id 时补一个', () => {
    const event = normalizeEvent({ company: '腾讯', startAt: '2026-10-24T14:00' })
    expect(event?.id).toBeTruthy()
  })

  it('旧数据没有口令时补空字符串，已有的会保留', () => {
    const base = { company: '腾讯', startAt: '2026-10-24T14:00' }
    expect(normalizeEvent(base)?.passcode).toBe('')
    expect(normalizeEvent({ ...base, passcode: '8848' })?.passcode).toBe('8848')
  })

  it('旧版本的「HR 面」并入面试', () => {
    const event = normalizeEvent({ company: '腾讯', startAt: '2026-10-24T14:00', stage: 'hr' })
    expect(event?.stage).toBe('interview')
  })

  it('旧的「已通过/未通过/已放弃」并入新状态', () => {
    const base = { company: '腾讯', startAt: '2026-10-24T14:00' }
    expect(normalizeEvent({ ...base, status: 'passed' })?.status).toBe('in_progress')
    expect(normalizeEvent({ ...base, status: 'failed' })?.status).toBe('finished')
    expect(normalizeEvent({ ...base, status: 'withdrawn' })?.status).toBe('finished')
    expect(normalizeEvent({ ...base, status: 'in_progress' })?.status).toBe('in_progress')
    expect(normalizeEvent({ ...base, status: 'completed' })?.status).toBe('completed')
  })

  it('新阶段「测评」可正常读写', () => {
    const event = normalizeEvent({ company: '腾讯', startAt: '2026-10-24T14:00', stage: 'assessment' })
    expect(event?.stage).toBe('assessment')
  })
})

describe('设置归一化', () => {
  it('非法主题回落到 system', () => {
    expect(normalizeSettings({ theme: 'neon' }).theme).toBe('system')
  })

  it('提前量越界被夹住', () => {
    expect(normalizeSettings({ defaultRemindMin: -5 }).defaultRemindMin).toBe(0)
    expect(normalizeSettings({ defaultRemindMin: 999999 }).defaultRemindMin).toBe(1440)
  })

  it('损坏的输入返回默认设置', () => {
    expect(normalizeSettings(null)).toMatchObject({ theme: 'system', notifications: false })
  })
})

describe('本地存储', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('环境可用', () => {
    expect(storageAvailable()).toBe(true)
  })

  it('事件可保存并读回', () => {
    const events = [makeEvent(), makeEvent({ id: 'ev-2', company: '腾讯' })]
    expect(saveEvents(events)).toBe(true)
    const loaded = loadEvents()
    expect(loaded.issue).toBeNull()
    expect(loaded.events).toHaveLength(2)
    expect(loaded.events[1]?.company).toBe('腾讯')
  })

  it('损坏的 JSON 会备份并空列表启动', () => {
    window.localStorage.setItem(EVENTS_KEY, '{ 这不是 JSON')
    const loaded = loadEvents()
    expect(loaded.events).toHaveLength(0)
    expect(loaded.issue).toBeTruthy()

    const backupKey = Object.keys(window.localStorage).find(key => key.startsWith(`${EVENTS_KEY}.corrupt.`))
    expect(backupKey).toBeTruthy()
    expect(backupKey ? window.localStorage.getItem(backupKey) : null).toBe('{ 这不是 JSON')
  })

  it('丢弃格式错误的记录并提示', () => {
    window.localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify({
        schemaVersion: 1,
        events: [
          { company: '腾讯', startAt: '2026-10-24T14:00' },
          { company: '', startAt: '2026-10-25T10:00' },
        ],
      }),
    )
    const loaded = loadEvents()
    expect(loaded.events).toHaveLength(1)
    expect(loaded.issue).toContain('1 条')
  })

  it('设置读写', () => {
    const settings = { ...normalizeSettings(null), theme: 'dark' as const, notifications: true }
    window.localStorage.setItem('rt.v1.settings', JSON.stringify(settings))
    expect(loadSettings().theme).toBe('dark')
    expect(loadSettings().notifications).toBe(true)
  })

  it('通知记录只保留 30 天内的', () => {
    const fresh = Date.now()
    const stale = fresh - 40 * 86_400_000
    saveNotified({ keep: fresh, drop: stale })
    expect(loadNotified()).toEqual({ keep: fresh })
  })
})
