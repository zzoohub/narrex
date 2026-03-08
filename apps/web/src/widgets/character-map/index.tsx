import { createSignal, createEffect, onMount, onCleanup, untrack, For, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { useI18n } from '@/shared/lib/i18n'
import { useWorkspace } from '@/features/workspace'
import { Button, IconPlus, IconArrowLeft, IconChevronLeft, IconTrash, IconPen, IconMaximize, IconMinimize, IconZoomIn, IconZoomOut, ContextMenu, type ContextMenuItem, Separator, Dialog } from '@/shared/ui'
import * as d3 from 'd3'
import type { Character, CharacterRelationship, RelationshipVisual } from '@/entities/character'

/* ── D3 simulation node type ─────────────────────────────────────────── */

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  x: number
  y: number
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string
}

/* ── Relationship popover state ──────────────────────────────────────── */

interface PopoverState {
  x: number
  y: number
  label: string
  visualType: RelationshipVisual
  /** If editing, holds the relationship id. Null when creating. */
  editingRelId: string | null
  /** When creating: the two character ids */
  characterAId: string
  characterBId: string
}

/* ── Main component ──────────────────────────────────────────────────── */

export function CharacterMap(props: {
  onCollapse?: () => void
  fullscreen?: boolean
  onEnterFullscreen?: () => void
  onExitFullscreen?: () => void
}) {
  const { t } = useI18n()
  const ws = useWorkspace()
  const [selectedCharId, setSelectedCharId] = createSignal<string | null>(null)

  const selectedChar = () =>
    ws.state.characters.find((c) => c.id === selectedCharId())

  return (
    <div class="flex flex-col h-full bg-surface">
      <Show
        when={selectedChar()}
        fallback={
          <GraphView
            t={t}
            onSelect={setSelectedCharId}
            fullscreen={props.fullscreen}
            onEnterFullscreen={props.onEnterFullscreen}
            onExitFullscreen={props.onExitFullscreen}
            {...(!props.fullscreen && props.onCollapse ? { onCollapse: props.onCollapse } : {})}
          />
        }
      >
        {(char) => (
          <CharacterCard
            character={char()}
            t={t}
            onBack={() => setSelectedCharId(null)}
            onDeleted={() => setSelectedCharId(null)}
            {...(!props.fullscreen && props.onCollapse ? { onCollapse: props.onCollapse } : {})}
          />
        )}
      </Show>
    </div>
  )
}

/* ── Graph view ──────────────────────────────────────────────────────── */

function GraphView(props: {
  t: (k: string, params?: Record<string, string | number>) => string
  onSelect: (id: string) => void
  onCollapse?: () => void
  fullscreen?: boolean
  onEnterFullscreen?: () => void
  onExitFullscreen?: () => void
}) {
  const ws = useWorkspace()

  let svgRef!: SVGSVGElement

  const [nodePositions, setNodePositions] = createSignal<Map<string, { x: number; y: number }>>(new Map())
  const [popover, setPopover] = createSignal<PopoverState | null>(null)

  /* ── Zoom state (fullscreen only) ──────────────────────────────────── */
  const [zoomScale, setZoomScale] = createSignal(1)
  const [panX, setPanX] = createSignal(0)
  const [panY, setPanY] = createSignal(0)

  function handleZoomIn() {
    setZoomScale((s) => Math.min(4, s * 1.3))
  }
  function handleZoomOut() {
    setZoomScale((s) => Math.max(0.25, s / 1.3))
  }

  /* drag-to-connect state */
  const [dragLine, setDragLine] = createSignal<{ fromId: string; x1: number; y1: number; x2: number; y2: number } | null>(null)

  let simulation: d3.Simulation<SimNode, SimLink> | undefined

  /* ── Build / rebuild simulation ──────────────────────────────────── */

  function rebuildSimulation() {
    simulation?.stop()

    if (!svgRef) return

    const width = svgRef.clientWidth || 400
    const height = svgRef.clientHeight || 300

    const chars = ws.state.characters
    const rels = ws.state.relationships

    if (chars.length === 0) return

    const nodes: SimNode[] = chars.map((c) => ({
      id: c.id,
      x: c.graphX ?? width / 2 + (Math.random() - 0.5) * 200,
      y: c.graphY ?? height / 2 + (Math.random() - 0.5) * 200,
    }))

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    const links: SimLink[] = rels
      .filter((r) => nodeMap.has(r.characterAId) && nodeMap.has(r.characterBId))
      .map((r) => ({
        id: r.id,
        source: r.characterAId,
        target: r.characterBId,
      }))

    const pad = 40 // padding from edges

    const sim = d3
      .forceSimulation<SimNode, SimLink>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(60),
      )
      .force('charge', d3.forceManyBody().strength(-160))
      .force('x', d3.forceX(width / 2).strength(0.08))
      .force('y', d3.forceY(height / 2).strength(0.08))
      .force('collide', d3.forceCollide(40))
      .on('tick', () => {
        const map = new Map<string, { x: number; y: number }>()
        sim.nodes().forEach((n) => {
          // Clamp nodes within viewport
          n.x = Math.max(pad, Math.min(width - pad, n.x!))
          n.y = Math.max(pad, Math.min(height - pad, n.y!))
          map.set(n.id, { x: n.x, y: n.y })
        })
        setNodePositions(map)
      })

    simulation = sim
  }

  onMount(() => {
    rebuildSimulation()
  })

  /* Rebuild only when characters/relationships are added or removed */
  createEffect(() => {
    const _chars = ws.state.characters.length
    const _rels = ws.state.relationships.length
    void _chars
    void _rels
    // untrack: rebuildSimulation reads ws.state.characters internally —
    // without untrack, property edits (graphX/graphY, name, etc.) would
    // also trigger a full rebuild, causing the "burst" on drag release.
    untrack(() => rebuildSimulation())
  })

  onCleanup(() => {
    simulation?.stop()
  })

  /* ── Node dragging (d3-drag on SVG) ─────────────────────────────── */

  let didDrag = false

  function handleNodePointerDown(charId: string, e: PointerEvent) {
    e.stopPropagation()
    if (!simulation) return

    const simNode = simulation.nodes().find((n) => n.id === charId)
    if (!simNode) return

    const startX = e.clientX
    const startY = e.clientY
    const origX = simNode.x!
    const origY = simNode.y!
    didDrag = false

    simNode.fx = origX
    simNode.fy = origY
    simulation.alphaTarget(0.3).restart()

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true
      simNode.fx = origX + dx
      simNode.fy = origY + dy
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      const finalX = simNode.fx!
      const finalY = simNode.fy!
      simNode.fx = null
      simNode.fy = null
      simulation!.alphaTarget(0)

      ws.updateCharacter(charId, { graphX: finalX, graphY: finalY })
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  /* ── Edge-handle drag to create relationship ────────────────────── */

  function handleEdgeHandlePointerDown(charId: string, e: PointerEvent) {
    e.stopPropagation()
    e.preventDefault()

    const pos = nodePositions().get(charId)
    if (!pos) return

    const svgRect = svgRef.getBoundingClientRect()

    setDragLine({
      fromId: charId,
      x1: pos.x,
      y1: pos.y,
      x2: pos.x,
      y2: pos.y,
    })

    const onMove = (ev: PointerEvent) => {
      setDragLine((prev) =>
        prev
          ? {
              ...prev,
              x2: ev.clientX - svgRect.left,
              y2: ev.clientY - svgRect.top,
            }
          : null,
      )
    }

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      const line = dragLine()
      setDragLine(null)

      if (!line) return

      // Find target node under pointer
      const dropX = ev.clientX - svgRect.left
      const dropY = ev.clientY - svgRect.top
      const positions = nodePositions()

      let targetId: string | null = null
      for (const [id, p] of positions) {
        if (id === charId) continue
        const dist = Math.sqrt((p.x - dropX) ** 2 + (p.y - dropY) ** 2)
        if (dist < 30) {
          targetId = id
          break
        }
      }

      if (targetId) {
        // Open popover to create relationship
        const midX = (line.x1 + dropX) / 2 + svgRect.left
        const midY = (line.y1 + dropY) / 2 + svgRect.top
        setPopover({
          x: midX,
          y: midY,
          label: '',
          visualType: 'solid',
          editingRelId: null,
          characterAId: charId,
          characterBId: targetId,
        })
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  /* ── Relationship click → edit popover ──────────────────────────── */

  function handleRelationshipClick(rel: CharacterRelationship, e: MouseEvent) {
    e.stopPropagation()
    setPopover({
      x: e.clientX,
      y: e.clientY,
      label: rel.label,
      visualType: rel.visualType,
      editingRelId: rel.id,
      characterAId: rel.characterAId,
      characterBId: rel.characterBId,
    })
  }

  /* ── Popover submit ─────────────────────────────────────────────── */

  function handlePopoverSubmit() {
    const p = popover()
    if (!p) return

    if (p.editingRelId) {
      ws.updateRelationship(p.editingRelId, {
        label: p.label,
        visualType: p.visualType,
      })
    } else {
      ws.addRelationship(p.characterAId, p.characterBId, p.label, p.visualType)
    }
    setPopover(null)
  }

  /* ── Context menus ──────────────────────────────────────────────── */

  function charContextItems(charId: string): (ContextMenuItem | typeof Separator)[] {
    return [
      {
        label: props.t('characters.edit') || 'Edit Character',
        icon: <IconPen size={14} />,
        onClick: () => props.onSelect(charId),
      },
      {
        label: props.t('characters.createRelationship') || 'Create Relationship',
        icon: <IconPlus size={14} />,
        onClick: () => {
          // Start relationship creation mode — show popover centered on character
          const pos = nodePositions().get(charId)
          if (!pos) return
          const svgRect = svgRef.getBoundingClientRect()
          // Open popover to pick target character
          setPopover({
            x: pos.x + svgRect.left,
            y: pos.y + svgRect.top,
            label: '',
            visualType: 'solid',
            editingRelId: null,
            characterAId: charId,
            characterBId: '', // user must select
          })
        },
      },
      Separator,
      {
        label: props.t('characters.deleteCharacter'),
        icon: <IconTrash size={14} />,
        danger: true,
        onClick: () => ws.removeCharacter(charId),
      },
    ]
  }

  function relContextItems(relId: string): (ContextMenuItem | typeof Separator)[] {
    return [
      {
        label: props.t('characters.editRelationship') || 'Edit Relationship',
        icon: <IconPen size={14} />,
        onClick: () => {
          const rel = ws.state.relationships.find((r) => r.id === relId)
          if (!rel) return
          const posA = nodePositions().get(rel.characterAId)
          const posB = nodePositions().get(rel.characterBId)
          if (!posA || !posB) return
          const svgRect = svgRef.getBoundingClientRect()
          setPopover({
            x: (posA.x + posB.x) / 2 + svgRect.left,
            y: (posA.y + posB.y) / 2 + svgRect.top,
            label: rel.label,
            visualType: rel.visualType,
            editingRelId: rel.id,
            characterAId: rel.characterAId,
            characterBId: rel.characterBId,
          })
        },
      },
      Separator,
      {
        label: props.t('characters.deleteRelationship') || 'Delete Relationship',
        icon: <IconTrash size={14} />,
        danger: true,
        onClick: () => ws.removeRelationship(relId),
      },
    ]
  }

  /* ── SVG arrow marker id ────────────────────────────────────────── */
  const ARROW_MARKER_ID = 'rel-arrow'

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <>
      {/* Header */}
      <div class="flex items-center justify-between px-4 h-10 border-b border-border-subtle flex-shrink-0">
        <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
          {props.t('characters.title')}
        </span>
        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<IconPlus size={14} />}
            onClick={() => ws.addCharacter(props.t('characters.newName') || 'New Character')}
          >
            {props.t('characters.add')}
          </Button>

          {/* Zoom controls — fullscreen only */}
          <Show when={props.fullscreen}>
            <button
              type="button"
              onClick={handleZoomOut}
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label={props.t('characters.zoomOut')}
            >
              <IconZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label={props.t('characters.zoomIn')}
            >
              <IconZoomIn size={14} />
            </button>
          </Show>

          {/* Maximize — panel mode only */}
          <Show when={!props.fullscreen && props.onEnterFullscreen}>
            <button
              type="button"
              onClick={props.onEnterFullscreen}
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label={props.t('characters.fullscreen')}
            >
              <IconMaximize size={14} />
            </button>
          </Show>

          {/* Minimize — fullscreen mode only */}
          <Show when={props.fullscreen && props.onExitFullscreen}>
            <button
              type="button"
              onClick={props.onExitFullscreen}
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label={props.t('characters.exitFullscreen')}
            >
              <IconMinimize size={14} />
            </button>
          </Show>

          {/* Collapse — panel mode only */}
          <Show when={!props.fullscreen && props.onCollapse}>
            <button
              type="button"
              onClick={props.onCollapse}
              class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
              aria-label="Collapse character panel"
              aria-expanded={true}
            >
              <IconChevronLeft size={14} />
            </button>
          </Show>
        </div>
      </div>

      {/* Graph area */}
      <div class="flex-1 relative overflow-hidden">
        <Show
          when={ws.state.characters.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full px-6 text-center">
              <p class="text-sm text-fg-muted leading-relaxed">
                {props.t('characters.empty')}
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon={<IconPlus size={14} />}
                class="mt-4"
                onClick={() => ws.addCharacter(props.t('characters.newName') || 'New Character')}
              >
                {props.t('characters.add')}
              </Button>
            </div>
          }
        >
          <svg
            ref={svgRef}
            class="absolute inset-0 w-full h-full"
            style={{ 'touch-action': 'none' }}
          >
            {/* Defs: arrow marker */}
            <defs>
              <marker
                id={ARROW_MARKER_ID}
                viewBox="0 0 10 10"
                refX="28"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--fg-muted)" />
              </marker>
            </defs>

            {/* Zoom/pan transform group */}
            <g transform={props.fullscreen ? `translate(${panX()},${panY()}) scale(${zoomScale()})` : undefined}>

            {/* Relationship lines */}
            <For each={ws.state.relationships}>
              {(rel) => {
                const posA = () => nodePositions().get(rel.characterAId)
                const posB = () => nodePositions().get(rel.characterBId)

                return (
                  <Show when={posA() && posB()}>
                    <ContextMenu items={relContextItems(rel.id)} svg>
                      <g
                        class="cursor-pointer"
                        style={{ 'pointer-events': 'all' }}
                      >
                        {/* Invisible wide hit area */}
                        <line
                          x1={posA()!.x}
                          y1={posA()!.y}
                          x2={posB()!.x}
                          y2={posB()!.y}
                          stroke="transparent"
                          stroke-width={12}
                          onClick={(e) => handleRelationshipClick(rel, e)}
                        />
                        {/* Visible line */}
                        <line
                          x1={posA()!.x}
                          y1={posA()!.y}
                          x2={posB()!.x}
                          y2={posB()!.y}
                          stroke="var(--fg-muted)"
                          stroke-width={1.5}
                          stroke-dasharray={
                            rel.visualType === 'dashed' ? '6 4' : undefined
                          }
                          marker-end={
                            rel.visualType === 'arrowed'
                              ? `url(#${ARROW_MARKER_ID})`
                              : undefined
                          }
                          class="pointer-events-none"
                        />
                        {/* Label at midpoint */}
                        <text
                          x={(posA()!.x + posB()!.x) / 2}
                          y={(posA()!.y + posB()!.y) / 2 - 8}
                          text-anchor="middle"
                          class="text-[10px] fill-fg-muted select-none pointer-events-none"
                        >
                          {rel.label}
                        </text>
                      </g>
                    </ContextMenu>
                  </Show>
                )
              }}
            </For>

            {/* Drag-to-connect preview line */}
            <Show when={dragLine()}>
              {(line) => (
                <line
                  x1={line().x1}
                  y1={line().y1}
                  x2={line().x2}
                  y2={line().y2}
                  stroke="var(--accent)"
                  stroke-width={2}
                  stroke-dasharray="4 4"
                  class="pointer-events-none"
                />
              )}
            </Show>

            {/* Character nodes */}
            <For each={ws.state.characters}>
              {(char) => {
                const pos = () => nodePositions().get(char.id)

                return (
                  <Show when={pos()}>
                    {(p) => (
                      <ContextMenu items={charContextItems(char.id)} svg>
                        <g
                          class="cursor-grab active:cursor-grabbing"
                          style={{ 'pointer-events': 'all' }}
                        >
                          {/* Main circle — drag to move */}
                          <Show when={char.profileImageUrl}>
                            <defs>
                              <clipPath id={`avatar-clip-${char.id}`}>
                                <circle cx={p().x} cy={p().y} r={22} />
                              </clipPath>
                            </defs>
                            <image
                              href={char.profileImageUrl!}
                              x={p().x - 22}
                              y={p().y - 22}
                              width={44}
                              height={44}
                              clip-path={`url(#avatar-clip-${char.id})`}
                              class="pointer-events-none"
                            />
                          </Show>
                          <circle
                            cx={p().x}
                            cy={p().y}
                            r={22}
                            class={char.profileImageUrl
                              ? 'fill-none stroke-border-default hover:stroke-accent transition-colors'
                              : 'fill-surface-raised stroke-border-default hover:stroke-accent transition-colors'}
                            stroke-width={2}
                            onPointerDown={(e) => handleNodePointerDown(char.id, e)}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!didDrag) props.onSelect(char.id)
                            }}
                          />

                          {/* Initial letter (only if no image) */}
                          <Show when={!char.profileImageUrl}>
                            <text
                              x={p().x}
                              y={p().y}
                              text-anchor="middle"
                              dominant-baseline="central"
                              class="text-sm font-semibold fill-fg select-none pointer-events-none"
                            >
                              {char.name.charAt(0)}
                            </text>
                          </Show>

                          {/* Name label below */}
                          <text
                            x={p().x}
                            y={p().y + 34}
                            text-anchor="middle"
                            class="text-[11px] fill-fg-secondary select-none pointer-events-none"
                          >
                            {char.name}
                          </text>

                          {/* Edge handle for relationship creation (small circle at bottom-right) */}
                          <circle
                            cx={p().x + 16}
                            cy={p().y + 16}
                            r={6}
                            class="fill-accent/60 hover:fill-accent stroke-surface-raised cursor-crosshair transition-colors"
                            stroke-width={2}
                            onPointerDown={(e) => handleEdgeHandlePointerDown(char.id, e)}
                          />
                        </g>
                      </ContextMenu>
                    )}
                  </Show>
                )
              }}
            </For>
            </g>
          </svg>
        </Show>
      </div>

      {/* Relationship popover */}
      <Show when={popover()}>
        {(pop) => (
          <RelationshipPopover
            state={pop()}
            t={props.t}
            characters={ws.state.characters}
            onUpdate={(updates) => setPopover((prev) => (prev ? { ...prev, ...updates } : null))}
            onSubmit={handlePopoverSubmit}
            onClose={() => setPopover(null)}
          />
        )}
      </Show>
    </>
  )
}

/* ── Relationship popover ────────────────────────────────────────────── */

function RelationshipPopover(props: {
  state: PopoverState
  t: (k: string, params?: Record<string, string | number>) => string
  characters: Character[]
  onUpdate: (updates: Partial<PopoverState>) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const isEditing = () => props.state.editingRelId !== null
  const needsTarget = () => !isEditing() && !props.state.characterBId

  /* Close on outside click */
  let containerRef: HTMLDivElement | undefined

  const handleOutsideClick = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      props.onClose()
    }
  }

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose()
  }

  document.addEventListener('mousedown', handleOutsideClick, true)
  document.addEventListener('keydown', handleEscape, true)
  onCleanup(() => {
    document.removeEventListener('mousedown', handleOutsideClick, true)
    document.removeEventListener('keydown', handleEscape, true)
  })

  const visualTypes: { value: RelationshipVisual; label: string }[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'arrowed', label: 'Arrowed' },
  ]

  /* If creating via context menu, need to pick target character */
  const availableTargets = () =>
    props.characters.filter((c) => c.id !== props.state.characterAId)

  return (
    <Portal>
      <div
        ref={containerRef}
        class="fixed z-[9999] w-64 p-3 rounded-xl border border-border-default bg-surface-raised shadow-2xl shadow-black/40"
        style={{
          left: `${Math.min(props.state.x, window.innerWidth - 280)}px`,
          top: `${Math.min(props.state.y, window.innerHeight - 320)}px`,
        }}
      >
        {/* Target selector (only when creating from context menu with no target) */}
        <Show when={needsTarget()}>
          <label class="flex flex-col gap-1.5 mb-3">
            <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
              Target
            </span>
            <select
              class="h-8 px-2 rounded-lg text-sm bg-canvas border border-border-default text-fg focus:border-accent focus:outline-none"
              value={props.state.characterBId}
              onInput={(e) => props.onUpdate({ characterBId: e.currentTarget.value })}
            >
              <option value="" disabled>
                Select character...
              </option>
              <For each={availableTargets()}>
                {(c) => <option value={c.id}>{c.name}</option>}
              </For>
            </select>
          </label>
        </Show>

        {/* Label */}
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
            Relationship Label
          </span>
          <input
            type="text"
            class="h-8 px-2 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
            placeholder="e.g. rival, mentor, lover"
            value={props.state.label}
            onInput={(e) => props.onUpdate({ label: e.currentTarget.value })}
            autofocus
          />
        </label>

        {/* Visual type radio */}
        <fieldset class="mt-3">
          <legend class="text-xs font-medium text-fg-secondary uppercase tracking-wide mb-1.5">
            Type
          </legend>
          <div class="flex flex-col gap-1">
            <For each={visualTypes}>
              {(vt) => (
                <label class="flex items-center gap-2 text-sm text-fg cursor-pointer py-0.5">
                  <input
                    type="radio"
                    name="visualType"
                    value={vt.value}
                    checked={props.state.visualType === vt.value}
                    onInput={() => props.onUpdate({ visualType: vt.value })}
                    class="accent-accent"
                  />
                  {vt.label}
                </label>
              )}
            </For>
          </div>
        </fieldset>

        {/* Actions */}
        <div class="mt-3 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={props.onClose}>
            {props.t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!props.state.label.trim() || (needsTarget() && !props.state.characterBId)}
            onClick={props.onSubmit}
          >
            {isEditing() ? props.t('common.save') : props.t('common.add') || 'Create'}
          </Button>
        </div>
      </div>
    </Portal>
  )
}

/* ── Character card view ─────────────────────────────────────────────── */

function CharacterCard(props: {
  character: Character
  t: (k: string, params?: Record<string, string | number>) => string
  onBack: () => void
  onDeleted: () => void
  onCollapse?: () => void
}) {
  const ws = useWorkspace()
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false)

  function handleFieldInput(field: string, e: InputEvent & { currentTarget: HTMLTextAreaElement }) {
    ws.updateCharacter(props.character.id, { [field]: e.currentTarget.value })
  }

  function handleDelete() {
    ws.removeCharacter(props.character.id)
    props.onDeleted()
  }

  const fields = () =>
    [
      { key: 'name', labelKey: 'characters.name', value: props.character.name ?? '', rows: 1 },
      { key: 'personality', labelKey: 'characters.personality', value: props.character.personality ?? '', rows: 3 },
      { key: 'appearance', labelKey: 'characters.appearance', value: props.character.appearance ?? '', rows: 3 },
      { key: 'secrets', labelKey: 'characters.secrets', value: props.character.secrets ?? '', rows: 3 },
      { key: 'motivation', labelKey: 'characters.motivation', value: props.character.motivation ?? '', rows: 3 },
    ] as const

  return (
    <>
      {/* Header */}
      <div class="flex items-center justify-between px-4 h-10 border-b border-border-subtle flex-shrink-0">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={props.onBack}
            class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <IconArrowLeft size={16} />
          </button>
          <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
            {props.t('characters.title')}
          </span>
        </div>
        <Show when={props.onCollapse}>
          <button
            type="button"
            onClick={props.onCollapse}
            class="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label="Collapse character panel"
            aria-expanded={true}
          >
            <IconChevronLeft size={14} />
          </button>
        </Show>
      </div>

      {/* Card body */}
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar with upload */}
        <div class="flex flex-col items-center gap-2">
          <label class="relative cursor-pointer group">
            <Show
              when={props.character.profileImageUrl}
              fallback={
                <div class="w-16 h-16 rounded-full bg-surface-raised border-2 border-border-default flex items-center justify-center text-xl font-display font-semibold text-fg group-hover:border-accent/50 transition-colors">
                  {props.character.name?.charAt(0) ?? '?'}
                </div>
              }
            >
              <img
                src={props.character.profileImageUrl!}
                alt={props.character.name}
                class="w-16 h-16 rounded-full object-cover border-2 border-border-default group-hover:border-accent/50 transition-colors"
              />
            </Show>
            <div class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <IconPen size={14} class="text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              onChange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  ws.updateCharacter(props.character.id, {
                    profileImageUrl: reader.result as string,
                  })
                }
                reader.readAsDataURL(file)
              }}
            />
          </label>
        </div>

        {/* Editable fields */}
        <For each={fields()}>
          {(field) => (
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-fg-secondary uppercase tracking-wide">
                {props.t(field.labelKey)}
              </span>
              <textarea
                value={field.value}
                rows={field.rows}
                onInput={(e) => handleFieldInput(field.key, e)}
                class="px-3 py-2 rounded-lg text-sm bg-canvas border border-border-default text-fg placeholder:text-fg-muted resize-none hover:border-accent/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors"
              />
            </label>
          )}
        </For>

        {/* Delete button */}
        <Button
          variant="danger"
          size="sm"
          class="w-full mt-4"
          icon={<IconTrash size={14} />}
          onClick={() => setShowDeleteDialog(true)}
        >
          {props.t('characters.deleteCharacter')}
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteDialog()}
        onClose={() => setShowDeleteDialog(false)}
        title={`${props.t('characters.deleteCharacter')}`}
        description={`${props.t('characters.title')} '${props.character.name}' ${props.t('characters.deleteConfirmSuffix') || "을(를) 삭제하시겠습니까?"}`}
        confirmLabel={props.t('common.delete')}
        confirmVariant="danger"
        onConfirm={handleDelete}
      />
    </>
  )
}
