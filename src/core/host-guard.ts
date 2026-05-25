// Refuses to boot the game outside the canonical URLs (preventing rehosting
// and arbitrary iframe embedding). Client-side checks like these are easily
// bypassed by a determined actor — the goal is to discourage casual misuse,
// not to be a security boundary.

const ALLOWED_HOSTS = [
  'tbesluau.github.io',
  'pathofpraxis.com',
  'www.pathofpraxis.com',
]

// Parent-document hostnames that are allowed to iframe the game.
const ALLOWED_IFRAME_PARENT_HOSTS = [
  'galaxy.click',
  'www.galaxy.click',
]

function isInIframe(): boolean {
  try {
    return window.top !== window.self
  } catch {
    // Cross-origin iframes throw on `window.top` access — treat as iframed.
    return true
  }
}

// Best-effort lookup of the immediate parent's hostname.
// `ancestorOrigins` is the reliable path (works cross-origin where
// `window.top.location` does not); we fall back to `document.referrer`
// for Firefox, which still lacks it.
function parentHost(): string | null {
  const origins = location.ancestorOrigins
  if (origins && origins.length > 0) {
    try { return new URL(origins[0]).hostname } catch { /* fall through */ }
  }
  if (document.referrer) {
    try { return new URL(document.referrer).hostname } catch { /* fall through */ }
  }
  return null
}

export function isAllowedToRun(): boolean {
  if (import.meta.env.DEV) return true
  if (!ALLOWED_HOSTS.includes(location.hostname)) return false
  if (isInIframe()) {
    const host = parentHost()
    return host !== null && ALLOWED_IFRAME_PARENT_HOSTS.includes(host)
  }
  return true
}
