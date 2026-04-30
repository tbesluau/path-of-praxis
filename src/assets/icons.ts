import { Assets, type Texture } from 'pixi.js'
import { iconToSVG } from '@iconify/utils'
import gameIconSet from '@iconify-json/game-icons/icons.json'

const cache = new Map<string, Promise<Texture>>()

export function iconTexture(name: string, size = 128): Promise<Texture> {
  const key = `${name}@${size}`
  const cached = cache.get(key)
  if (cached) return cached

  const data = (gameIconSet.icons as Record<string, { body: string; width?: number; height?: number }>)[name]
  if (!data) throw new Error(`game-icons: missing icon "${name}"`)

  const built = iconToSVG(
    { body: data.body, width: data.width ?? gameIconSet.width, height: data.height ?? gameIconSet.height },
    { width: size.toString(), height: size.toString() },
  )
  // Replace currentColor with white so PixiJS sprite.tint works correctly.
  const body = built.body.replace(/currentColor/g, '#ffffff')
  const attrs = Object.entries(built.attributes).map(([k, v]) => `${k}="${v}"`).join(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

  const promise = Assets.load<Texture>(url)
  cache.set(key, promise)
  return promise
}
