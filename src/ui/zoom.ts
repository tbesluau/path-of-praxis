export const ZOOM_STEPS = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2] as const
export const ZOOM_DEFAULT_INDEX = 4

export function indexFromZoom(zoom: number): number {
  let bestIdx = ZOOM_DEFAULT_INDEX
  let bestDiff = Infinity
  for (let i = 0; i < ZOOM_STEPS.length; i++) {
    const diff = Math.abs(ZOOM_STEPS[i] - zoom)
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i }
  }
  return bestIdx
}
