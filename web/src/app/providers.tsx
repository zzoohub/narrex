import { onMount } from 'solid-js'
import type { ParentComponent } from 'solid-js'
import { I18nProvider } from '@/shared/lib/i18n'
import { useTheme } from '@/shared/stores/theme'
import { initAuth } from '@/shared/stores/auth'

export const Providers: ParentComponent = (props) => {
  // Initialize theme side-effect (applies .dark class)
  useTheme()

  // Initialize auth (token check + refresh)
  onMount(() => {
    void initAuth()
  })

  return <I18nProvider initial="ko">{props.children}</I18nProvider>
}
