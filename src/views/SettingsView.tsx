import { useRef, useState, type ChangeEvent, type ComponentType, type ReactNode } from 'react'
import { REMIND_OPTIONS, THEMES, THEME_LABELS } from '../types'
import type { PermissionState } from '../lib/notify'
import type { FileSyncControls } from '../hooks/useFileSync'
import { useEvents } from '../store/useEvents'
import { useSettings } from '../store/useSettings'
import {
  MAX_BACKUP_BYTES,
  buildBackup,
  mergeEvents,
  parseBackup,
  type ParsedBackup,
} from '../store/importExport'
import { generateIcs } from '../lib/ics'
import { dateSlug, downloadText, timestampSlug } from '../lib/download'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import {
  IconBell,
  IconDownload,
  IconMonitor,
  IconMoon,
  IconSun,
  IconTrash,
  IconUpload,
} from '../components/icons'
import { btnSecondary, fieldClass } from '../components/ui'

const APP_VERSION = '1.0.0'

const THEME_ICONS: Record<(typeof THEMES)[number], ComponentType<{ className?: string }>> = {
  system: IconMonitor,
  light: IconSun,
  dark: IconMoon,
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-ink-faint">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-accent-solid' : 'bg-line-strong'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'left-[22px]' : 'left-[2px]'
        }`}
      />
    </button>
  )
}

export interface SettingsViewProps {
  permission: PermissionState
  onRequestPermission: () => Promise<PermissionState>
  onSendTest: () => Promise<boolean>
  sync: FileSyncControls
}

export function SettingsView({
  permission,
  onRequestPermission,
  onSendTest,
  sync,
}: SettingsViewProps) {
  const { events, replaceEvents, clearAll } = useEvents()
  const { settings, update } = useSettings()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [icsScope, setIcsScope] = useState<'pending' | 'all'>('pending')

  const permissionLabel =
    permission === 'granted'
      ? '已允许'
      : permission === 'denied'
        ? '已被浏览器拒绝，需要在地址栏左侧重新允许'
        : permission === 'unsupported'
          ? '当前浏览器不支持通知'
          : '未授权'

  const toggleNotifications = async () => {
    if (settings.notifications) {
      update({ notifications: false })
      toast('页面内提醒已关闭')
      return
    }
    if (permission === 'unsupported') {
      toast('这个浏览器不支持系统通知，可以改用 .ics 导出到手机日历')
      return
    }
    const result = await onRequestPermission()
    if (result === 'granted') {
      update({ notifications: true })
      toast('提醒已开启：页面开着时会按提前量弹出通知')
    } else {
      toast('未获得通知权限，可以稍后在浏览器地址栏左侧允许')
    }
  }

  const exportJson = () => {
    downloadText(
      `recruitment-timeline-backup-${timestampSlug(new Date())}.json`,
      buildBackup(events, settings),
      'application/json',
    )
    toast(`已导出 ${events.length} 场记录的 JSON 备份`)
  }

  const exportIcs = () => {
    const list =
      icsScope === 'pending' ? events.filter(event => event.status === 'pending') : [...events]
    if (list.length === 0) {
      toast('没有可导出的事件')
      return
    }
    downloadText(`秋招日程-${dateSlug(new Date())}.ics`, generateIcs(list), 'text/calendar')
    toast(`已导出 ${list.length} 场到 .ics，导入手机日历后到点会响`)
  }

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_BACKUP_BYTES) {
      toast('备份文件超过 5MB，已拒绝导入')
      return
    }
    try {
      const text = await file.text()
      setPendingImport(parseBackup(text))
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败')
    }
  }

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!pendingImport) return
    if (mode === 'merge') {
      const result = mergeEvents(events, pendingImport.events)
      replaceEvents(result.events)
      toast(`合并完成：新增 ${result.added}，更新 ${result.updated}，跳过 ${result.skipped}`)
    } else {
      replaceEvents(pendingImport.events)
      if (pendingImport.settings) update(pendingImport.settings)
      toast(`已覆盖导入 ${pendingImport.events.length} 场`)
    }
    setPendingImport(null)
  }

  const handleClear = () => {
    const count = events.length
    clearAll()
    setConfirmClear(false)
    toast(`已清空 ${count} 场记录`)
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">设置</h1>
        <p className="mt-0.5 text-xs text-ink-faint">外观、提醒方式与数据备份都在这里。</p>
      </header>

      <Section title="外观" description="深色模式适合夜里看第二天的面试安排。">
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(theme => {
            const Icon = THEME_ICONS[theme]
            const active = settings.theme === theme
            return (
              <button
                key={theme}
                type="button"
                aria-pressed={active}
                onClick={() => update({ theme })}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs transition ${
                  active
                    ? 'border-accent/40 bg-accent-soft font-medium text-accent'
                    : 'border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" />
                {THEME_LABELS[theme]}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="提醒" description="页面内提醒只在页面打开（或后台标签页存活）时生效。">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink">浏览器通知</p>
            <p className="mt-0.5 text-[11px] text-ink-faint">权限状态：{permissionLabel}</p>
          </div>
          <Switch checked={settings.notifications} label="开启浏览器通知" onChange={toggleNotifications} />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">默认提前量</span>
            <select
              value={settings.defaultRemindMin}
              onChange={event => update({ defaultRemindMin: Number(event.target.value) })}
              className={`${fieldClass} w-44`}
            >
              {REMIND_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={btnSecondary}
            disabled={permission !== 'granted'}
            onClick={async () => {
              const ok = await onSendTest()
              toast(ok ? '已发送测试通知' : '发送失败，请检查通知权限')
            }}
          >
            <IconBell className="h-4 w-4" />
            发送测试通知
          </button>
        </div>

        <p className="mt-3 rounded-xl bg-panel-soft px-3 py-2 text-[11px] leading-relaxed text-ink-faint">
          关掉页面也想收到提醒时，用下面的「导出 .ics」把日程丢进手机自带日历，由系统负责到点提醒，这是最稳的方式。
        </p>
      </Section>

      <Section
        title="本地文件同步"
        description="每次增删改都会写入本地 JSON 快照，并在 changes.log 里追加一条记录。"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
              sync.connected
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-line bg-panel-soft text-ink-faint'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${sync.connected ? 'bg-success' : 'bg-ink-faint'}`}
            />
            {sync.connected ? '已连接' : '未连接'}
          </span>
          {sync.connected && sync.lastSavedAt ? (
            <span className="text-[11px] text-ink-faint">
              最后保存{' '}
              {new Date(sync.lastSavedAt).toLocaleTimeString('zh-CN', { hour12: false })}
            </span>
          ) : null}
        </div>

        {sync.connected ? (
          <p className="mt-2 break-all rounded-xl bg-panel-soft px-3 py-2 text-[11px] leading-relaxed text-ink-faint">
            数据文件：{sync.dataDir ?? 'data'}/
            <br />
            recruitment-timeline.json（全量快照） · changes.log（追加日志）
          </p>
        ) : (
          <p className="mt-2 rounded-xl bg-panel-soft px-3 py-2 text-[11px] leading-relaxed text-ink-faint">
            未连接：运行 <code className="rounded bg-panel px-1">npm run app</code>，页面和数据文件会一起在
            http://127.0.0.1:4600 提供。未连接时改动仍保存在浏览器里，下次连接会自动补写。
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            disabled={!sync.connected}
            onClick={sync.syncNow}
          >
            <IconDownload className="h-4 w-4" />
            立即写入文件
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={!sync.connected}
            onClick={sync.reloadFromFile}
          >
            <IconUpload className="h-4 w-4" />
            用文件覆盖浏览器
          </button>
        </div>

        {sync.error ? <p className="mt-2 text-[11px] text-warn">{sync.error}</p> : null}
      </Section>

      <Section
        title="数据"
        description="JSON 备份包含日程与设置（不含待办）；待办和日程都会写进本地文件快照。"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnSecondary} onClick={exportJson}>
            <IconDownload className="h-4 w-4" />
            导出 JSON 备份
          </button>
          <button type="button" className={btnSecondary} onClick={() => fileInputRef.current?.click()}>
            <IconUpload className="h-4 w-4" />
            导入 JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">导出 .ics 的范围</span>
            <select
              value={icsScope}
              onChange={event => setIcsScope(event.target.value === 'all' ? 'all' : 'pending')}
              className={`${fieldClass} w-44`}
            >
              <option value="pending">仅待进行</option>
              <option value="all">全部事件</option>
            </select>
          </label>
          <button type="button" className={btnSecondary} onClick={exportIcs}>
            <IconDownload className="h-4 w-4" />
            导出 .ics 到日历
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5">
          <p className="text-xs text-ink-muted">当前共 {events.length} 场记录</p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10"
            onClick={() => setConfirmClear(true)}
            disabled={events.length === 0}
          >
            <IconTrash className="h-3.5 w-3.5" />
            清空所有日程
          </button>
        </div>
      </Section>

      <Section title="关于" description={`版本 ${APP_VERSION}`}>
        <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-ink-muted">
          <li>· 纯本地应用：没有账号、没有服务器，数据不会离开你的浏览器。</li>
          <li>· 建议把这套文件部署到任意静态托管（或直接用本地预览）后在浏览器里「安装」成桌面应用。</li>
          <li>· 通勤路上想看日程，可以把导出的 .ics 发到手机，或用同一份静态站点在手机浏览器里再录入。</li>
        </ul>
      </Section>

      <ConfirmDialog
        open={pendingImport !== null}
        title="导入备份"
        description={
          pendingImport ? (
            <>
              文件里有 <b className="text-ink">{pendingImport.events.length}</b> 场安排。合并会保留现有数据并按 id
              去重；覆盖会先清空当前列表。
              {pendingImport.dropped > 0 ? `（${pendingImport.dropped} 条无法识别，已忽略）` : ''}
            </>
          ) : null
        }
        confirmLabel="合并导入"
        secondaryLabel="覆盖导入"
        onConfirm={() => applyImport('merge')}
        onSecondary={() => applyImport('replace')}
        onCancel={() => setPendingImport(null)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="清空所有日程？"
        description="这会删除本机保存的全部安排，无法撤销。建议先导出一份 JSON 备份。"
        confirmLabel="清空"
        tone="danger"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
