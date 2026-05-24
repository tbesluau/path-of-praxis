// Refuses to boot the game outside the canonical URLs (preventing rehosting
// and iframe embedding). Client-side checks like these are easily bypassed
// by a determined actor — the goal is to discourage casual misuse, not to
// be a security boundary.

const ALLOWED_HOSTS = [
  'tbesluau.github.io',
  'pathofpraxis.com',
  'www.pathofpraxis.com',
]

function isInIframe(): boolean {
  try {
    return window.top !== window.self
  } catch {
    // Cross-origin iframes throw on `window.top` access — treat as iframed.
    return true
  }
}

export function isAllowedToRun(): boolean {
  if (isInIframe()) return false
  if (import.meta.env.DEV) return true
  return ALLOWED_HOSTS.includes(location.hostname)
}
