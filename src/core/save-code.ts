import { exportSaveData, importSaveData } from './character'

// Human-recognisable tag so a pasted blob is obviously a Path of Praxis save
// and so we can reject unrelated text quickly. Bumped only on a breaking change
// to the envelope format (the inner `v` tracks the save schema version).
const PREFIX = 'POP1'

// Base64 of the UTF-8 bytes — handles non-ASCII characters in character names
// that plain btoa(str) would choke on.
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

interface SaveEnvelope {
  v: 1
  save: ReturnType<typeof exportSaveData>
}

// Produce a portable, copy-pasteable code that encodes every save slot.
export function exportSaveCode(): string {
  const envelope: SaveEnvelope = { v: 1, save: exportSaveData() }
  return PREFIX + utf8ToBase64(JSON.stringify(envelope))
}

// Decode a save code and replace the current save with it. Returns false for
// any malformed input (bad base64, wrong tag, unknown version, invalid shape)
// without touching existing data.
export function importSaveCode(code: string): boolean {
  try {
    let cleaned = code.trim().replace(/\s+/g, '')
    if (cleaned.startsWith(PREFIX)) cleaned = cleaned.slice(PREFIX.length)
    if (!cleaned) return false
    const envelope = JSON.parse(base64ToUtf8(cleaned)) as Partial<SaveEnvelope>
    if (envelope.v !== 1 || typeof envelope.save !== 'object' || envelope.save === null) return false
    importSaveData(envelope.save)
    return true
  } catch {
    return false
  }
}
