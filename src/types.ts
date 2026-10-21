export type Stage = 'apply' | 'assessment' | 'written' | 'interview' | 'offer' | 'other'
export type Status = 'pending' | 'passed' | 'failed' | 'withdrawn'
export type Mode = 'online' | 'onsite'
export type Theme = 'system' | 'light' | 'dark'

/** 一场秋招安排：笔试、面试、网申截止等。 */
export interface RecruitEvent {
  id: string
  company: string
  role: string
  stage: Stage
  status: Status
  /** 只有日期、没有具体时刻（如网申截止） */
  allDay: boolean
  /** 'YYYY-MM-DDTHH:mm'；全天事件只保留日期 */
  startAt: string
  durationMin: number
  mode: Mode
  link: string
  location: string
  note: string
  remindBeforeMin: number
  createdAt: string
  updatedAt: string
}

/** 表单提交的数据，id 与时间戳由数据层生成。 */
export type EventInput = Omit<RecruitEvent, 'id' | 'createdAt' | 'updatedAt'>

export interface Settings {
  schemaVersion: number
  theme: Theme
  notifications: boolean
  defaultRemindMin: number
}

export interface BackupFile {
  schemaVersion: number
  app: string
  exportedAt: string
  settings: Settings
  events: RecruitEvent[]
}

export const SCHEMA_VERSION = 1

export const STAGES: readonly Stage[] = ['apply', 'assessment', 'written', 'interview', 'offer', 'other']
export const STATUSES: readonly Status[] = ['pending', 'passed', 'failed', 'withdrawn']
export const MODES: readonly Mode[] = ['online', 'onsite']
export const THEMES: readonly Theme[] = ['system', 'light', 'dark']

export const STAGE_LABELS: Record<Stage, string> = {
  apply: '网申',
  assessment: '测评',
  written: '笔试',
  interview: '面试',
  offer: 'Offer',
  other: '其他',
}

export const STATUS_LABELS: Record<Status, string> = {
  pending: '待进行',
  passed: '已通过',
  failed: '未通过',
  withdrawn: '已放弃',
}

export const MODE_LABELS: Record<Mode, string> = {
  online: '线上',
  onsite: '线下',
}

export const THEME_LABELS: Record<Theme, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
}

export const REMIND_OPTIONS = [
  { value: 0, label: '不提醒' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
  { value: 120, label: '提前 2 小时' },
  { value: 1440, label: '提前 1 天' },
] as const

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SCHEMA_VERSION,
  theme: 'system',
  notifications: false,
  defaultRemindMin: 30,
}
