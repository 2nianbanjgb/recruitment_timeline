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
})
