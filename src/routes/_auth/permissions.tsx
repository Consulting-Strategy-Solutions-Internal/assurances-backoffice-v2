import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { getPermissions } from '#/services/roles'
import { PermissionsTable } from '#/components/permissions/PermissionsTable'
import { Pagination } from '#/components/ui/Pagination'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { useShell } from '#/components/dashboard/shell'

export const Route = createFileRoute('/_auth/permissions')({
  component: PermissionsPage,
})

function PermissionsPage() {
  const { search } = useShell()
  const [page, setPage] = useState(0)

  const { data, isLoading, error } = useQuery({
    queryKey: ['permissions', page],
    queryFn: () => getPermissions(page),
    retry: false,
  })

  if (error) console.error('[permissions]', error)

  const permissions = (data?.content ?? []).filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2 rounded-[10px] text-muted-foreground"
      >
        <Link to="/roles">
          <ArrowLeft />
          Rôles
        </Link>
      </Button>

      <PageHeader
        title="Permissions"
        subtitle="Catalogue des permissions disponibles"
      />

      {isLoading ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        </Card>
      ) : (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <PermissionsTable permissions={permissions} />
          </Card>
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            isLast={data?.last ?? true}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </>
  )
}
