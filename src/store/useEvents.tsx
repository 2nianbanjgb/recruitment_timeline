import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { EventInput, RecruitEvent } from '../types'
import { newId } from '../lib/id'
import { EVENTS_KEY, loadEvents, saveEvents } from './storage'

export interface EventsContextValue {
  events: RecruitEvent[]
  issue: string | null
  saveIssue: string | null
  addEvent: (input: EventInput) => RecruitEvent
  updateEvent: (id: string, input: EventInput) => void
  removeEvent: (id: string) => RecruitEvent | null
  restoreEvent: (event: RecruitEvent) => void
  replaceEvents: (events: RecruitEvent[]) => void
  clearAll: () => void
}

const EventsContext = createContext<EventsContextValue | null>(null)

export function EventsProvider({ children }: { children: ReactNode }) {
  const [snapshot] = useState(loadEvents)
  const [events, setEvents] = useState<RecruitEvent[]>(snapshot.events)
  const [issue, setIssue] = useState<string | null>(snapshot.issue)
  const [saveIssue, setSaveIssue] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  // 首次渲染后把归一化后的数据写回本地，并持续持久化。
  useEffect(() => {
    if (!hydrated) return
    setSaveIssue(saveEvents(events) ? null : '本地存储不可用，本次改动不会保存。')
  }, [events, hydrated])

  // 多标签页同步。
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== EVENTS_KEY && event.key !== null) return
      const next = loadEvents()
      if (next.issue) setIssue(next.issue)
      setEvents(previous =>
        JSON.stringify(previous) === JSON.stringify(next.events) ? previous : next.events,
      )
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addEvent = useCallback((input: EventInput) => {
    const timestamp = new Date().toISOString()
    const event: RecruitEvent = {
      ...input,
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    setEvents(previous => [...previous, event])
    return event
  }, [])

  const updateEvent = useCallback((id: string, input: EventInput) => {
    const timestamp = new Date().toISOString()
    setEvents(previous =>
      previous.map(event =>
        event.id === id
          ? { ...input, id: event.id, createdAt: event.createdAt, updatedAt: timestamp }
          : event,
      ),
    )
  }, [])

  const removeEvent = useCallback(
    (id: string) => {
      const removed = events.find(event => event.id === id) ?? null
      if (removed) setEvents(previous => previous.filter(event => event.id !== id))
      return removed
    },
    [events],
  )

  const restoreEvent = useCallback((event: RecruitEvent) => {
    setEvents(previous =>
      previous.some(item => item.id === event.id) ? previous : [...previous, event],
    )
  }, [])

  const replaceEvents = useCallback((next: RecruitEvent[]) => {
    setEvents(next)
    setIssue(null)
  }, [])

  const clearAll = useCallback(() => {
    setEvents([])
  }, [])

  const value = useMemo<EventsContextValue>(
    () => ({
      events,
      issue,
      saveIssue,
      addEvent,
      updateEvent,
      removeEvent,
      restoreEvent,
      replaceEvents,
      clearAll,
    }),
    [events, issue, saveIssue, addEvent, updateEvent, removeEvent, restoreEvent, replaceEvents, clearAll],
  )

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

export function useEvents(): EventsContextValue {
  const context = useContext(EventsContext)
  if (!context) throw new Error('useEvents 必须在 EventsProvider 内使用')
  return context
}
