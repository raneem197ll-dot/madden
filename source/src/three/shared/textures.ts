import * as THREE from 'three'
import { rng } from './env'

/** Procedural canvas textures (no image downloads). Cached by key. */
const cache = new Map<string, THREE.Texture>()

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, opts?: { repeat?: [number, number]; srgb?: boolean; aniso?: boolean }) {
  const k = key + (opts?.repeat ? opts.repeat.join('x') : '')
  const hit = cache.get(k)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  if (opts?.srgb !== false) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (opts?.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1])
  t.anisotropy = 4
  cache.set(k, t)
  return t
}

/** Facade with windows. `lit` = emissive map variant (black + warm windows). */
export function facadeTex(floors: number, cols: number, lit: boolean, seed = 1) {
  return make(`facade-${floors}-${cols}-${lit}-${seed}`, 128, 128, (g, w, h) => {
    const r = rng(seed * 31 + floors)
    g.fillStyle = lit ? '#000' : '#f3ead8'
    g.fillRect(0, 0, w, h)
    if (!lit) {
      // subtle plaster noise
      for (let i = 0; i < 380; i++) {
        g.fillStyle = `rgba(160,130,90,${r() * 0.07})`
        g.fillRect(r() * w, r() * h, 2, 2)
      }
      // parapet band
      g.fillStyle = 'rgba(150,120,80,0.22)'
      g.fillRect(0, 0, w, 7)
    }
    const fh = (h - 10) / floors
    const cw = w / cols
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw * 0.28
        const y = 10 + f * fh + fh * 0.22
        const ww = cw * 0.44
        const wh = fh * 0.52
        if (lit) {
          const on = r() > 0.35
          g.fillStyle = on ? `rgba(255,${190 + Math.floor(r() * 40)},${110 + Math.floor(r() * 50)},1)` : '#050505'
          g.fillRect(x, y, ww, wh)
        } else {
          g.fillStyle = '#5a4634'
          g.fillRect(x - 1.5, y - 1.5, ww + 3, wh + 3)
          g.fillStyle = r() > 0.5 ? '#2f3a3c' : '#3b3026'
          g.fillRect(x, y, ww, wh)
          // mashrabiya hint
          if (r() > 0.75) {
            g.fillStyle = '#7a5532'
            g.fillRect(x - 2, y - 2, ww + 4, wh + 4)
            g.strokeStyle = '#5b3d22'
            g.lineWidth = 1
            for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, y + (k * wh) / 4); g.lineTo(x + ww, y + (k * wh) / 4); g.stroke() }
          }
        }
      }
    }
  }, { srgb: true })
}

export function stoneBlocksTex(base = '#3d3b3d', repeat: [number, number] = [1, 1]) {
  return make(`stone-${base}`, 256, 256, (g, w, h) => {
    const r = rng(7)
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const rows = 8
    const rh = h / rows
    for (let y = 0; y < rows; y++) {
      const off = (y % 2) * 24
      for (let x = -48; x < w; x += 48) {
        const l = 0.85 + r() * 0.3
        const c = new THREE.Color(base).multiplyScalar(l)
        g.fillStyle = `#${c.getHexString()}`
        g.fillRect(x + off + 2, y * rh + 2, 44, rh - 4)
        // pits of volcanic stone
        for (let k = 0; k < 10; k++) {
          g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.2})`
          g.beginPath(); g.arc(x + off + 4 + r() * 40, y * rh + 4 + r() * (rh - 8), r() * 1.6 + 0.4, 0, Math.PI * 2); g.fill()
        }
      }
      g.fillStyle = 'rgba(200,185,160,0.35)'
      g.fillRect(0, y * rh, w, 2)
    }
  }, { repeat })
}

export function tileFloorTex(repeat: [number, number]) {
  return make('tiles', 256, 256, (g, w, h) => {
    const n = 4
    const s = w / n
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? '#e9dcc0' : '#b8643f'
      g.fillRect(x * s, y * s, s, s)
      g.fillStyle = (x + y) % 2 ? '#c9a24a' : '#efe3c8'
      g.save(); g.translate(x * s + s / 2, y * s + s / 2); g.rotate(Math.PI / 4)
      g.fillRect(-s * 0.14, -s * 0.14, s * 0.28, s * 0.28); g.restore()
    }
    g.strokeStyle = 'rgba(80,60,40,0.4)'; g.lineWidth = 2
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke() }
  }, { repeat })
}

/** black / red / white marble courtyard pattern */
export function marbleTex(repeat: [number, number]) {
  return make('marble', 256, 256, (g, w, h) => {
    const r = rng(3)
    g.fillStyle = '#f2efe8'; g.fillRect(0, 0, w, h)
    const s = w / 4
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const k = (x + y * 2) % 4
      g.fillStyle = k === 0 ? '#2b2a2c' : k === 2 ? '#9a4a3c' : '#f2efe8'
      g.save(); g.translate(x * s + s / 2, y * s + s / 2); g.rotate(Math.PI / 4)
      g.fillRect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72); g.restore()
    }
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(120,110,100,${r() * 0.15})`; g.lineWidth = 1
      g.beginPath(); g.moveTo(r() * w, r() * h); g.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h); g.stroke()
    }
  }, { repeat })
}

/** Light plaza paving: white marble slabs with thin grey joints and a soft star motif. */
export function plazaTex(repeat: [number, number]) {
  return make('plaza', 256, 256, (g, w, h) => {
    const r = rng(11)
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(140,130,118,${r() * 0.1})`; g.lineWidth = 1
      g.beginPath(); g.moveTo(r() * w, r() * h); g.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h); g.stroke()
    }
    g.strokeStyle = 'rgba(150,140,128,0.45)'; g.lineWidth = 2
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo((i * w) / 4, 0); g.lineTo((i * w) / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, (i * h) / 4); g.lineTo(w, (i * h) / 4); g.stroke() }
    g.strokeStyle = 'rgba(176,150,104,0.55)'; g.lineWidth = 3
    const c = w / 2, R = w * 0.18
    g.beginPath()
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; const rr = k % 2 ? R * 0.55 : R; g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr) }
    g.closePath(); g.stroke()
  }, { repeat })
}

export function carpetTex(repeat: [number, number], color = '#8d1f2a') {
  return make(`carpet-${color}`, 256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h)
    const c = new THREE.Color(color)
    const dark = `#${c.clone().multiplyScalar(0.7).getHexString()}`
    g.fillStyle = dark
    g.fillRect(0, h - 26, w, 26)
    g.fillStyle = '#c9a24a'
    g.fillRect(0, h - 28, w, 3)
    // arch motifs per prayer place
    for (let i = 0; i < 4; i++) {
      const x = i * (w / 4) + w / 8
      g.strokeStyle = 'rgba(220,187,99,0.75)'; g.lineWidth = 3
      g.beginPath(); g.moveTo(x - 22, h - 34); g.lineTo(x - 22, 70); g.arc(x, 70, 22, Math.PI, 0); g.lineTo(x + 22, h - 34); g.stroke()
      g.fillStyle = 'rgba(15,61,46,0.55)'
      g.beginPath(); g.arc(x, 110, 8, 0, Math.PI * 2); g.fill()
    }
  }, { repeat })
}

export function asphaltTex(repeat: [number, number]) {
  return make('asphalt', 64, 256, (g, w, h) => {
    g.fillStyle = '#56524d'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#c4b89e'; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h)
    g.fillStyle = '#e9dfc5'
    for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 2, y + 8, 4, 32)
  }, { repeat })
}

export function sandTex(repeat: [number, number], base = '#dcc597') {
  return make(`sand-${base}`, 256, 256, (g, w, h) => {
    const r = rng(11)
    g.fillStyle = base; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 1600; i++) {
      const l = r()
      g.fillStyle = l > 0.5 ? `rgba(255,245,220,${r() * 0.18})` : `rgba(120,90,50,${r() * 0.14})`
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2)
    }
  }, { repeat })
}

export function woodTex(repeat: [number, number]) {
  return make('wood', 128, 128, (g, w, h) => {
    const r = rng(5)
    g.fillStyle = '#7b5133'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(${40 + r() * 30},${25 + r() * 20},10,${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2
      const y = r() * h
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + r() * 6 - 3, w * 0.6, y + r() * 6 - 3, w, y); g.stroke()
    }
  }, { repeat })
}

/** Text panel texture (plaques, signs, maps). */
export function textPanel(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  return make(`panel-${key}`, w, h, draw)
}

export function clearTextPanels() {
  for (const [k, t] of cache) if (k.startsWith('panel-')) { t.dispose(); cache.delete(k) }
}
