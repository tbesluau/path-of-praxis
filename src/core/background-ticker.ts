// Drives a callback on a fixed interval even while the browser tab is hidden.
//
// Hidden tabs pause requestAnimationFrame entirely and throttle main-thread
// timers (clamped to ~1 Hz, then as low as ~1/min after a few minutes of
// "intensive throttling"). A dedicated Web Worker is exempt from the intensive
// throttle, so its setInterval keeps firing at ~1 Hz indefinitely while hidden —
// letting the game keep simulating in the background instead of freezing. If
// Worker construction fails (sandboxed/blocked), we fall back to a main-thread
// interval, which still ticks (just more aggressively throttled when hidden).

export interface BackgroundTicker {
  start(): void
  stop(): void
  dispose(): void
}

const WORKER_SRC = `
let id = null
onmessage = (e) => {
  const d = e.data
  if (d && d.type === 'start') {
    if (id !== null) clearInterval(id)
    id = setInterval(function () { postMessage(0) }, d.interval)
  } else if (d && d.type === 'stop') {
    if (id !== null) { clearInterval(id); id = null }
  }
}
`

export function createBackgroundTicker(onTick: () => void, intervalMs = 250): BackgroundTicker {
  let worker: Worker | null = null
  let url: string | null = null
  let fallbackId: ReturnType<typeof setInterval> | null = null
  let running = false

  try {
    url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'application/javascript' }))
    worker = new Worker(url)
    worker.onmessage = (): void => { if (running) onTick() }
  } catch {
    if (url) { URL.revokeObjectURL(url); url = null }
    worker = null
  }

  return {
    start(): void {
      if (running) return
      running = true
      if (worker) worker.postMessage({ type: 'start', interval: intervalMs })
      else fallbackId = setInterval(() => { if (running) onTick() }, intervalMs)
    },
    stop(): void {
      if (!running) return
      running = false
      if (worker) worker.postMessage({ type: 'stop' })
      else if (fallbackId !== null) { clearInterval(fallbackId); fallbackId = null }
    },
    dispose(): void {
      running = false
      if (worker) { worker.terminate(); worker = null }
      if (fallbackId !== null) { clearInterval(fallbackId); fallbackId = null }
      if (url) { URL.revokeObjectURL(url); url = null }
    },
  }
}
