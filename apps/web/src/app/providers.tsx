import { createEffect, onMount } from 'solid-js'
import type { Component, ParentComponent } from 'solid-js'
import { I18nProvider, useI18n } from '@/shared/lib/i18n'
import { useTheme } from '@/shared/stores/theme'
import { initAuth, useAuth } from '@/shared/stores/auth'
import type { Locale } from '@/shared/types'

/** Syncs i18n locale from the authenticated user's languagePreference. */
const LocaleSync: Component = () => {
  const { setLocale } = useI18n()
  const { user } = useAuth()

  createEffect(() => {
    const pref = user()?.languagePreference as Locale | undefined
    if (pref) setLocale(pref)
  })

  return null
}

export const Providers: ParentComponent = (props) => {
  // Initialize theme side-effect (applies .dark class)
  useTheme()

  // Initialize auth (token check + refresh)
  onMount(() => {
    void initAuth()
  })

  return (
    <I18nProvider initial="ko">
      <LocaleSync />
      {props.children}
    </I18nProvider>
  )
}
