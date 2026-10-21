import { useState, type FormEvent } from 'react'
import type { TodoItem } from '../types'
import { useTodos } from '../store/useTodos'
import { remainingArchiveDays, splitTodos } from '../lib/todos'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { IconCheck, IconPlus, IconTodo, IconTrash, IconUndo } from '../components/icons'
import { btnPrimary, fieldClass } from '../components/ui'

export function TodosView() {
  const { todos, addTodo, completeTodo, restoreTodo, deleteTodo } = useTodos()
  const { toast } = useToast()
  const [draft, setDraft] = useState('')
  const now = Date.now()
  const { active, archived } = splitTodos(todos, now)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!addTodo(draft)) return
    setDraft('')
  }

  const handleComplete = (todo: TodoItem) => {
    const completed = completeTodo(todo.id)
    if (!completed) return
    toast(`已完成「${todo.text}」，7 天内可在归档里恢复`, {
      label: '撤销',
      onClick: () => restoreTodo(completed),
    })
  }

  const handleDelete = (todo: TodoItem) => {
    const removed = deleteTodo(todo.id)
    if (!removed) return
    toast(`已删除「${todo.text}」`, { label: '撤销', onClick: () => restoreTodo(removed) })
  }

  const handleRestore = (todo: TodoItem) => {
    restoreTodo(todo)
    toast(`已恢复「${todo.text}」`)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">TO DO</h1>
        <p className="mt-0.5 text-xs text-ink-faint">
          勾掉即归档，归档保留 7 天，期间随时可以恢复。
        </p>
      </header>

      <form onSubmit={submit} className="flex items-stretch gap-2">
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder="下一步要做什么？例如：准备字节二面的项目复盘"
          className={fieldClass}
          maxLength={200}
          aria-label="新增待办"
        />
        <button type="submit" className={`${btnPrimary} shrink-0`} disabled={draft.trim().length === 0}>
          <IconPlus className="h-4 w-4" />
          添加
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-ink">
            待办{active.length > 0 ? ` · ${active.length}` : ''}
          </h2>
          <span className="text-[11px] text-ink-faint">新的在上</span>
        </div>
        {active.length === 0 ? (
          <div className="p-3">
            <EmptyState
              compact
              icon={<IconTodo className="h-5 w-5" />}
              title="没有待办"
              description="把要做的事记在上面，完成一件勾一件。"
            />
          </div>
        ) : (
          <ul>
            {active.map(todo => (
              <li
                key={todo.id}
                className="flex items-start gap-3 px-4 py-3 [&+li]:border-t [&+li]:border-line"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={false}
                  aria-label={`完成「${todo.text}」`}
                  onClick={() => handleComplete(todo)}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line-strong text-transparent transition hover:border-accent hover:text-accent"
                >
                  <IconCheck className="h-3.5 w-3.5" />
                </button>
                <p className="min-w-0 flex-1 break-words text-sm leading-5 text-ink">{todo.text}</p>
                <button
                  type="button"
                  aria-label={`删除「${todo.text}」`}
                  onClick={() => handleDelete(todo)}
                  className="rounded-lg p-1 text-ink-faint transition hover:bg-danger/10 hover:text-danger"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-ink">
            已归档{archived.length > 0 ? ` · ${archived.length}` : ''}
          </h2>
          <span className="text-[11px] text-ink-faint">完成后 7 天自动删除</span>
        </div>
        {archived.length === 0 ? (
          <p className="px-4 py-4 text-xs text-ink-faint">
            勾掉的待办会出现在这里，7 天内都可以恢复。
          </p>
        ) : (
          <ul>
            {archived.map(todo => (
              <li
                key={todo.id}
                className="flex items-start gap-3 px-4 py-3 [&+li]:border-t [&+li]:border-line"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm leading-5 text-ink-faint line-through">
                    {todo.text}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    还剩 {remainingArchiveDays(todo, now)} 天可恢复
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(todo)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-accent transition hover:bg-accent-soft"
                >
                  <IconUndo className="h-3.5 w-3.5" />
                  恢复
                </button>
                <button
                  type="button"
                  aria-label={`彻底删除「${todo.text}」`}
                  onClick={() => handleDelete(todo)}
                  className="rounded-lg p-1 text-ink-faint transition hover:bg-danger/10 hover:text-danger"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
