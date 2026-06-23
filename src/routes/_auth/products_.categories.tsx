import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
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
import { StatusPill } from '#/components/dashboard/StatusPill'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { CATEGORIES } from '#/components/products/data'

export const Route = createFileRoute('/_auth/products_/categories')({
  component: CategoriesPage,
})

const headCls = 'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function CategoriesPage() {
  const { search } = useShell()

  const rows = useMemo(
    () => CATEGORIES.filter((r) => matchesQuery(r, search)),
    [search],
  )

  return (
    <>
      <PageHeader
        title="Catégories"
        subtitle="Familles de produits du catalogue"
        action="Nouvelle catégorie"
        onAction={() => toast("Création d'une catégorie (démo)")}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>Catégorie</TableHead>
              <TableHead className={headCls}>Branche</TableHead>
              <TableHead className={cn(headCls, 'text-right')}>Produits</TableHead>
              <TableHead className={cn(headCls, 'pr-[22px]')}>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.nom}>
                <TableCell className="py-3.5 pl-[22px] text-[13.5px] font-semibold">
                  {r.nom}
                </TableCell>
                <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                  {r.branche}
                </TableCell>
                <TableCell className="py-3.5 text-right">
                  <Badge
                    variant="secondary"
                    className="rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums"
                  >
                    {r.produits}
                  </Badge>
                </TableCell>
                <TableCell className="py-3.5 pr-[22px]">
                  <StatusPill status={r.statut} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-9 text-center text-[13.5px] text-muted-foreground">
                  Aucune catégorie ne correspond à votre recherche.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
