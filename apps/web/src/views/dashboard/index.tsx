import { createResource, createSignal, For, onCleanup, Show, Suspense } from 'solid-js'
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
  IconTrash,
  IconSettings,
  IconLogOut,
  ContextMenu,
  Dialog,
} from '@/shared/ui'
import { listProjects, deleteProject } from '@/entities/project'
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

  // ── Profile dropdown ──
  const [avatarImgFailed, setAvatarImgFailed] = createSignal(false)
  const [profileOpen, setProfileOpen] = createSignal(false)
  let profileRef: HTMLDivElement | undefined

  const handleOutsideClick = (e: MouseEvent) => {
    if (profileOpen() && profileRef && !profileRef.contains(e.target as Node)) {
      setProfileOpen(false)
    }
  }
  const handleEscape = (e: KeyboardEvent) => {
    if (profileOpen() && e.key === 'Escape') setProfileOpen(false)
  }
  document.addEventListener('mousedown', handleOutsideClick, true)
  document.addEventListener('keydown', handleEscape, true)
  onCleanup(() => {
    document.removeEventListener('mousedown', handleOutsideClick, true)
    document.removeEventListener('keydown', handleEscape, true)
  })

  // ── Responsive check ──
  const [isMobile, setIsMobile] = createSignal(false)
  if (typeof window !== 'undefined') {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    onCleanup(() => window.removeEventListener('resize', check))
  }

  // ── Delete project ──
  const [deleteTarget, setDeleteTarget] = createSignal<ProjectSummary | null>(null)

  async function handleDeleteConfirm() {
    const target = deleteTarget()
    if (!target) return
    setDeleteTarget(null)
    await deleteProject(target.id)
    refetch()
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
            <div ref={profileRef} class="relative">
              <button
                type="button"
                class="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
                aria-label={t('nav.account')}
                onClick={() => setProfileOpen((v) => !v)}
                title={user()?.displayName ?? ''}
              >
                <Show
                  when={user()?.profileImageUrl && !avatarImgFailed()}
                  fallback={<IconUser size={18} />}
                >
                  <img
                    src={user()!.profileImageUrl!}
                    alt=""
                    class="w-5 h-5 rounded-full"
                    onError={() => setAvatarImgFailed(true)}
                  />
                </Show>
              </button>

              <Show when={profileOpen()}>
                <div class="absolute right-0 top-full mt-1 w-56 py-1.5 rounded-lg bg-surface-raised border border-border-default shadow-xl shadow-black/30 animate-scale-in origin-top-right z-50">
                  <div class="px-3 py-2 flex items-center gap-3">
                    <Show
                      when={user()?.profileImageUrl && !avatarImgFailed()}
                      fallback={
                        <div class="w-9 h-9 rounded-full bg-accent text-canvas flex items-center justify-center font-display font-semibold text-sm shrink-0">
                          {(user()?.displayName ?? user()?.email ?? '?').charAt(0).toUpperCase()}
                        </div>
                      }
                    >
                      <img
                        src={user()!.profileImageUrl!}
                        alt=""
                        class="w-9 h-9 rounded-full object-cover shrink-0"
                        onError={() => setAvatarImgFailed(true)}
                      />
                    </Show>
                    <div class="min-w-0">
                      <Show when={user()?.displayName}>
                        <p class="text-sm font-medium text-fg truncate">{user()!.displayName}</p>
                      </Show>
                      <p class="text-xs text-fg-muted truncate">{user()?.email}</p>
                    </div>
                  </div>
                  <div class="my-1 mx-2 h-px bg-border-default" />
                  <Link
                    to="/settings"
                    class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-fg hover:bg-surface transition-colors cursor-pointer"
                    onClick={() => setProfileOpen(false)}
                  >
                    <IconSettings size={14} />
                    {t('nav.settings')}
                  </Link>
                  <div class="my-1 mx-2 h-px bg-border-default" />
                  <button
                    type="button"
                    class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-fg hover:bg-surface transition-colors cursor-pointer"
                    onClick={() => {
                      setProfileOpen(false)
                      void logout()
                    }}
                  >
                    <IconLogOut size={14} />
                    {t('nav.logout')}
                  </button>
                </div>
              </Show>
            </div>
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
          <Show when={!projects.loading && (projects()?.length ?? 0) > 0}>
            <Link to="/new">
              <Button variant="primary" icon={<IconPlus size={16} />}>
                {t('dashboard.newProject')}
              </Button>
            </Link>
          </Show>
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
                  <ContextMenu
                    items={[
                      {
                        label: t('common.delete'),
                        icon: <IconTrash size={14} />,
                        danger: true,
                        onClick: () => setDeleteTarget(project),
                      },
                    ]}
                  >
                    <div data-project-card={project.id}>
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
                    </div>
                  </ContextMenu>
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

      {/* ── Delete confirmation dialog ─────────────────────────────── */}
      <Dialog
        open={deleteTarget() !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('dashboard.deleteConfirmTitle', { title: deleteTarget()?.title ?? '' })}
        description={t('dashboard.deleteConfirmDescription')}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
      />
    </div>
    </Show>
  )
}
