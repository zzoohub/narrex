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

vi.mock('@/shared/stores/auth', () => ({
  useAuth: () => ({
    state: () => 'authenticated',
    user: () => ({ id: 'u1', name: 'Test User', email: 'test@test.com', profileImageUrl: null }),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
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

  it('shows new project button', () => {
    mockListProjects.mockResolvedValue({ data: [] })
    renderDashboard()
    expect(screen.getByText('New Project')).toBeInTheDocument()
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
