import type { ReactNode } from 'react'

const AUTH_BG = '/login-bg.jpg'

/**
 * Shared chrome for the public auth pages (login, forgot-password): full-bleed
 * background, NSIA brand panel, and a right-hand slot for the form card.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${AUTH_BG})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#00255e]/95 via-[#00337f]/80 to-[#00337f]/40" />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Brand panel */}
        <div className="flex flex-1 flex-col justify-between gap-10 p-8 text-white lg:p-14">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[12px] bg-white/15 shadow-[0_4px_14px_rgba(0,0,0,0.25)] backdrop-blur">
              <span className="text-[22px] font-extrabold tracking-[-0.03em] text-[#FFC61E]">
                N
              </span>
            </div>
            <div className="leading-[1.05]">
              <div className="text-[18px] font-extrabold tracking-[0.02em]">
                NSIA
              </div>
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/70">
                ASSURANCES
              </div>
            </div>
          </div>

          <div className="hidden max-w-md lg:block">
            <h1 className="text-[40px] leading-[1.08] font-extrabold tracking-[-0.03em]">
              Votre espace de gestion, au même endroit.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-white/80">
              Pilotez contrats, sinistres, clients et réseau de distribution
              depuis un tableau de bord unique.
            </p>
          </div>

          <div className="text-[12px] text-white/60">
            © 2026 NSIA Assurances. Tous droits réservés.
          </div>
        </div>

        {/* Form panel */}
        <div className="flex w-full items-center justify-center p-6 lg:w-[520px] lg:p-12">
          {children}
        </div>
      </div>
    </div>
  )
}
