import { type RefObject, useLayoutEffect, useRef } from 'react'

const SLIDE_MS = 240
const TURN_GREEN_MS = 200
const CROSSFADE_MS = 120
/** ease-out-quart */
const EASE_OUT_QUART = 'cubic-bezier(0.25, 1, 0.5, 1)'

type Rects = { laptop: DOMRect | null; server: DOMRect | null }

const iconRect = (root: HTMLElement, marker: string) =>
  root.querySelector(`[data-sync="${marker}"] svg`)?.getBoundingClientRect() ?? null

/**
 * Delight 3, "The moment you and the server agree" (Figma 2925:25499 annotation):
 * when a push (or pull) finishes, the server marker slides from its row to join the laptop
 * marker (240ms, ease-out-quart), then the pair turns green and reads "In sync".
 * With reduced motion the markers swap in place with a 120ms crossfade.
 *
 * FLIP: every commit records where the separate markers are; on the commit where the rail
 * becomes in sync, the merged marker's icons start at those old spots and animate home.
 */
export function useSyncMotion(root: RefObject<HTMLElement | null>, inSync: boolean) {
  const last = useRef<Rects>({ laptop: null, server: null })
  const wasInSync = useRef(inSync)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return

    if (inSync && !wasInSync.current) {
      const marker = el.querySelector<HTMLElement>('[data-sync="in-sync"]')
      if (marker) play(marker, last.current)
    }
    wasInSync.current = inSync
    last.current = { laptop: iconRect(el, 'newest-here'), server: iconRect(el, 'newest-on-server') }
  })
}

function play(marker: HTMLElement, from: Rects) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    marker.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CROSSFADE_MS, easing: 'linear' })
    return
  }

  for (const part of ['laptop', 'server'] as const) {
    const icon = marker.querySelector<SVGElement>(`[data-sync-part="${part}"]`)
    const start = from[part]
    if (!icon || !start) continue
    const end = icon.getBoundingClientRect()
    const dx = start.left - end.left
    const dy = start.top - end.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
    icon.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration: SLIDE_MS,
      easing: EASE_OUT_QUART,
    })
  }

  // Then the pair turns green and the label appears.
  const css = getComputedStyle(document.documentElement)
  const muted = css.getPropertyValue('--muted-foreground-strong').trim()
  const green = css.getPropertyValue('--success-foreground').trim()
  const turn = { delay: SLIDE_MS, duration: TURN_GREEN_MS, easing: 'ease-out', fill: 'backwards' as const }
  marker.animate([{ color: muted }, { color: green }], turn)
  marker.querySelector('[data-sync-part="label"]')?.animate([{ opacity: 0 }, { opacity: 1 }], turn)
}
