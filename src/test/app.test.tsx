import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { ToastProvider } from '../components/Toast'
import { EventsProvider } from '../store/useEvents'
import { TodosProvider } from '../store/useTodos'
import { SettingsProvider } from '../store/useSettings'
import { EVENTS_KEY } from '../store/storage'
import { localInput, makeEvent } from './fixtures'

function renderApp() {
  return render(
    <ToastProvider>
      <EventsProvider>
        <TodosProvider>
          <SettingsProvider>
            <App />
          </SettingsProvider>
        </TodosProvider>
      </EventsProvider>
    </ToastProvider>,
  )
}

describe('App 集成', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('空数据时给出新增引导', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: '总览' })).toBeInTheDocument()
    expect(screen.getByText('还没有录入任何安排')).toBeInTheDocument()
  })

  it('有数据时渲染下一场、倒计时与统计', () => {
    const soon = Date.now() + 3 * 86_400_000 + 4 * 3_600_000
    window.localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify({
        schemaVersion: 1,
        events: [makeEvent({ id: 'ev-soon', company: '字节跳动', startAt: localInput(soon) })],
      }),
    )

    renderApp()

    expect(screen.getByText('下一场')).toBeInTheDocument()
    expect(screen.getAllByText('字节跳动').length).toBeGreaterThan(0)
    expect(screen.getAllByText('待进行').length).toBeGreaterThan(0)
    expect(screen.getAllByText('流程中').length).toBeGreaterThan(0)
    expect(screen.getAllByText('近 7 天').length).toBeGreaterThan(0)
    expect(screen.getByText('今天没有安排')).toBeInTheDocument()
  })

  it('通过设置页进入后仍能正常渲染', () => {
    window.location.hash = '#/settings'
    renderApp()
    expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument()
    expect(screen.getByText('浏览器通知')).toBeInTheDocument()
    window.location.hash = ''
  })

  it('删除日程前会弹窗确认', async () => {
    const soon = Date.now() + 86_400_000
    window.localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify({
        schemaVersion: 1,
        events: [makeEvent({ id: 'ev-del', company: '字节跳动', startAt: localInput(soon) })],
      }),
    )
    window.location.hash = '#/events'
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: '删除「字节跳动」' }))
    expect(screen.getByText('删除这场安排？')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除「字节跳动」' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.queryByRole('button', { name: '删除「字节跳动」' })).toBeNull()
    window.location.hash = ''
  })
})
