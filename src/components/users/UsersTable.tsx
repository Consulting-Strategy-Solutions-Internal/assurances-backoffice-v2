import { ShieldUser } from 'lucide-react'
import type { UserResponse } from '#/services/users'
import { StatusPill } from '#/components/dashboard/StatusPill'
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
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'
import { formatPersonName } from '#/lib/people'
import { formatPhone } from '#/lib/clients'
import { formatRoleName, isPlaceholderPhone } from '#/lib/admin-roles'
import { TruncatedText } from '#/components/layout/TruncatedText'

interface UsersTableProps {
  users: UserResponse[]
  onSelect: (user: UserResponse) => void
  selectedId?: number
  isLoading?: boolean
  error?: unknown
  forbidden?: boolean
  filtering?: boolean
  onReset?: () => void
  onRetry?: () => void
}

const COLS = 5

export function UsersTable({
  users,
  onSelect,
  selectedId,
  isLoading = false,
  error,
  forbidden,
  filtering = false,
  onReset,
  onRetry,
}: UsersTableProps) {
  return (
    <DataTableCard>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <DataTableHead first>Administrateur</DataTableHead>
            <DataTableHead>Rôle</DataTableHead>
            <DataTableHead>Téléphone</DataTableHead>
            <DataTableHead>Email vérifié</DataTableHead>
            <DataTableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows
              columns={[44, 20, 28, 20]}
              leading="avatar"
              trailing
            />
          ) : error ? (
            <TableErrorState
              colSpan={COLS}
              forbidden={forbidden}
              title="Impossible de charger les administrateurs."
              action={
                onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Réessayer
                  </Button>
                )
              }
            />
          ) : users.length === 0 ? (
            <TableEmptyState
              colSpan={COLS}
              icon={ShieldUser}
              title={
                filtering
                  ? 'Aucun administrateur ne correspond à votre recherche.'
                  : 'Aucun administrateur pour le moment.'
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
            users.map((user) => (
              <ClickableRow
                key={user.id}
                aria-label={`Voir ${formatPersonName(user.firstName, user.lastName)}`}
                onActivate={() => onSelect(user)}
                className={cn(selectedId === user.id && 'bg-primary/5')}
              >
                <TableCell className={FIRST_CELL_CLASS}>
                  <div className="flex items-center gap-3">
                    <EntityAvatar
                      name={formatPersonName(user.firstName, user.lastName)}
                    />
                    <div className="min-w-0 max-w-[280px]">
                      <TruncatedText className="font-semibold">
                        {formatPersonName(user.firstName, user.lastName)}
                      </TruncatedText>
                      <TruncatedText className="text-[12px] text-muted-foreground">
                        {user.email}
                      </TruncatedText>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusPill tone="info">
                    {formatRoleName(user.role)}
                  </StatusPill>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {isPlaceholderPhone(user.phoneNumber) ? (
                    <span className="text-muted-foreground">Non renseigné</span>
                  ) : (
                    formatPhone(user.phoneNumber)
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill tone={user.emailVerified ? 'success' : 'warning'}>
                    {user.emailVerified ? 'Vérifié' : 'Non vérifié'}
                  </StatusPill>
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
