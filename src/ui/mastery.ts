import type { MasteryId } from '../config/masteries'
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

// Returns null if assignable, or a string reason why not.
function assignBlockReason(
  p: MasteryProgress,
  treeDef: MasteryTreeDef,
  treeIdx: number,
  nodeIdx: number,
): string | null {
  if (isNodeAssigned(p, treeIdx, nodeIdx)) return 'already assigned'
  if (masteryPointsAvailable(p) <= 0) return 'no mastery points'
  const assigned = p.nodes[treeIdx] ?? []
  if (nodeIdx < 12) {
    // Line node: all previous must be assigned
    for (let i = 0; i < nodeIdx; i++) {
      if (!assigned.includes(i)) return 'complete previous nodes first'
    }
  } else {
    // Key node: determine parent major (node 5 or 11) and sibling
    const majorLineIdx = nodeIdx <= 13 ? 5 : 11
    // Short trees don't have a second major; key nodes 14/15 are invalid
    if (treeDef.short && majorLineIdx === 11) return 'node not available'
    if (!assigned.includes(majorLineIdx)) return 'complete previous nodes first'
    // Mutual exclusion: sibling key
    const siblingIdx = nodeIdx % 2 === 0 ? nodeIdx + 1 : nodeIdx - 1
    if (assigned.includes(siblingIdx)) return 'another key already chosen'
  }
  return null
}

// ── Reset Confirmation Modal ───────────────────────────────────────────────

function mountResetConfirmModal(
  parent: HTMLElement,
  masteryLabel: string,
  onConfirm: () => void,
  onClose: () => void,
): () => void {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop mastery-node-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel mastery-node-panel" role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="reset-confirm-title">Reset ${masteryLabel}?</h2>
      <p class="node-detail-desc">All assigned nodes will be cleared and you will lose 1 level in this mastery.</p>
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
    isAssigned: boolean
    blockReason: string | null
  },
  onAssign: () => void,
  onClose: () => void,
): () => void {
  const typeLabelMap: Record<string, string> = { small: 'Small Node', strong: 'Strong Node', major: 'Major Node', key: 'Key Node' }
  const typeLabel = typeLabelMap[nodeType(info.nodeIdx)]

  let actionHtml = ''
  if (info.isAssigned) {
    actionHtml = '<span class="node-detail-assigned">Assigned</span>'
  } else if (info.blockReason === null) {
    actionHtml = '<button class="modal-btn modal-btn--primary node-detail-assign-btn" data-action="assign">Assign</button>'
  } else {
    actionHtml = `<span class="node-detail-blocked">${info.blockReason === 'no mastery points' ? 'No mastery points available' : info.blockReason === 'another key already chosen' ? 'Another key node already chosen' : 'Complete previous nodes first'}</span>`
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

// Returns whether the h-bar to the right of lineIdx should be filled.
// A bar is filled when the node to its left is assigned.
function hBarFilled(p: MasteryProgress, treeIdx: number, leftLineIdx: number): boolean {
  return isNodeAssigned(p, treeIdx, leftLineIdx)
}

function buildTreeNodes(
  def: MasteryDef,
  treeDef: MasteryTreeDef,
  p: MasteryProgress,
  treeIdx: number,
): HTMLElement {
  const container = document.createElement('div')
  container.className = 'mastery-tree-nodes'

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

      const keyA = document.createElement('div')
      keyA.className = `tree-node tree-node--key${keyAAssigned ? ' tree-node--assigned' : ''}`
      keyA.dataset['tree'] = String(treeIdx)
      keyA.dataset['node'] = String(keyAIdx)
      keyA.setAttribute('role', 'button')
      keyA.setAttribute('tabindex', '0')
      keyA.textContent = '+'

      const keyHalf = nodeHalfSize(keyAIdx)
      const majorHalf = nodeHalfSize(lineIdx)

      const vBarA = document.createElement('div')
      vBarA.className = `tree-bar--v${majorAssigned ? ' tree-bar--filled' : ''}`
      vBarA.style.height = `${keyHalf + V_BAR_GAP + majorHalf}px`
      vBarA.style.marginTop = `-${keyHalf}px`
      vBarA.style.marginBottom = `-${majorHalf}px`

      const majorNode = document.createElement('div')
      majorNode.className = `tree-node tree-node--major${majorAssigned ? ' tree-node--assigned' : ''}`
      majorNode.dataset['tree'] = String(treeIdx)
      majorNode.dataset['node'] = String(lineIdx)
      majorNode.setAttribute('role', 'button')
      majorNode.setAttribute('tabindex', '0')
      majorNode.textContent = '+'

      const vBarB = document.createElement('div')
      vBarB.className = `tree-bar--v${majorAssigned ? ' tree-bar--filled' : ''}`
      vBarB.style.height = `${majorHalf + V_BAR_GAP + keyHalf}px`
      vBarB.style.marginTop = `-${majorHalf}px`
      vBarB.style.marginBottom = `-${keyHalf}px`

      const keyB = document.createElement('div')
      keyB.className = `tree-node tree-node--key${keyBAssigned ? ' tree-node--assigned' : ''}`
      keyB.dataset['tree'] = String(treeIdx)
      keyB.dataset['node'] = String(keyBIdx)
      keyB.setAttribute('role', 'button')
      keyB.setAttribute('tabindex', '0')
      keyB.textContent = '+'

      cluster.append(keyA, vBarA, majorNode, vBarB, keyB)
      container.appendChild(cluster)
    } else {
      const node = document.createElement('div')
      node.className = `tree-node tree-node--${type}${isNodeAssigned(p, treeIdx, lineIdx) ? ' tree-node--assigned' : ''}`
      node.dataset['tree'] = String(treeIdx)
      node.dataset['node'] = String(lineIdx)
      node.setAttribute('role', 'button')
      node.setAttribute('tabindex', '0')
      node.textContent = '+'
      container.appendChild(node)
    }

    // Add h-bar between this node and the next (not after the last).
    // Bar extends center-to-center: layout width is H_BAR_GAP, but the bar
    // visually grows past it (overlapping into adjacent nodes) via negative
    // margins; nodes' z-index covers the overlap.
    if (lineIdx < lastLineIdx) {
      const leftHalf = nodeHalfSize(lineIdx)
      const rightHalf = nodeHalfSize(lineIdx + 1)
      const bar = document.createElement('div')
      bar.className = `tree-bar--h${hBarFilled(p, treeIdx, lineIdx) ? ' tree-bar--filled' : ''}`
      bar.style.width = `${leftHalf + H_BAR_GAP + rightHalf}px`
      bar.style.marginLeft = `-${leftHalf}px`
      bar.style.marginRight = `-${rightHalf}px`
      container.appendChild(bar)
    }
  }

  // Wire click handlers on all tree-node elements
  container.querySelectorAll<HTMLElement>('.tree-node').forEach(nodeEl => {
    const handleActivate = (): void => {
      const nodeIdx = parseInt(nodeEl.dataset['node']!, 10)
      const reason = assignBlockReason(p, treeDef, treeIdx, nodeIdx)
      const isAssigned = isNodeAssigned(p, treeIdx, nodeIdx)
      nodeEl.dispatchEvent(new CustomEvent('node-detail', {
        bubbles: true,
        detail: {
          treeIdx,
          nodeIdx,
          treeLabel: treeDef.label,
          desc: getNodeDescription(def.id, treeIdx, nodeIdx, treeDef.label),
          isAssigned,
          blockReason: isAssigned ? null : reason,
        },
      }))
    }
    nodeEl.addEventListener('click', handleActivate)
    nodeEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate() }
    })
  })

  return container
}

// ── Mastery Tree Modal ─────────────────────────────────────────────────────

function mountMasteryTreeModal(
  parent: HTMLElement,
  def: MasteryDef,
  masteryProgress: Partial<Record<MasteryId, MasteryProgress>>,
  onAssign: (treeIdx: number, nodeIdx: number) => void,
  onReset: () => void,
  onClose: () => void,
): () => void {
  const p = prog(masteryProgress, def.id)

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

  function updatePointsSummary(): void {
    const freshP = prog(masteryProgress, def.id)
    const available = masteryPointsAvailable(freshP)
    const earned = Math.max(0, freshP.level - 1)
    pointsEl.textContent = `You have ${available} / ${earned} mastery point${earned !== 1 ? 's' : ''} to assign`
    resetBtn.disabled = freshP.level <= 1
  }

  updatePointsSummary()

  def.trees.forEach((treeDef) => {
    const entry = document.createElement('div')
    entry.className = 'mastery-tree-entry'
    const label = document.createElement('span')
    label.className = 'mastery-tree-label'
    label.textContent = treeDef.label
    entry.appendChild(label)
    entry.appendChild(buildTreeNodes(def, treeDef, p, treeDef.index))
    list.appendChild(entry)
  })

  parent.appendChild(backdrop)

  let subCleanup: (() => void) | null = null
  function closeSub(): void { if (subCleanup) { subCleanup(); subCleanup = null } }

  // Handle node-detail events bubbled from tree nodes
  panel.addEventListener('node-detail', (e: Event) => {
    const detail = (e as CustomEvent).detail as {
      treeIdx: number; nodeIdx: number; treeLabel: string; desc: string
      isAssigned: boolean; blockReason: string | null
    }
    closeSub()
    subCleanup = mountNodeDetailModal(
      parent,
      { treeLabel: detail.treeLabel, nodeIdx: detail.nodeIdx, desc: detail.desc, isAssigned: detail.isAssigned, blockReason: detail.blockReason },
      () => {
        onAssign(detail.treeIdx, detail.nodeIdx)
        subCleanup = null
        rebuildTrees()
      },
      () => { subCleanup = null },
    )
  })

  function rebuildTrees(): void {
    const freshP = prog(masteryProgress, def.id)
    list.innerHTML = ''
    def.trees.forEach((treeDef) => {
      const entry = document.createElement('div')
      entry.className = 'mastery-tree-entry'
      const labelEl = document.createElement('span')
      labelEl.className = 'mastery-tree-label'
      labelEl.textContent = treeDef.label
      entry.appendChild(labelEl)
      entry.appendChild(buildTreeNodes(def, treeDef, freshP, treeDef.index))
      list.appendChild(entry)
    })
    updatePointsSummary()
  }

  resetBtn.addEventListener('click', () => {
    closeSub()
    subCleanup = mountResetConfirmModal(
      parent,
      def.label,
      () => {
        onReset()
        subCleanup = null
        rebuildTrees()
      },
      () => { subCleanup = null },
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

  function buildRows(): void {
    const gainById = new Map(getPendingGains().map(g => [g.id, g.xpGain]))
    categoriesEl.innerHTML = masteryCategories.flatMap(cat => {
      const rows = cat.masteries.flatMap(m => {
        const p = prog(masteryProgress, m.id)
        const pts = masteryPointsAvailable(p)
        const xpGain = gainById.get(m.id) ?? 0
        if (m.id !== 'enemy' && p.level === 1 && p.xp === 0 && xpGain === 0) return []
        let oldPct: number, gainPct: number, levelsGained: number, displayLevel: number
        if (xpGain > 0) {
          const pv = previewMasteryGain(p.xp, p.level, xpGain, p.level + levelsPerRebirth)
          oldPct = pv.oldPct; gainPct = pv.gainPct
          levelsGained = pv.levelsGained; displayLevel = pv.toLv
        } else {
          oldPct = Math.round((p.xp / masteryXpNeeded(p.level)) * 100)
          gainPct = 0; levelsGained = 0; displayLevel = p.level
        }
        return [`
          <div class="mastery-row">
            <button class="mastery-name-btn" data-mastery="${m.id}">
              ${m.label}${pts > 0 ? '<span class="notif-dot"></span>' : ''}
            </button>
            ${renderMasteryBar(oldPct, gainPct)}
            <span class="mastery-level${levelsGained > 0 ? ' mastery-level--gain' : ''}">Lv.${displayLevel}${pts > 0 ? ` · <span class="mastery-pts">${pts}pt</span>` : ''}</span>
            ${levelsGained > 0 ? `<span class="mastery-gain-badge">+${levelsGained}</span>` : ''}
          </div>`]
      })
      if (rows.length === 0) return []
      return [`
        <div class="mastery-category">
          <div class="mastery-category-label">${cat.label}</div>
          ${rows.join('')}
        </div>`]
    }).join('')

    // Wire mastery-name buttons (open tree modal)
    categoriesEl.querySelectorAll<HTMLButtonElement>('.mastery-name-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['mastery'] as MasteryId
        const def = allMasteries.find(m => m.id === id)!
        closeSub()
        // The tree modal stays open across assigns/resets, so we must NOT clear
        // subCleanup in those callbacks — only when the tree modal itself closes.
        subCleanup = mountMasteryTreeModal(
          parent, def, masteryProgress,
          (treeIdx, nodeIdx) => { onAssign(id, treeIdx, nodeIdx); buildRows() },
          () => { onReset(id); buildRows() },
          () => { subCleanup = null },
        )
      })
    })
  }

  buildRows()
  // Keep the gain preview fresh while the modal is open: XP keeps accruing
  // in the background, so refresh every 500 ms unless a sub-modal is open
  // (its own state is independent of these top-level rows).
  const refreshTimer = window.setInterval(() => { if (!subCleanup) buildRows() }, 500)

  const dismiss = (): void => { window.clearInterval(refreshTimer); closeSub(); backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  return () => { window.clearInterval(refreshTimer); closeSub(); backdrop.remove() }
}
