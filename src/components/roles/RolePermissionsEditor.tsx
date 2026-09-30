import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { PermissionResponse, RoleResponse } from '#/services/roles'
import {
  addPermissionToRole,
  getPermissions,
  removePermissionFromRole,
} from '#/services/roles'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { PermissionMatrix } from '#/components/roles/PermissionMatrix'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { useAllUsers } from '#/components/users/use-all-users'
import { formatRoleName } from '#/lib/admin-roles'
import { permissionLabel } from '#/lib/permission-labels'

/**
 * Remplace le rôle `updated` dans une liste en cache — `{ content }`
 * (`['roles-all']`) ou `{ items }` (`['roles', 'all-pages']`). Toute autre
 * forme est rendue telle quelle.
 */
export function replaceRoleInCache<T>(data: T, updated: RoleResponse): T {
  if (!data || typeof data !== 'object') return data
  const swap = (list: unknown): unknown =>
    Array.isArray(list)
      ? list.map((r: RoleResponse) => (r.id === updated.id ? updated : r))
      : list
  const record = data as { content?: unknown; items?: unknown }
  if ('content' in record) return { ...data, content: swap(record.content) }
  if ('items' in record) return { ...data, items: swap(record.items) }
  return data
}

interface RolePermissionsEditorProps {
  role: RoleResponse
  /** Rôle de l'utilisateur connecté : garde-fou contre l'auto-verrouillage. */
  isOwnRole?: boolean
}

/**
 * Permissions d'un rôle : un clic sur une puce accorde ou retire
 * (`POST|DELETE /roles/{roleId}/permissions/{permissionId}`).
 *
 * Le backend ne connaît pas de permission par utilisateur : tout se joue au
 * niveau du rôle, donc pour tous les comptes qui le portent — y compris
 * l'utilisateur connecté, ce qui lui permet de s'attribuer une permission.
 */
export function RolePermissionsEditor({
  role,
  isOwnRole,
}: RolePermissionsEditorProps) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const editable = can('iam:write')

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions-all'],
    queryFn: () => getPermissions(0, 200),
    retry: false,
  })

  const granted = role.permissions
  // Union catalogue + accordées : si `/permissions` n'est pas lisible, on
  // affiche au moins ce que le rôle possède déjà.
  const byId = new Map<number, PermissionResponse>()
  for (const p of [...(permissionsData?.content ?? []), ...granted])
    byId.set(p.id, p)
  const catalog = [...byId.values()]
  const grantedIds = new Set(granted.map((p) => p.id))

  function onMutationError(error: unknown) {
    if (isAxiosError(error) && error.response?.status === 403)
      toast.error(
        "Vous n'avez pas les droits requis (Rôles & accès — Modifier).",
      )
    else toast.error('La mise à jour des permissions a échoué.')
  }

  // Dernier état du rôle renvoyé par le serveur : sert d'état de référence à
  // l'annulation tant que le cache n'a pas fini de se rafraîchir (L-004).
  const latestRole = useRef<RoleResponse | null>(null)

  function onMutationSuccess(updated: RoleResponse) {
    latestRole.current = updated
    // On écrit la réponse du serveur dans le cache AVANT de proposer
    // « Annuler » : sinon l'annulation lirait l'état d'avant la mutation.
    for (const queryKey of [['roles-all'], ['roles']])
      queryClient.setQueriesData({ queryKey }, (data: unknown) =>
        replaceRoleInCache(data, updated),
      )
    void queryClient.invalidateQueries({ queryKey: ['roles-all'] })
    void queryClient.invalidateQueries({ queryKey: ['roles'] })
  }

  interface MutationVars {
    permissionId: number
    name: string
    /** Faux pour une annulation : pas de nouvelle annulation en chaîne. */
    undoable?: boolean
  }

  const grant = useMutation({
    mutationFn: ({ permissionId }: MutationVars) =>
      addPermissionToRole(role.id, permissionId),
    onSuccess: (result, vars) => {
      onMutationSuccess(result)
      toast.success(
        `« ${permissionLabel(vars.name)} » accordée au rôle ${formatRoleName(role.name)}.`,
        vars.undoable === false
          ? undefined
          : {
              duration: 8000,
              action: {
                label: 'Annuler',
                onClick: () => undo(vars.permissionId, vars.name, false),
              },
            },
      )
    },
    onError: onMutationError,
  })

  const revoke = useMutation({
    mutationFn: ({ permissionId }: MutationVars) =>
      removePermissionFromRole(role.id, permissionId),
    onSuccess: (result, vars) => {
      onMutationSuccess(result)
      toast.success(
        `« ${permissionLabel(vars.name)} » retirée du rôle ${formatRoleName(role.name)}.`,
        vars.undoable === false
          ? undefined
          : {
              duration: 8000,
              action: {
                label: 'Annuler',
                onClick: () => undo(vars.permissionId, vars.name, true),
              },
            },
      )
    },
    onError: onMutationError,
  })

  const pending = grant.isPending || revoke.isPending

  // Nombre de comptes touchés : tous ceux qui portent ce rôle.
  const { data: usersData } = useAllUsers()
  const accounts = usersData
    ? usersData.items.filter(
        (u) => u.role.toLowerCase() === role.name.toLowerCase(),
      ).length
    : null
  const [confirm, setConfirm] = useState<{
    permission: PermissionResponse
    isGranted: boolean
  } | null>(null)

  // Le POST n'est pas idempotent : on relit le cache avant d'accorder à
  // nouveau (annulation d'un retrait), pour ne jamais créer de double lien.
  function currentlyGranted(permissionId: number): boolean {
    const fresh =
      queryClient
        .getQueryData<{ content: RoleResponse[] }>(['roles-all'])
        ?.content.find((r) => r.id === role.id) ??
      (latestRole.current?.id === role.id ? latestRole.current : undefined)
    return (fresh ?? role).permissions.some((p) => p.id === permissionId)
  }

  // wasGranted = la permission était accordée avant l'action à annuler.
  function undo(permissionId: number, name: string, wasGranted: boolean) {
    const vars = { permissionId, name, undoable: false }
    const label = `« ${permissionLabel(name)} »`
    if (wasGranted) {
      if (currentlyGranted(permissionId))
        toast.info(
          `Annulation ignorée : ${label} est déjà accordée au rôle ${formatRoleName(role.name)}.`,
        )
      else grant.mutate(vars)
    } else if (currentlyGranted(permissionId)) {
      revoke.mutate(vars)
    } else {
      toast.info(
        `Annulation ignorée : ${label} n'est déjà plus accordée au rôle ${formatRoleName(role.name)}.`,
      )
    }
  }

  const scope =
    accounts === null
      ? 'tous les comptes ayant ce rôle'
      : accounts === 0
        ? 'aucun compte pour l’instant (aucun ne porte ce rôle)'
        : `${accounts} compte${accounts > 1 ? 's' : ''}`

  return (
    <>
      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.isGranted
            ? 'Retirer cette permission ?'
            : 'Accorder cette permission ?'
        }
        description={
          confirm
            ? `« ${permissionLabel(confirm.permission.name)} » sera ${confirm.isGranted ? 'retirée du' : 'accordée au'} rôle ${formatRoleName(role.name)}. Cela concerne ${scope}${isOwnRole ? ', y compris le vôtre' : ''}, immédiatement. Vous pourrez annuler juste après.`
            : undefined
        }
        confirmLabel={confirm?.isGranted ? 'Retirer' : 'Accorder'}
        destructive={confirm?.isGranted}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
        onConfirm={() => {
          if (!confirm) return
          const { permission, isGranted } = confirm
          // Le POST n'est pas idempotent : on n'accorde que ce qui ne l'est pas.
          if (!isGranted && grantedIds.has(permission.id)) {
            setConfirm(null)
            return
          }
          ;(isGranted ? revoke : grant).mutate(
            { permissionId: permission.id, name: permission.name },
            { onSettled: () => setConfirm(null) },
          )
        }}
      />
      <PermissionMatrix
        catalog={catalog}
        grantedIds={grantedIds}
        editable={editable}
        resetKey={role.id}
        pending={pending}
        busyId={grant.variables?.permissionId ?? revoke.variables?.permissionId}
        lockedName={isOwnRole ? 'iam:write' : undefined}
        lockedReason="Retirer cette permission de votre propre rôle vous ferait perdre la gestion des accès."
        onToggle={(permission, isGranted) =>
          setConfirm({ permission, isGranted })
        }
        note={
          <div className="mt-3.5 flex gap-2.5 rounded-[10px] bg-muted/60 p-3">
            <ShieldAlert className="mt-px size-4 shrink-0 text-muted-foreground" />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              {editable
                ? 'Cliquez sur une permission pour l’accorder ou la retirer (une confirmation est demandée). '
                : 'Vous n’avez pas les droits requis (Rôles & accès — Modifier) pour les modifier. '}
              Elles sont portées par le rôle : toute modification s'applique à{' '}
              <strong>tous</strong> les comptes ayant le rôle{' '}
              {formatRoleName(role.name)}
              {isOwnRole && ', y compris vous'}.
            </p>
          </div>
        }
      />
    </>
  )
}
