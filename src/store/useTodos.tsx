import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { TodoItem } from '../types'
import { newId } from '../lib/id'
import { moveTodoInList, nextTopOrder, purgeExpiredTodos } from '../lib/todos'
import { TODOS_KEY, loadTodos, saveTodos } from './storage'

export interface TodosContextValue {
  todos: TodoItem[]
  issue: string | null
  saveIssue: string | null
  addTodo: (text: string) => TodoItem | null
  completeTodo: (id: string) => TodoItem | null
  updateTodoText: (id: string, text: string) => void
  moveTodo: (id: string, targetIndex: number) => void
  restoreTodo: (todo: TodoItem) => void
  deleteTodo: (id: string) => TodoItem | null
  /** 一键清空归档，返回被清掉的条目，便于撤销。 */
  clearArchived: () => TodoItem[]
  /** 撤销清空：把条目按原样（仍是已完成）放回归档。 */
  restoreArchived: (todos: TodoItem[]) => void
}

const TodosContext = createContext<TodosContextValue | null>(null)

export function TodosProvider({ children }: { children: ReactNode }) {
  const [snapshot] = useState(loadTodos)
  const [todos, setTodos] = useState<TodoItem[]>(snapshot.todos)
  const [issue, setIssue] = useState<string | null>(snapshot.issue)
  const [saveIssue, setSaveIssue] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    setSaveIssue(saveTodos(todos) ? null : '本地存储不可用，待办改动不会保存。')
  }, [todos, hydrated])

  // 归档满 30 天后自动删除；页面长期开着也不会一直留着过期条目。
  useEffect(() => {
    const sweep = () => {
      setTodos(previous => {
        const next = purgeExpiredTodos(previous, Date.now())
        return next.length === previous.length ? previous : next
      })
    }
    sweep()
    const timer = window.setInterval(sweep, 5 * 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TODOS_KEY && event.key !== null) return
      const next = loadTodos()
      if (next.issue) setIssue(next.issue)
      setTodos(previous =>
        JSON.stringify(previous) === JSON.stringify(next.todos) ? previous : next.todos,
      )
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addTodo = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return null
      const todo: TodoItem = {
        id: newId(),
        text: trimmed.slice(0, 200),
        done: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        order: nextTopOrder(todos),
      }
      setTodos(previous => [todo, ...previous])
      return todo
    },
    [todos],
  )

  const completeTodo = useCallback(
    (id: string) => {
      const target = todos.find(todo => todo.id === id && !todo.done)
      if (!target) return null
      const completed: TodoItem = { ...target, done: true, completedAt: new Date().toISOString() }
      setTodos(previous => previous.map(todo => (todo.id === id ? completed : todo)))
      return completed
    },
    [todos],
  )

  const updateTodoText = useCallback((id: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setTodos(previous =>
      previous.map(todo =>
        todo.id === id ? { ...todo, text: trimmed.slice(0, 200) } : todo,
      ),
    )
  }, [])

  const moveTodo = useCallback((id: string, targetIndex: number) => {
    setTodos(previous => moveTodoInList(previous, id, targetIndex))
  }, [])

  /** 既能撤销「完成」，也能撤销「删除」：不存在就放回去。 */
  const restoreTodo = useCallback(
    (todo: TodoItem) => {
      const revived: TodoItem = {
        ...todo,
        done: false,
        completedAt: null,
        order: nextTopOrder(todos),
      }
      setTodos(previous =>
        previous.some(item => item.id === todo.id)
          ? previous.map(item => (item.id === todo.id ? revived : item))
          : [revived, ...previous],
      )
    },
    [todos],
  )

  const deleteTodo = useCallback(
    (id: string) => {
      const removed = todos.find(todo => todo.id === id) ?? null
      if (removed) setTodos(previous => previous.filter(todo => todo.id !== id))
      return removed
    },
    [todos],
  )

  const clearArchived = useCallback(() => {
    const removed = todos.filter(todo => todo.done)
    if (removed.length > 0) setTodos(previous => previous.filter(todo => !todo.done))
    return removed
  }, [todos])

  const restoreArchived = useCallback((items: TodoItem[]) => {
    if (items.length === 0) return
    setTodos(previous => {
      const existing = new Set(previous.map(todo => todo.id))
      const revived = items.filter(item => !existing.has(item.id))
      return revived.length > 0 ? [...revived, ...previous] : previous
    })
  }, [])

  const value = useMemo<TodosContextValue>(
    () => ({
      todos,
      issue,
      saveIssue,
      addTodo,
      completeTodo,
      updateTodoText,
      moveTodo,
      restoreTodo,
      deleteTodo,
      clearArchived,
      restoreArchived,
    }),
    [
      todos,
      issue,
      saveIssue,
      addTodo,
      completeTodo,
      updateTodoText,
      moveTodo,
      restoreTodo,
      deleteTodo,
      clearArchived,
      restoreArchived,
    ],
  )

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>
}

export function useTodos(): TodosContextValue {
  const context = useContext(TodosContext)
  if (!context) throw new Error('useTodos 必须在 TodosProvider 内使用')
  return context
}
