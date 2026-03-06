import type { ParentComponent } from 'solid-js'
import { I18nProvider } from '@/shared/lib/i18n'
import { useTheme } from '@/shared/stores/theme'

export const Providers: ParentComponent = (props) => {
  // Initialize theme side-effect (applies .dark class)
  useTheme()

  return <I18nProvider initial="ko">{props.children}</I18nProvider>
}
