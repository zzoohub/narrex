import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { I18nProvider } from '@/shared/lib/i18n'

// Mock as guest (unauthenticated)
const mockLoginWithGoogle = vi.fn()

vi.mock('@tanstack/solid-router', () => ({
  Link: (props: any) => <a href={props.to} onClick={props.onClick}>{props.children}</a>,
}))

vi.mock('@/shared/stores/auth', () => ({
  useAuth: () => ({
    state: () => 'unauthenticated',
    user: () => null,
    isGuest: () => true,
    loginWithGoogle: mockLoginWithGoogle,
    logout: vi.fn(),
  }),
}))

const mockListProjects = vi.fn()

vi.mock('@/entities/project', () => ({
  listProjects: (...args: any[]) => mockListProjects(...args),
  deleteProject: vi.fn(),
}))

import { DashboardView } from './index'

function renderDashboard() {
  Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  return render(() => (
    <I18nProvider initial="ko">
      <DashboardView />
    </I18nProvider>
  ))
}

describe('DashboardView – guest mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows demo project card for guests', async () => {
    renderDashboard()
    await vi.waitFor(() => {
      expect(screen.getByText('다시, 그 계절')).toBeInTheDocument()
    })
  })

  it('shows demo badge on the demo project card', async () => {
    renderDashboard()
    await vi.waitFor(() => {
      expect(screen.getByText('체험용')).toBeInTheDocument()
    })
  })

  it('shows Sign in button instead of profile avatar', () => {
    renderDashboard()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('does not call listProjects API for guests', () => {
    renderDashboard()
    expect(mockListProjects).not.toHaveBeenCalled()
  })

  it('opens login gate modal when New Project is clicked', async () => {
    renderDashboard()
    await vi.waitFor(() => {
      expect(screen.getByText('다시, 그 계절')).toBeInTheDocument()
    })

    // Find and click "새 프로젝트" button
    const newProjectButtons = screen.getAllByText('새 프로젝트')
    await fireEvent.click(newProjectButtons[0]!)

    await vi.waitFor(() => {
      expect(screen.getByText('로그인이 필요합니다')).toBeInTheDocument()
    })
  })

  it('shows guest title instead of "내 프로젝트"', () => {
    renderDashboard()
    expect(screen.getByText('프로젝트')).toBeInTheDocument()
    expect(screen.queryByText('내 프로젝트')).not.toBeInTheDocument()
  })
})
