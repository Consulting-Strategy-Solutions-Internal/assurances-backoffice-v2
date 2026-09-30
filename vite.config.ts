import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig(({ mode, command }) => {
  // Dev only: VITE_API_URL=http://localhost:3000/api + API_PROXY_TARGET=https://… in .env.local
  // proxies API calls to a remote backend (avoids CORS and SameSite cookies).
  // `serve` only: a `pnpm build` must never bake the proxy (it strips Origin/Referer).
  const proxyTarget =
    command === 'serve'
      ? loadEnv(mode, process.cwd(), '').API_PROXY_TARGET
      : undefined
  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      tailwindcss(),
      tanstackStart(),
      ...(mode === 'test'
        ? []
        : [
            nitro(
              proxyTarget
                ? {
                    routeRules: {
                      '/api/**': {
                        proxy: {
                          to: `${proxyTarget}/api/**`,
                          // The backend's CORS rejects the localhost Origin.
                          filterHeaders: ['origin', 'referer'],
                        },
                      },
                    },
                  }
                : undefined,
            ),
          ]),
      viteReact(),
    ],
  }
})

export default config
