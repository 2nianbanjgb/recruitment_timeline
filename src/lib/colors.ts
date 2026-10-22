import type { Status } from '../types'

/** 公司徽章用色：按名称哈希稳定取色，不污染状态语义。 */
const HUES = [258, 217, 190, 160, 45, 25, 350, 300, 275, 130] as const

export interface CompanyColor {
  hue: number
  accent: string
  soft: string
  border: string
}

export function hashString(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash
}

export function companyHue(name: string): number {
  const index = hashString(name) % HUES.length
  return HUES[index] ?? 258
}

export function companyColor(name: string): CompanyColor {
  const hue = companyHue(name)
  return {
    hue,
    accent: `hsl(${hue} 78% 60%)`,
    soft: `hsl(${hue} 78% 60% / 0.14)`,
    border: `hsl(${hue} 78% 60% / 0.35)`,
  }
}

export interface StatusStyle {
  dot: string
  pill: string
  label: string
}

export const STATUS_STYLES: Record<Status, StatusStyle> = {
  pending: { dot: 'bg-warn', pill: 'border-warn/25 bg-warn/10 text-warn', label: '待进行' },
  in_progress: { dot: 'bg-info', pill: 'border-info/25 bg-info/10 text-info', label: '流程中' },
  finished: { dot: 'bg-muted', pill: 'border-line-strong bg-muted/10 text-muted', label: '已结束' },
}
