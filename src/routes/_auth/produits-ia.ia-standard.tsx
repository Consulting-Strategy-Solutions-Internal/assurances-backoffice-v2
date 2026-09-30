import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { ScrollShadow } from '#/components/layout/ScrollShadow'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'

export const Route = createFileRoute('/_auth/produits-ia/ia-standard')({
  component: IaStandardLayout,
})

const TABS = [
  {
    to: '/produits-ia/ia-standard/classes',
    value: 'classes',
    label: 'Classes & métiers',
    title: 'Classes de risque et métiers',
    description:
      'Regroupez les métiers assurables par classe de risque ; la classe détermine le barème appliqué.',
  },
  {
    to: '/produits-ia/ia-standard/baremes',
    value: 'baremes',
    label: 'Barèmes',
    title: 'Barèmes de prime',
    description:
      'Taux de prime en ‰ par classe de risque pour le décès, l’invalidité permanente et les frais médicaux.',
  },
  {
    to: '/produits-ia/ia-standard/majorations',
    value: 'majorations',
    label: 'Majorations',
    title: 'Majorations et réductions',
    description:
      'Règles de majoration et de réduction (en %) applicables aux cotations.',
  },
  {
    to: '/produits-ia/ia-standard/accessoires',
    value: 'accessoires',
    label: 'Accessoires',
    title: 'Frais accessoires',
    description: 'Frais d’accessoires par tranche de prime nette.',
  },
  {
    to: '/produits-ia/ia-standard/prorata',
    value: 'prorata',
    label: 'Prorata',
    title: 'Prorata court terme',
    description:
      'Coefficient appliqué à la prime pour les contrats de courte durée.',
  },
  {
    to: '/produits-ia/ia-standard/reglages',
    value: 'reglages',
    label: 'Réglages',
    title: 'Réglages du produit',
    description:
      'Majoration liée à l’âge et politique de réduction du produit IA Standard.',
  },
] as const

function IaStandardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const current = TABS.find((t) => pathname.startsWith(t.to)) ?? TABS[0]
  const active = current.value

  return (
    <>
      <PageHeader
        title={current.title}
        subtitle={`Individuel Accidents · IA Standard — ${current.description}`}
      />
      <Tabs value={active} className="gap-4">
        <ScrollShadow>
          <TabsList className="h-11 gap-1 bg-[#e6ebf3] p-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                asChild
                className="h-full flex-none px-4 text-[13.5px] font-semibold text-foreground/75 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
              >
                <Link to={t.to}>{t.label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollShadow>
        <Outlet />
      </Tabs>
    </>
  )
}
