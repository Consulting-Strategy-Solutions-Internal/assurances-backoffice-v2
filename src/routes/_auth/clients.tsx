import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '#/components/ui/card'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
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
import { clientDrawer } from '#/components/dashboard/drawers'
import { CLIENTS } from '#/components/dashboard/mock-data'
import { PageHeader } from '#/components/dashboard/PageHeader'

export const Route = createFileRoute('/_auth/clients')({
  component: ClientsPage,
})

const headCls = 'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function ClientsPage() {
  const { search } = useShell()
  const [drawer, setDrawer] = useState<DrawerContent | null>(null)

  const rows = useMemo(
    () => CLIENTS.filter((r) => matchesQuery(r, search)),
    [search],
  )

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Portefeuille assurés · particuliers & entreprises"
        action="Nouveau client"
        onAction={() => toast("Création d'un nouveau client")}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>Client</TableHead>
              <TableHead className={headCls}>Référence</TableHead>
              <TableHead className={headCls}>Branche</TableHead>
              <TableHead className={headCls}>Agence</TableHead>
              <TableHead className={cn(headCls, 'text-right')}>Prime annuelle</TableHead>
              <TableHead className={cn(headCls, 'pr-[22px]')}>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.ref}
                className="cursor-pointer"
                {...clickableRow(() => setDrawer(clientDrawer(r)))}
              >
                <TableCell className="py-3.5 pl-[22px]">
                  <div className="flex items-center gap-[11px]">
                    <Avatar className="size-[34px]">
                      <AvatarFallback
                        className="text-[12.5px] font-bold text-white"
                        style={{ background: r.color }}
                      >
                        {r.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-[13.5px] font-semibold">{r.nom}</div>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 text-[13px] font-semibold text-muted-foreground">
                  {r.ref}
                </TableCell>
                <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                  {r.branche}
                </TableCell>
                <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                  {r.agence}
                </TableCell>
                <TableCell className="py-3.5 text-right text-[13.5px] font-semibold tabular-nums">
                  {r.prime}
                </TableCell>
                <TableCell className="py-3.5 pr-[22px]">
                  <StatusPill status={r.statut} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-9 text-center text-[13.5px] text-muted-foreground">
                  Aucun client ne correspond à votre recherche.
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
