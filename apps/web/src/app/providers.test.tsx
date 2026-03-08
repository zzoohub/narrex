import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import { useI18n } from '@/shared/lib/i18n'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/shared/stores/theme', () => ({
  useTheme: () => ({
    theme: () => 'dark' as const,
    preference: () => 'system' as const,
    setPreference: vi.fn(),
    toggle: vi.fn(),
  }),
}))

const mockUser = vi.fn()

vi.mock('@/shared/stores/auth', () => ({
  useAuth: () => ({
    state: () => 'authenticated',
    user: mockUser,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
  initAuth: vi.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// Lazy import — after mocks
// ---------------------------------------------------------------------------

const { Providers } = await import('./providers')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function LocaleViewer() {
  const { locale } = useI18n()
  return <span data-testid="locale">{locale()}</span>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Providers', () => {
  it('syncs i18n locale from user languagePreference', () => {
    mockUser.mockReturnValue({
      id: 'u1',
      name: 'Test',
      email: 'test@test.com',
      profileImageUrl: null,
      themePreference: 'system',
      languagePreference: 'en',
    })

    render(() => (
      <Providers>
        <LocaleViewer />
      </Providers>
    ))

    expect(screen.getByTestId('locale').textContent).toBe('en')
  })

  it('keeps ko when user languagePreference is ko', () => {
    mockUser.mockReturnValue({
      id: 'u1',
      name: 'Test',
      email: 'test@test.com',
      profileImageUrl: null,
      themePreference: 'system',
      languagePreference: 'ko',
    })

    render(() => (
      <Providers>
        <LocaleViewer />
      </Providers>
    ))

    expect(screen.getByTestId('locale').textContent).toBe('ko')
  })

  it('defaults to ko when user is null (unauthenticated)', () => {
    mockUser.mockReturnValue(null)

    render(() => (
      <Providers>
        <LocaleViewer />
      </Providers>
    ))

    expect(screen.getByTestId('locale').textContent).toBe('ko')
  })
})
