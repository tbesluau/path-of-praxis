import type { MasteryId, NodeType } from '../config/masteries'
import { masteryCategories, allMasteries, masteryXpNeeded, nodeType, previewMasteryGain } from '../config/masteries'
import type { MasteryDef, MasteryTreeDef } from '../config/masteries'
import { getNodeDescription } from '../config/mastery-nodes'
import type { MasteryProgress } from '../core/character'
import { masteryPointsAvailable, defaultMasteryNodes } from '../core/character'
import { linkifyNoteTerms, mountNoteModal } from './notes'

// ── Helpers ────────────────────────────────────────────────────────────────

// Renders the mastery progress bar with min-bar semantics:
// - 0 amount → empty (just the back-track)
// - any amount > 0 → at least a min-bar (caps clamped via CSS min-width)
// - both > 0 → the CSS :has() rule strips inner caps so yellow keeps only its
//   opening cap and green only its closing cap, each at 9px min-width.
// Both fills are absolutely positioned at the same percentage boundary so the
// yellow→green seam is exact and never leaks the back-track between them.
export function renderMasteryBar(oldPct: number, gainPct: number): string {
  const hasOld = oldPct > 0
  const hasGain = gainPct > 0
  const oldDiv = hasOld
    ? `<div class="mastery-bar-old" style="width:${oldPct}%"></div>`
    : ''
  // In paired mode the yellow fill has min-width: 9px, so its visual right
  // edge can exceed oldPct% when that percentage maps to fewer than 9px.
  // Position the green at max(oldPct%, 9px) so it never overlaps the yellow.
  const newLeft = hasOld && hasGain ? `max(${oldPct}%, 9px)` : `${oldPct}%`
  const newDiv = hasGain
    ? `<div class="mastery-bar-new" style="width:${gainPct}%;left:${newLeft}"></div>`
    : ''
  return `<div class="mastery-bar">${oldDiv}${newDiv}</div>`
}

function prog(
  masteryProgress: Partial<Record<MasteryId, MasteryProgress>>,
  id: MasteryId,
): MasteryProgress {
  const p = masteryProgress[id]
  if (p) return p
  return { xp: 0, level: 1, nodes: defaultMasteryNodes() }
}

function isNodeAssigned(p: MasteryProgress, treeIdx: number, nodeIdx: number): boolean {
  return (p.nodes[treeIdx] ?? []).includes(nodeIdx)
}

// Information about whether/how a node can be assigned.
//   assigned     — already taken
//   unavailable  — structural block (sibling key already chosen, or short-tree key 14/15)
//   assignable   — can be assigned now; `path` is the full ordered list of unassigned
//                  nodes to assign (the requested node is always last). `extra` is
//                  the count of additional intermediate nodes beyond the clicked one.
//   insufficient — path is computable but cost > totalAvailable
type AssignInfo =
  | { kind: 'assigned' }
  | { kind: 'unavailable'; reason: 'sibling' | 'shortKey' }
  | { kind: 'assignable'; path: number[]; extra: number; cost: number }
  | { kind: 'insufficient'; path: number[]; cost: number; available: number }

// Returns the ordered list of unassigned nodes that would be assigned to reach
// (and include) `nodeIdx`. Returns null with a structural-error tag when the
// node can never be reached from this state (sibling key already chosen, etc).
function computeAssignPath(
  p: MasteryProgress,
  treeDef: MasteryTreeDef,
  treeIdx: number,
  nodeIdx: number,
): number[] | { error: 'sibling' | 'shortKey' } {
  if (isNodeAssigned(p, treeIdx, nodeIdx)) return []
  const assigned = new Set(p.nodes[treeIdx] ?? [])
  const path: number[] = []
  if (nodeIdx < 12) {
    for (let i = 0; i <= nodeIdx; i++) {
      if (!assigned.has(i)) path.push(i)
    }
    return path
  }
  const majorLineIdx = nodeIdx <= 13 ? 5 : 11
  if (treeDef.short && majorLineIdx === 11) return { error: 'shortKey' }
  const siblingIdx = nodeIdx % 2 === 0 ? nodeIdx + 1 : nodeIdx - 1
  if (assigned.has(siblingIdx)) return { error: 'sibling' }
  for (let i = 0; i <= majorLineIdx; i++) {
    if (!assigned.has(i)) path.push(i)
  }
  path.push(nodeIdx)
  return path
}

function computeAssignInfo(
  p: MasteryProgress,
  treeDef: MasteryTreeDef,
  treeIdx: number,
  nodeIdx: number,
  totalAvailable: number,
): AssignInfo {
  if (isNodeAssigned(p, treeIdx, nodeIdx)) return { kind: 'assigned' }
  const result = computeAssignPath(p, treeDef, treeIdx, nodeIdx)
  if (!Array.isArray(result)) return { kind: 'unavailable', reason: result.error }
  const cost = result.length
  if (cost === 0) return { kind: 'assigned' }
  if (cost <= totalAvailable) return { kind: 'assignable', path: result, extra: cost - 1, cost }
  return { kind: 'insufficient', path: result, cost, available: totalAvailable }
}

// ── Reset Confirmation Modal ───────────────────────────────────────────────

function mountResetConfirmModal(
  parent: HTMLElement,
  masteryLabel: string,
  onConfirm: () => void,
  onClose: () => void,
  description = 'All assigned nodes will be cleared and you will lose 1 level in this mastery.',
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop mastery-node-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel mastery-node-panel" role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="reset-confirm-title">Reset ${masteryLabel}?</h2>
      <p class="node-detail-desc">${description}</p>
      <div class="node-detail-actions reset-confirm-actions">
        <button class="modal-btn modal-btn--ghost" data-action="cancel">Cancel</button>
        <button class="modal-btn modal-btn--danger" data-action="confirm">Reset</button>
      </div>
    </div>
  `
  parent.appendChild(backdrop)

  const dismiss = (): void => { backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })
  backdrop.querySelector<HTMLButtonElement>('[data-action="confirm"]')!.addEventListener('click', () => {
    onConfirm()
    dismiss()
  })

  return () => backdrop.remove()
}

// ── Node Detail Modal ──────────────────────────────────────────────────────

function mountNodeDetailModal(
  parent: HTMLElement,
  info: {
    treeLabel: string
    nodeIdx: number
    desc: string
    assignInfo: AssignInfo
  },
  onAssign: () => void,
  onClose: () => void,
): () => void {
  const typeLabelMap: Record<string, string> = { small: 'Small Node', strong: 'Strong Node', major: 'Major Node', key: 'Key Node' }
  const typeLabel = typeLabelMap[nodeType(info.nodeIdx)]

  let actionHtml = ''
  if (info.assignInfo.kind === 'assigned') {
    actionHtml = '<span class="node-detail-assigned">Assigned</span>'
  } else if (info.assignInfo.kind === 'assignable') {
    const label = info.assignInfo.extra > 0 ? `Assign (+${info.assignInfo.extra})` : 'Assign'
    actionHtml = `<button class="modal-btn modal-btn--primary node-detail-assign-btn" data-action="assign">${label}</button>`
  } else if (info.assignInfo.kind === 'insufficient') {
    const { cost, available } = info.assignInfo
    actionHtml = `<span class="node-detail-blocked">Need ${cost} mastery point${cost === 1 ? '' : 's'} (have ${available})</span>`
  } else {
    actionHtml = info.assignInfo.reason === 'sibling'
      ? '<span class="node-detail-blocked">Another key node already chosen</span>'
      : '<span class="node-detail-blocked">Node not available</span>'
  }

  const descHtml = linkifyNoteTerms(info.desc)

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop mastery-node-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel mastery-node-panel" role="dialog" aria-modal="true" aria-labelledby="node-detail-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="node-detail-title">${typeLabel}</h2>
      <p class="node-detail-tree">${info.treeLabel}</p>
      <p class="node-detail-desc">${descHtml}</p>
      <div class="node-detail-actions">${actionHtml}</div>
    </div>
  `
  parent.appendChild(backdrop)

  let noteCleanup: (() => void) | null = null
  const closeNote = (): void => { if (noteCleanup) { noteCleanup(); noteCleanup = null } }

  backdrop.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-note-id]')
    if (link) {
      const noteId = link.dataset.noteId!
      e.stopPropagation()
      closeNote()
      noteCleanup = mountNoteModal(parent, noteId, () => { noteCleanup = null })
      return
    }
    if (e.target === backdrop) dismiss()
  })

  const dismiss = (): void => { closeNote(); backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.querySelector<HTMLButtonElement>('[data-action="assign"]')?.addEventListener('click', () => {
    onAssign()
    dismiss()
  })

  return () => { closeNote(); backdrop.remove() }
}

// ── Tree Row Builder ───────────────────────────────────────────────────────

// Half-width (and half-height) of a node by index — used to extend bars
// center-to-center so the bar's ends sit hidden under the adjacent nodes.
function nodeHalfSize(nodeIdx: number): number {
  switch (nodeType(nodeIdx)) {
    case 'small':  return 12  // 24/2
    case 'strong': return 22  // 44/2
    case 'major':  return 36  // 72/2
    case 'key':    return 22  // 44/2
  }
}

const H_BAR_GAP = 20  // distance between adjacent node edges
const V_BAR_GAP = 16  // distance between major and key edges

function mkNode(treeIdx: number, nodeIdx: number, type: NodeType, assigned: boolean): HTMLElement {
  const node = document.createElement('div')
  node.className = `tree-node tree-node--${type}${assigned ? ' tree-node--assigned' : ''}`
  node.dataset['tree'] = String(treeIdx)
  node.dataset['node'] = String(nodeIdx)
  node.setAttribute('role', 'button')
  node.setAttribute('tabindex', '0')
  node.textContent = '+'
  return node
}

function buildTreeNodes(
  def: MasteryDef,
  treeDef: MasteryTreeDef,
  p: MasteryProgress,
  treeIdx: number,
  freePointsUsedHere: number,
  remainingFreePoints: number,
): HTMLElement {
  const container = document.createElement('div')
  container.className = 'mastery-tree-nodes'
  const totalAvailable = masteryPointsAvailable(p, freePointsUsedHere) + remainingFreePoints

  // Short trees end after the first major (line nodes 0-5; key nodes 12-13 only).
  const lastLineIdx = treeDef.short ? 5 : 11

  // Build line elements, inserting bars and major clusters at the right spots
  for (let lineIdx = 0; lineIdx <= lastLineIdx; lineIdx++) {
    const type = nodeType(lineIdx)

    if (type === 'major') {
      // Build the cluster: key-A / vbar / major / vbar / key-B + hbar to the right (unless last)
      const keyAIdx = lineIdx === 5 ? 12 : 14
      const keyBIdx = lineIdx === 5 ? 13 : 15
      const majorAssigned = isNodeAssigned(p, treeIdx, lineIdx)
      const keyAAssigned = isNodeAssigned(p, treeIdx, keyAIdx)
      const keyBAssigned = isNodeAssigned(p, treeIdx, keyBIdx)

      const cluster = document.createElement('div')
      cluster.className = 'tree-major-cluster'

      const keyA = mkNode(treeIdx, keyAIdx, 'key', keyAAssigned)
      const keyHalf = nodeHalfSize(keyAIdx)
      const majorHalf = nodeHalfSize(lineIdx)

      const vBarA = document.createElement('div')
      const vBarAFilled = majorAssigned && keyAAssigned
      vBarA.className = `tree-bar--v${vBarAFilled ? ' tree-bar--filled' : ''}`
      vBarA.dataset['barFrom'] = String(keyAIdx)
      vBarA.dataset['barTo'] = String(lineIdx)
      vBarA.style.height = `${keyHalf + V_BAR_GAP + majorHalf}px`
      vBarA.style.marginTop = `-${keyHalf}px`
      vBarA.style.marginBottom = `-${majorHalf}px`

      const majorNode = mkNode(treeIdx, lineIdx, 'major', majorAssigned)

      const vBarB = document.createElement('div')
      const vBarBFilled = majorAssigned && keyBAssigned
      vBarB.className = `tree-bar--v${vBarBFilled ? ' tree-bar--filled' : ''}`
      vBarB.dataset['barFrom'] = String(lineIdx)
      vBarB.dataset['barTo'] = String(keyBIdx)
      vBarB.style.height = `${majorHalf + V_BAR_GAP + keyHalf}px`
      vBarB.style.marginTop = `-${majorHalf}px`
      vBarB.style.marginBottom = `-${keyHalf}px`

      const keyB = mkNode(treeIdx, keyBIdx, 'key', keyBAssigned)

      cluster.append(keyA, vBarA, majorNode, vBarB, keyB)
      container.appendChild(cluster)
    } else {
      container.appendChild(mkNode(treeIdx, lineIdx, type, isNodeAssigned(p, treeIdx, lineIdx)))
    }

    // Add h-bar between this node and the next (not after the last). A bar is
    // filled (yellow) only when BOTH adjacent line nodes are assigned.
    if (lineIdx < lastLineIdx) {
      const leftHalf = nodeHalfSize(lineIdx)
      const rightHalf = nodeHalfSize(lineIdx + 1)
      const filled = isNodeAssigned(p, treeIdx, lineIdx) && isNodeAssigned(p, treeIdx, lineIdx + 1)
      const bar = document.createElement('div')
      bar.className = `tree-bar--h${filled ? ' tree-bar--filled' : ''}`
      bar.dataset['barFrom'] = String(lineIdx)
      bar.dataset['barTo'] = String(lineIdx + 1)
      bar.style.width = `${leftHalf + H_BAR_GAP + rightHalf}px`
      bar.style.marginLeft = `-${leftHalf}px`
      bar.style.marginRight = `-${rightHalf}px`
      container.appendChild(bar)
    }
  }

  // Hover preview: when hovering an unassigned node, color the bars along the
  // assignment path green up to whatever the user can afford right now.
  function applyPreviewFor(nodeIdx: number): void {
    const info = computeAssignInfo(p, treeDef, treeIdx, nodeIdx, totalAvailable)
    if (info.kind !== 'assignable' && info.kind !== 'insufficient') return
    const reachable = info.path.slice(0, totalAvailable)
    if (reachable.length === 0) return
    const reachableSet = new Set(reachable)
    container.querySelectorAll<HTMLElement>('[data-bar-from]').forEach(bar => {
      const from = parseInt(bar.dataset['barFrom']!, 10)
      const to = parseInt(bar.dataset['barTo']!, 10)
      const fromAssigned = isNodeAssigned(p, treeIdx, from)
      const toAssigned = isNodeAssigned(p, treeIdx, to)
      const fromInReach = fromAssigned || reachableSet.has(from)
      const toInReach = toAssigned || reachableSet.has(to)
      if (fromInReach && toInReach && !(fromAssigned && toAssigned)) {
        bar.classList.add('tree-bar--preview')
      }
    })
  }
  function clearPreview(): void {
    container.querySelectorAll<HTMLElement>('.tree-bar--preview').forEach(b => b.classList.remove('tree-bar--preview'))
  }

  // Wire click handlers and hover preview on all tree-node elements
  container.querySelectorAll<HTMLElement>('.tree-node').forEach(nodeEl => {
    const nodeIdx = parseInt(nodeEl.dataset['node']!, 10)
    const handleActivate = (): void => {
      const info = computeAssignInfo(p, treeDef, treeIdx, nodeIdx, totalAvailable)
      nodeEl.dispatchEvent(new CustomEvent('node-detail', {
        bubbles: true,
        detail: {
          treeIdx,
          nodeIdx,
          treeLabel: treeDef.label,
          desc: getNodeDescription(def.id, treeIdx, nodeIdx, treeDef.label),
          info,
        },
      }))
    }
    nodeEl.addEventListener('click', handleActivate)
    nodeEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate() }
    })
    if (!isNodeAssigned(p, treeIdx, nodeIdx)) {
      nodeEl.addEventListener('mouseenter', () => applyPreviewFor(nodeIdx))
      nodeEl.addEventListener('mouseleave', clearPreview)
      nodeEl.addEventListener('focus', () => applyPreviewFor(nodeIdx))
      nodeEl.addEventListener('blur', clearPreview)
    }
  })

  return container
}

// ── Mastery Tree Modal ─────────────────────────────────────────────────────

function mountMasteryTreeModal(
  parent: HTMLElement,
  def: MasteryDef,
  masteryProgress: Partial<Record<MasteryId, MasteryProgress>>,
  freeMasteryPointsUsed: Partial<Record<MasteryId, number>>,
  getRemainingFreePoints: () => number,
  ascentCount: number,
  onAssign: (treeIdx: number, nodeIdx: number) => void,
  onReset: () => void,
  onClose: () => void,
): () => void {
  const p = prog(masteryProgress, def.id)
  const visibleTrees = def.trees.filter(t => !t.unlockAscent || ascentCount >= t.unlockAscent)

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop mastery-tree-backdrop'

  const panel = document.createElement('div')
  panel.className = 'modal-panel mastery-tree-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'tree-modal-title')
  panel.innerHTML = `
    <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
    <h2 class="modal-title" id="tree-modal-title">${def.label}</h2>
    <p class="mastery-tree-points"></p>
    <div class="mastery-trees-list"></div>
    <div class="mastery-tree-footer">
      <button class="modal-btn modal-btn--danger mastery-reset-btn" data-action="reset">Reset (−1 level)</button>
    </div>
  `
  backdrop.appendChild(panel)

  const pointsEl = panel.querySelector<HTMLElement>('.mastery-tree-points')!
  const list = panel.querySelector<HTMLElement>('.mastery-trees-list')!
  const resetBtn = panel.querySelector<HTMLButtonElement>('.mastery-reset-btn')!

  const getFreeUsedHere = (): number => freeMasteryPointsUsed[def.id] ?? 0

  function updatePointsSummary(): void {
    const freshP = prog(masteryProgress, def.id)
    const freeUsed = getFreeUsedHere()
    const remaining = getRemainingFreePoints()
    const levelAvail = masteryPointsAvailable(freshP, freeUsed)
    const total = levelAvail + remaining
    const earned = Math.max(0, freshP.level - 1) + freeUsed + remaining
    const freePart = (freeUsed + remaining) > 0 ? ` (${freeUsed + remaining} free)` : ''
    pointsEl.textContent = `You have ${total} / ${earned} mastery point${earned !== 1 ? 's' : ''} to assign${freePart}`
    const freeUsedCurrent = getFreeUsedHere()
    resetBtn.disabled = freshP.level <= 1 && freeUsedCurrent === 0
  }

  updatePointsSummary()

  visibleTrees.forEach((treeDef) => {
    const entry = document.createElement('div')
    entry.className = 'mastery-tree-entry'
    const label = document.createElement('span')
    label.className = 'mastery-tree-label'
    label.textContent = treeDef.label
    entry.appendChild(label)
    entry.appendChild(buildTreeNodes(def, treeDef, p, treeDef.index, getFreeUsedHere(), getRemainingFreePoints()))
    list.appendChild(entry)
  })

  parent.appendChild(backdrop)

  let subCleanup: (() => void) | null = null
  function closeSub(): void { if (subCleanup) { subCleanup(); subCleanup = null } }

  // Handle node-detail events bubbled from tree nodes
  panel.addEventListener('node-detail', (e: Event) => {
    const detail = (e as CustomEvent).detail as {
      treeIdx: number; nodeIdx: number; treeLabel: string; desc: string
      info: AssignInfo
    }
    closeSub()
    subCleanup = mountNodeDetailModal(
      parent,
      { treeLabel: detail.treeLabel, nodeIdx: detail.nodeIdx, desc: detail.desc, assignInfo: detail.info },
      () => {
        if (detail.info.kind === 'assignable') {
          for (const nIdx of detail.info.path) onAssign(detail.treeIdx, nIdx)
        }
        subCleanup = null
        rebuildTrees()
      },
      () => { subCleanup = null },
    )
  })

  function rebuildTrees(): void {
    const freshP = prog(masteryProgress, def.id)
    list.innerHTML = ''
    visibleTrees.forEach((treeDef) => {
      const entry = document.createElement('div')
      entry.className = 'mastery-tree-entry'
      const labelEl = document.createElement('span')
      labelEl.className = 'mastery-tree-label'
      labelEl.textContent = treeDef.label
      entry.appendChild(labelEl)
      entry.appendChild(buildTreeNodes(def, treeDef, freshP, treeDef.index, getFreeUsedHere(), getRemainingFreePoints()))
      list.appendChild(entry)
    })
    updatePointsSummary()
  }

  resetBtn.addEventListener('click', () => {
    closeSub()
    const freshP = prog(masteryProgress, def.id)
    const willLoseLevel = freshP.level > 1
    const resetDesc = willLoseLevel
      ? 'All assigned nodes will be cleared and you will lose 1 level in this mastery.'
      : 'All assigned nodes will be cleared and your free mastery points will be returned.'
    subCleanup = mountResetConfirmModal(
      parent,
      def.label,
      () => {
        onReset()
        subCleanup = null
        rebuildTrees()
      },
      () => { subCleanup = null },
      resetDesc,
    )
  })

  const dismiss = (): void => { closeSub(); backdrop.remove(); onClose() }
  panel.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  return () => { closeSub(); backdrop.remove() }
}

// ── Mastery Modal (main list) ──────────────────────────────────────────────

export function mountMasteryModal(
  parent: HTMLElement,
  masteryProgress: Partial<Record<MasteryId, MasteryProgress>>,
  onClose: () => void,
  onAssign: (id: MasteryId, treeIdx: number, nodeIdx: number) => void,
  onReset: (id: MasteryId) => void,
  getPendingGains: () => Array<{ id: MasteryId; xpGain: number }>,
  levelsPerRebirth: number,
  ascentCount: number,
  freeMasteryPointsUsed: Partial<Record<MasteryId, number>>,
  getRemainingFreePoints: () => number,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel mastery-panel" role="dialog" aria-modal="true" aria-labelledby="mastery-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="mastery-title">Masteries</h2>
      <div class="mastery-categories"></div>
    </div>
  `
  parent.appendChild(backdrop)

  const categoriesEl = backdrop.querySelector<HTMLElement>('.mastery-categories')!

  let subCleanup: (() => void) | null = null
  function closeSub(): void { if (subCleanup) { subCleanup(); subCleanup = null } }

  interface RowState {
    oldPct: number
    gainPct: number
    levelsGained: number
    displayLevel: number
    capped: boolean
    pts: number
  }

  function computeVisibleRows(): Array<{ catLabel: string; id: MasteryId; label: string; state: RowState }> {
    const gainById = new Map(getPendingGains().map(g => [g.id, g.xpGain]))
    const out: Array<{ catLabel: string; id: MasteryId; label: string; state: RowState }> = []
    for (const cat of masteryCategories) {
      for (const m of cat.masteries) {
        const p = prog(masteryProgress, m.id)
        const xpGain = gainById.get(m.id) ?? 0
        if (m.id !== 'enemy' && m.id !== 'action' && p.level === 1 && p.xp === 0 && xpGain === 0) continue
        // Mastery is visible — include free points in available count
        const freeUsedHere = freeMasteryPointsUsed[m.id] ?? 0
        const pts = masteryPointsAvailable(p, freeUsedHere) + getRemainingFreePoints()
        let oldPct: number, gainPct: number, levelsGained: number, capped: boolean
        if (m.id === 'enemy' && xpGain > 0) {
          // xpGain is the new absolute level (sentinel for non-XP enemy mastery)
          levelsGained = Math.max(0, xpGain - p.level)
          oldPct = 0; gainPct = levelsGained > 0 ? 1 : 0
          capped = false
        } else if (xpGain > 0) {
          const pv = previewMasteryGain(p.xp, p.level, xpGain, p.level + levelsPerRebirth, m.id)
          oldPct = pv.oldPct; gainPct = pv.gainPct
          levelsGained = pv.levelsGained
          capped = levelsGained >= levelsPerRebirth
        } else {
          oldPct = Math.round((p.xp / masteryXpNeeded(p.level, m.id)) * 100)
          gainPct = 0; levelsGained = 0; capped = false
        }
        out.push({ catLabel: cat.label, id: m.id, label: m.label, state: { oldPct, gainPct, levelsGained, displayLevel: p.level, capped, pts } })
      }
    }
    return out
  }

  function applyRowState(rowEl: HTMLElement, label: string, s: RowState): void {
    const btnLabel = rowEl.querySelector<HTMLElement>('.mastery-name-label')!
    btnLabel.textContent = label
    const dot = rowEl.querySelector<HTMLElement>('.mastery-name-btn .notif-dot')!
    dot.hidden = s.pts === 0
    const barWrap = rowEl.querySelector<HTMLElement>('.mastery-bar-wrap')!
    barWrap.innerHTML = renderMasteryBar(s.oldPct, s.gainPct)
    const levelEl = rowEl.querySelector<HTMLElement>('.mastery-level')!
    const levelClasses = ['mastery-level']
    if (s.levelsGained > 0) levelClasses.push(s.capped ? 'mastery-level--capped' : 'mastery-level--gain')
    levelEl.className = levelClasses.join(' ')
    levelEl.innerHTML = `Lv.${s.displayLevel}${s.pts > 0 ? ` · <span class="mastery-pts">${s.pts}pt</span>` : ''}`
    const badge = rowEl.querySelector<HTMLElement>('.mastery-gain-badge')!
    if (s.levelsGained > 0) {
      badge.innerHTML = `+${s.levelsGained}<span class="notif-dot mastery-cap-dot" hidden></span>`
      badge.className = `mastery-gain-badge${s.capped ? ' mastery-gain-badge--capped' : ''}`
      badge.hidden = false
      badge.querySelector<HTMLElement>('.mastery-cap-dot')!.hidden = !s.capped
    } else { badge.hidden = true }
  }

  function wireRowButton(rowEl: HTMLElement): void {
    const btn = rowEl.querySelector<HTMLButtonElement>('.mastery-name-btn')!
    btn.addEventListener('click', () => {
      const id = btn.dataset['mastery'] as MasteryId
      const def = allMasteries.find(m => m.id === id)!
      closeSub()
      // The tree modal stays open across assigns/resets, so we must NOT clear
      // subCleanup in those callbacks — only when the tree modal itself closes.
      subCleanup = mountMasteryTreeModal(
        parent, def, masteryProgress, freeMasteryPointsUsed, getRemainingFreePoints, ascentCount,
        (treeIdx, nodeIdx) => { onAssign(id, treeIdx, nodeIdx); buildRows() },
        () => { onReset(id); buildRows() },
        () => { subCleanup = null },
      )
    })
  }

  // Full rebuild — replaces all category DOM. Triggered on first mount and when
  // the visible-mastery set changes (a new mastery becomes eligible).
  function buildRows(): void {
    const visible = computeVisibleRows()
    const byCategory = new Map<string, typeof visible>()
    for (const r of visible) {
      const list = byCategory.get(r.catLabel) ?? []
      list.push(r)
      byCategory.set(r.catLabel, list)
    }

    categoriesEl.innerHTML = ''
    for (const [catLabel, rows] of byCategory) {
      const catEl = document.createElement('div')
      catEl.className = 'mastery-category'
      const labelEl = document.createElement('div')
      labelEl.className = 'mastery-category-label'
      labelEl.textContent = catLabel
      catEl.appendChild(labelEl)
      for (const r of rows) {
        const rowEl = document.createElement('div')
        rowEl.className = 'mastery-row'
        rowEl.dataset['masteryId'] = r.id
        rowEl.innerHTML = `
          <button class="mastery-name-btn" data-mastery="${r.id}">
            <span class="mastery-name-label"></span>
            <span class="notif-dot" hidden></span>
          </button>
          <div class="mastery-bar-wrap"></div>
          <span class="mastery-level"></span>
          <span class="mastery-gain-badge" hidden></span>
        `
        applyRowState(rowEl, r.label, r.state)
        wireRowButton(rowEl)
        catEl.appendChild(rowEl)
      }
      categoriesEl.appendChild(catEl)
    }
  }

  // In-place refresh — only touches text/bar widths/hidden state, preserves
  // existing buttons (and their click handlers) so a click in flight isn't
  // dropped when the interval fires between mousedown and mouseup.
  function refreshRows(): void {
    const visible = computeVisibleRows()
    const newIds = visible.map(r => r.id)
    const currentRowEls = Array.from(categoriesEl.querySelectorAll<HTMLElement>('[data-mastery-id]'))
    const currentIds = currentRowEls.map(el => el.dataset['masteryId'] as MasteryId)
    const sameStructure = currentIds.length === newIds.length
      && currentIds.every((id, i) => id === newIds[i])
    if (!sameStructure) { buildRows(); return }
    for (let i = 0; i < visible.length; i++) {
      applyRowState(currentRowEls[i], visible[i].label, visible[i].state)
    }
  }

  buildRows()
  // Keep the gain preview fresh while the modal is open: XP keeps accruing
  // in the background, so refresh every 500 ms unless a sub-modal is open
  // (its own state is independent of these top-level rows).
  const refreshTimer = window.setInterval(() => { if (!subCleanup) refreshRows() }, 500)

  const dismiss = (): void => { window.clearInterval(refreshTimer); closeSub(); backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  return () => { window.clearInterval(refreshTimer); closeSub(); backdrop.remove() }
}
