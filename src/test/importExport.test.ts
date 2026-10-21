import { describe, expect, it } from 'vitest'
import { buildBackup, mergeEvents, parseBackup } from '../store/importExport'
import { normalizeSettings } from '../store/storage'
import { makeEvent } from './fixtures'

const settings = normalizeSettings(null)

describe('备份文件', () => {
  it('导出再导入能还原事件', () => {
    const events = [makeEvent(), makeEvent({ id: 'ev-2', company: '腾讯', stage: 'interview' })]
    const text = buildBackup(events, settings, new Date('2026-10-21T09:00:00.000Z'))
    const parsed = parseBackup(text)
    expect(parsed.events).toHaveLength(2)
    expect(parsed.dropped).toBe(0)
    expect(parsed.settings?.theme).toBe('system')
  })

  it('非 JSON 直接报错', () => {
    expect(() => parseBackup('不是 json')).toThrow('JSON')
  })

  it('缺少 events 列表报错', () => {
    expect(() => parseBackup(JSON.stringify({ foo: 1 }))).toThrow('events')
  })

  it('全部无法识别时报错', () => {
    expect(() => parseBackup(JSON.stringify({ events: [{ company: '' }] }))).toThrow('无法识别')
  })

  it('部分无法识别时保留可用记录', () => {
    const text = JSON.stringify({
      events: [
        { company: '腾讯', startAt: '2026-10-24T14:00' },
        { company: '' },
      ],
    })
    const parsed = parseBackup(text)
    expect(parsed.events).toHaveLength(1)
    expect(parsed.dropped).toBe(1)
  })
})

describe('合并导入', () => {
  it('新增、更新较新、跳过较旧', () => {
    const base = makeEvent({ id: 'a', updatedAt: '2026-10-01T00:00:00.000Z' })
    const newer = makeEvent({ id: 'a', company: '字节跳动（改）', updatedAt: '2026-10-05T00:00:00.000Z' })
    const older = makeEvent({ id: 'a', company: '旧名字', updatedAt: '2026-09-01T00:00:00.000Z' })
    const added = makeEvent({ id: 'b', company: '腾讯' })

    const first = mergeEvents([base], [newer, added])
    expect(first.added).toBe(1)
    expect(first.updated).toBe(1)
    expect(first.skipped).toBe(0)
    expect(first.events.find(event => event.id === 'a')?.company).toBe('字节跳动（改）')

    const second = mergeEvents(first.events, [older])
    expect(second.skipped).toBe(1)
    expect(second.updated).toBe(0)
    expect(second.events.find(event => event.id === 'a')?.company).toBe('字节跳动（改）')
  })
})
