import { Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { useI18n } from '@/shared/lib/i18n'
import { useAuth } from '@/shared/stores/auth'
import { Button } from '@/shared/ui'

export type LoginGateReason = 'newProject' | 'aiGeneration'

interface LoginGateModalProps {
  open: boolean
  reason: LoginGateReason
  onClose: () => void
}

export function LoginGateModal(props: LoginGateModalProps) {
  const { t } = useI18n()
  const { loginWithGoogle } = useAuth()

  const reasonKey = () =>
    props.reason === 'newProject'
      ? 'loginGate.newProject'
      : 'loginGate.aiGeneration'

  return (
    <Show when={props.open}>
      <Portal>
        {/* Backdrop */}
        <div
          class="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={props.onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-gate-title"
          aria-describedby="login-gate-desc"
          class={[
            'fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100%-2rem)] max-w-sm',
            'rounded-xl border border-border-default bg-surface-raised p-6 shadow-2xl shadow-black/40',
            'animate-scale-in origin-center',
          ].join(' ')}
        >
          <h2
            id="login-gate-title"
            class="text-lg font-semibold text-fg leading-tight"
          >
            {t('loginGate.title')}
          </h2>

          <p
            id="login-gate-desc"
            class="mt-2 text-sm text-fg-muted leading-relaxed"
          >
            {t(reasonKey() as any)}
          </p>

          <div class="mt-6 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={props.onClose}>
              {t('loginGate.cancel')}
            </Button>
            <Button variant="primary" onClick={loginWithGoogle}>
              {t('loginGate.cta')}
            </Button>
          </div>
        </div>
      </Portal>
    </Show>
  )
}
