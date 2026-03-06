import { createSignal, For, Show } from 'solid-js'
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
import type { Project } from '@/shared/types'

/* ── Mock data ───────────────────────────────────────────────────────── */
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: '회귀한 검사의 두 번째 삶',
    genre: '회귀 판타지',
    totalScenes: 14,
    draftedScenes: 6,
    lastEdited: new Date(2026, 2, 6),
  },
  {
    id: '2',
    title: '달빛 아래 피어난 운명',
    genre: '로맨스 판타지',
    totalScenes: 8,
    draftedScenes: 3,
    lastEdited: new Date(2026, 2, 5),
  },
  {
    id: '3',
    title: '무림맹 최강의 제자',
    genre: '무협',
    totalScenes: 20,
    draftedScenes: 12,
    lastEdited: new Date(2026, 2, 1),
  },
]

type ViewState = 'loading' | 'empty' | 'loaded'

export function DashboardView() {
  const { t } = useI18n()
  const { theme, toggle } = useTheme()
  // Change initial state to test: 'loading' | 'empty' | 'loaded'
  const [state, _setState] = createSignal<ViewState>('loaded')

  function formatDate(date: Date) {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
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
          <button
            type="button"
            class="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label={t('nav.account')}
          >
            <IconUser size={18} />
          </button>
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

        {/* ── Loading state ──────────────────────────────────────── */}
        <Show when={state() === 'loading'}>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </Show>

        {/* ── Empty state ────────────────────────────────────────── */}
        <Show when={state() === 'empty'}>
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
        <Show when={state() === 'loaded'}>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <For each={MOCK_PROJECTS}>
              {(project, i) => (
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

                      {/* Genre tag */}
                      <span class="self-start text-xs font-medium px-2 py-0.5 rounded-md bg-accent-muted text-accent">
                        {project.genre}
                      </span>

                      {/* Progress */}
                      <div class="space-y-1.5 pt-1">
                        <div class="flex items-center justify-between text-xs">
                          <span class="text-fg-secondary">
                            {t('dashboard.card.scenes', {
                              drafted: project.draftedScenes,
                              total: project.totalScenes,
                            })}
                          </span>
                          <span class="text-fg-muted">
                            {Math.round(
                              (project.draftedScenes / project.totalScenes) * 100,
                            )}
                            %
                          </span>
                        </div>
                        <div class="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                          <div
                            class="h-full bg-accent rounded-full transition-all duration-500"
                            style={{
                              width: `${(project.draftedScenes / project.totalScenes) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Last edited */}
                      <span class="text-xs text-fg-muted">
                        {t('dashboard.card.lastEdited')}: {formatDate(project.lastEdited)}
                      </span>
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
      </main>
    </div>
  )
}
