import { Menu } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { NotificationsMenu } from '#/components/notifications/NotificationsMenu'
import { GlobalSearch } from '#/components/search/GlobalSearch'
import { useShell } from './shell'

export function Topbar() {
  const { setNavOpen } = useShell()

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-[15px] md:px-[34px] backdrop-blur-[10px]">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Ouvrir le menu"
        className="size-10 shrink-0 rounded-[11px] bg-card lg:hidden"
        onClick={() => setNavOpen(true)}
      >
        <Menu className="size-[18px]" />
      </Button>

      <GlobalSearch />

      <div className="flex-1" />

      <NotificationsMenu />
    </div>
  )
}
