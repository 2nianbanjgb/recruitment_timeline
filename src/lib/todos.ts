import type { TodoItem } from '../types'

/** 完成后进入归档，保留 30 天后自动删除，期间可随时恢复。 */
export const TODO_ARCHIVE_TTL_DAYS = 30
export const TODO_ARCHIVE_TTL_MS = TODO_ARCHIVE_TTL_DAYS * 86_400_000

export function completedAtMs(todo: TodoItem): number | null {
  if (!todo.completedAt) return null
  const ms = Date.parse(todo.completedAt)
  return Number.isFinite(ms) ? ms : null
}

/** 归档超过 30 天，等待清理。 */
export function isExpiredArchive(todo: TodoItem, now: number): boolean {
  if (!todo.done) return false
  const completedAt = completedAtMs(todo)
  if (completedAt === null) return false
  return now - completedAt > TODO_ARCHIVE_TTL_MS
}

export function purgeExpiredTodos(todos: readonly TodoItem[], now: number): TodoItem[] {
  return todos.filter(todo => !isExpiredArchive(todo, now))
}

/** 待办排序：手动顺序（order 小的在前），同序号时新建的在前。 */
export function compareActive(a: TodoItem, b: TodoItem): number {
  if (a.order !== b.order) return a.order - b.order
  return b.createdAt.localeCompare(a.createdAt)
}

export interface TodoBuckets {
  /** 未完成，按手动顺序 */
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

  active.sort(compareActive)
  archived.sort((a, b) => (completedAtMs(b) ?? 0) - (completedAtMs(a) ?? 0))
  return { active, archived, expiredCount }
}

/** 新建或恢复的待办放到最上面。 */
export function nextTopOrder(todos: readonly TodoItem[]): number {
  const orders = todos
    .filter(todo => !todo.done && Number.isFinite(todo.order))
    .map(todo => todo.order)
  return orders.length > 0 ? Math.min(...orders) - 1 : 0
}

/**
 * 旧数据没有 order：按创建时间倒序给现有待办整体编号，
 * 保持升级前的显示顺序不变。
 */
export function assignMissingOrder(todos: readonly TodoItem[]): TodoItem[] {
  const needsMigration = todos.some(todo => !todo.done && !Number.isFinite(todo.order))
  if (!needsMigration) return [...todos]

  const active = todos
    .filter(todo => !todo.done)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const orderById = new Map(active.map((todo, index) => [todo.id, index]))

  return todos.map(todo => {
    if (!todo.done) return { ...todo, order: orderById.get(todo.id) ?? 0 }
    return Number.isFinite(todo.order) ? todo : { ...todo, order: 0 }
  })
}

/** 把某条待办移动到目标位置，并给全部未完成待办重新编号。 */
export function moveTodoInList(
  todos: readonly TodoItem[],
  id: string,
  targetIndex: number,
): TodoItem[] {
  const active = todos.filter(todo => !todo.done).sort(compareActive)
  const from = active.findIndex(todo => todo.id === id)
  if (from === -1) return [...todos]

  const bounded = Math.max(0, Math.min(targetIndex, active.length - 1))
  if (from === bounded) return [...todos]

  const reordered = [...active]
  const [moved] = reordered.splice(from, 1)
  if (!moved) return [...todos]
  reordered.splice(bounded, 0, moved)

  const orderById = new Map(reordered.map((todo, index) => [todo.id, index]))
  return todos.map(todo => {
    if (todo.done) return todo
    const order = orderById.get(todo.id)
    return order === undefined ? todo : { ...todo, order }
  })
}

/** 归档还剩几天可恢复（向上取整）。 */
export function remainingArchiveDays(todo: TodoItem, now: number): number {
  const completedAt = completedAtMs(todo)
  if (completedAt === null) return TODO_ARCHIVE_TTL_DAYS
  const remain = TODO_ARCHIVE_TTL_MS - (now - completedAt)
  return Math.max(0, Math.ceil(remain / 86_400_000))
}
