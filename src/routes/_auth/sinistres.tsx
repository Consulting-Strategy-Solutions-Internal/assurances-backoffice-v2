import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '#/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'
import { clickableRow, matchesQuery } from '#/lib/dashboard-theme'
import { useShell } from '#/components/dashboard/shell'
import { StatusPill } from '#/components/dashboard/StatusPill'
import {
  DetailDrawer,
  type DrawerContent,
} from '#/components/dashboard/DetailDrawer'
import { sinistreDrawer } from '#/components/dashboard/drawers'
import { SINISTRES } from '#/components/dashboard/mock-data'
import { PageHeader } from '#/components/dashboard/PageHeader'

export const Route = createFileRoute('/_auth/sinistres')({
  component: SinistresPage,
})

const TABS = ['Tous', 'Déclarés', 'En expertise', 'Réglés'] as const
type Tab = (typeof TABS)[number]

const STATS = [
  { value: '327', label: 'En cours de traitement' },
  { value: '68', label: 'En expertise' },
  { value: '1 942', label: 'Réglés (cumul année)', accent: true },
  { value: '11,2', unit: 'j', label: 'Délai moyen de règlement' },
] as const

const headCls = 'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function SinistresPage() {
  const { search } = useShell()
  const [tab, setTab] = useState<Tab>('Tous')
  const [drawer, setDrawer] = useState<DrawerContent | null>(null)

  const rows = useMemo(() => {
    let base: readonly (typeof SINISTRES)[number][] = SINISTRES
    if (tab === 'Déclarés') base = base.filter((r) => r.statut === 'Déclaré')
    else if (tab === 'En expertise')
      base = base.filter((r) => r.statut === 'En expertise')
    else if (tab === 'Réglés')
      base = base.filter((r) => r.statut === 'Réglé' || r.statut === 'Validé')
    return base.filter((r) => matchesQuery(r, search))
  }, [tab, search])

  return (
    <>
      <PageHeader
        title="Sinistres"
        subtitle="Gestion et suivi des déclarations de sinistre"
        action="Déclarer un sinistre"
        onAction={() => toast("Déclaration d'un sinistre")}
      />

      <div className="mb-[18px] grid grid-cols-4 gap-4">
        {STATS.map((s) => (
          <Card key={s.label} className="gap-0 px-[19px] py-[17px]">
            <div
              className={cn(
                'text-[27px] font-extrabold tracking-[-0.035em]',
                'accent' in s && s.accent && 'text-[#1c8a57]',
              )}
            >
              {s.value}
              {'unit' in s && s.unit && (
                <span className="text-sm text-muted-foreground"> {s.unit}</span>
              )}
            </div>
            <div className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">
              {s.label}
            </div>
          </Card>
        ))}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center gap-1.5 border-b px-[18px] py-3.5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="h-auto gap-1.5 bg-transparent p-0">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="rounded-[9px] px-3.5 py-[7px] text-[12.5px] font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>Référence</TableHead>
              <TableHead className={headCls}>Assuré</TableHead>
              <TableHead className={headCls}>Branche</TableHead>
              <TableHead className={headCls}>Date</TableHead>
              <TableHead className={cn(headCls, 'text-right')}>Montant (FCFA)</TableHead>
              <TableHead className={cn(headCls, 'pr-[22px]')}>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.ref}
                className="cursor-pointer"
                {...clickableRow(() => setDrawer(sinistreDrawer(r)))}
              >
                <TableCell className="py-[14px] pl-[22px] text-[13.5px] font-bold text-primary">
                  {r.ref}
                </TableCell>
                <TableCell className="py-[14px] text-[13.5px] font-medium">
                  {r.client}
                </TableCell>
                <TableCell className="py-[14px] text-[13px] text-muted-foreground">
                  {r.branche}
                </TableCell>
                <TableCell className="py-[14px] text-[13px] text-muted-foreground">
                  {r.date}
                </TableCell>
                <TableCell className="py-[14px] text-right text-[13.5px] font-semibold tabular-nums">
                  {r.montant}
                </TableCell>
                <TableCell className="py-[14px] pr-[22px]">
                  <StatusPill status={r.statut} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-9 text-center text-[13.5px] text-muted-foreground">
                  Aucun sinistre ne correspond à votre recherche.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <DetailDrawer
        content={drawer}
        onClose={() => setDrawer(null)}
        onAction={(c) => {
          toast(c.actionLabel + ' (démo)')
          setDrawer(null)
        }}
      />
    </>
  )
}
