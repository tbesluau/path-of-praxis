// Cloudflare Zaraz custom event tracking.
// Zaraz is injected automatically at the edge when enabled in the Cloudflare
// dashboard (pathofpraxis.com → Zaraz). No script tag needed in index.html.
// Calls here are silent no-ops in development or before Zaraz loads.
declare global {
  interface Window {
    zaraz?: { track?: (name: string, props?: Record<string, string>) => void }
  }
}

export function trackEvent(name: string, props?: Record<string, string>): void {
  if (import.meta.env.DEV) return
  try { window.zaraz?.track?.(name, props) } catch { /* never surface */ }
}
