import { useCallback, useEffect, useState } from 'react'
import type { EventInput, RecruitEvent, Status } from './types'
import { STATUS_LABELS, STAGE_LABELS } from './types'
import { ROUTE_HASH, useHashRoute, type Route } from './hooks/useHashRoute'
import { useNow } from './hooks/useNow'
import { useNotifications } from './hooks/useNotifications'
import { useEvents } from './store/useEvents'
import { useSettings } from './store/useSettings'
import { countdownDisplay, countdownText, nextEvent } from './lib/date'
import { Layout } from './components/Layout'
import { EventForm } from './components/EventForm'
import { useToast } from './components/Toast'
import { DashboardView } from './views/DashboardView'
import { CalendarView } from './views/CalendarView'
import { EventsView } from './views/EventsView'
import { SettingsView } from './views/SettingsView'

interface FormState {
  open: boolean
  initial: RecruitEvent | null
  date?: string
}

function toInput(event: RecruitEvent): EventInput {
  return {
    company: event.company,
    role: event.role,
    stage: event.stage,
    status: event.status,
    allDay: event.allDay,
    startAt: event.startAt,
    durationMin: event.durationMin,
    mode: event.mode,
    link: event.link,
    location: event.location,
    note: event.note,
    remindBeforeMin: event.remindBeforeMin,
  }
}

export function App() {
  const now = useNow(30_000)
  const { route, params, navigate } = useHashRoute()
  const { events, addEvent, updateEvent, removeEvent, restoreEvent } = useEvents()
  const { settings } = useSettings()
  const { permission, request, sendTest } = useNotifications(events, settings.notifications)
  const { toast } = useToast()
  const [form, setForm] = useState<FormState>({ open: false, initial: null })

  const focusId = params.get('focus')

  const openAdd = useCallback((date?: string) => {
    setForm({ open: true, initial: null, date })
  }, [])

  const closeForm = useCallback(() => {
    setForm({ open: false, initial: null })
  }, [])

  const openEdit = useCallback((event: RecruitEvent) => {
    setForm({ open: true, initial: event })
  }, [])

  const handleNavigate = useCallback(
    (next: Route) => {
      navigate(ROUTE_HASH[next])
    },
    [navigate],
  )

  const handleSubmit = useCallback(
    (input: EventInput) => {
      if (form.initial) {
        updateEvent(form.initial.id, input)
        toast('已保存修改')
      } else {
        addEvent(input)
        toast('已添加，倒计时开始')
      }
      setForm({ open: false, initial: null })
    },
    [form.initial, addEvent, updateEvent, toast],
  )

  const handleDelete = useCallback(
    (event: RecruitEvent) => {
      const removed = removeEvent(event.id)
      if (!removed) return
      toast(`已删除「${removed.company}」`, {
        label: '撤销',
        onClick: () => restoreEvent(removed),
      })
    },
    [removeEvent, restoreEvent, toast],
  )

  const handleStatus = useCallback(
    (event: RecruitEvent, status: Status) => {
      if (event.status === status) return
      updateEvent(event.id, { ...toInput(event), status })
      toast(`已标记为「${STATUS_LABELS[status]}」`)
    },
    [updateEvent, toast],
  )

  // 标题栏显示下一场的相对时间（天 / 时粒度）。
  useEffect(() => {
    const next = nextEvent(events, now)
    document.title = next
      ? `${countdownText(countdownDisplay(next, now))} · 【${next.company}】${STAGE_LABELS[next.stage]} · 秋招日程`
      : '秋招日程'
  }, [events, now])

  // 快捷键 n 打开新增表单。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key !== 'n' && event.key !== 'N') return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      event.preventDefault()
      openAdd()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openAdd])

  // 通知点击后由 Service Worker 转发回来，直接跳到对应事件。
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; id?: string } | null
      if (data?.type === 'open-event' && data.id) navigate(`#/events?focus=${data.id}`)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [navigate])

  return (
    <>
      <Layout route={route} onNavigate={handleNavigate} onAdd={() => openAdd()}>
        {route === 'dashboard' ? (
          <DashboardView
            now={now}
            onAdd={() => openAdd()}
            onEdit={openEdit}
            onNavigateAll={() => handleNavigate('events')}
          />
        ) : null}

        {route === 'calendar' ? (
          <CalendarView
            now={now}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatus={handleStatus}
          />
        ) : null}

        {route === 'events' ? (
          <EventsView
            now={now}
            onAdd={() => openAdd()}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatus={handleStatus}
            focusId={focusId}
          />
        ) : null}

        {route === 'settings' ? (
          <SettingsView
            permission={permission}
            onRequestPermission={request}
            onSendTest={sendTest}
          />
        ) : null}
      </Layout>

      <EventForm
        open={form.open}
        initial={form.initial}
        defaultDate={form.date}
        defaultRemindMin={settings.defaultRemindMin}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />
    </>
  )
}
