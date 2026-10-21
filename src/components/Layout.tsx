import type { ComponentType, ReactNode } from 'react'
import type { Route } from '../hooks/useHashRoute'
import { useEvents } from '../store/useEvents'
import { useSettings } from '../store/useSettings'
import type { Theme } from '../types'
import { THEME_LABELS } from '../types'
import {
  IconAlert,
  IconCalendar,
  IconDashboard,
  IconList,
  IconLogo,
  IconMonitor,
  IconMoon,
  IconPlus,
  IconSettings,
  IconSun,
} from './icons'
import { btnPrimary } from './ui'

interface NavItem {
  route: Route
  label: string
  Icon: ComponentType<{ className?: string }>
}

const NAV: NavItem[] = [
  { route: 'dashboard', label: '总览', Icon: IconDashboard },
  { route: 'calendar', label: '日历', Icon: IconCalendar },
  { route: 'events', label: '全部事件', Icon: IconList },
  { route: 'settings', label: '设置', Icon: IconSettings },
]

const THEME_CYCLE: Theme[] = ['system', 'light', 'dark']

function ThemeToggle({ compact }: { compact?: boolean }) {
  const { settings, update } = useSettings()

  if (compact) {
    const index = THEME_CYCLE.indexOf(settings.theme)
    const next = THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? 'system'
    const Icon = settings.theme === 'light' ? IconSun : settings.theme === 'dark' ? IconMoon : IconMonitor
    return (
      <button
        type="button"
        aria-label={`主题：${THEME_LABELS[settings.theme]}，点击切换`}
        title={`主题：${THEME_LABELS[settings.theme]}`}
        onClick={() => update({ theme: next })}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-panel text-ink-muted transition hover:text-ink"
      >
        <Icon className="h-4 w-4" />
      </button>
    )
  }

  const options: { value: Theme; Icon: ComponentType<{ className?: string }> }[] = [
    { value: 'system', Icon: IconMonitor },
    { value: 'light', Icon: IconSun },
    { value: 'dark', Icon: IconMoon },
  ]

  return (
    <div
      role="group"
      aria-label="主题"
      className="flex items-center gap-1 rounded-xl border border-line bg-panel-soft p-1"
    >
      {options.map(({ value, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={settings.theme === value}
          aria-label={THEME_LABELS[value]}
          title={THEME_LABELS[value]}
          onClick={() => update({ theme: value })}
          className={`flex flex-1 items-center justify-center rounded-lg py-1.5 transition ${
            settings.theme === value
              ? 'bg-panel text-ink shadow-sm'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <IconLogo className="h-9 w-9" />
      <div>
        <p className="text-sm font-semibold leading-tight text-ink">秋招日程</p>
        <p className="text-[11px] leading-tight text-ink-faint">笔试 · 面试提醒</p>
      </div>
    </div>
  )
}

export interface LayoutProps {
  route: Route
  onNavigate: (route: Route) => void
  onAdd: () => void
  children: ReactNode
}

export function Layout({ route, onNavigate, onAdd, children }: LayoutProps) {
  const { issue, saveIssue } = useEvents()

  return (
    <div className="min-h-dvh bg-canvas text-ink lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-panel/60 px-4 py-6 backdrop-blur lg:flex">
        <Brand />

        <nav className="mt-8 flex flex-col gap-1" aria-label="主导航">
          {NAV.map(({ route: itemRoute, label, Icon }) => {
            const active = route === itemRoute
            return (
              <button
                key={itemRoute}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(itemRoute)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-accent-soft font-medium text-accent'
                    : 'text-ink-muted hover:bg-panel-soft hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <button type="button" className={`${btnPrimary} w-full`} onClick={onAdd}>
            <IconPlus className="h-4 w-4" />
            新增日程
          </button>
          <ThemeToggle />
          <p className="text-[11px] leading-relaxed text-ink-faint">
            数据只保存在这台设备的浏览器里，建议每周导出一次 JSON 备份。
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <div className="flex items-center gap-1.5">
          <ThemeToggle compact />
          <button type="button" className={btnPrimary} onClick={onAdd}>
            <IconPlus className="h-4 w-4" />
            新增
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 lg:pb-12 lg:pt-8">
        {saveIssue || issue ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2.5 text-xs text-warn">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{saveIssue ?? issue}</span>
          </div>
        ) : null}
        {children}
      </main>

      <nav
        aria-label="底部导航"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-4">
          {NAV.map(({ route: itemRoute, label, Icon }) => {
            const active = route === itemRoute
            return (
              <button
                key={itemRoute}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(itemRoute)}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition ${
                  active ? 'text-accent' : 'text-ink-faint hover:text-ink-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
