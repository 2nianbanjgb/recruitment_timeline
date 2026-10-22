import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { ToastProvider } from '../components/Toast'
import { EventsProvider } from '../store/useEvents'
import { CompanyColorsProvider } from '../store/useCompanyColors'
import { TodosProvider } from '../store/useTodos'
import { SettingsProvider } from '../store/useSettings'
import { EVENTS_KEY } from '../store/storage'
import { localInput, makeEvent } from './fixtures'

function renderApp() {
  return render(
    <ToastProvider>
      <EventsProvider>
        <CompanyColorsProvider>
          <TodosProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </TodosProvider>
        </CompanyColorsProvider>
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

  it('线上一键复制口令、线下一键复制地址并带通知链接', async () => {
    const soon = Date.now() + 86_400_000
    window.localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify({
        schemaVersion: 1,
        events: [
          makeEvent({
            id: 'ev-online',
            company: '字节跳动',
            startAt: localInput(soon),
            passcode: '8848',
            link: 'https://meeting.example.com/abc',
          }),
          makeEvent({
            id: 'ev-onsite',
            company: '美团',
            mode: 'onsite',
            location: '北京望京 · 美团总部',
            link: 'https://notice.example.com/1',
            startAt: localInput(soon + 3_600_000),
          }),
        ],
      }),
    )
    window.location.hash = '#/events'
    const user = userEvent.setup()
    // userEvent.setup() 会先装一份自己的剪贴板桩，这里在它之后替换成能断言的版本。
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    renderApp()

    expect(screen.getByText('8848')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '复制口令「8848」' }))
    expect(writeText).toHaveBeenCalledWith('8848')
    expect(await screen.findByText('已复制口令')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '复制地址「北京望京 · 美团总部」' }))
    expect(writeText).toHaveBeenCalledWith('北京望京 · 美团总部')
    expect(await screen.findByText('已复制地址')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: '通知链接' })).toHaveAttribute(
      'href',
      'https://notice.example.com/1',
    )
    expect(screen.getByRole('link', { name: '会议链接' })).toHaveAttribute(
      'href',
      'https://meeting.example.com/abc',
    )
    window.location.hash = ''
  })
})
