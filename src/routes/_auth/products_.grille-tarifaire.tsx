import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
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
import { matchesQuery } from '#/lib/dashboard-theme'
import { useShell } from '#/components/dashboard/shell'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { FORMULES, TARIFS, type Formule } from '#/components/products/data'

export const Route = createFileRoute('/_auth/products_/grille-tarifaire')({
  component: GrilleTarifairePage,
})

const headCls = 'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

const formuleBadge: Record<string, string> = {
  Essentiel: 'bg-[#eef0f4] text-[#49525f]',
  Confort: 'bg-primary/10 text-primary',
  Premium: 'bg-[#fef3da] text-[#9a7400]',
}

function GrilleTarifairePage() {
  const { search } = useShell()
  const [formule, setFormule] = useState<Formule>('Toutes')

  const rows = useMemo(() => {
    const base =
      formule === 'Toutes'
        ? TARIFS
        : TARIFS.filter((t) => t.formule === formule)
    return base.filter((t) => matchesQuery(t, search))
  }, [formule, search])

  return (
    <>
      <PageHeader
        title="Grille tarifaire"
        subtitle="Tarifs par produit et par formule"
        action="Exporter la grille"
        onAction={() => toast('Export de la grille tarifaire (démo)')}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center gap-1.5 border-b px-[18px] py-3.5">
          <Tabs value={formule} onValueChange={(v) => setFormule(v as Formule)}>
            <TabsList className="h-auto gap-1.5 bg-transparent p-0">
              {FORMULES.map((f) => (
                <TabsTrigger
                  key={f}
                  value={f}
                  className="rounded-[9px] px-3.5 py-[7px] text-[12.5px] font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none!"
                >
                  {f}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>Produit</TableHead>
              <TableHead className={headCls}>Formule</TableHead>
              <TableHead className={headCls}>Couverture</TableHead>
              <TableHead className={cn(headCls, 'text-right')}>Prime mensuelle</TableHead>
              <TableHead className={cn(headCls, 'pr-[22px] text-right')}>Prime annuelle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.produit}-${r.formule}-${i}`}>
                <TableCell className="py-3.5 pl-[22px] text-[13.5px] font-semibold">
                  {r.produit}
                </TableCell>
                <TableCell className="py-3.5">
                  <Badge
                    className={cn(
                      'rounded-full border-transparent px-2.5 py-0.5 text-[12px] font-bold',
                      formuleBadge[r.formule] ?? 'bg-[#eef0f4] text-[#49525f]',
                    )}
                  >
                    {r.formule}
                  </Badge>
                </TableCell>
                <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                  {r.couverture}
                </TableCell>
                <TableCell className="py-3.5 text-right text-[13.5px] font-semibold tabular-nums">
                  {r.mensuel}
                </TableCell>
                <TableCell className="py-3.5 pr-[22px] text-right text-[13.5px] font-bold tabular-nums">
                  {r.annuel}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-9 text-center text-[13.5px] text-muted-foreground">
                  Aucun tarif ne correspond à votre recherche.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
