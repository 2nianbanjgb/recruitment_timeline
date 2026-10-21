import type { TodoItem } from '../types'

/** 完成后进入归档，保留 7 天后自动删除。 */
export const TODO_ARCHIVE_TTL_MS = 7 * 86_400_000
export const TODO_ARCHIVE_TTL_DAYS = 7

export function completedAtMs(todo: TodoItem): number | null {
  if (!todo.completedAt) return null
  const ms = Date.parse(todo.completedAt)
  return Number.isFinite(ms) ? ms : null
}

/** 归档超过 7 天，等待清理。 */
export function isExpiredArchive(todo: TodoItem, now: number): boolean {
  if (!todo.done) return false
  const completedAt = completedAtMs(todo)
  if (completedAt === null) return false
  return now - completedAt > TODO_ARCHIVE_TTL_MS
}

export function purgeExpiredTodos(todos: readonly TodoItem[], now: number): TodoItem[] {
  return todos.filter(todo => !isExpiredArchive(todo, now))
}

export interface TodoBuckets {
  /** 未完成，新的在前 */
  active: TodoItem[]
  /** 已完成且未过期，刚完成的在前 */
  archived: TodoItem[]
  expiredCount: number
}

export function splitTodos(todos: readonly TodoItem[], now: number): TodoBuckets {
  const active: TodoItem[] = []
  const archived: TodoItem[] = []
  let expiredCount = 0

  for (const todo of todos) {
    if (!todo.done) {
      active.push(todo)
      continue
    }
    if (isExpiredArchive(todo, now)) {
      expiredCount += 1
      continue
    }
    archived.push(todo)
  }

  active.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  archived.sort((a, b) => (completedAtMs(b) ?? 0) - (completedAtMs(a) ?? 0))
  return { active, archived, expiredCount }
}

/** 归档还剩几天可恢复（向上取整）。 */
export function remainingArchiveDays(todo: TodoItem, now: number): number {
  const completedAt = completedAtMs(todo)
  if (completedAt === null) return TODO_ARCHIVE_TTL_DAYS
  const remain = TODO_ARCHIVE_TTL_MS - (now - completedAt)
  return Math.max(0, Math.ceil(remain / 86_400_000))
}
