import { createResource, createSignal, For, Show, Suspense } from 'solid-js'
import { Link } from '@tanstack/solid-router'
import { useI18n } from '@/shared/lib/i18n'
import { useTheme } from '@/shared/stores/theme'
import {
  Button,
  Card,
  SkeletonCard,
  IconPlus,
  IconUser,
  IconMoon,
  IconSun,
} from '@/shared/ui'
import { listProjects } from '@/entities/project'
import type { ProjectSummary } from '@/entities/project'
import { useAuth } from '@/shared/stores/auth'

export function DashboardView() {
  const { t } = useI18n()
  const { theme, toggle } = useTheme()
  const { state: authState, user, loginWithGoogle, logout } = useAuth()

  const [projects, { refetch }] = createResource(async () => {
    const res = await listProjects()
    return res.data
  })

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // ── Responsive check ──
  const [isMobile, setIsMobile] = createSignal(false)
  if (typeof window !== 'undefined') {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
  }

  return (
    <Show
      when={!isMobile()}
      fallback={
        <div class="h-screen flex items-center justify-center bg-canvas px-8">
          <p class="text-center text-fg-secondary text-sm leading-relaxed">
            Narrex는 데스크톱용으로 설계되었습니다. 더 넓은 화면의 기기를 사용하세요.
          </p>
        </div>
      }
    >
    <div class="min-h-screen bg-canvas">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header class="flex items-center justify-between px-6 h-14 border-b border-border-default bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <h1 class="text-lg font-display font-semibold tracking-tight text-fg">
          Narrex
        </h1>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            class="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            <Show when={theme() === 'dark'} fallback={<IconMoon size={18} />}>
              <IconSun size={18} />
            </Show>
          </button>
          <Show
            when={authState() === 'authenticated'}
            fallback={
              <Button
                variant="ghost"
                size="sm"
                onClick={loginWithGoogle}
              >
                Sign in
              </Button>
            }
          >
            <button
              type="button"
              class="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label={t('nav.account')}
              onClick={logout}
              title={user()?.name ?? ''}
            >
              <Show
                when={user()?.profileImageUrl}
                fallback={<IconUser size={18} />}
              >
                <img
                  src={user()!.profileImageUrl!}
                  alt=""
                  class="w-5 h-5 rounded-full"
                />
              </Show>
            </button>
          </Show>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main class="max-w-5xl mx-auto px-6 py-10">
        {/* Title row */}
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-display font-semibold text-fg">
            {t('dashboard.title')}
          </h2>
          <Link to="/new">
            <Button variant="primary" icon={<IconPlus size={16} />}>
              {t('dashboard.newProject')}
            </Button>
          </Link>
        </div>

        <Suspense
          fallback={
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          }
        >
          {/* ── Loading state ──────────────────────────────────────── */}
          <Show when={projects.loading}>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </Show>

          {/* ── Error state ────────────────────────────────────────── */}
          <Show when={projects.error}>
            <div class="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
              <p class="text-sm text-fg-muted mb-4">
                {t('creation.error')}
              </p>
              <Button variant="secondary" onClick={() => refetch()}>
                {t('creation.errorRetry')}
              </Button>
            </div>
          </Show>

          {/* ── Empty state ────────────────────────────────────────── */}
          <Show when={!projects.loading && !projects.error && projects()?.length === 0}>
            <div class="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
              {/* Illustration placeholder */}
              <div class="w-28 h-28 rounded-3xl bg-surface border border-border-default flex items-center justify-center mb-8">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.2"
                  class="text-fg-muted"
                >
                  <path d="M12 20h9" stroke-linecap="round" />
                  <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <h3 class="text-xl font-display font-semibold text-fg mb-2">
                {t('dashboard.empty.title')}
              </h3>
              <p class="text-sm text-fg-muted mb-8">
                {t('dashboard.empty.description')}
              </p>
              <Link to="/new">
                <Button variant="primary" size="lg" icon={<IconPlus size={18} />}>
                  {t('dashboard.empty.cta')}
                </Button>
              </Link>
            </div>
          </Show>

          {/* ── Loaded state ───────────────────────────────────────── */}
          <Show when={!projects.loading && !projects.error && (projects()?.length ?? 0) > 0}>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <For each={projects()}>
                {(project: ProjectSummary, i) => (
                  <Link
                    to="/project/$id"
                    params={{ id: project.id }}
                    class="block"
                    style={{ "animation-delay": `${i() * 60}ms` }}
                  >
                    <Card interactive class="animate-slide-up h-full">
                      <div class="flex flex-col gap-3">
                        {/* Title */}
                        <h3 class="text-base font-semibold text-fg leading-snug line-clamp-2">
                          {project.title}
                        </h3>

                        {/* Genre tag + progress */}
                        <div class="flex items-center gap-2">
                          <Show when={project.genre}>
                            <span class="text-xs font-medium px-2 py-0.5 rounded-md bg-accent-muted text-accent">
                              {project.genre}
                            </span>
                          </Show>
                          <Show when={project.sceneCount > 0}>
                            <span class="text-xs text-fg-muted">
                              {t('dashboard.card.scenes', {
                                drafted: project.draftedSceneCount,
                                total: project.sceneCount,
                              })}
                            </span>
                          </Show>
                        </div>

                        {/* Progress bar */}
                        <Show when={project.sceneCount > 0}>
                          <div class="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                            <div
                              class="h-full rounded-full bg-accent transition-all duration-300"
                              style={{
                                width: `${Math.round((project.draftedSceneCount / project.sceneCount) * 100)}%`,
                              }}
                            />
                          </div>
                        </Show>

                        {/* Dates */}
                        <div class="flex items-center justify-between text-xs pt-1">
                          <span class="text-fg-muted">
                            {t('dashboard.card.lastEdited')}: {formatDate(project.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                )}
              </For>

              {/* Ghost "new" card */}
              <Link to="/new" class="block">
                <div class="rounded-xl border-2 border-dashed border-border-default h-full min-h-[180px] flex flex-col items-center justify-center gap-2 text-fg-muted hover:border-accent/40 hover:text-accent transition-colors cursor-pointer">
                  <IconPlus size={28} />
                  <span class="text-sm font-medium">
                    {t('dashboard.newProject')}
                  </span>
                </div>
              </Link>
            </div>
          </Show>
        </Suspense>
      </main>
    </div>
    </Show>
  )
}
