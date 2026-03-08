import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'

const mockLoginWithGoogle = vi.fn()

vi.mock('@/shared/stores/auth', () => ({
  useAuth: () => ({
    state: () => 'unauthenticated',
    user: () => null,
    loginWithGoogle: mockLoginWithGoogle,
    logout: vi.fn(),
  }),
}))

vi.mock('@tanstack/solid-router', () => ({
  Link: (props: any) => <a href={props.to}>{props.children}</a>,
}))

import { LoginView } from './index'

describe('LoginView', () => {
  it('renders the login page with Google sign-in button (ko)', () => {
    render(() => (
      <I18nProvider initial="ko">
        <LoginView />
      </I18nProvider>
    ))
    expect(screen.getByText('Google로 시작하기')).toBeInTheDocument()
  })

  it('renders the login page with Google sign-in button (en)', () => {
    render(() => (
      <I18nProvider initial="en">
        <LoginView />
      </I18nProvider>
    ))
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('calls loginWithGoogle when Google button is clicked', async () => {
    render(() => (
      <I18nProvider initial="en">
        <LoginView />
      </I18nProvider>
    ))
    const btn = screen.getByText('Continue with Google')
    await fireEvent.click(btn)
    expect(mockLoginWithGoogle).toHaveBeenCalledOnce()
  })

  it('displays the app name', () => {
    render(() => (
      <I18nProvider initial="en">
        <LoginView />
      </I18nProvider>
    ))
    expect(screen.getByText('Narrex')).toBeInTheDocument()
  })

  it('displays a tagline', () => {
    render(() => (
      <I18nProvider initial="ko">
        <LoginView />
      </I18nProvider>
    ))
    expect(screen.getByText('AI와 함께 이야기를 구조화하세요')).toBeInTheDocument()
  })
})
