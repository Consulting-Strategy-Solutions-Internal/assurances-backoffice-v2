import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'
import type { AccessoryResponse } from '#/services/accessories'

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

const nf = new Intl.NumberFormat('fr-FR')

export interface AccessoryGroup {
  productId: number
  label: string
  productCode?: number
  items: AccessoryResponse[]
}

interface AccessoriesByProductProps {
  groups: AccessoryGroup[]
  onEdit: (accessory: AccessoryResponse) => void
  onDelete: (accessory: AccessoryResponse) => void
  /** When false, the row "Modifier"/"Supprimer" actions are disabled. */
  canWrite?: boolean
}

const noPerm = "Vous n'avez pas la permission requise (accessory:write)."

export function AccessoriesByProduct({
  groups,
  onEdit,
  onDelete,
  canWrite = true,
}: AccessoriesByProductProps) {
  if (groups.length === 0) {
    return (
      <Card className="gap-0 py-0">
        <div className="p-9 text-center text-[13.5px] text-muted-foreground">
          Aucun accessoire à afficher.
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <Card key={group.productId} className="gap-0 overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b px-[18px] py-3">
            <div className="flex items-center gap-2.5">
              <Badge className="rounded-md border-transparent bg-primary/10 px-2 py-0.5 font-mono text-[12px] font-bold text-primary tabular-nums">
                {group.productCode ?? ''}
              </Badge>
              <span className="text-[14.5px] font-bold">{group.label}</span>
            </div>
            <span className="text-[12px] font-medium text-muted-foreground tabular-nums">
              {group.items.length} accessoire(s)
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(headCls, 'pl-[18px] text-right')}>
                  Prime min (FCFA)
                </TableHead>
                <TableHead className={cn(headCls, 'text-right')}>
                  Prime max (FCFA)
                </TableHead>
                <TableHead className={cn(headCls, 'text-right')}>
                  Montant (FCFA)
                </TableHead>
                <TableHead className={cn(headCls, 'pr-[18px] text-right')}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.items.map((a) => (
                <TableRow key={a.id} className="hover:bg-transparent">
                  <TableCell className="py-3 pl-[18px] text-right text-[13px] text-muted-foreground tabular-nums">
                    {nf.format(a.minPremium)}
                  </TableCell>
                  <TableCell className="py-3 text-right text-[13px] text-muted-foreground tabular-nums">
                    {nf.format(a.maxPremium)}
                  </TableCell>
                  <TableCell className="py-3 text-right text-[13.5px] font-semibold tabular-nums">
                    {nf.format(a.amount)}
                  </TableCell>
                  <TableCell className="py-3 pr-[18px]">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[9px]"
                        onClick={() => onEdit(a)}
                        disabled={!canWrite}
                        title={canWrite ? undefined : noPerm}
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(a)}
                        disabled={!canWrite}
                        title={canWrite ? undefined : noPerm}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ))}
    </div>
  )
}
