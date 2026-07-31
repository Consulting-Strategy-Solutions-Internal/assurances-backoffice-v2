import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  BarChart3,
  ChevronRight,
  Coins,
  Download,
  FileText,
  Plus,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'
import { CHART, clickableRow, matchesQuery } from '#/lib/dashboard-theme'
import { useShell } from '#/components/dashboard/shell'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { DetailDrawer } from '#/components/dashboard/DetailDrawer'
import type { DrawerContent } from '#/components/dashboard/DetailDrawer'
import {
  renouvelerDrawer,
  sinistreDrawer,
} from '#/components/dashboard/drawers'
import {
  MONTHLY_FLOW,
  REPARTITION,
  RENOUVELER,
  SIN_TRAITER,
  TOP_PARTENAIRES,
} from '#/components/dashboard/mock-data'

export const Route = createFileRoute('/_auth/dashboard')({
  component: DashboardPage,
})

const headCls =
  'h-auto px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'
const moreLink =
  'text-[13px] font-semibold text-primary whitespace-nowrap hover:underline'

function DashboardPage() {
  const { search } = useShell()
  const [drawer, setDrawer] = useState<DrawerContent | null>(null)

  const sinTraiter = useMemo(
    () => SIN_TRAITER.filter((r) => matchesQuery(r, search)),
    [search],
  )
  const renouveler = useMemo(
    () => RENOUVELER.filter((r) => matchesQuery(r, search)),
    [search],
  )

  const donut = useMemo(() => {
    let acc = 0
    const stops = REPARTITION.map((s) => {
      const seg = `${s.color} ${acc}% ${acc + s.pct}%`
      acc += s.pct
      return seg
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [])

  function handleDrawerAction(content: DrawerContent) {
    toast(content.actionLabel + ' (démo)')
    setDrawer(null)
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
            Vue d'ensemble
          </h1>
          <p className="mt-[7px] text-sm text-muted-foreground">
            Activité du portefeuille · Direction Générale
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            className="rounded-[11px]"
            onClick={() => toast('Export du rapport en cours…')}
          >
            <Download />
            Exporter
          </Button>
          <Button
            className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
            onClick={() => toast("Création d'un nouveau contrat")}
          >
            <Plus />
            Nouveau contrat
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-[18px] grid grid-cols-4 gap-4">
        <KpiCard
          icon={<FileText className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value="12 480"
          label="Contrats actifs"
          trend={{ label: '↑ 8,4%', class: 'bg-[#e7f6ee] text-[#1c8a57]' }}
        />
        <KpiCard
          variant="dark"
          icon={<Coins className="size-5 text-[#FFC61E]" />}
          iconClass="bg-white/10"
          value={
            <>
              2,84{' '}
              <span className="text-base font-bold text-[#FFC61E]">Mds</span>
            </>
          }
          label="Primes encaissées · FCFA"
          trend={{ label: '↑ 12,1%', class: 'bg-[#FFC61E] text-[#0c2c5e]' }}
        />
        <KpiCard
          icon={<TriangleAlert className="size-5 text-destructive" />}
          iconClass="bg-[#d64545]/10"
          value="327"
          label="Sinistres en cours"
          trend={{ label: '↑ 5,2%', class: 'bg-[#fbe9e9] text-[#cf3d3d]' }}
        />
        <KpiCard
          icon={<BarChart3 className="size-5 text-[#1c8a57]" />}
          iconClass="bg-[#1c8a57]/10"
          value={
            <>
              42,8
              <span className="text-base font-bold text-muted-foreground">
                %
              </span>
            </>
          }
          label="Taux de sinistralité"
          trend={{ label: '↓ 3,1%', class: 'bg-[#e7f6ee] text-[#1c8a57]' }}
        />
      </div>

      {/* Sinistres à traiter + Répartition */}
      <div className="mb-[18px] grid grid-cols-[1.7fr_1fr] gap-4">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between px-[22px] pt-[18px] pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold tracking-[-0.01em]">
                Sinistres à traiter
              </span>
              <span className="rounded-full bg-[#ffc61e]/[0.22] px-2 py-px text-[11.5px] font-bold text-[#9a7400]">
                {sinTraiter.length}
              </span>
            </div>
            <Link
              to="/sinistres"
              search={{ page: 0, size: 20, sort: 'createdAt,desc' }}
              className={moreLink}
            >
              Tout voir →
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(headCls, 'pl-[22px]')}>
                  Référence
                </TableHead>
                <TableHead className={headCls}>Client</TableHead>
                <TableHead className={headCls}>Branche</TableHead>
                <TableHead className={cn(headCls, 'text-right')}>
                  Montant
                </TableHead>
                <TableHead className={cn(headCls, 'pr-[22px]')}>
                  Statut
                </TableHead>
                <TableHead className="w-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sinTraiter.map((r) => (
                <TableRow
                  key={r.ref}
                  className="cursor-pointer"
                  {...clickableRow(() => setDrawer(sinistreDrawer(r)))}
                >
                  <TableCell className="py-3.5 pl-[22px] text-[13.5px] font-bold text-primary">
                    {r.ref}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13.5px] font-medium">
                    {r.client}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                    {r.branche}
                  </TableCell>
                  <TableCell className="py-3.5 text-right text-[13.5px] font-semibold tabular-nums">
                    {r.montant}
                  </TableCell>
                  <TableCell className="py-3.5 pr-[22px]">
                    <StatusPill status={r.statut} />
                  </TableCell>
                  <TableCell className="py-3.5 pr-[18px]">
                    <ChevronRight className="size-[15px] text-[#c2c9d4]" />
                  </TableCell>
                </TableRow>
              ))}
              {sinTraiter.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="py-9 text-center text-[13.5px] text-muted-foreground"
                  >
                    Aucun sinistre ne correspond à votre recherche.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="gap-0 px-[22px] py-[18px]">
          <div className="text-base font-bold tracking-[-0.01em]">
            Répartition du portefeuille
          </div>
          <div className="mt-[3px] mb-[18px] text-[12.5px] text-muted-foreground">
            Primes par branche
          </div>
          <div className="flex items-center gap-[22px]">
            <div
              className="flex size-36 shrink-0 items-center justify-center rounded-full"
              style={{ background: donut }}
            >
              <div className="flex size-[92px] flex-col items-center justify-center rounded-full bg-card shadow-[inset_0_0_0_1px_#f0f2f6]">
                <div className="text-[21px] font-extrabold tracking-[-0.03em]">
                  2,84
                </div>
                <div className="text-[10.5px] font-semibold text-muted-foreground">
                  Mds FCFA
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              {REPARTITION.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ background: s.color }}
                  />
                  <span className="flex-1 text-[13px] font-semibold">
                    {s.label}
                  </span>
                  <span className="text-[13px] font-bold text-muted-foreground">
                    {s.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bar chart */}
      <Card className="mb-[18px] gap-0 px-6 pt-5 pb-4">
        <div className="mb-[22px] flex items-center justify-between">
          <div>
            <div className="text-base font-bold tracking-[-0.01em]">
              Primes encaissées vs sinistres réglés
            </div>
            <div className="mt-[3px] text-[12.5px] text-muted-foreground">
              12 derniers mois · en millions FCFA
            </div>
          </div>
          <div className="flex gap-[18px]">
            <Legend color={CHART.brand} label="Primes" />
            <Legend color={CHART.gold} label="Sinistres réglés" />
          </div>
        </div>
        <div className="flex gap-3.5">
          <div className="flex h-[200px] w-10 shrink-0 flex-col justify-between text-right text-[11px] font-semibold text-[#aeb6c2]">
            <span>200M</span>
            <span>150M</span>
            <span>100M</span>
            <span>50M</span>
            <span>0</span>
          </div>
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[200px] flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'border-t',
                    i === 4 ? 'border-[#e7eaf0]' : 'border-[#eef0f4]',
                  )}
                />
              ))}
            </div>
            <div className="relative flex h-[200px] items-end gap-[11px]">
              {MONTHLY_FLOW.map((m) => (
                <div
                  key={m.mois}
                  className="flex h-full flex-1 items-end justify-center gap-1"
                >
                  <div
                    className="w-[9px] rounded-t-[4px]"
                    style={{ height: m.primes, background: CHART.brand }}
                  />
                  <div
                    className="w-[9px] rounded-t-[4px]"
                    style={{ height: m.sinistres, background: CHART.gold }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex gap-[11px]">
              {MONTHLY_FLOW.map((m) => (
                <div
                  key={m.mois}
                  className="flex-1 text-center text-[11.5px] font-semibold text-muted-foreground"
                >
                  {m.mois}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Contrats à renouveler + Top partenaires */}
      <div className="grid grid-cols-[1.7fr_1fr] gap-4">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between px-[22px] pt-[18px] pb-3.5">
            <span className="text-base font-bold tracking-[-0.01em]">
              Contrats à renouveler
            </span>
            <Link
              to="/clients"
              search={{ page: 0, size: 20, sort: 'lastName,asc' }}
              className={moreLink}
            >
              Tout voir →
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(headCls, 'pl-[22px]')}>
                  Client
                </TableHead>
                <TableHead className={headCls}>Police</TableHead>
                <TableHead className={headCls}>Échéance</TableHead>
                <TableHead className={cn(headCls, 'pr-[22px] text-right')}>
                  Prime
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renouveler.map((r) => (
                <TableRow
                  key={r.police}
                  className="cursor-pointer"
                  {...clickableRow(() => setDrawer(renouvelerDrawer(r)))}
                >
                  <TableCell className="py-3.5 pl-[22px] text-[13.5px] font-semibold">
                    {r.client}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] font-semibold text-muted-foreground">
                    {r.police}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                    {r.echeance}
                  </TableCell>
                  <TableCell className="py-3.5 pr-[22px] text-right text-[13.5px] font-bold tabular-nums">
                    {r.prime}
                  </TableCell>
                </TableRow>
              ))}
              {renouveler.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="py-9 text-center text-[13.5px] text-muted-foreground"
                  >
                    Aucun contrat ne correspond à votre recherche.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="gap-0 px-[22px] py-[18px]">
          <div className="mb-[18px] flex items-center justify-between">
            <span className="text-base font-bold tracking-[-0.01em]">
              Top partenaires
            </span>
            <Link to="/partners" className={moreLink}>
              Réseau →
            </Link>
          </div>
          <div className="flex flex-col gap-[17px]">
            {TOP_PARTENAIRES.map((p) => (
              <div key={p.nom}>
                <div className="mb-[7px] flex justify-between">
                  <span className="text-[13.5px] font-semibold">{p.nom}</span>
                  <span
                    className={cn(
                      'text-[13px] font-bold',
                      p.gold ? 'text-[#9a7400]' : 'text-primary',
                    )}
                  >
                    {p.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-[4px] bg-[#eef0f4]">
                  <div
                    className="h-full rounded-[4px]"
                    style={{
                      width: `${p.pct}%`,
                      background: p.gold ? CHART.gold : CHART.brand,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <DetailDrawer
        content={drawer}
        onClose={() => setDrawer(null)}
        onAction={handleDrawerAction}
      />
    </>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-[7px]">
      <span
        className="size-[11px] rounded-[3px]"
        style={{ background: color }}
      />
      <span className="text-[12.5px] font-semibold text-muted-foreground">
        {label}
      </span>
    </div>
  )
}
