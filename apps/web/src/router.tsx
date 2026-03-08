import { createRouter as createTanStackRouter, ErrorComponent } from '@tanstack/solid-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error }) => {
      const msg = error instanceof Error ? error.message : String(error)
      return (
        <div style={{ padding: '2rem', 'text-align': 'center' }}>
          <h2 style={{ color: '#e55', 'margin-bottom': '1rem' }}>Something went wrong</h2>
          <pre style={{ 'white-space': 'pre-wrap', 'font-size': '0.85rem', color: '#999' }}>{msg}</pre>
        </div>
      )
    },
  })

  return router
}

declare module '@tanstack/solid-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
