import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'

// Mock auth store
const mockLoginWithGoogle = vi.fn()
vi.mock('@/shared/stores/auth', () => ({
  useAuth: () => ({
    loginWithGoogle: mockLoginWithGoogle,
  }),
}))

import { LoginGateModal } from './login-gate-modal'

function renderModal(props: { open: boolean; reason: 'newProject' | 'aiGeneration'; onClose: () => void }) {
  return render(() => (
    <I18nProvider initial="ko">
      <LoginGateModal {...props} />
    </I18nProvider>
  ))
}

describe('LoginGateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    const { container } = renderModal({ open: false, reason: 'newProject', onClose: vi.fn() })
    expect(container.textContent).toBe('')
  })

  it('renders title when open', () => {
    renderModal({ open: true, reason: 'newProject', onClose: vi.fn() })
    expect(screen.getByText('로그인이 필요합니다')).toBeInTheDocument()
  })

  it('shows newProject reason message', () => {
    renderModal({ open: true, reason: 'newProject', onClose: vi.fn() })
    expect(screen.getByText('새 프로젝트를 만들려면 로그인이 필요합니다.')).toBeInTheDocument()
  })

  it('shows aiGeneration reason message', () => {
    renderModal({ open: true, reason: 'aiGeneration', onClose: vi.fn() })
    expect(screen.getByText('AI 초고 생성은 로그인 후 이용할 수 있습니다.')).toBeInTheDocument()
  })

  it('calls loginWithGoogle on CTA click', () => {
    renderModal({ open: true, reason: 'newProject', onClose: vi.fn() })
    fireEvent.click(screen.getByText('Google로 로그인'))
    expect(mockLoginWithGoogle).toHaveBeenCalledOnce()
  })

  it('calls onClose on cancel click', () => {
    const onClose = vi.fn()
    renderModal({ open: true, reason: 'newProject', onClose })
    fireEvent.click(screen.getByText('나중에'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders with en locale', () => {
    render(() => (
      <I18nProvider initial="en">
        <LoginGateModal open={true} reason="aiGeneration" onClose={vi.fn()} />
      </I18nProvider>
    ))
    expect(screen.getByText('Sign in required')).toBeInTheDocument()
    expect(screen.getByText('Sign in to use AI draft generation.')).toBeInTheDocument()
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })
})
