import type { MasteryId } from '../config/masteries'
import { masteryCategories, allMasteries, masteryXpNeeded, nodeType, nodeDescription } from '../config/masteries'
import type { MasteryDef, MasteryTreeDef } from '../config/masteries'
import type { MasteryProgress } from '../core/character'
import { masteryPointsAvailable, defaultMasteryNodes } from '../core/character'

// ── Helpers ────────────────────────────────────────────────────────────────

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
    if (!assigned.includes(majorLineIdx)) return 'complete previous nodes first'
    // Mutual exclusion: sibling key
    const siblingIdx = nodeIdx % 2 === 0 ? nodeIdx + 1 : nodeIdx - 1
    if (assigned.includes(siblingIdx)) return 'another key already chosen'
  }
  return null
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

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop mastery-node-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel mastery-node-panel" role="dialog" aria-modal="true" aria-labelledby="node-detail-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="node-detail-title">${typeLabel}</h2>
      <p class="node-detail-tree">${info.treeLabel}</p>
      <p class="node-detail-desc">${info.desc}</p>
      <div class="node-detail-actions">${actionHtml}</div>
    </div>
  `
  parent.appendChild(backdrop)

  const dismiss = (): void => { backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })
  backdrop.querySelector<HTMLButtonElement>('[data-action="assign"]')?.addEventListener('click', () => {
    onAssign()
    dismiss()
  })

  return () => backdrop.remove()
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
  _def: MasteryDef,
  treeDef: MasteryTreeDef,
  p: MasteryProgress,
  treeIdx: number,
): HTMLElement {
  const container = document.createElement('div')
  container.className = 'mastery-tree-nodes'

  // Build 12 line elements, inserting bars and major clusters at the right spots
  for (let lineIdx = 0; lineIdx < 12; lineIdx++) {
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
    if (lineIdx < 11) {
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
      const reason = assignBlockReason(p, treeIdx, nodeIdx)
      const isAssigned = isNodeAssigned(p, treeIdx, nodeIdx)
      nodeEl.dispatchEvent(new CustomEvent('node-detail', {
        bubbles: true,
        detail: {
          treeIdx,
          nodeIdx,
          treeLabel: treeDef.label,
          desc: nodeDescription(treeDef, nodeIdx),
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
    <div class="mastery-trees-list"></div>
  `
  backdrop.appendChild(panel)

  const list = panel.querySelector<HTMLElement>('.mastery-trees-list')!
  def.trees.forEach((treeDef, treeIdx) => {
    const entry = document.createElement('div')
    entry.className = 'mastery-tree-entry'
    const label = document.createElement('span')
    label.className = 'mastery-tree-label'
    label.textContent = treeDef.label
    entry.appendChild(label)
    entry.appendChild(buildTreeNodes(def, treeDef, p, treeIdx))
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
        // Rebuild tree rows to reflect new assignment
        rebuildTrees()
      },
      () => { subCleanup = null },
    )
  })

  function rebuildTrees(): void {
    const freshP = prog(masteryProgress, def.id)
    list.innerHTML = ''
    def.trees.forEach((treeDef, treeIdx) => {
      const entry = document.createElement('div')
      entry.className = 'mastery-tree-entry'
      const labelEl = document.createElement('span')
      labelEl.className = 'mastery-tree-label'
      labelEl.textContent = treeDef.label
      entry.appendChild(labelEl)
      entry.appendChild(buildTreeNodes(def, treeDef, freshP, treeIdx))
      list.appendChild(entry)
    })
  }

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
): () => void {
  const categoriesHtml = masteryCategories.map(cat => {
    const rows = cat.masteries.map(m => {
      const p = prog(masteryProgress, m.id)
      const xpPct = Math.round((p.xp / masteryXpNeeded(p.level)) * 100)
      const pts = masteryPointsAvailable(p)
      return `
        <div class="mastery-row">
          <div class="mastery-bar"><div class="mastery-bar-fill" style="width:${xpPct}%"></div></div>
          <button class="mastery-name-btn" data-mastery="${m.id}">
            ${m.label}${pts > 0 ? '<span class="notif-dot"></span>' : ''}
          </button>
          <span class="mastery-level">Lv.${p.level}</span>
        </div>`
    }).join('')
    return `
      <div class="mastery-category">
        <div class="mastery-category-label">${cat.label}</div>
        ${rows}
      </div>`
  }).join('')

  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal-panel mastery-panel" role="dialog" aria-modal="true" aria-labelledby="mastery-title">
      <button class="modal-close-btn" data-action="close" aria-label="Close"></button>
      <h2 class="modal-title" id="mastery-title">Masteries</h2>
      <div class="mastery-categories">${categoriesHtml}</div>
    </div>
  `
  parent.appendChild(backdrop)

  let subCleanup: (() => void) | null = null
  function closeSub(): void { if (subCleanup) { subCleanup(); subCleanup = null } }

  backdrop.querySelectorAll<HTMLButtonElement>('.mastery-name-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset['mastery'] as MasteryId
      const def = allMasteries.find(m => m.id === id)!
      closeSub()
      subCleanup = mountMasteryTreeModal(
        parent,
        def,
        masteryProgress,
        (treeIdx, nodeIdx) => {
          onAssign(id, treeIdx, nodeIdx)
          subCleanup = null
        },
        () => { subCleanup = null },
      )
    })
  })

  const dismiss = (): void => { closeSub(); backdrop.remove(); onClose() }
  backdrop.querySelector<HTMLButtonElement>('[data-action="close"]')!.addEventListener('click', dismiss)
  backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss() })

  return () => { closeSub(); backdrop.remove() }
}
