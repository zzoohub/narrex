import { createFileRoute, Outlet } from '@tanstack/solid-router'
import { useAuth } from '@/shared/stores/auth'
import { Show } from 'solid-js'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { state } = useAuth()

  return (
    <Show
      when={state() !== 'loading'}
      fallback={<AuthLoadingScreen />}
    >
      <Show
        when={state() === 'authenticated'}
        fallback={<RedirectToLogin />}
      >
        <Outlet />
      </Show>
    </Show>
  )
}

function AuthLoadingScreen() {
  return (
    <div class="flex min-h-screen items-center justify-center bg-canvas">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )
}

function RedirectToLogin() {
  // Client-side redirect to /login
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
  return null
}
