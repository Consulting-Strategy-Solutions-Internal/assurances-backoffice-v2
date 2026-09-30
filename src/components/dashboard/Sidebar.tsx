import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronsUpDown,
  FilePenLine,
  FileText,
  HandCoins,
  Headset,
  LayoutDashboard,
  LogOut,
  Package,
  Share2,
  ShieldCheck,
  TriangleAlert,
  User,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePermissions } from './use-permissions'
import { getSupportUnreadCount, supportKeys } from '#/services/support'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '#/components/ui/sheet'
import { cn } from '#/lib/utils'
import { useShell } from './shell'

const SECTION_LABEL =
  'px-3 pb-2 text-[10.5px] font-bold tracking-[0.1em] text-muted-foreground uppercase'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: string
  alsoMatch?: string[]
}

const PILOTAGE: NavItem[] = [
  { to: '/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: '/sinistres', label: 'Sinistres', icon: TriangleAlert },
  { to: '/clients', label: 'Clients', icon: Users },
]

interface NavChild {
  to: string
  label: string
  /** Stay highlighted on sub-paths (tabs in the URL). */
  matchChildren?: boolean
  /** Nested collapsible sub-group; `to` is then its base path. */
  children?: NavChild[]
}

const PRODUITS_CHILDREN: NavChild[] = [
  {
    to: '/produits-ia',
    label: 'Individuel Accidents',
    children: [
      {
        to: '/produits-ia/ia-standard',
        label: 'IA Standard',
        matchChildren: true,
      },
      { to: '/produits-ia/ia-pour-tous', label: 'IA Pour Tous' },
    ],
  },
]

const CONTRATS_CHILDREN: NavChild[] = [
  {
    to: '/contrats/modifications',
    label: 'Modifications',
    matchChildren: true,
  },
]

const COMMISSIONS_CHILDREN = [
  { to: '/commissions/schemes', label: 'Schémas' },
  { to: '/commissions/distributions', label: 'Distributions' },
  { to: '/commissions/wallets', label: 'Portefeuilles' },
]

const RESEAU: NavItem[] = [
  { to: '/partners', label: 'Partenaires', icon: Share2 },
  { to: '/users', label: 'Administrateurs', icon: UserCog },
  {
    to: '/roles',
    label: 'Rôles & permissions',
    icon: ShieldCheck,
    alsoMatch: ['/permissions'],
  },
]

/** Collapsible sidebar section: a parent row that toggles a list of children. */
function CollapsibleNavGroup({
  icon: Icon,
  label,
  basePath,
  items,
  pathname,
}: {
  icon: LucideIcon
  label: string
  basePath: string | string[]
  items: NavChild[]
  pathname: string
}) {
  const groupActive = (Array.isArray(basePath) ? basePath : [basePath]).some(
    (p) => pathname.startsWith(p),
  )
  const [open, setOpen] = useState(groupActive)
  // Deep link / navigation into the group: open it.
  useEffect(() => {
    if (groupActive) setOpen(true)
  }, [groupActive])
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'h-auto w-full justify-start gap-3 rounded-[10px] px-[13px] py-[10px] text-[14px] font-medium tracking-[-0.01em]',
          groupActive &&
            'font-semibold text-primary hover:bg-primary/[0.07] hover:text-primary',
        )}
      >
        <Icon
          className={cn(
            'size-[18px]',
            groupActive ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </Button>
      {open && (
        <div className="my-0.5 ml-[27px] flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
          {items.map((c) =>
            c.children ? (
              <NavSubGroup key={c.to} group={c} pathname={pathname} />
            ) : (
              <NavChildLink key={c.to} item={c} pathname={pathname} />
            ),
          )}
        </div>
      )}
    </>
  )
}

function NavChildLink({
  item,
  pathname,
}: {
  item: NavChild
  pathname: string
}) {
  const active =
    pathname === item.to ||
    (!!item.matchChildren && pathname.startsWith(`${item.to}/`))
  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        'h-auto w-full justify-start rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium text-muted-foreground',
        active &&
          'bg-primary/[0.07] font-semibold text-primary hover:bg-primary/[0.07] hover:text-primary',
      )}
    >
      <Link to={item.to} aria-current={active ? 'page' : undefined}>
        {item.label}
      </Link>
    </Button>
  )
}

/** Second-level collapsible entry inside a group (e.g. Produits → Individuel Accidents). */
function NavSubGroup({
  group,
  pathname,
}: {
  group: NavChild
  pathname: string
}) {
  const active = pathname.startsWith(group.to)
  const [open, setOpen] = useState(active)
  useEffect(() => {
    if (active) setOpen(true)
  }, [active])
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'h-auto w-full justify-start rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium text-muted-foreground',
          active && 'font-semibold text-primary hover:text-primary',
        )}
      >
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
        />
      </Button>
      {open && (
        <div className="ml-2.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
          {(group.children ?? []).map((c) => (
            <NavChildLink key={c.to} item={c} pathname={pathname} />
          ))}
        </div>
      )}
    </>
  )
}

export function Sidebar({
  user,
  onLogout,
}: {
  user?: { firstName: string; lastName: string; role: string }
  onLogout: () => void
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { navOpen, setNavOpen } = useShell()
  // The mobile drawer is only CSS-hidden at ≥ lg: if it stays open while the
  // window is widened, Radix keeps the body scroll-locked and inert. Close it.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (wide.matches) setNavOpen(false)
    }
    onChange()
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [setNavOpen])

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setNavOpen(false)
  }, [pathname, setNavOpen])
  const isAdmin = user?.role.toUpperCase() === 'ADMIN'
  // Droit inconnu = refus : le menu n'apparaît que si le droit est accordé (L-005).
  const { canKnown } = usePermissions()

  // Badge de messages support non lus — la file est commune à tous les
  // agents ; en cas de rôle sans `support:write` la requête échoue en
  // silence et le badge reste absent.
  const { data: supportUnread } = useQuery({
    queryKey: supportKeys.unread,
    queryFn: getSupportUnreadCount,
    refetchInterval: 30_000,
    retry: false,
  })
  const supportItem: NavItem = {
    to: '/support',
    label: 'Support client',
    icon: Headset,
    ...(supportUnread ? { badge: String(supportUnread) } : {}),
  }

  const isActive = (item: NavItem) =>
    pathname.startsWith(item.to) ||
    (item.alsoMatch?.some((p) => pathname.startsWith(p)) ?? false)

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : ''

  const renderItem = (item: NavItem) => {
    const active = isActive(item)
    const Icon = item.icon
    return (
      <Button
        key={item.to}
        asChild
        variant="ghost"
        className={cn(
          'h-auto w-full justify-start gap-3 rounded-[10px] px-[13px] py-[10px] text-[14px] font-medium tracking-[-0.01em]',
          active &&
            'bg-primary/[0.07] font-semibold text-primary hover:bg-primary/[0.07] hover:text-primary',
        )}
      >
        <Link to={item.to} aria-current={active ? 'page' : undefined}>
          <Icon
            className={cn(
              'size-[18px]',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <Badge className="rounded-full border-transparent bg-[#ffc61e]/25 px-2 py-px text-[11px] font-bold text-[#8a6600]">
              {item.badge}
            </Badge>
          )}
        </Link>
      </Button>
    )
  }

  const content = (
    <div className="flex h-full flex-col bg-sidebar px-[14px] py-5 text-sidebar-foreground">
      <div className="flex items-center gap-[11px] px-2 pt-1.5 pb-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary shadow-[0_4px_12px_rgba(0,51,127,0.25)]">
          <span className="text-[18px] font-extrabold tracking-[-0.03em] text-[#FFC61E]">
            N
          </span>
        </div>
        <div className="leading-[1.05]">
          <div className="text-[15.5px] font-extrabold tracking-[0.01em] text-primary">
            NSIA
          </div>
          <div className="text-[10.5px] font-bold tracking-[0.13em] text-muted-foreground">
            ASSURANCES
          </div>
        </div>
      </div>

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
        <div className={cn(SECTION_LABEL, 'pt-2')}>Pilotage</div>
        <nav className="flex flex-col gap-[3px]">
          {PILOTAGE.filter((item) => item.to !== '/sinistres' || isAdmin).map(
            renderItem,
          )}
          {renderItem(supportItem)}

          {renderItem({ to: '/cotations', label: 'Cotations', icon: FileText })}

          {canKnown('amendment:read-all') && (
            <CollapsibleNavGroup
              icon={FilePenLine}
              label="Contrats"
              basePath="/contrats"
              items={CONTRATS_CHILDREN}
              pathname={pathname}
            />
          )}

          <CollapsibleNavGroup
            icon={Package}
            label="Produits"
            basePath="/produits-ia"
            items={PRODUITS_CHILDREN}
            pathname={pathname}
          />

          <CollapsibleNavGroup
            icon={HandCoins}
            label="Commissions"
            basePath="/commissions"
            items={COMMISSIONS_CHILDREN}
            pathname={pathname}
          />
        </nav>

        <div className={cn(SECTION_LABEL, 'pt-[22px]')}>Réseau &amp; admin</div>
        <nav className="flex flex-col gap-[3px]">{RESEAU.map(renderItem)}</nav>
      </div>

      <div className="border-t border-sidebar-border px-1.5 pt-3.5 pb-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-[11px] rounded-[11px] p-1.5 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Avatar className="size-[38px]">
                <AvatarFallback className="bg-primary text-[13px] font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-[1.25]">
                <div className="truncate text-[13.5px] font-bold text-primary">
                  {fullName}
                </div>
                <div className="text-[11.5px] text-muted-foreground">
                  {user?.role ?? ''}
                </div>
              </div>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[214px]">
            <DropdownMenuItem asChild>
              <Link to="/profil">
                <User className="size-4" />
                Mon profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onLogout}>
              <LogOut className="size-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden h-dvh w-64 shrink-0 border-r border-sidebar-border lg:block">
        {content}
      </aside>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-64 max-w-[85vw] gap-0 p-0 sm:max-w-[85vw] lg:hidden"
        >
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          {content}
        </SheetContent>
      </Sheet>
    </>
  )
}
