import type { PermissionResponse } from '#/services/roles'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

const headCls = 'h-auto bg-[#fafbfc] px-3 py-3 pl-[22px] text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

interface PermissionsTableProps {
  permissions: PermissionResponse[]
}

export function PermissionsTable({ permissions }: PermissionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={headCls}>Permission</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissions.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell className="py-9 text-center text-[13.5px] text-muted-foreground">
              Aucune permission ne correspond à votre recherche.
            </TableCell>
          </TableRow>
        ) : (
          permissions.map((permission) => (
            <TableRow key={permission.id}>
              <TableCell className="py-3.5 pl-[22px] text-[13.5px] font-medium">
                {permission.name}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
