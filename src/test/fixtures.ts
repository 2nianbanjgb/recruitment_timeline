import type { RecruitEvent } from '../types'

/** 测试基准时刻：本地时间 2026-10-21 09:00。 */
export const BASE_TIME = new Date(2026, 9, 21, 9, 0, 0).getTime()

export function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

export function localInput(ms: number): string {
  const date = new Date(ms)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function localDate(ms: number): string {
  const date = new Date(ms)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function makeEvent(overrides: Partial<RecruitEvent> = {}): RecruitEvent {
  return {
    id: 'ev-1',
    company: '字节跳动',
    role: '后端开发',
    stage: 'written',
    status: 'pending',
    allDay: false,
    startAt: '2026-10-24T14:00',
    durationMin: 60,
    mode: 'online',
    link: '',
    location: '',
    note: '',
    remindBeforeMin: 30,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  }
}
