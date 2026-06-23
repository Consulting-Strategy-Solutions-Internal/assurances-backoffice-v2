import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
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
import { clickableRow, matchesQuery } from '#/lib/dashboard-theme'
import { useShell } from '#/components/dashboard/shell'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { PageHeader } from '#/components/dashboard/PageHeader'
import {
  DetailDrawer,
  type DrawerContent,
} from '#/components/dashboard/DetailDrawer'
import { productDrawer } from '#/components/dashboard/drawers'
import { PRODUITS } from '#/components/products/data'

export const Route = createFileRoute('/_auth/products')({
  component: ProductsPage,
})

const headCls = 'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function ProductsPage() {
  const { search } = useShell()
  const [drawer, setDrawer] = useState<DrawerContent | null>(null)

  const rows = useMemo(
    () => PRODUITS.filter((r) => matchesQuery(r, search)),
    [search],
  )

  return (
    <>
      <PageHeader
        title="Produits"
        subtitle="Catalogue des produits d'assurance"
        action="Nouveau produit"
        onAction={() => toast("Création d'un nouveau produit (démo)")}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>Produit</TableHead>
              <TableHead className={headCls}>Branche</TableHead>
              <TableHead className={headCls}>Catégorie</TableHead>
              <TableHead className={cn(headCls, 'text-right')}>Prime de base (FCFA)</TableHead>
              <TableHead className={cn(headCls, 'pr-[22px]')}>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.code}
                className="cursor-pointer"
                {...clickableRow(() => setDrawer(productDrawer(r)))}
              >
                <TableCell className="py-3.5 pl-[22px]">
                  <div className="text-[13.5px] font-semibold">{r.nom}</div>
                  <div className="text-[12px] text-muted-foreground">{r.code}</div>
                </TableCell>
                <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                  {r.branche}
                </TableCell>
                <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                  {r.categorie}
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
                <TableCell colSpan={5} className="py-9 text-center text-[13.5px] text-muted-foreground">
                  Aucun produit ne correspond à votre recherche.
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
