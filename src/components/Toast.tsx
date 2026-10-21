import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: number
  message: string
  action?: ToastAction
}

interface ToastApi {
  toast: (message: string, action?: ToastAction) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems(previous => previous.filter(item => item.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, action?: ToastAction) => {
      seq.current += 1
      const id = seq.current
      setItems(previous => [...previous.slice(-2), { id, message, action }])
      window.setTimeout(() => dismiss(id), action ? 7000 : 4200)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map(item => (
          <div
            key={item.id}
            role="status"
            className="animate-fade-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-line bg-panel/95 px-4 py-3 text-sm text-ink shadow-[var(--shadow-soft)] backdrop-blur"
          >
            <span className="flex-1">{item.message}</span>
            {item.action ? (
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick()
                  dismiss(item.id)
                }}
                className="rounded-lg px-2 py-1 text-sm font-medium text-accent transition hover:bg-accent-soft"
              >
                {item.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => dismiss(item.id)}
              className="rounded-lg p-1 text-ink-faint transition hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast 必须在 ToastProvider 内使用')
  return context
}
