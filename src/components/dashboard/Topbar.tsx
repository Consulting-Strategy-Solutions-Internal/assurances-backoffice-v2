import { Bell, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useShell } from './shell'
import type { Period } from './shell'

const PERIODS: Period[] = ['Jour', 'Mois', 'Trimestre', 'Année']

export function Topbar() {
  const { search, setSearch, period, setPeriod } = useShell()

  return (
    <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-[#e7eaf0] bg-background/80 px-[34px] py-[15px] backdrop-blur-[10px]">
      <div className="relative w-[330px]">
        <Search className="pointer-events-none absolute top-1/2 left-[13px] size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client, un sinistre…"
          className="h-10 rounded-[11px] bg-card pl-9 text-[13.5px]"
        />
      </div>

      <div className="flex-1" />

      <Tabs
        value={period}
        onValueChange={(v) => {
          setPeriod(v as Period)
          toast('Période : ' + v)
        }}
      >
        <TabsList className="h-auto rounded-[11px] border bg-card p-[3px]">
          {PERIODS.map((p) => (
            <TabsTrigger
              key={p}
              value={p}
              className="rounded-lg px-[13px] py-1.5 text-[12.5px] font-semibold text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none!"
            >
              {p}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Button
        variant="outline"
        size="icon"
        aria-label="Notifications"
        onClick={() => toast('3 nouvelles notifications')}
        className="relative size-[41px] rounded-[11px] bg-card"
      >
        <Bell className="size-[18px] text-[#3a4150]" />
        <span className="absolute top-[9px] right-[11px] size-[7px] rounded-full border-[1.5px] border-card bg-[#FFC61E]" />
      </Button>
    </div>
  )
}
