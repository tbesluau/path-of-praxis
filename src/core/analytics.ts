// Cloudflare Zaraz custom event tracking, forwarded server-side to GA4.
// Zaraz is injected first-party at Cloudflare's edge and relays events to
// GA4 via the Measurement Protocol, so no google-analytics.com request is
// made in the browser — this survives the cross-origin galaxy.click iframe
// and most hostname-based tracker blockers. Configure the GA4 destination in
// the Cloudflare dashboard (pathofpraxis.com → Zaraz → Tools → Google
// Analytics 4, mapping these events as triggers). No script tag in index.html.
// Calls here are silent no-ops in development or before Zaraz loads.
//
// Every event carries a stable `user_id` (persisted in localStorage via
// prefs). Without it, Zaraz's edge relay attributes each Measurement Protocol
// hit to a fresh user/session — especially inside the cross-origin
// galaxy.click iframe, where Zaraz's own cookie storage is unreliable — so the
// dashboard saw a brand-new session on every call. A consistent user_id lets
// GA4 stitch events into real users and sessions. Map this field to the GA4
// user ID in the Cloudflare Zaraz dashboard.
import { getClientId } from './prefs'

declare global {
  interface Window {
    zaraz?: { track?: (name: string, props?: Record<string, string>) => void }
  }
}

export function trackEvent(name: string, props?: Record<string, string>): void {
  if (import.meta.env.DEV) return
  try { window.zaraz?.track?.(name, { user_id: getClientId(), ...props }) } catch { /* never surface */ }
}
