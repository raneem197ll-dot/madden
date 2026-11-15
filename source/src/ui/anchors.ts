/**
 * Screen-space anchors: DOM elements that follow a 3D point. The canvas-side
 * <LabelProjector/> moves every registered element each frame (no React work), hides
 * labels that would overlap a more important one, and marks far-away labels "compact".
 */
export interface AnchorOpts {
  /** higher wins when labels overlap (default 1) */
  pri?: number
  /** hide when the camera is further than this */
  maxDist?: number
  /** add data-compact when the camera is further than this */
  compactDist?: number
}
export interface Anchor { pos: [number, number, number]; el: HTMLElement; opts: AnchorOpts; w: number; h: number; measuredAt: number }
export const anchors = new Map<string, Anchor>()

export function anchorRef(key: string, pos: [number, number, number], opts: AnchorOpts = {}) {
  return (el: HTMLElement | null) => {
    if (el) anchors.set(key, { pos, el, opts, w: 0, h: 0, measuredAt: -1e9 })
    else anchors.delete(key)
  }
}
