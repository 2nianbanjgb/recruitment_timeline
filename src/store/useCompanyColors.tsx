import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { buildCompanyColors, companyColor as fallbackCompanyColor, type CompanyColor } from '../lib/colors'
import { useEvents } from './useEvents'

const CompanyColorsContext = createContext<Map<string, CompanyColor> | null>(null)

/**
 * 按当前所有日程里的公司统一分配颜色：
 * 同一家公司所有页面同色，不同公司在 8 种颜色内尽量错开。
 */
export function CompanyColorsProvider({ children }: { children: ReactNode }) {
  const { events } = useEvents()
  const colors = useMemo(
    () => buildCompanyColors(events.map(event => event.company)),
    [events],
  )

  return <CompanyColorsContext.Provider value={colors}>{children}</CompanyColorsContext.Provider>
}

export function useCompanyColor(): (company: string) => CompanyColor {
  const colors = useContext(CompanyColorsContext)
  return useCallback(
    (company: string) => colors?.get(company) ?? fallbackCompanyColor(company),
    [colors],
  )
}
