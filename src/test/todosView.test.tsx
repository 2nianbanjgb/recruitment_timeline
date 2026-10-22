import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { TodosProvider } from '../store/useTodos'
import { TodosView } from '../views/TodosView'

function renderView() {
  return render(
    <ToastProvider>
      <TodosProvider>
        <TodosView />
      </TodosProvider>
    </ToastProvider>,
  )
}

describe('TO DO 视图', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('新增待办、勾选归档、再恢复', async () => {
    const user = userEvent.setup()
    renderView()

    await user.type(screen.getByLabelText('新增待办'), '整理字节二面项目复盘{Enter}')
    expect(screen.getByText('整理字节二面项目复盘')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: '完成「整理字节二面项目复盘」' }))
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByRole('button', { name: '恢复' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '恢复' }))
    expect(
      screen.getByRole('checkbox', { name: '完成「整理字节二面项目复盘」' }),
    ).toBeInTheDocument()
  })

  it('空白输入不会被添加', async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole('button', { name: '添加' }))
    expect(screen.getByText('没有待办')).toBeInTheDocument()
  })

  it('可以重新编辑待办内容', async () => {
    const user = userEvent.setup()
    renderView()

    await user.type(screen.getByLabelText('新增待办'), '写周报{Enter}')
    await user.click(screen.getByRole('button', { name: '编辑「写周报」' }))

    const input = screen.getByLabelText('编辑待办内容')
    await user.clear(input)
    await user.type(input, '写周报并发给 mentor')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('写周报并发给 mentor')).toBeInTheDocument()
    expect(screen.queryByText('写周报')).toBeNull()
  })

  it('删除待办会先弹窗确认', async () => {
    const user = userEvent.setup()
    renderView()

    await user.type(screen.getByLabelText('新增待办'), '要删掉的任务{Enter}')
    await user.click(screen.getByRole('button', { name: '删除「要删掉的任务」' }))

    expect(screen.getByText('删除这条待办？')).toBeInTheDocument()
    expect(screen.getByText('要删掉的任务')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.queryByText('要删掉的任务')).toBeNull()
  })

  it('一键清空归档会先确认，清空后还能撤销', async () => {
    const user = userEvent.setup()
    renderView()

    await user.type(screen.getByLabelText('新增待办'), '任务一{Enter}')
    await user.type(screen.getByLabelText('新增待办'), '任务二{Enter}')
    await user.click(screen.getByRole('checkbox', { name: '完成「任务一」' }))
    await user.click(screen.getByRole('checkbox', { name: '完成「任务二」' }))
    expect(screen.getByText('已归档 · 2')).toBeInTheDocument()

    // 先关掉两条「已完成」提示，后面只剩清空的那条提示可以撤销。
    for (const button of screen.queryAllByRole('button', { name: '关闭提示' })) {
      await user.click(button)
    }

    await user.click(screen.getByRole('button', { name: '清空归档' }))
    expect(screen.getByText('清空归档？')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.getByText('已归档 · 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '清空归档' }))
    await user.click(screen.getByRole('button', { name: '清空' }))
    expect(screen.queryByText('已归档 · 2')).toBeNull()
    expect(screen.getByText('已清空归档，共 2 条')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '撤销' }))
    expect(screen.getByText('已归档 · 2')).toBeInTheDocument()
  })

  it('方向键可以调整优先级', async () => {
    const user = userEvent.setup()
    renderView()

    await user.type(screen.getByLabelText('新增待办'), '第一件{Enter}')
    await user.type(screen.getByLabelText('新增待办'), '第二件{Enter}')
    expect(activeTexts()).toEqual(['第二件', '第一件'])

    const handle = screen.getByRole('button', { name: /拖动排序：第二件/ })
    handle.focus()
    await user.keyboard('{ArrowDown}')

    expect(activeTexts()).toEqual(['第一件', '第二件'])
  })
})

function activeTexts(): string[] {
  return Array.from(document.querySelectorAll('[data-todo-row] [data-todo-text]')).map(
    node => node.textContent ?? '',
  )
}
