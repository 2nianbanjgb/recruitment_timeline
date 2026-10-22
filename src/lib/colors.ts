import type { Status } from '../types'

/**
 * 公司徽章用色：8 个区分度较高的色相。
 * 8 家以内可以通过 buildCompanyColors 做到互不重复，再多才复用。
 */
const PALETTE_HUES = [8, 32, 150, 185, 215, 258, 292, 330] as const

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

function makeColor(hue: number): CompanyColor {
  return {
    hue,
    accent: `hsl(${hue} 78% 60%)`,
    soft: `hsl(${hue} 78% 60% / 0.14)`,
    border: `hsl(${hue} 78% 60% / 0.35)`,
  }
}

export const COMPANY_COLORS: readonly CompanyColor[] = PALETTE_HUES.map(makeColor)

/** 单个公司的主色（没有全量公司列表时的兜底，可能与别的公司撞色）。 */
export function companyColor(name: string): CompanyColor {
  return COMPANY_COLORS[hashString(name) % COMPANY_COLORS.length] ?? COMPANY_COLORS[0]!
}

/**
 * 给一批公司分配颜色：按公司名排序后依次挑色，色相被占了就顺延到下一种。
 * 同一批数据算出来的结果固定，所以同一家公司始终是同一个颜色；
 * 8 家以内互不重复，超过 8 家才开始复用。
 */
export function buildCompanyColors(names: readonly string[]): Map<string, CompanyColor> {
  const map = new Map<string, CompanyColor>()
  const used = new Set<number>()
  const sorted = [...new Set(names)].sort()

  for (const name of sorted) {
    let slot = hashString(name) % COMPANY_COLORS.length
    if (used.size < COMPANY_COLORS.length) {
      for (let probe = 0; probe < COMPANY_COLORS.length; probe += 1) {
        const candidate = (slot + probe) % COMPANY_COLORS.length
        if (!used.has(candidate)) {
          slot = candidate
          break
        }
      }
    }
    used.add(slot)
    map.set(name, COMPANY_COLORS[slot] ?? COMPANY_COLORS[0]!)
  }

  return map
}

export interface StatusStyle {
  dot: string
  pill: string
  label: string
}

export const STATUS_STYLES: Record<Status, StatusStyle> = {
  pending: { dot: 'bg-warn', pill: 'border-warn/25 bg-warn/10 text-warn', label: '待进行' },
  in_progress: { dot: 'bg-info', pill: 'border-info/25 bg-info/10 text-info', label: '流程中' },
  completed: { dot: 'bg-success', pill: 'border-success/25 bg-success/10 text-success', label: '已完成' },
  finished: { dot: 'bg-muted', pill: 'border-line-strong bg-muted/10 text-muted', label: '已结束' },
}
