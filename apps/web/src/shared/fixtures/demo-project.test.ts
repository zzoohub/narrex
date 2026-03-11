import { describe, it, expect } from 'vitest'
import { buildDemoWorkspace, buildDemoProjectSummary, DEMO_PROJECT_ID } from './demo-project'

describe('demo fixture – ko', () => {
  const ws = buildDemoWorkspace('ko')
  const summary = buildDemoProjectSummary('ko')

  it('DEMO_PROJECT_ID has demo- prefix', () => {
    expect(DEMO_PROJECT_ID).toMatch(/^demo-/)
  })

  it('workspace has correct structure', () => {
    expect(ws.project).toBeDefined()
    expect(ws.tracks).toHaveLength(2)
    expect(ws.scenes.length).toBeGreaterThanOrEqual(8)
    expect(ws.characters.length).toBeGreaterThanOrEqual(4)
    expect(ws.relationships.length).toBeGreaterThanOrEqual(5)
    expect(ws.connections.length).toBeGreaterThanOrEqual(2)
  })

  it('all IDs start with demo-', () => {
    expect(ws.project.id).toMatch(/^demo-/)
    for (const t of ws.tracks) expect(t.id).toMatch(/^demo-/)
    for (const s of ws.scenes) expect(s.id).toMatch(/^demo-/)
    for (const c of ws.characters) expect(c.id).toMatch(/^demo-/)
    for (const r of ws.relationships) expect(r.id).toMatch(/^demo-/)
    for (const conn of ws.connections) expect(conn.id).toMatch(/^demo-/)
  })

  it('scene characterIds reference valid character IDs', () => {
    const charIds = new Set(ws.characters.map((c) => c.id))
    for (const scene of ws.scenes) {
      for (const cid of scene.characterIds) {
        expect(charIds.has(cid)).toBe(true)
      }
    }
  })

  it('scenes with edited/ai_draft status have content', () => {
    for (const scene of ws.scenes) {
      if (scene.status === 'edited' || scene.status === 'ai_draft') {
        expect(scene.content).toBeTruthy()
      }
    }
  })

  it('empty scenes have no content', () => {
    const emptyScenes = ws.scenes.filter((s) => s.status === 'empty')
    expect(emptyScenes.length).toBeGreaterThan(0)
    for (const scene of emptyScenes) {
      expect(scene.content).toBeNull()
    }
  })

  it('summary has correct counts', () => {
    expect(summary.id).toBe(DEMO_PROJECT_ID)
    expect(summary.sceneCount).toBe(ws.scenes.length)
    const drafted = ws.scenes.filter((s) => s.status !== 'empty').length
    expect(summary.draftedSceneCount).toBe(drafted)
  })

  it('tracks reference the demo project', () => {
    for (const t of ws.tracks) {
      expect(t.projectId).toBe(DEMO_PROJECT_ID)
    }
  })

  it('scenes reference valid track IDs', () => {
    const trackIds = new Set(ws.tracks.map((t) => t.id))
    for (const scene of ws.scenes) {
      expect(trackIds.has(scene.trackId)).toBe(true)
    }
  })
})

describe('demo fixture – en', () => {
  const ws = buildDemoWorkspace('en')
  const summary = buildDemoProjectSummary('en')

  it('has same structure as ko', () => {
    const koWs = buildDemoWorkspace('ko')
    expect(ws.tracks).toHaveLength(koWs.tracks.length)
    expect(ws.scenes).toHaveLength(koWs.scenes.length)
    expect(ws.characters).toHaveLength(koWs.characters.length)
    expect(ws.relationships).toHaveLength(koWs.relationships.length)
    expect(ws.connections).toHaveLength(koWs.connections.length)
  })

  it('project title is in English', () => {
    expect(ws.project.title).not.toMatch(/[\uAC00-\uD7A3]/) // no Korean chars
  })

  it('summary genre is in English', () => {
    expect(summary.genre).toBeTruthy()
    expect(summary.genre!).not.toMatch(/[\uAC00-\uD7A3]/)
  })
})

describe('fixture is deterministic', () => {
  it('returns identical data on repeated calls', () => {
    const a = buildDemoWorkspace('ko')
    const b = buildDemoWorkspace('ko')
    expect(a.project.id).toBe(b.project.id)
    expect(a.scenes.map((s) => s.id)).toEqual(b.scenes.map((s) => s.id))
  })
})
