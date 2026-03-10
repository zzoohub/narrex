import { createSignal, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Link } from '@tanstack/solid-router'
import { useI18n } from '@/shared/lib/i18n'
import { useTheme, type ThemePreference } from '@/shared/stores/theme'
import { useAuth, updateProfile, deleteAccount, uploadAvatar } from '@/shared/stores/auth'
import { Button, TextInput, Skeleton } from '@/shared/ui'
import { getQuota } from '@/entities/quota'
import type { QuotaInfo } from '@/entities/quota'
import type { Locale } from '@/shared/types'

export function SettingsView() {
  const { t, locale, setLocale } = useI18n()
  const { preference, setPreference } = useTheme()
  const { user, logout } = useAuth()

  // Profile form state
  const [displayName, setDisplayName] = createSignal(user()?.displayName ?? '')
  const [saving, setSaving] = createSignal(false)
  const [saveSuccess, setSaveSuccess] = createSignal(false)
  const [saveError, setSaveError] = createSignal('')
  const [nameError, setNameError] = createSignal('')

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false)
  const [deletePhrase, setDeletePhrase] = createSignal('')
  const [deleting, setDeleting] = createSignal(false)
  const [deleteError, setDeleteError] = createSignal('')

  // Avatar upload state
  let fileInputRef: HTMLInputElement | undefined
  const [avatarUploading, setAvatarUploading] = createSignal(false)
  const [avatarError, setAvatarError] = createSignal('')
  const [avatarImgFailed, setAvatarImgFailed] = createSignal(false)

  // Quota state
  const [quota, setQuota] = createSignal<QuotaInfo | null>(null)
  const [quotaLoading, setQuotaLoading] = createSignal(true)
  const [quotaError, setQuotaError] = createSignal(false)

  onMount(async () => {
    try {
      const res = await getQuota()
      setQuota(res.data)
    } catch {
      setQuotaError(true)
    } finally {
      setQuotaLoading(false)
    }
  })

  const handleAvatarUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    // Reset input so same file can be selected again
    input.value = ''

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError(t('settings.avatar.invalidType'))
      return
    }

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t('settings.avatar.tooLarge'))
      return
    }

    setAvatarError('')
    setAvatarImgFailed(false)
    setAvatarUploading(true)
    try {
      await uploadAvatar(file)
    } catch {
      setAvatarError(t('settings.avatar.error'))
    } finally {
      setAvatarUploading(false)
    }
  }

  // Dirty check for profile form
  const isDirty = () => {
    const u = user()
    if (!u) return false
    return displayName() !== (u.displayName ?? '')
  }

  // Validate display name
  const validateName = () => {
    const name = displayName().trim()
    if (!name) {
      setNameError(t('settings.displayName.errorEmpty'))
      return false
    }
    if (name.length > 50) {
      setNameError(t('settings.displayName.errorLong'))
      return false
    }
    setNameError('')
    return true
  }

  // Save profile
  const saveProfile = async () => {
    if (!validateName()) return
    setSaving(true)
    setSaveError('')
    try {
      await updateProfile({
        displayName: displayName().trim(),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      setSaveError(t('settings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  // Handle theme change (auto-apply + server sync)
  const handleThemeChange = async (pref: ThemePreference) => {
    const prev = preference()
    setPreference(pref)
    try {
      await updateProfile({ themePreference: pref })
    } catch {
      setPreference(prev) // revert on failure
    }
  }

  // Handle language change (auto-apply + server sync)
  const handleLanguageChange = async (lang: Locale) => {
    const prev = locale()
    setLocale(lang)
    try {
      await updateProfile({ languagePreference: lang })
    } catch {
      setLocale(prev) // revert on failure
    }
  }

  // Handle logout
  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  // Handle delete account
  const confirmPhrase = () => t('settings.deleteConfirmPhrase')
  const isPhraseMatch = () => deletePhrase().trim().toLowerCase() === confirmPhrase().toLowerCase()

  const handleDelete = async () => {
    if (!isPhraseMatch()) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount()
      window.location.href = '/login'
    } catch {
      setDeleteError(t('settings.deleteError') ?? 'Failed to delete account')
      setDeleting(false)
    }
  }

  // Avatar initial
  const avatarInitial = () => {
    const name = displayName() || user()?.displayName || user()?.email || '?'
    return name.charAt(0).toUpperCase()
  }

  return (
    <div class="min-h-screen bg-canvas">
      {/* Header */}
      <header class="border-b border-border-default bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div class="max-w-xl mx-auto px-6 h-14 flex items-center">
          <Link to="/" class="text-fg-muted hover:text-fg transition-colors text-sm">
            &larr; {t('settings.back')}
          </Link>
        </div>
      </header>

      <main class="max-w-xl mx-auto px-6 py-10 space-y-8">
        <h1 class="text-2xl font-display font-semibold text-fg">{t('settings.title')}</h1>
        {/* ── Profile Section ── */}
        <section class="bg-surface border border-border-default rounded-xl p-6">
          <h2 class="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-6">
            {t('settings.profile')}
          </h2>

          <div class="space-y-5">
            {/* Avatar with upload */}
            <div class="flex items-center gap-4">
              <button
                type="button"
                class="relative group w-16 h-16 rounded-full border border-border-default overflow-hidden shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                onClick={() => fileInputRef?.click()}
                disabled={avatarUploading()}
                aria-label={t('settings.avatar.upload')}
              >
                <Show
                  when={user()?.profileImageUrl && !avatarImgFailed()}
                  fallback={
                    <div class="w-full h-full bg-accent text-canvas flex items-center justify-center font-display font-semibold text-xl">
                      {avatarInitial()}
                    </div>
                  }
                >
                  <img
                    src={user()!.profileImageUrl!}
                    alt=""
                    class="w-full h-full object-cover"
                    onError={() => setAvatarImgFailed(true)}
                  />
                </Show>
                {/* Hover overlay */}
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span class="text-white text-xs font-medium">{t('settings.avatar.change')}</span>
                </div>
                {/* Uploading spinner overlay */}
                <Show when={avatarUploading()}>
                  <div class="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                </Show>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                onChange={handleAvatarUpload}
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-fg truncate">{displayName() || user()?.displayName}</p>
                <p class="text-xs text-fg-muted truncate">{user()?.email}</p>
                <Show when={avatarError()}>
                  <p class="mt-1 text-xs text-error">{avatarError()}</p>
                </Show>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <TextInput
                label={t('settings.displayName')}
                value={displayName()}
                onInput={(e) => {
                  setDisplayName(e.currentTarget.value)
                  setNameError('')
                }}
                onBlur={validateName}
                placeholder={t('settings.displayName.placeholder')}
                maxLength={50}
              />
              <Show when={nameError()}>
                <p class="mt-1 text-xs text-error">{nameError()}</p>
              </Show>
            </div>

            {/* Email (read-only) */}
            <div>
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('settings.email')}
              </span>
              <p class="mt-1.5 text-sm text-fg-secondary">{user()?.email}</p>
              <p class="mt-1 text-xs text-fg-muted">{t('settings.email.helper')}</p>
            </div>

            {/* Save Button */}
            <div class="flex items-center justify-end gap-3">
              <Show when={saveError()}>
                <p class="text-xs text-error">{saveError()}</p>
              </Show>
              <Button
                variant="primary"
                disabled={!isDirty() || saving()}
                loading={saving()}
                onClick={saveProfile}
              >
                {saveSuccess() ? '\u2713 ' + t('settings.saved') : t('settings.save')}
              </Button>
            </div>
          </div>
        </section>

        {/* ── Preferences Section ── */}
        <section class="bg-surface border border-border-default rounded-xl p-6">
          <h2 class="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-6">
            {t('settings.preferences')}
          </h2>

          <div class="space-y-5">
            {/* Theme Toggle */}
            <div>
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('settings.theme')}
              </span>
              <div
                role="radiogroup"
                aria-label={t('settings.theme')}
                class="mt-2 flex bg-surface-raised rounded-lg p-1"
              >
                {(['system', 'light', 'dark'] as const).map((opt) => (
                  <button
                    role="radio"
                    aria-checked={preference() === opt}
                    class={[
                      'flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-150 cursor-pointer',
                      preference() === opt
                        ? 'bg-accent text-canvas shadow-sm'
                        : 'text-fg-secondary hover:text-fg',
                    ].join(' ')}
                    onClick={() => handleThemeChange(opt)}
                  >
                    {t(`settings.theme.${opt}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Toggle */}
            <div>
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {t('settings.language')}
              </span>
              <div
                role="radiogroup"
                aria-label={t('settings.language')}
                class="mt-2 flex bg-surface-raised rounded-lg p-1"
              >
                {(['ko', 'en'] as const).map((lang) => (
                  <button
                    role="radio"
                    aria-checked={locale() === lang}
                    class={[
                      'flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-150 cursor-pointer',
                      locale() === lang
                        ? 'bg-accent text-canvas shadow-sm'
                        : 'text-fg-secondary hover:text-fg',
                    ].join(' ')}
                    onClick={() => handleLanguageChange(lang)}
                  >
                    {t(`settings.language.${lang}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Usage Section ── */}
        <section class="bg-surface border border-border-default rounded-xl p-6">
          <h2 class="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-6">
            {t('settings.quota')}
          </h2>
          <Show when={!quotaLoading()} fallback={<Skeleton height="60px" />}>
            <Show when={!quotaError()} fallback={<p class="text-sm text-fg-muted">{t('settings.quota.loadError')}</p>}>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-fg-secondary">{t('settings.quota.used')}</span>
                  <span class="text-sm font-medium text-fg">{quota()!.used} / {quota()!.limit}</span>
                </div>
                <div class="h-2 rounded-full bg-surface-raised overflow-hidden">
                  <div
                    class={`h-full rounded-full transition-all ${quota()!.warning ? 'bg-amber-500' : 'bg-accent'}`}
                    style={{ width: `${Math.min(100, (quota()!.used / quota()!.limit) * 100)}%` }}
                  />
                </div>
                <div class="flex items-center justify-between text-xs text-fg-muted">
                  <span>{t('settings.quota.remaining')}: {quota()!.remaining}</span>
                  <span>{t('settings.quota.resetsAt')}: {new Date(quota()!.resetsAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Show>
          </Show>
        </section>

        {/* ── Account Section ── */}
        <section class="bg-surface border border-border-default rounded-xl p-6">
          <h2 class="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-6">
            {t('settings.account')}
          </h2>

          <div class="space-y-4">
            {/* Logout */}
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-fg">{t('settings.logout')}</p>
                <p class="text-xs text-fg-muted">{t('settings.logoutDescription')}</p>
              </div>
              <Button variant="secondary" onClick={handleLogout}>
                {t('settings.logout')}
              </Button>
            </div>

            <div class="h-px bg-border-default" />

            {/* Delete Account */}
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-fg">{t('settings.deleteAccount')}</p>
                <p class="text-xs text-fg-muted">{t('settings.deleteDescription')}</p>
              </div>
              <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
                {t('settings.deleteAccount')}
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Delete Confirmation Dialog */}
      <Show when={showDeleteDialog()}>
        <Portal>
          <div class="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm" onClick={() => !deleting() && setShowDeleteDialog(false)} />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            class="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md rounded-xl border border-border-default bg-surface-raised p-6 shadow-2xl shadow-black/40"
          >
            <h2 id="delete-dialog-title" class="text-lg font-semibold text-fg">
              {t('settings.deleteConfirmTitle')}
            </h2>

            <p class="mt-3 text-sm text-fg-secondary">{t('settings.deleteConfirmBody')}</p>

            <p class="mt-3 text-sm font-medium text-error">{t('settings.deleteConfirmWarning')}</p>

            <p class="mt-4 text-sm text-fg-secondary">
              {t('settings.deleteConfirmLabel', { phrase: confirmPhrase() })}
            </p>

            <input
              type="text"
              class="mt-2 w-full h-9 px-3 rounded-lg text-sm bg-surface border border-border-default text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors duration-150"
              value={deletePhrase()}
              onInput={(e) => setDeletePhrase(e.currentTarget.value)}
              autocomplete="off"
              spellcheck={false}
              disabled={deleting()}
            />

            <Show when={deleteError()}>
              <p class="mt-2 text-xs text-error">{deleteError()}</p>
            </Show>

            <div class="mt-6 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={deleting()}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={!isPhraseMatch() || deleting()}
                loading={deleting()}
                onClick={handleDelete}
              >
                {t('settings.deleteConfirmButton')}
              </Button>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  )
}
