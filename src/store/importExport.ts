import type { BackupFile, RecruitEvent, Settings } from '../types'
import { SCHEMA_VERSION } from '../types'
import { normalizeEvent, normalizeSettings } from './storage'

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024

export function buildBackup(
  events: readonly RecruitEvent[],
  settings: Settings,
  now: Date = new Date(),
): string {
  const payload: BackupFile = {
    schemaVersion: SCHEMA_VERSION,
    app: 'recruitment-timeline',
    exportedAt: now.toISOString(),
    settings,
    events: [...events],
  }
  return JSON.stringify(payload, null, 2)
}

export interface ParsedBackup {
  events: RecruitEvent[]
  settings: Settings | null
  dropped: number
}

export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) {
    throw new Error('备份文件超过 5MB，已拒绝导入。')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON。')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('备份文件结构不正确。')
  }

  const source = parsed as Record<string, unknown>
  const list = Array.isArray(source.events) ? source.events : null
  if (!list) throw new Error('备份文件里没有 events 列表。')
  if (list.length > 5000) throw new Error('备份文件包含的日程过多（超过 5000 条）。')

  const events: RecruitEvent[] = []
  for (const item of list) {
    const event = normalizeEvent(item)
    if (event) events.push(event)
  }
  if (list.length > 0 && events.length === 0) {
    throw new Error('备份文件里的日程都无法识别。')
  }

  const settings =
    source.settings && typeof source.settings === 'object'
      ? normalizeSettings(source.settings)
      : null

  return { events, settings, dropped: list.length - events.length }
}

export interface MergeResult {
  events: RecruitEvent[]
  added: number
  updated: number
  skipped: number
}

/** 按 id 合并：新 id 追加，同 id 取 updatedAt 较新的版本。 */
export function mergeEvents(
  current: readonly RecruitEvent[],
  incoming: readonly RecruitEvent[],
): MergeResult {
  const merged = new Map(current.map(event => [event.id, event]))
  let added = 0
  let updated = 0
  let skipped = 0

  for (const event of incoming) {
    const existing = merged.get(event.id)
    if (!existing) {
      merged.set(event.id, event)
      added += 1
    } else if (event.updatedAt > existing.updatedAt) {
      merged.set(event.id, event)
      updated += 1
    } else {
      skipped += 1
    }
  }

  return { events: [...merged.values()], added, updated, skipped }
}
