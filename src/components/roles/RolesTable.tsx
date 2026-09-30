import { translateRoleDescription } from '#/lib/backend-messages'
import { ShieldCheck } from 'lucide-react'
import type { RoleResponse } from '#/services/roles'
import { EntityAvatar } from '#/components/layout/EntityAvatar'
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
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { permissionLabel } from '#/lib/permission-labels'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'
import { formatRoleName } from '#/lib/admin-roles'
import { TruncatedText } from '#/components/layout/TruncatedText'

interface RolesTableProps {
  roles: RoleResponse[]
  onSelect: (role: RoleResponse) => void
  selectedId?: number
  isLoading?: boolean
  error?: unknown
  forbidden?: boolean
  filtering?: boolean
  onReset?: () => void
  onRetry?: () => void
}

const COLS = 4
/** Nombre de permissions listées dans la ligne ; le reste passe en « +N ». */
const VISIBLE_PERMISSIONS = 4

export function RolesTable({
  roles,
  onSelect,
  selectedId,
  isLoading = false,
  error,
  forbidden,
  filtering = false,
  onReset,
  onRetry,
}: RolesTableProps) {
  return (
    <DataTableCard>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <DataTableHead first>Rôle</DataTableHead>
            <DataTableHead className="w-[110px]">Permissions</DataTableHead>
            <DataTableHead>Accès accordés</DataTableHead>
            <DataTableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows
              columns={[44, 12, 80]}
              leading="avatar"
              rows={6}
              trailing
            />
          ) : error ? (
            <TableErrorState
              colSpan={COLS}
              forbidden={forbidden}
              title="Impossible de charger les rôles."
              action={
                onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Réessayer
                  </Button>
                )
              }
            />
          ) : roles.length === 0 ? (
            <TableEmptyState
              colSpan={COLS}
              icon={ShieldCheck}
              title={
                filtering
                  ? 'Aucun rôle ne correspond à votre recherche.'
                  : 'Aucun rôle pour le moment.'
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
            roles.map((role) => (
              <ClickableRow
                key={role.id}
                aria-label={`Voir le rôle ${formatRoleName(role.name)}`}
                onActivate={() => onSelect(role)}
                className={cn(selectedId === role.id && 'bg-primary/5')}
              >
                <TableCell className={cn(FIRST_CELL_CLASS, 'max-w-[320px]')}>
                  <div className="flex items-center gap-3">
                    <EntityAvatar name={formatRoleName(role.name)} />
                    <div className="min-w-0">
                      <TruncatedText className="font-semibold">
                        {formatRoleName(role.name)}
                      </TruncatedText>
                      <TruncatedText className="text-[12px] text-muted-foreground">
                        {translateRoleDescription(role.description) ||
                          'Aucune description'}
                      </TruncatedText>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-semibold tabular-nums">
                  {role.permissions.length}
                </TableCell>
                <TableCell>
                  {role.permissions.length === 0 ? (
                    <span className="text-muted-foreground">
                      Aucune permission
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions
                        .slice(0, VISIBLE_PERMISSIONS)
                        .map((p) => (
                          <Badge
                            key={p.id}
                            variant="secondary"
                            className="rounded-md px-2 py-0.5 text-[11.5px] font-medium"
                            title={p.name}
                          >
                            {permissionLabel(p.name)}
                          </Badge>
                        ))}
                      {role.permissions.length > VISIBLE_PERMISSIONS && (
                        <Badge
                          variant="outline"
                          className="rounded-md px-2 py-0.5 text-[11.5px] font-semibold text-muted-foreground"
                          title={role.permissions
                            .slice(VISIBLE_PERMISSIONS)
                            .map((p) => permissionLabel(p.name))
                            .join(', ')}
                        >
                          +{role.permissions.length - VISIBLE_PERMISSIONS}
                        </Badge>
                      )}
                    </div>
                  )}
                </TableCell>
                <RowChevron />
              </ClickableRow>
            ))
          )}
        </TableBody>
      </Table>
    </DataTableCard>
  )
}
