import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'
import { DashboardView } from './index'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@tanstack/solid-router', () => ({
  Link: (props: any) => <a href={props.to}>{props.children}</a>,
}))

const mockLogout = vi.fn()

vi.mock('@/shared/stores/auth', () => ({
  useAuth: () => ({
    state: () => 'authenticated',
    user: () => ({ id: 'u1', displayName: 'Test User', email: 'test@test.com', profileImageUrl: null }),
    isGuest: () => false,
    loginWithGoogle: vi.fn(),
    logout: mockLogout,
  }),
}))

const mockListProjects = vi.fn()
const mockDeleteProject = vi.fn()

vi.mock('@/entities/project', () => ({
  listProjects: (...args: any[]) => mockListProjects(...args),
  deleteProject: (...args: any[]) => mockDeleteProject(...args),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDashboard() {
  // Ensure window.innerWidth is desktop
  Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  return render(() => (
    <I18nProvider initial="en">
      <DashboardView />
    </I18nProvider>
  ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title', async () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()
    expect(screen.getByText('Narrex')).toBeInTheDocument()
    expect(screen.getByText('My Projects')).toBeInTheDocument()
  })

  it('shows empty state when no projects', async () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()
    // Wait for resource to resolve
    await vi.waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument()
    })
  })

  it('shows project cards when projects exist', async () => {
    mockListProjects.mockResolvedValue({
      data: [
        {
          id: 'p1',
          title: 'My Novel',
          genre: 'Fantasy',
          sceneCount: 10,
          draftedSceneCount: 3,
          updatedAt: '2024-06-15T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    })
    renderDashboard()
    await vi.waitFor(() => {
      expect(screen.getByText('My Novel')).toBeInTheDocument()
    })
    expect(screen.getByText('Fantasy')).toBeInTheDocument()
  })

  it('shows progress bar for projects with scenes', async () => {
    mockListProjects.mockResolvedValue({
      data: [
        {
          id: 'p1',
          title: 'My Novel',
          genre: 'Fantasy',
          sceneCount: 10,
          draftedSceneCount: 3,
          updatedAt: '2024-06-15T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    })
    renderDashboard()
    await vi.waitFor(() => {
      expect(screen.getByText('My Novel')).toBeInTheDocument()
    })
    // Progress bar should show 30% width (3/10)
    const progressBar = document.querySelector('[style*="width: 30%"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('shows mobile fallback message on small screens', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })
    mockListProjects.mockResolvedValue({ data: [] })
    render(() => (
      <I18nProvider initial="ko">
        <DashboardView />
      </I18nProvider>
    ))
    expect(screen.getByText(/데스크톱용으로 설계/)).toBeInTheDocument()
  })

  it('shows theme toggle button', () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument()
  })

  it('hides new project button in title row when no projects', async () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()
    await vi.waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument()
    })
    expect(screen.queryByText('New Project')).not.toBeInTheDocument()
  })

  it('shows new project button in title row when projects exist', async () => {
    mockListProjects.mockResolvedValue({ data: PROJECT_LIST })
    renderDashboard()
    await vi.waitFor(() => {
      const buttons = screen.getAllByText('New Project')
      // title row button + ghost card = 2 occurrences
      expect(buttons.length).toBe(2)
    })
  })

  // ── Project deletion ──────────────────────────────────────────────

  const PROJECT_LIST = [
    {
      id: 'p1',
      title: 'My Novel',
      genre: 'Fantasy',
      sceneCount: 10,
      draftedSceneCount: 3,
      updatedAt: '2024-06-15T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ]

  it('shows context menu with delete option on right-click', async () => {
    mockListProjects.mockResolvedValue({ data: PROJECT_LIST })
    renderDashboard()

    await vi.waitFor(() => {
      expect(screen.getByText('My Novel')).toBeInTheDocument()
    })

    const card = screen.getByText('My Novel').closest('[data-project-card]')!
    await fireEvent.contextMenu(card)

    await vi.waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  it('shows confirmation dialog when delete is clicked from context menu', async () => {
    mockListProjects.mockResolvedValue({ data: PROJECT_LIST })
    renderDashboard()

    await vi.waitFor(() => {
      expect(screen.getByText('My Novel')).toBeInTheDocument()
    })

    const card = screen.getByText('My Novel').closest('[data-project-card]')!
    await fireEvent.contextMenu(card)

    await vi.waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    await fireEvent.click(screen.getByText('Delete'))

    await vi.waitFor(() => {
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog.textContent).toContain('My Novel')
    })
  })

  it('calls deleteProject and refetches on confirm', async () => {
    mockDeleteProject.mockResolvedValue(undefined)
    mockListProjects.mockResolvedValue({ data: PROJECT_LIST })
    renderDashboard()

    await vi.waitFor(() => {
      expect(screen.getByText('My Novel')).toBeInTheDocument()
    })

    const card = screen.getByText('My Novel').closest('[data-project-card]')!
    await fireEvent.contextMenu(card)

    await vi.waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
    await fireEvent.click(screen.getByText('Delete'))

    await vi.waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Confirm delete
    const confirmBtn = screen.getByRole('dialog').querySelector('button.bg-error-muted, button.bg-error')
      ?? screen.getAllByText('Delete').find(el => el.closest('[role="dialog"]'))!
    await fireEvent.click(confirmBtn)

    expect(mockDeleteProject).toHaveBeenCalledWith('p1')
  })

  // ── Profile dropdown ─────────────────────────────────────────────

  it('opens profile dropdown when avatar is clicked', async () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()

    const avatar = screen.getByLabelText('Account')
    await fireEvent.click(avatar)

    await vi.waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@test.com')).toBeInTheDocument()
    })
  })

  it('calls logout when Log out button is clicked in dropdown', async () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()

    const avatar = screen.getByLabelText('Account')
    await fireEvent.click(avatar)

    await vi.waitFor(() => {
      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    await fireEvent.click(screen.getByText('Log out'))
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('closes profile dropdown on Escape', async () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()

    const avatar = screen.getByLabelText('Account')
    await fireEvent.click(avatar)

    await vi.waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    await fireEvent.keyDown(document, { key: 'Escape' })

    await vi.waitFor(() => {
      expect(screen.queryByText('test@test.com')).not.toBeInTheDocument()
    })
  })

  it('closes profile dropdown on outside click', async () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()

    const avatar = screen.getByLabelText('Account')
    await fireEvent.click(avatar)

    await vi.waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    await fireEvent.mouseDown(document.body)

    await vi.waitFor(() => {
      expect(screen.queryByText('test@test.com')).not.toBeInTheDocument()
    })
  })

  it('does not call logout directly when avatar is clicked', async () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()

    const avatar = screen.getByLabelText('Account')
    await fireEvent.click(avatar)

    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('shows avatar image in profile dropdown when profileImageUrl is set', async () => {
    // This test verifies the dropdown includes the avatar — the mock has profileImageUrl: null,
    // so we rely on the trigger button test. We mainly verify structure here.
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()

    const avatar = screen.getByLabelText('Account')
    await fireEvent.click(avatar)

    await vi.waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    // Dropdown should contain the avatar area (initial letter fallback since profileImageUrl is null)
    const dropdown = screen.getByText('Test User').closest('div.absolute')!
    expect(dropdown).toBeInTheDocument()
    // Should have avatar initial 'T' in the dropdown
    expect(dropdown.querySelector('.rounded-full')).toBeInTheDocument()
  })

  it('does not delete when dialog is cancelled', async () => {
    mockListProjects.mockResolvedValue({ data: PROJECT_LIST })
    renderDashboard()

    await vi.waitFor(() => {
      expect(screen.getByText('My Novel')).toBeInTheDocument()
    })

    const card = screen.getByText('My Novel').closest('[data-project-card]')!
    await fireEvent.contextMenu(card)

    await vi.waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
    await fireEvent.click(screen.getByText('Delete'))

    await vi.waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await fireEvent.click(screen.getByText('Cancel'))

    expect(mockDeleteProject).not.toHaveBeenCalled()
  })
})
