import type { ReactNode } from 'react'

export interface MenuItem {
  label: string
  onSelect: () => void
  active?: boolean
  tone?: 'default' | 'danger'
  icon?: ReactNode
}

export interface MenuProps {
  label: string
  trigger: ReactNode
  triggerClassName?: string
  items: MenuItem[]
  align?: 'start' | 'end'
}

import { useEffect, useRef, useState } from 'react'
import { IconCheck } from './icons'

export function Menu({ label, trigger, triggerClassName, items, align = 'end' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          className={`animate-pop absolute z-40 mt-1.5 w-44 overflow-hidden rounded-xl border border-line bg-panel p-1 shadow-[var(--shadow-soft)] ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                item.tone === 'danger'
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-ink-muted hover:bg-panel-soft hover:text-ink'
              }`}
            >
              {item.icon ? <span className="text-current">{item.icon}</span> : null}
              <span className="flex-1">{item.label}</span>
              {item.active ? <IconCheck className="h-4 w-4 text-accent" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
