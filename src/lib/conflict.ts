import type { RecruitEvent } from '../types'
import { eventEnd, eventStart } from './date'

/**
 * 找出时间互相重叠的待进行事件（全天事件不参与比较）。
 * 返回事件 id 集合，供卡片显示「时间冲突」提示。
 */
export function conflictIds(events: readonly RecruitEvent[]): Set<string> {
  const intervals = events
    .filter(event => event.status === 'pending' && !event.allDay)
    .map(event => ({
      id: event.id,
      start: eventStart(event).getTime(),
      end: eventEnd(event).getTime(),
    }))
    .filter(item => Number.isFinite(item.start) && Number.isFinite(item.end))

  const conflicts = new Set<string>()
  for (let i = 0; i < intervals.length; i += 1) {
    for (let j = i + 1; j < intervals.length; j += 1) {
      const a = intervals[i]
      const b = intervals[j]
      if (!a || !b) continue
      if (a.start < b.end && b.start < a.end) {
        conflicts.add(a.id)
        conflicts.add(b.id)
      }
    }
  }
  return conflicts
}
