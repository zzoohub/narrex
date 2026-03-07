import { describe, it, expect } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from './i18n'

// ---------------------------------------------------------------------------
// Test component that exposes i18n context
// ---------------------------------------------------------------------------

function TestConsumer(props: { translationKey: string; params?: Record<string, string | number> }) {
  const { t, locale } = useI18n()
  return (
    <div>
      <span data-testid="locale">{locale()}</span>
      <span data-testid="translation">{t(props.translationKey as never, props.params)}</span>
    </div>
  )
}

function TestLocaleSwitcher() {
  const { locale, setLocale, t } = useI18n()
  return (
    <div>
      <span data-testid="locale">{locale()}</span>
      <span data-testid="translation">{t('nav.projects' as never)}</span>
      <button data-testid="switch-en" onClick={() => setLocale('en')}>EN</button>
      <button data-testid="switch-ko" onClick={() => setLocale('ko')}>KO</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('I18nProvider', () => {
  it('defaults to ko locale', () => {
    render(() => (
      <I18nProvider>
        <TestConsumer translationKey="nav.projects" />
      </I18nProvider>
    ))
    expect(screen.getByTestId('locale').textContent).toBe('ko')
    expect(screen.getByTestId('translation').textContent).toBe('프로젝트')
  })

  it('respects initial locale prop', () => {
    render(() => (
      <I18nProvider initial="en">
        <TestConsumer translationKey="nav.projects" />
      </I18nProvider>
    ))
    expect(screen.getByTestId('locale').textContent).toBe('en')
    expect(screen.getByTestId('translation').textContent).toBe('Projects')
  })

  it('translates keys in Korean', () => {
    render(() => (
      <I18nProvider initial="ko">
        <TestConsumer translationKey="dashboard.title" />
      </I18nProvider>
    ))
    expect(screen.getByTestId('translation').textContent).toBe('내 프로젝트')
  })

  it('translates keys in English', () => {
    render(() => (
      <I18nProvider initial="en">
        <TestConsumer translationKey="dashboard.title" />
      </I18nProvider>
    ))
    expect(screen.getByTestId('translation').textContent).toBe('My Projects')
  })

  it('falls back to English when locale has no translation', () => {
    // 'es' has an empty translations object
    render(() => (
      <I18nProvider initial={'es' as never}>
        <TestConsumer translationKey="nav.projects" />
      </I18nProvider>
    ))
    expect(screen.getByTestId('translation').textContent).toBe('Projects')
  })

  it('returns the key itself when no translation exists in any locale', () => {
    render(() => (
      <I18nProvider initial="en">
        <TestConsumer translationKey="nonexistent.key" />
      </I18nProvider>
    ))
    expect(screen.getByTestId('translation').textContent).toBe('nonexistent.key')
  })

  it('interpolates params in translations', () => {
    render(() => (
      <I18nProvider initial="en">
        <TestConsumer
          translationKey="dashboard.card.scenes"
          params={{ drafted: 3, total: 10 }}
        />
      </I18nProvider>
    ))
    expect(screen.getByTestId('translation').textContent).toBe('3/10 scenes drafted')
  })

  it('interpolates params in Korean translations', () => {
    render(() => (
      <I18nProvider initial="ko">
        <TestConsumer
          translationKey="dashboard.card.scenes"
          params={{ drafted: 5, total: 12 }}
        />
      </I18nProvider>
    ))
    expect(screen.getByTestId('translation').textContent).toBe('5/12 장면 작성')
  })

  it('switches locale dynamically', async () => {
    render(() => (
      <I18nProvider initial="ko">
        <TestLocaleSwitcher />
      </I18nProvider>
    ))

    expect(screen.getByTestId('locale').textContent).toBe('ko')
    expect(screen.getByTestId('translation').textContent).toBe('프로젝트')

    screen.getByTestId('switch-en').click()

    expect(screen.getByTestId('locale').textContent).toBe('en')
    expect(screen.getByTestId('translation').textContent).toBe('Projects')

    screen.getByTestId('switch-ko').click()

    expect(screen.getByTestId('locale').textContent).toBe('ko')
    expect(screen.getByTestId('translation').textContent).toBe('프로젝트')
  })
})

describe('useI18n', () => {
  it('throws when used outside I18nProvider', () => {
    expect(() => {
      render(() => {
        const { t } = useI18n()
        return <span>{t('nav.projects' as never)}</span>
      })
    }).toThrow('useI18n must be used within I18nProvider')
  })
})
