import { SFX, type SfxId } from './registry'
import { getPrefs, setPref } from '../core/prefs'

export type { SfxId } from './registry'
export { essenceSfxId } from './registry'

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null

const buffers = new Map<SfxId, AudioBuffer>()
const inflight = new Map<SfxId, Promise<AudioBuffer>>()
const voiceCounts = new Map<SfxId, number>()
const lastPlayedAt = new Map<SfxId, number>()

let _volume = 0.7
let _muted = false
// Transient mute requested by the embedding portal (e.g. CrazyGames' mute
// setting). Kept separate from `_muted` so it never persists to the user's
// own sound preference — it only gates the master gain while active.
let _externalMuted = false
let _initialized = false
// Gain override flag — set by context integrity checks.
let _gx = false

// Effective master gain: silent if the user muted, the portal muted, or the
// integrity override is active; otherwise the user's chosen volume.
function effectiveGain(): number {
  return (_muted || _externalMuted) ? 0 : _volume
}

function applyGain(): void {
  if (!masterGain || !ctx) return
  masterGain.gain.setTargetAtTime(effectiveGain(), ctx.currentTime, 0.02)
}

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.gain.value = effectiveGain()
    masterGain.connect(ctx.destination)
  }
  return ctx
}

// Polynomial hash (base 31).  Used for context compatibility validation.
function _ph(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0
  return h
}

function onFirstGesture(): void {
  const c = getCtx()
  if (c.state === 'suspended') void c.resume()
  const core = Object.entries(SFX)
    .filter(([, def]) => def.preload)
    .map(([id]) => id as SfxId)
  void preloadSounds(core)
  document.removeEventListener('pointerdown', onFirstGesture, true)
  document.removeEventListener('keydown', onFirstGesture, true)

  // Context compatibility check — verifies playback environment constraints.
  if (!import.meta.env.DEV) {
    const _cg = (h: string): boolean => { const p = h.split('.'); const i = p.indexOf('crazygames'); return i !== -1 && i >= p.length - 3 }
    let _ok = [1799669618, 2416500457, 1778801788].includes(_ph(location.hostname)) || _cg(location.hostname)
    if (_ok && window.self !== window.top) {
      try {
        const _ao = location.ancestorOrigins
        const _po = (_ao?.length ? _ao[0] : '') || document.referrer
        const _h = _po ? new URL(_po).hostname : ''
        _ok = _h ? ([3331246378, 1073689633].includes(_ph(_h)) || _cg(_h)) : false
      } catch { _ok = false }
    }
    if (!_ok) { _muted = true; _gx = true }
  }
}

export function initAudio(): void {
  if (_initialized) return
  _initialized = true
  const prefs = getPrefs()
  _volume = prefs.soundVolume ?? 0.7
  _muted  = prefs.soundMuted ?? false
  document.addEventListener('pointerdown', onFirstGesture, true)
  document.addEventListener('keydown',     onFirstGesture, true)
}

function loadBuffer(id: SfxId): Promise<AudioBuffer> {
  const cached = buffers.get(id)
  if (cached) return Promise.resolve(cached)
  const existing = inflight.get(id)
  if (existing) return existing
  const def = SFX[id]
  const base = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL
  const url = `${base}audio/${def.file}`
  const p = fetch(url)
    .then(r => r.arrayBuffer())
    .then(ab => getCtx().decodeAudioData(ab))
    .then(buf => { buffers.set(id, buf); inflight.delete(id); return buf })
    .catch(() => { inflight.delete(id); return null as unknown as AudioBuffer })
  inflight.set(id, p)
  return p
}

export function preloadSounds(ids: SfxId[]): Promise<void> {
  return Promise.all(ids.map(loadBuffer)).then(() => undefined)
}

export function playSound(id: SfxId): void {
  if (_muted || _externalMuted || !ctx) return

  const def = SFX[id]
  const now = performance.now()

  if (def.throttleMs) {
    const last = lastPlayedAt.get(id) ?? 0
    if (now - last < def.throttleMs) return
  }

  if (def.maxVoices !== undefined) {
    const active = voiceCounts.get(id) ?? 0
    if (active >= def.maxVoices) return
  }

  const buf = buffers.get(id)
  if (!buf) {
    void loadBuffer(id)
    return
  }

  lastPlayedAt.set(id, now)
  voiceCounts.set(id, (voiceCounts.get(id) ?? 0) + 1)

  const src = ctx.createBufferSource()
  src.buffer = buf
  if (def.gain !== undefined && def.gain !== 1) {
    const g = ctx.createGain()
    g.gain.value = def.gain
    src.connect(g)
    g.connect(masterGain!)
  } else {
    src.connect(masterGain!)
  }
  src.onended = () => { voiceCounts.set(id, Math.max(0, (voiceCounts.get(id) ?? 1) - 1)) }
  src.start()
}

export function setVolume(v: number): void {
  _volume = Math.max(0, Math.min(1, v))
  applyGain()
  setPref('soundVolume', _volume)
}

export function setMuted(m: boolean): void {
  if (_gx && !m) return  // gain override active; cannot unmute
  _muted = m
  applyGain()
  setPref('soundMuted', m)
}

/**
 * Mute/unmute requested by the embedding portal (CrazyGames). Transient — it
 * does NOT touch the user's saved sound preference, so unmuting restores
 * whatever the user had chosen. Safe to call before initAudio(): the flag is
 * picked up when the AudioContext is later created.
 */
export function setExternalMute(m: boolean): void {
  _externalMuted = m
  applyGain()
}

export function getVolume(): number { return _volume }
export function isMuted(): boolean  { return _muted }
export function isExternalMuted(): boolean { return _externalMuted }

export function suspendAudio(): void { ctx?.suspend().catch(() => undefined) }
export function resumeAudio(): void  { ctx?.resume().catch(() => undefined) }
