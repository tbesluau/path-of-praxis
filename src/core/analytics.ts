// Thin wrapper around Cloudflare Web Analytics custom events.
// The beacon script (injected by Cloudflare Pages or via the <script> tag in
// index.html) sets up window.cfAnalytics; calls here silently no-op if the
// beacon hasn't loaded yet, or in development builds.
declare global {
  interface Window {
    cfAnalytics?: { track?: (name: string, props?: Record<string, string>) => void }
  }
}

export function trackEvent(name: string, props?: Record<string, string>): void {
  if (import.meta.env.DEV) return
  try { window.cfAnalytics?.track?.(name, props) } catch { /* never surface */ }
}
