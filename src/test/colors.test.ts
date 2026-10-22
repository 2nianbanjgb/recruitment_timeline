import { describe, expect, it } from 'vitest'
import { buildCompanyColors, companyColor } from '../lib/colors'

describe('公司配色', () => {
  it('8 家以内的公司颜色互不重复', () => {
    const names = ['京东', '邮储银行', '携程', '蚂蚁', '中信证券', '6', '2', '3']
    const map = buildCompanyColors(names)
    expect(map.size).toBe(8)
    expect(new Set([...map.values()].map(color => color.hue)).size).toBe(8)
  })

  it('同一家公司在不同数据集合里颜色一致', () => {
    const withOthers = buildCompanyColors(['京东', '携程', '蚂蚁'])
    const alone = buildCompanyColors(['京东'])
    expect(withOthers.get('京东')?.hue).toBe(alone.get('京东')?.hue)
  })

  it('公司只在原来想用的颜色被占用时才顺延', () => {
    // 找到两家哈希到同一色位的公司，加到同一批里应该被拆开。
    const slot = (name: string) => {
      const map = buildCompanyColors([name])
      return map.get(name)?.hue
    }
    const pool = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    let pair: [string, string] | null = null
    for (const first of pool) {
      for (const second of pool) {
        if (first !== second && slot(first) === slot(second)) {
          pair = [first, second]
          break
        }
      }
      if (pair) break
    }
    expect(pair).not.toBeNull()
    const [first, second] = pair!
    const together = buildCompanyColors([first, second])
    expect(together.get(first)?.hue).not.toBe(together.get(second)?.hue)
  })

  it('超过 8 家公司时开始复用颜色', () => {
    const names = Array.from({ length: 11 }, (_, index) => `公司${index}`)
    const map = buildCompanyColors(names)
    expect(map.size).toBe(11)
    expect(new Set([...map.values()].map(color => color.hue)).size).toBe(8)
  })

  it('单个公司取色稳定', () => {
    expect(companyColor('京东')).toEqual(companyColor('京东'))
  })
})
