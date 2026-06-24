import { createContext, useContext, useMemo, useState } from 'react'

export type Period = 'Jour' | 'Mois' | 'Trimestre' | 'Année'

interface ShellContextValue {
  /** Global topbar search query, consumed by the data views to filter rows. */
  search: string
  setSearch: (value: string) => void
  /** Selected period in the topbar segmented control. */
  period: Period
  setPeriod: (value: Period) => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used within <ShellProvider>')
  return ctx
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<Period>('Mois')

  const value = useMemo(
    () => ({ search, setSearch, period, setPeriod }),
    [search, period],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
