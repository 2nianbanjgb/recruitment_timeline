import { beforeEach, describe, expect, it } from 'vitest'
import type { TodoItem } from '../types'
import {
  TODO_ARCHIVE_TTL_MS,
  isExpiredArchive,
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
