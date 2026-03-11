import { createFileRoute } from '@tanstack/solid-router'
import { Show } from 'solid-js'
import { useAuth } from '@/shared/stores/auth'
import { ProjectCreationView } from '@/views/project-creation'

export const Route = createFileRoute('/new')({ component: AuthGuardedNew })

function AuthGuardedNew() {
  const { state } = useAuth()

  return (
    <Show
      when={state() !== 'loading'}
      fallback={
        <div class="flex min-h-screen items-center justify-center bg-canvas">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <Show
        when={state() === 'authenticated'}
        fallback={<Redirect />}
      >
        <ProjectCreationView />
      </Show>
    </Show>
  )
}

function Redirect() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
  return null
}
