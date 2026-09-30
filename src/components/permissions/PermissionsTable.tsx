import { KeyRound } from 'lucide-react'
import type { PermissionResponse } from '#/services/roles'
import {
  ClickableRow,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  RowChevron,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { Button } from '#/components/ui/button'
import { Table, TableBody, TableHeader, TableRow } from '#/components/ui/table'
import { permissionDescription, permissionLabel } from '#/lib/permission-labels'

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
            <DataTableHead hideBelow="md">Ce que ça autorise</DataTableHead>
            {onSelect && <DataTableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows
              columns={[48, 96]}
              hideBelow={[undefined, 'md']}
              trailing={!!onSelect}
            />
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
                  <DataTableCell
                    first
                    className="align-top @2xl/main:w-[300px]"
                  >
                    <div className="font-semibold">
                      {permissionLabel(permission.name)}
                    </div>
                    <div className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                      {permission.name}
                    </div>
                    <div className="mt-1 text-[12.5px] leading-snug whitespace-normal text-muted-foreground @2xl/main:hidden">
                      <TruncatedText lines={2}>
                        {permissionDescription(permission.name)}
                      </TruncatedText>
                    </div>
                  </DataTableCell>
                  <DataTableCell
                    hideBelow="md"
                    className="align-top leading-relaxed whitespace-normal text-muted-foreground"
                  >
                    {permissionDescription(permission.name)}
                  </DataTableCell>
                </>
              )
              return onSelect ? (
                <ClickableRow
                  key={permission.id}
                  aria-label={`Modifier la permission ${permission.name}`}
                  onActivate={() => onSelect(permission)}
                  selected={selectedId === permission.id}
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
