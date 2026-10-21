import type { RecruitEvent, Settings, TodoItem } from '../types'
import { STAGE_LABELS } from '../types'
import {
  loadEvents,
  loadSettings,
  loadTodos,
  normalizeSettings,
  saveEvents,
  saveSettings,
  saveTodos,
} from '../store/storage'

/** 一次完整的数据快照，与本地文件里的 data 结构一致。 */
export interface Snapshot {
  events: RecruitEvent[]
  todos: TodoItem[]
  settings: Settings
}

export type SyncEntity = 'event' | 'todo' | 'settings'
export type SyncAction = 'add' | 'update' | 'delete'

export interface SyncChange {
  entity: SyncEntity
  action: SyncAction
  id: string
  label: string
  fields?: string[]
}

export interface RemoteState {
  revision: number
  savedAt: string | null
  data: Snapshot | null
  dataDir?: string
}

const API_BASE = '/api'
const SYNCED_AT_KEY = 'rt.v1.syncedAt'

const EVENT_FIELDS: (keyof RecruitEvent)[] = [
  'company',
  'role',
  'stage',
  'status',
  'allDay',
  'startAt',
  'durationMin',
  'mode',
  'link',
  'location',
  'note',
  'remindBeforeMin',
]

const TODO_FIELDS: (keyof TodoItem)[] = ['text', 'done', 'completedAt', 'order']

const SETTINGS_FIELDS: (keyof Settings)[] = ['theme', 'notifications', 'defaultRemindMin']

function eventLabel(event: RecruitEvent): string {
  return `${event.company} · ${STAGE_LABELS[event.stage]} · ${event.startAt.replace('T', ' ')}`
}

function changedFields<T>(before: T, after: T, fields: readonly (keyof T)[]): string[] {
  return fields
    .filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map(field => String(field))
}

/**
 * 对比上一次写入文件的内容，算出这次改动涉及的记录。
 * previous 为 null（文件还是空的）时，把现有数据整体记为新增。
 * 只在本地给日志用，不参与业务逻辑。
 */
export function diffState(previous: Snapshot | null, next: Snapshot): SyncChange[] {
  const before: Snapshot = previous ?? { events: [], todos: [], settings: next.settings }
  const changes: SyncChange[] = []

  const previousEvents = new Map(before.events.map(event => [event.id, event]))
  const nextEvents = new Map(next.events.map(event => [event.id, event]))

  for (const [id, event] of nextEvents) {
    const before = previousEvents.get(id)
    if (!before) {
      changes.push({ entity: 'event', action: 'add', id, label: eventLabel(event) })
      continue
    }
    const fields = changedFields(before, event, EVENT_FIELDS)
    if (fields.length > 0) {
      changes.push({ entity: 'event', action: 'update', id, label: eventLabel(event), fields })
    }
  }
  for (const [id, event] of previousEvents) {
    if (!nextEvents.has(id)) {
      changes.push({ entity: 'event', action: 'delete', id, label: eventLabel(event) })
    }
  }

  const previousTodos = new Map(before.todos.map(todo => [todo.id, todo]))
  const nextTodos = new Map(next.todos.map(todo => [todo.id, todo]))

  for (const [id, todo] of nextTodos) {
    const before = previousTodos.get(id)
    if (!before) {
      changes.push({ entity: 'todo', action: 'add', id, label: todo.text })
      continue
    }
    const fields = changedFields(before, todo, TODO_FIELDS)
    if (fields.length > 0) {
      changes.push({ entity: 'todo', action: 'update', id, label: todo.text, fields })
    }
  }
  for (const [id, todo] of previousTodos) {
    if (!nextTodos.has(id)) {
      changes.push({ entity: 'todo', action: 'delete', id, label: todo.text })
    }
  }

  const settingsFields = changedFields(before.settings, next.settings, SETTINGS_FIELDS)
  if (settingsFields.length > 0) {
    changes.push({
      entity: 'settings',
      action: 'update',
      id: 'settings',
      label: '偏好设置',
      fields: settingsFields,
    })
  }

  return changes
}

export function readSyncedAt(): string | null {
  try {
    return window.localStorage.getItem(SYNCED_AT_KEY)
  } catch {
    return null
  }
}

export function writeSyncedAt(value: string): void {
  try {
    window.localStorage.setItem(SYNCED_AT_KEY, value)
  } catch {
    // ignore
  }
}

export function readLocalSnapshot(): Snapshot {
  return {
    events: loadEvents().events,
    todos: loadTodos().todos,
    settings: loadSettings(),
  }
}

export function applySnapshotToLocal(snapshot: Snapshot): void {
  saveEvents(snapshot.events.map(event => ({ ...event })))
  saveTodos(snapshot.todos.map(todo => ({ ...todo })))
  saveSettings(normalizeSettings(snapshot.settings))
}

export function hasAnyData(snapshot: Snapshot): boolean {
  return snapshot.events.length > 0 || snapshot.todos.length > 0
}

export async function fetchRemoteState(): Promise<RemoteState | null> {
  try {
    const response = await fetch(`${API_BASE}/state`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return null
    return (await response.json()) as RemoteState
  } catch {
    return null
  }
}

export async function pushSnapshot(
  snapshot: Snapshot,
  changes: SyncChange[],
): Promise<{ revision: number; savedAt: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/state`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: snapshot, changes }),
    })
    if (!response.ok) return null
    const payload = (await response.json()) as { revision: number; savedAt: string }
    return payload
  } catch {
    return null
  }
}

/**
 * 首屏渲染前调用：如果本地文件比浏览器里的新，就把文件内容灌回 localStorage。
 * 服务没启动时静默跳过。
 */
export async function hydrateFromServer(): Promise<boolean> {
  const remote = await fetchRemoteState()
  if (!remote?.data || !remote.savedAt) return false

  const localSyncedAt = readSyncedAt()
  if (localSyncedAt && remote.savedAt <= localSyncedAt) return false

  applySnapshotToLocal(remote.data)
  writeSyncedAt(remote.savedAt)
  return true
}
