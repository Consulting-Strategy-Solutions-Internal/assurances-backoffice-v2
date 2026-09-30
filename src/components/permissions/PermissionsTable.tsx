import { KeyRound } from 'lucide-react'
import type { PermissionResponse } from '#/services/roles'
import {
  ClickableRow,
  DataTableCard,
  DataTableHead,
  FIRST_CELL_CLASS,
  RowChevron,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { permissionDescription, permissionLabel } from '#/lib/permission-labels'
import { cn } from '#/lib/utils'

interface PermissionsTableProps {
  permissions: PermissionResponse[]
  /** Absent si l'utilisateur n'a pas le droit de modifier une permission. */
  onSelect?: (permission: PermissionResponse) => void
  selectedId?: number
  isLoading?: boolean
  error?: unknown
  forbidden?: boolean
  filtering?: boolean
  onReset?: () => void
  onRetry?: () => void
}

export function PermissionsTable({
  permissions,
  onSelect,
  selectedId,
  isLoading = false,
  error,
  forbidden,
  filtering = false,
  onReset,
  onRetry,
}: PermissionsTableProps) {
  const cols = onSelect ? 3 : 2
  return (
    <DataTableCard>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <DataTableHead first>Permission</DataTableHead>
            <DataTableHead>Ce que ça autorise</DataTableHead>
            {onSelect && <DataTableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows columns={[48, 96]} trailing={!!onSelect} />
          ) : error ? (
            <TableErrorState
              colSpan={cols}
              forbidden={forbidden}
              title="Impossible de charger les permissions."
              action={
                onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Réessayer
                  </Button>
                )
              }
            />
          ) : permissions.length === 0 ? (
            <TableEmptyState
              colSpan={cols}
              icon={KeyRound}
              title={
                filtering
                  ? 'Aucune permission ne correspond à votre recherche.'
                  : 'Aucune permission pour le moment.'
              }
              action={
                filtering && onReset ? (
                  <button
                    type="button"
                    onClick={onReset}
                    className="text-[13px] font-semibold text-primary hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                ) : undefined
              }
            />
          ) : (
            permissions.map((permission) => {
              const cells = (
                <>
                  <TableCell
                    className={cn(FIRST_CELL_CLASS, 'w-[300px] align-top')}
                  >
                    <div className="font-semibold">
                      {permissionLabel(permission.name)}
                    </div>
                    <div className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                      {permission.name}
                    </div>
                  </TableCell>
                  <TableCell className="align-top leading-relaxed whitespace-normal text-muted-foreground">
                    {permissionDescription(permission.name)}
                  </TableCell>
                </>
              )
              return onSelect ? (
                <ClickableRow
                  key={permission.id}
                  aria-label={`Modifier la permission ${permission.name}`}
                  onActivate={() => onSelect(permission)}
                  className={cn(selectedId === permission.id && 'bg-primary/5')}
                >
                  {cells}
                  <RowChevron />
                </ClickableRow>
              ) : (
                <TableRow key={permission.id} className="hover:bg-[#f6f8fc]">
                  {cells}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </DataTableCard>
  )
}
