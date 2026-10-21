import type { RecruitEvent } from '../types'
import { STAGE_LABELS } from '../types'
import { MINUTE, dayKey, eventStart, formatTime, parseStartAt } from './date'

/** 只补发 1 小时内的提醒，避免打开页面时被过期提醒刷屏。 */
export const NOTIFICATION_GRACE_MS = 60 * MINUTE

export type NotificationKind = 'remind' | 'start'

export interface DueNotification {
  key: string
  kind: NotificationKind
  event: RecruitEvent
  triggerAt: number
  title: string
  body: string
}

export type SentMap = Record<string, number>

function minutesLabel(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} 天前`
  if (minutes % 60 === 0) return `${minutes / 60} 小时前`
  return `${minutes} 分钟前`
}

function placeLabel(event: RecruitEvent): string {
  if (event.mode === 'online') return event.link.trim() ? '线上会议' : '线上'
  return event.location.trim() || '地址待定'
}

/** 触发时刻（毫秒）；无此提醒时返回 null。 */
export function notificationTrigger(event: RecruitEvent, kind: NotificationKind): number | null {
  const parsed = parseStartAt(event.startAt)
  if (!parsed) return null

  if (event.allDay) {
    if (kind === 'start') return null
    if (event.remindBeforeMin <= 0) return null
    const start = eventStart(event)
    const base = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 9, 0, 0, 0)
    return base.getTime() - event.remindBeforeMin * MINUTE
  }

  const start = eventStart(event).getTime()
  if (kind === 'start') return start
  if (event.remindBeforeMin <= 0) return null
  return start - event.remindBeforeMin * MINUTE
}

function content(event: RecruitEvent, kind: NotificationKind): { title: string; body: string } {
  const stage = STAGE_LABELS[event.stage]
  const start = eventStart(event)

  if (event.allDay) {
    return {
      title: `【${event.company}】${stage}提醒`,
      body: `${dayKey(start)} · ${placeLabel(event)}`,
    }
  }

  if (kind === 'start') {
    return {
      title: `【${event.company}】${stage}开始了`,
      body: `${formatTime(start)} · ${placeLabel(event)}`,
    }
  }

  return {
    title: `【${event.company}】${stage}即将开始`,
    body: `${formatTime(start)} 开始 · ${minutesLabel(event.remindBeforeMin)}提醒`,
  }
}

/** 计算此刻应发出的通知；sent 是已发通知的记录，用来去重。 */
export function dueNotifications(
  events: readonly RecruitEvent[],
  now: number,
  sent: SentMap,
): DueNotification[] {
  const due: DueNotification[] = []

  for (const event of events) {
    if (event.status !== 'pending') continue
    for (const kind of ['remind', 'start'] as const) {
      const triggerAt = notificationTrigger(event, kind)
      if (triggerAt === null) continue
      if (now < triggerAt) continue
      if (now - triggerAt > NOTIFICATION_GRACE_MS) continue
      const key = `${event.id}:${kind}:${triggerAt}`
      if (sent[key]) continue
      due.push({ key, kind, event, triggerAt, ...content(event, kind) })
    }
  }

  return due.sort((a, b) => a.triggerAt - b.triggerAt)
}

export type PermissionState = NotificationPermission | 'unsupported'

export function currentPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function notificationOptions(body: string, tag: string, eventId: string): NotificationOptions {
  return {
    body,
    tag,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { eventId, url: `#/events?focus=${eventId}` },
  }
}

export async function presentNotification(notification: DueNotification): Promise<void> {
  const options = notificationOptions(notification.body, notification.key, notification.event.id)
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(notification.title, options)
        return
      }
    }
  } catch {
    // 落到下面的前台通知
  }
  try {
    if (typeof Notification !== 'undefined') new Notification(notification.title, options)
  } catch {
    // 通知不可用时不打断使用
  }
}

export async function sendTestNotification(): Promise<boolean> {
  const title = '秋招日程 · 测试提醒'
  const options = notificationOptions('如果你看到这条通知，说明提醒已经接好了。', 'rt-test', '')
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(title, options)
        return true
      }
    }
    if (typeof Notification !== 'undefined') {
      new Notification(title, options)
      return true
    }
  } catch {
    return false
  }
  return false
}
