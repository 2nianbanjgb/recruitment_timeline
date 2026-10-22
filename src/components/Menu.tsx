import { useLayoutEffect, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck } from './icons'

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

/** 与 w-44 对齐；定位时用于左右夹住，避免菜单超出视口。 */
const MENU_WIDTH = 176
const GAP = 6
const EDGE = 8

export function Menu({ label, trigger, triggerClassName, items, align = 'end' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 菜单通过 portal 挂到 body 上：卡片、右边栏的滚动容器都会裁掉绝对定位的子元素。
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const height = menuRef.current?.offsetHeight ?? items.length * 38 + 8
    const left = Math.min(
      Math.max(EDGE, align === 'end' ? rect.right - MENU_WIDTH : rect.left),
      window.innerWidth - MENU_WIDTH - EDGE,
    )
    const below = rect.bottom + GAP
    const above = rect.top - height - GAP
    const top = below + height > window.innerHeight - EDGE && above >= EDGE ? above : below
    setPosition({ top, left })
  }, [open, align, items.length])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    // 页面或边栏滚动后，固定定位会和按钮错开，直接收起更稳。
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                top: position?.top ?? -9999,
                left: position?.left ?? -9999,
                width: MENU_WIDTH,
              }}
              className="animate-pop fixed z-[70] overflow-hidden rounded-xl border border-line bg-panel p-1 shadow-[var(--shadow-soft)]"
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
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
