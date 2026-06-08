// Google Analytics 4 custom event tracking.
// gtag.js is loaded in index.html. Calls here are silent no-ops in
// development or before the script loads.
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?(...args: unknown[]): void
  }
}

export function trackEvent(name: string, props?: Record<string, string>): void {
  if (import.meta.env.DEV) return
  try { window.gtag?.('event', name, props) } catch { /* never surface */ }
}
