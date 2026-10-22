import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '../components/EventForm'
import type { EventInput } from '../types'

function renderForm(onSubmit: (input: EventInput) => void) {
  return render(
    <EventForm
      open
      initial={null}
      defaultDate="2026-10-24"
      defaultRemindMin={30}
      onClose={() => {}}
      onSubmit={onSubmit}
    />,
  )
}

describe('EventForm', () => {
  it('公司为空时提示并阻止提交', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderForm(onSubmit)

    await user.click(screen.getByRole('button', { name: '添加' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('请填写公司名称')
  })

  it('填写公司后按默认时间提交', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderForm(onSubmit)

    await user.type(screen.getByPlaceholderText('例如：字节跳动'), '腾讯')
    await user.click(screen.getByRole('button', { name: '添加' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      company: '腾讯',
      stage: 'written',
      status: 'pending',
      allDay: false,
      startAt: '2026-10-24T10:00',
      remindBeforeMin: 30,
    })
  })

  it('切换到全天时只提交日期', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderForm(onSubmit)

    await user.type(screen.getByPlaceholderText('例如：字节跳动'), '阿里')
    await user.click(screen.getByRole('checkbox', { name: '全天' }))
    await user.click(screen.getByRole('button', { name: '添加' }))

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ allDay: true, startAt: '2026-10-24' })
  })

  it('线上会议可以填会议链接和口令', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderForm(onSubmit)

    await user.type(screen.getByPlaceholderText('例如：字节跳动'), '字节跳动')
    await user.type(screen.getByPlaceholderText('https://...'), 'https://meeting.example.com/abc')
    await user.type(screen.getByPlaceholderText('例如：0862'), '0862')
    await user.click(screen.getByRole('button', { name: '添加' }))

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      mode: 'online',
      link: 'https://meeting.example.com/abc',
      passcode: '0862',
    })
  })

  it('线下场次可以填地址和通知链接', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderForm(onSubmit)

    await user.type(screen.getByPlaceholderText('例如：字节跳动'), '美团')
    await user.click(screen.getByRole('button', { name: '线下' }))
    await user.type(screen.getByPlaceholderText('例如：上海张江 · 3 号楼'), '北京望京 · 美团总部')
    await user.type(screen.getByPlaceholderText('https://...'), 'https://notice.example.com/1')
    await user.click(screen.getByRole('button', { name: '添加' }))

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      mode: 'onsite',
      location: '北京望京 · 美团总部',
      link: 'https://notice.example.com/1',
    })
  })
})
