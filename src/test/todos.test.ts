import { beforeEach, describe, expect, it } from 'vitest'
import type { TodoItem } from '../types'
import {
  TODO_ARCHIVE_TTL_MS,
  assignMissingOrder,
  isExpiredArchive,
  moveTodoInList,
  purgeExpiredTodos,
  remainingArchiveDays,
  splitTodos,
} from '../lib/todos'
import { TODOS_KEY, loadTodos, normalizeTodo, saveTodos } from '../store/storage'

const NOW = new Date('2026-10-22T09:00:00.000Z').getTime()
const DAY = 86_400_000

function makeTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 't1',
    text: '准备项目复盘',
    done: false,
    createdAt: new Date(NOW - 3_600_000).toISOString(),
    completedAt: null,
    order: 0,
    ...overrides,
  }
}

describe('待办归档规则', () => {
  it('完成后 7 天内保留，超过 7 天才删除', () => {
    const fresh = makeTodo({ done: true, completedAt: new Date(NOW - 6 * DAY).toISOString() })
    const boundary = makeTodo({ id: 'b', done: true, completedAt: new Date(NOW - 7 * DAY).toISOString() })
    const stale = makeTodo({
      id: 'c',
      done: true,
      completedAt: new Date(NOW - 7 * DAY - 1).toISOString(),
    })

    expect(isExpiredArchive(fresh, NOW)).toBe(false)
    expect(isExpiredArchive(boundary, NOW)).toBe(false)
    expect(isExpiredArchive(stale, NOW)).toBe(true)
    expect(purgeExpiredTodos([fresh, boundary, stale], NOW).map(todo => todo.id)).toEqual([
      't1',
      'b',
    ])
  })

  it('未完成的待办永远不会被清理', () => {
    const active = makeTodo({ createdAt: new Date(NOW - 30 * DAY).toISOString() })
    expect(purgeExpiredTodos([active], NOW)).toHaveLength(1)
  })

  it('分组：待办新的在前，归档按完成时间倒序', () => {
    const newer = makeTodo({ id: 'newer', createdAt: new Date(NOW - 1_000).toISOString() })
    const older = makeTodo({ id: 'older', createdAt: new Date(NOW - 2_000).toISOString() })
    const doneEarlier = makeTodo({
      id: 'done-earlier',
      done: true,
      completedAt: new Date(NOW - 3_000).toISOString(),
    })
    const doneLater = makeTodo({
      id: 'done-later',
      done: true,
      completedAt: new Date(NOW - 1_000).toISOString(),
    })

    const { active, archived } = splitTodos([older, doneEarlier, newer, doneLater], NOW)
    expect(active.map(todo => todo.id)).toEqual(['newer', 'older'])
    expect(archived.map(todo => todo.id)).toEqual(['done-later', 'done-earlier'])
  })

  it('剩余可恢复天数按天向上取整', () => {
    const sixDaysAgo = makeTodo({ done: true, completedAt: new Date(NOW - 6 * DAY).toISOString() })
    const justDone = makeTodo({ done: true, completedAt: new Date(NOW).toISOString() })
    expect(remainingArchiveDays(sixDaysAgo, NOW)).toBe(1)
    expect(remainingArchiveDays(justDone, NOW)).toBe(7)
  })

  it('拖动排序会重写全部待办的 order', () => {
    const a = makeTodo({ id: 'a', order: 0 })
    const b = makeTodo({ id: 'b', order: 1 })
    const c = makeTodo({ id: 'c', order: 2 })

    const movedToTop = moveTodoInList([a, b, c], 'c', 0)
    expect(splitTodos(movedToTop, NOW).active.map(todo => todo.id)).toEqual(['c', 'a', 'b'])
    expect(movedToTop.find(todo => todo.id === 'c')?.order).toBe(0)

    const movedToBottom = moveTodoInList([a, b, c], 'a', 2)
    expect(splitTodos(movedToBottom, NOW).active.map(todo => todo.id)).toEqual(['b', 'c', 'a'])

    const unchanged = moveTodoInList([a, b, c], 'a', 0)
    expect(unchanged.map(todo => todo.order)).toEqual([0, 1, 2])
  })

  it('旧数据缺 order 时按创建时间补齐，显示顺序不变', () => {
    const newer = makeTodo({
      id: 'newer',
      order: Number.NaN,
      createdAt: new Date(NOW).toISOString(),
    })
    const older = makeTodo({
      id: 'older',
      order: Number.NaN,
      createdAt: new Date(NOW - 1_000).toISOString(),
    })
    const migrated = assignMissingOrder([older, newer])
    expect(splitTodos(migrated, NOW).active.map(todo => todo.id)).toEqual(['newer', 'older'])
    expect(migrated.every(todo => Number.isFinite(todo.order))).toBe(true)
  })
})

describe('待办存储', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('空文本与非法输入被拒绝', () => {
    expect(normalizeTodo({ text: '   ' })).toBeNull()
    expect(normalizeTodo(null)).toBeNull()
    expect(normalizeTodo({ text: '投递简历' })?.done).toBe(false)
  })

  it('保留已有 order，缺失时标记为待迁移', () => {
    expect(normalizeTodo({ text: 'a', order: 5 })?.order).toBe(5)
    expect(Number.isNaN(normalizeTodo({ text: 'b' })?.order ?? 0)).toBe(true)
  })

  it('标记完成但缺完成时间时补上', () => {
    const todo = normalizeTodo({
      text: '投递简历',
      done: true,
      createdAt: '2026-10-01T00:00:00.000Z',
    })
    expect(todo?.completedAt).toBe('2026-10-01T00:00:00.000Z')
  })

  it('保存后能读回', () => {
    expect(saveTodos([makeTodo()])).toBe(true)
    const loaded = loadTodos()
    expect(loaded.issue).toBeNull()
    expect(loaded.todos).toHaveLength(1)
    expect(loaded.todos[0]?.text).toBe('准备项目复盘')
  })

  it('读取时自动清理超过 7 天的归档', () => {
    const stale = makeTodo({
      id: 'stale',
      done: true,
      completedAt: new Date(Date.now() - TODO_ARCHIVE_TTL_MS - 1_000).toISOString(),
    })
    const fresh = makeTodo({
      id: 'fresh',
      done: true,
      completedAt: new Date().toISOString(),
    })
    window.localStorage.setItem(TODOS_KEY, JSON.stringify({ schemaVersion: 1, todos: [stale, fresh] }))
    expect(loadTodos().todos.map(todo => todo.id)).toEqual(['fresh'])
  })

  it('损坏的 JSON 会备份并空列表启动', () => {
    window.localStorage.setItem(TODOS_KEY, '{ 这不是 JSON')
    const loaded = loadTodos()
    expect(loaded.todos).toHaveLength(0)
    expect(loaded.issue).toBeTruthy()
    const backupKey = Object.keys(window.localStorage).find(key =>
      key.startsWith(`${TODOS_KEY}.corrupt.`),
    )
    expect(backupKey).toBeTruthy()
  })
})
