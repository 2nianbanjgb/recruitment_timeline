import type { Mode, RecruitEvent, Settings, Stage, Status, Theme } from '../types'
import { DEFAULT_SETTINGS, MODES, SCHEMA_VERSION, STAGES, STATUSES, THEMES } from '../types'
import { parseStartAt } from '../lib/date'
import { newId } from '../lib/id'

export const EVENTS_KEY = 'rt.v1.events'
export const SETTINGS_KEY = 'rt.v1.settings'
export const NOTIFIED_KEY = 'rt.v1.notified'

const NOTIFIED_TTL_MS = 30 * 86_400_000
const REMIND_RANGE: readonly [number, number] = [0, 7 * 1440]

let storageProbe: boolean | null = null

export function storageAvailable(): boolean {
  if (storageProbe !== null) return storageProbe
  try {
    const probe = '__rt_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    storageProbe = true
  } catch {
    storageProbe = false
  }
  return storageProbe
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T
  return fallback
}

function clampRemind(value: number): number {
  const rounded = Math.round(value)
  if (rounded < REMIND_RANGE[0]) return 0
  if (rounded > REMIND_RANGE[1]) return 1440
  return rounded
}

/** 旧版本把「HR 面」单独列为阶段，现在合并进面试。 */
function normalizeStage(value: unknown): Stage {
  if (value === 'hr') return 'interview'
  return pick<Stage>(value, STAGES, 'other')
}

/** 尽最大努力把一条任意输入修成合法事件；无法识别时返回 null。 */
export function normalizeEvent(raw: unknown): RecruitEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>

  const company = str(source.company).trim()
  if (!company) return null

  const startAtRaw = str(source.startAt).trim()
  if (!parseStartAt(startAtRaw)) return null

  const hasTime = startAtRaw.includes('T')
  const allDay = hasTime ? bool(source.allDay, false) : true
  const startAt = allDay ? startAtRaw.slice(0, 10) : startAtRaw

  const link = str(source.link)
  const createdAt = str(source.createdAt) || new Date().toISOString()

  return {
    id: str(source.id) || newId(),
    company,
    role: str(source.role),
    stage: normalizeStage(source.stage),
    status: pick<Status>(source.status, STATUSES, 'pending'),
    allDay,
    startAt,
    durationMin: Math.min(600, Math.max(5, Math.round(num(source.durationMin, 60)))),
    mode: pick<Mode>(source.mode, MODES, link ? 'online' : 'onsite'),
    link,
    location: str(source.location),
    note: str(source.note),
    remindBeforeMin: clampRemind(num(source.remindBeforeMin, DEFAULT_SETTINGS.defaultRemindMin)),
    createdAt,
    updatedAt: str(source.updatedAt) || createdAt,
  }
}

export function normalizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }
  const source = raw as Record<string, unknown>
  return {
    schemaVersion: SCHEMA_VERSION,
    theme: pick<Theme>(source.theme, THEMES, 'system'),
    notifications: bool(source.notifications, false),
    defaultRemindMin: clampRemind(num(source.defaultRemindMin, DEFAULT_SETTINGS.defaultRemindMin)),
  }
}

export interface LoadEventsResult {
  events: RecruitEvent[]
  issue: string | null
}

export function loadEvents(): LoadEventsResult {
  if (!storageAvailable()) {
    return { events: [], issue: '当前浏览器禁用了本地存储，数据只能保留在本次会话中。' }
  }

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(EVENTS_KEY)
  } catch {
    return { events: [], issue: '读取本地存储失败，已按空列表启动。' }
  }
  if (!raw) return { events: [], issue: null }

  try {
    const parsed: unknown = JSON.parse(raw)
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { events?: unknown }).events)
        ? (parsed as { events: unknown[] }).events
        : null

    if (!list) throw new Error('unexpected shape')

    const events: RecruitEvent[] = []
    for (const item of list) {
      const event = normalizeEvent(item)
      if (event) events.push(event)
    }
    const dropped = list.length - events.length
    return {
      events,
      issue: dropped > 0 ? `有 ${dropped} 条记录格式不正确，已忽略并保留其余 ${events.length} 条。` : null,
    }
  } catch {
    try {
      window.localStorage.setItem(`${EVENTS_KEY}.corrupt.${Date.now()}`, raw)
    } catch {
      // 备份失败也不能阻塞启动
    }
    return { events: [], issue: '本地数据无法解析，原始内容已备份，界面按空列表启动。' }
  }
}

export function saveEvents(events: readonly RecruitEvent[]): boolean {
  if (!storageAvailable()) return false
  try {
    window.localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, events }),
    )
    return true
  } catch {
    return false
  }
}

export function clearStoredEvents(): void {
  try {
    window.localStorage.removeItem(EVENTS_KEY)
  } catch {
    // ignore
  }
}

export function loadSettings(): Settings {
  if (!storageAvailable()) return { ...DEFAULT_SETTINGS }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return normalizeSettings(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): boolean {
  if (!storageAvailable()) return false
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

export function loadNotified(): Record<string, number> {
  if (!storageAvailable()) return {}
  let parsed: unknown
  try {
    const raw = window.localStorage.getItem(NOTIFIED_KEY)
    if (!raw) return {}
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== 'object') return {}

  const cutoff = Date.now() - NOTIFIED_TTL_MS
  const map: Record<string, number> = {}
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'number' && value > cutoff) map[key] = value
  }
  return map
}

export function saveNotified(map: Record<string, number>): void {
  if (!storageAvailable()) return
  const entries = Object.entries(map)
  const trimmed =
    entries.length > 500
      ? Object.fromEntries(entries.sort((a, b) => b[1] - a[1]).slice(0, 400))
      : map
  try {
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(trimmed))
  } catch {
    // ignore
  }
}
