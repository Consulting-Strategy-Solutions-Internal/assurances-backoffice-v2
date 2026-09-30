import { createContext, useContext, useMemo, useState } from 'react'

export type Period = 'Jour' | 'Mois' | 'Trimestre' | 'Année'

interface ShellContextValue {
  /** Selected period, consumed by the dashboard (control lives in the dashboard page). */
  period: Period
  setPeriod: (value: Period) => void
  /** Mobile navigation drawer (below `lg`). */
  navOpen: boolean
  setNavOpen: (open: boolean) => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used within <ShellProvider>')
  return ctx
}

/** True when rendered inside an `AppShell` (avoids mounting a second shell). */
export function useInsideShell(): boolean {
  return useContext(ShellContext) !== null
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>('Mois')
  const [navOpen, setNavOpen] = useState(false)

  const value = useMemo(
    () => ({ period, setPeriod, navOpen, setNavOpen }),
    [period, navOpen],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
