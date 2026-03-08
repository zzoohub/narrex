import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@tanstack/solid-router', () => ({
  Link: (props: any) => <a href={props.to}>{props.children}</a>,
  useNavigate: () => vi.fn(),
}))

const mockSetPreference = vi.fn()
const mockToggle = vi.fn()

vi.mock('@/shared/stores/theme', () => ({
  useTheme: () => ({
    theme: () => 'dark' as const,
    preference: () => 'system' as const,
    setPreference: mockSetPreference,
    toggle: mockToggle,
  }),
}))

const mockLogout = vi.fn()
const mockDeleteAccount = vi.fn()
const mockUpdateProfile = vi.fn()

vi.mock('@/shared/stores/auth', () => ({
  useAuth: () => ({
    state: () => 'authenticated',
    user: () => ({
      id: 'u1',
      name: 'Test User',
      email: 'test@test.com',
      profileImageUrl: null,
      themePreference: 'system',
      languagePreference: 'en',
    }),
    loginWithGoogle: vi.fn(),
    logout: mockLogout,
    deleteAccount: mockDeleteAccount,
    updateProfile: mockUpdateProfile,
  }),
}))

// ---------------------------------------------------------------------------
// Lazy import — after mocks
// ---------------------------------------------------------------------------

const { SettingsView } = await import('./index')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSettings(locale: 'en' | 'ko' = 'en') {
  return render(() => (
    <I18nProvider initial={locale}>
      <SettingsView />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateProfile.mockResolvedValue({
      id: 'u1',
      name: 'Test User',
      email: 'test@test.com',
      profileImageUrl: null,
      themePreference: 'system',
      languagePreference: 'en',
    })
  })

  // ── Sections rendering ──────────────────────────────────────────────

  it('renders the page title', () => {
    renderSettings()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders the Profile section heading', () => {
    renderSettings()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('renders the Preferences section heading', () => {
    renderSettings()
    expect(screen.getByText('Preferences')).toBeInTheDocument()
  })

  it('renders the Account section heading', () => {
    renderSettings()
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('renders back link', () => {
    renderSettings()
    expect(screen.getByText('Go back')).toBeInTheDocument()
  })

  // ── Profile form ────────────────────────────────────────────────────

  it('shows user email as disabled', () => {
    renderSettings()
    const emailInput = screen.getByDisplayValue('test@test.com')
    expect(emailInput).toBeDisabled()
  })

  it('shows user display name in input', () => {
    renderSettings()
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
  })

  it('shows save button for profile', () => {
    renderSettings()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('calls updateProfile when save is clicked', async () => {
    renderSettings()
    const saveBtn = screen.getByText('Save')
    await fireEvent.click(saveBtn)
    expect(mockUpdateProfile).toHaveBeenCalled()
  })

  // ── Theme toggle ───────────────────────────────────────────────────

  it('renders three theme buttons: System, Light, Dark', () => {
    renderSettings()
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
  })

  it('calls setPreference when light theme is clicked', async () => {
    renderSettings()
    await fireEvent.click(screen.getByText('Light'))
    expect(mockSetPreference).toHaveBeenCalledWith('light')
  })

  it('calls setPreference when dark theme is clicked', async () => {
    renderSettings()
    await fireEvent.click(screen.getByText('Dark'))
    expect(mockSetPreference).toHaveBeenCalledWith('dark')
  })

  it('calls setPreference when system theme is clicked', async () => {
    renderSettings()
    await fireEvent.click(screen.getByText('System'))
    expect(mockSetPreference).toHaveBeenCalledWith('system')
  })

  // ── Language toggle ────────────────────────────────────────────────

  it('renders two language buttons', () => {
    renderSettings()
    expect(screen.getByText('English')).toBeInTheDocument()
    // Korean language label is same in both locales
    const koButtons = screen.getAllByText((content) => content.includes('한국어'))
    expect(koButtons.length).toBeGreaterThan(0)
  })

  // ── Account section ────────────────────────────────────────────────

  it('renders Log out button', () => {
    renderSettings()
    expect(screen.getByText('Log out')).toBeInTheDocument()
  })

  it('calls logout when Log out is clicked', async () => {
    renderSettings()
    await fireEvent.click(screen.getByText('Log out'))
    expect(mockLogout).toHaveBeenCalled()
  })

  it('renders Delete Account button', () => {
    renderSettings()
    expect(screen.getByText('Delete Account')).toBeInTheDocument()
  })

  // ── Delete confirmation ────────────────────────────────────────────

  it('shows delete confirmation dialog when Delete Account is clicked', async () => {
    renderSettings()
    await fireEvent.click(screen.getByText('Delete Account'))

    await vi.waitFor(() => {
      expect(
        screen.getByText('Are you sure you want to delete your account?'),
      ).toBeInTheDocument()
    })
  })

  it('delete confirm button is disabled until phrase is typed', async () => {
    renderSettings()
    await fireEvent.click(screen.getByText('Delete Account'))

    await vi.waitFor(() => {
      expect(
        screen.getByText('Are you sure you want to delete your account?'),
      ).toBeInTheDocument()
    })

    // The confirm button inside the dialog should be disabled
    const confirmBtn = screen.getByRole('button', { name: /delete account/i })
    // The main "Delete Account" that opened the dialog and the one inside
    // We need the one inside the dialog
    const dialogConfirmBtns = screen
      .getAllByText('Delete Account')
      .filter((el) => el.closest('[role="dialog"]'))
    expect(dialogConfirmBtns.length).toBeGreaterThan(0)

    // Find the button element
    const dialogBtn = dialogConfirmBtns[0]!.closest('button')
    expect(dialogBtn).toBeDisabled()
  })

  it('enables delete confirm button when confirmation phrase is typed', async () => {
    renderSettings()
    await fireEvent.click(screen.getByText('Delete Account'))

    await vi.waitFor(() => {
      expect(
        screen.getByText('Are you sure you want to delete your account?'),
      ).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/delete my account/i)
    await fireEvent.input(input, { target: { value: 'delete my account' } })

    await vi.waitFor(() => {
      const dialogConfirmBtns = screen
        .getAllByText('Delete Account')
        .filter((el) => el.closest('[role="dialog"]'))
      const dialogBtn = dialogConfirmBtns[0]!.closest('button')
      expect(dialogBtn).not.toBeDisabled()
    })
  })

  // ── i18n ──────────────────────────────────────────────────────────

  it('renders Korean labels when locale is ko', () => {
    renderSettings('ko')
    expect(screen.getByText('설정')).toBeInTheDocument()
    expect(screen.getByText('프로필')).toBeInTheDocument()
    expect(screen.getByText('환경설정')).toBeInTheDocument()
    expect(screen.getByText('계정 관리')).toBeInTheDocument()
  })
})
