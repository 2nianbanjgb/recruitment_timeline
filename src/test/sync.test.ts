import { beforeEach, describe, expect, it } from 'vitest'
import type { RecruitEvent, TodoItem } from '../types'
import {
  applySnapshotToLocal,
  diffState,
  readLocalSnapshot,
  type Snapshot,
} from '../lib/sync'
import { normalizeSettings } from '../store/storage'

const settings = normalizeSettings(null)

function makeEvent(overrides: Partial<RecruitEvent> = {}): RecruitEvent {
  return {
    id: 'e1',
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

function makeTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 't1',
    text: '准备项目复盘',
    done: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    completedAt: null,
    order: 0,
    ...overrides,
  }
}

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return { events: [], todos: [], settings, ...overrides }
}

describe('文件同步的变更记录', () => {
  it('文件还是空的时候，首次写入把现有数据记为新增', () => {
    const changes = diffState(
      null,
      snapshot({ events: [makeEvent()], todos: [makeTodo()] }),
    )
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: 'event', action: 'add', id: 'e1' }),
        expect.objectContaining({ entity: 'todo', action: 'add', id: 't1' }),
      ]),
    )
    expect(changes.some(change => change.entity === 'settings')).toBe(false)
  })

  it('识别日程的新增、修改、删除，并记录字段', () => {
    const base = snapshot({
      events: [makeEvent({ id: 'a' }), makeEvent({ id: 'b', company: '腾讯' })],
    })
    const next = snapshot({
      events: [makeEvent({ id: 'a', status: 'in_progress' }), makeEvent({ id: 'c', company: '美团' })],
    })

    const changes = diffState(base, next)
    expect(changes).toHaveLength(3)
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: 'event', action: 'update', id: 'a', fields: ['status'] }),
        expect.objectContaining({ entity: 'event', action: 'delete', id: 'b' }),
        expect.objectContaining({ entity: 'event', action: 'add', id: 'c' }),
      ]),
    )
    expect(changes.find(change => change.id === 'c')?.label).toContain('美团')
  })

  it('待办的文本、完成状态和排序都会记录', () => {
    const base = snapshot({ todos: [makeTodo({ id: 't1', text: '旧文案' })] })
    const next = snapshot({
      todos: [
        makeTodo({
          id: 't1',
          text: '新文案',
          done: true,
          completedAt: '2026-10-22T00:00:00.000Z',
          order: 3,
        }),
      ],
    })

    const changes = diffState(base, next)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ entity: 'todo', action: 'update', id: 't1', label: '新文案' })
    expect(changes[0]?.fields).toEqual(expect.arrayContaining(['text', 'done', 'order']))
  })

  it('待办删除与新增各记一条', () => {
    const base = snapshot({ todos: [makeTodo({ id: 'gone' })] })
    const next = snapshot({ todos: [makeTodo({ id: 'fresh', text: '新任务' })] })
    const changes = diffState(base, next)
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: 'todo', action: 'delete', id: 'gone' }),
        expect.objectContaining({ entity: 'todo', action: 'add', id: 'fresh', label: '新任务' }),
      ]),
    )
  })

  it('设置变化单独记录', () => {
    const changes = diffState(snapshot(), snapshot({ settings: { ...settings, theme: 'dark' } }))
    expect(changes).toEqual([
      expect.objectContaining({ entity: 'settings', action: 'update', fields: ['theme'] }),
    ])
  })

  it('没有变化时不产生记录', () => {
    const same = snapshot({ events: [makeEvent()], todos: [makeTodo()] })
    expect(diffState(same, same)).toEqual([])
  })
})

describe('快照回写浏览器', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('写回后能读回同一份数据', () => {
    const data = snapshot({
      events: [makeEvent({ id: 'a' }), makeEvent({ id: 'b', company: '腾讯' })],
      todos: [makeTodo({ id: 't1' }), makeTodo({ id: 't2', text: '投递拼多多' })],
    })
    applySnapshotToLocal(data)

    const restored = readLocalSnapshot()
    expect(restored.events).toHaveLength(2)
    expect(restored.todos).toHaveLength(2)
    expect(restored.events.map(event => event.company)).toEqual(['字节跳动', '腾讯'])
    expect(restored.todos.map(todo => todo.text)).toEqual(['准备项目复盘', '投递拼多多'])
    expect(restored.settings.theme).toBe(settings.theme)
  })

  it('覆盖前会把浏览器里现有数据备份一份', () => {
    applySnapshotToLocal(snapshot({ events: [makeEvent({ id: 'a', company: '旧公司' })] }))
    expect(
      Object.keys(window.localStorage).filter(key => key.startsWith('rt.v1.backup.')),
    ).toHaveLength(0)

    applySnapshotToLocal(snapshot({ events: [makeEvent({ id: 'b', company: '新公司' })] }))
    const keys = Object.keys(window.localStorage).filter(key => key.startsWith('rt.v1.backup.'))
    expect(keys).toHaveLength(1)
    expect(window.localStorage.getItem(keys[0] ?? '') ?? '').toContain('旧公司')
    expect(readLocalSnapshot().events[0]?.company).toBe('新公司')

    applySnapshotToLocal(snapshot({ events: [makeEvent({ id: 'c', company: '再公司' })] }))
    expect(
      Object.keys(window.localStorage).filter(key => key.startsWith('rt.v1.backup.')),
    ).toHaveLength(2)
  })
})
