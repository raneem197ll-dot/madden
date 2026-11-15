/** Tiny WebAudio synth for game feedback — routed through the shared audio engine's SFX bus. */
import { audio } from './audio'

function out() {
  const c = audio.ensure()
  const bus = audio.sfxOut()
  return c && bus ? { c, bus } : null
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const o0 = out()
  if (!o0) return
  const { c, bus } = o0
  const t0 = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(bus)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}

function thud(start: number, gain = 0.18, f0 = 140) {
  const o0 = out()
  if (!o0) return
  const { c, bus } = o0
  const t0 = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(f0, t0)
  o.frequency.exponentialRampToValueAtTime(48, t0 + 0.18)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
  o.connect(g).connect(bus)
  o.start(t0)
  o.stop(t0 + 0.25)
}

/** Hijaz-flavoured scale (D Hijaz): D Eb F# G A Bb C D */
const HIJAZ = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33]

export const sfx = {
  unlockAudio() { audio.ensure() },
  tap(on: boolean) { if (on) tone(660, 0, 0.08, 'sine', 0.05) },
  build(on: boolean) {
    if (!on) return
    for (let i = 0; i < 7; i++) thud(i * 0.45)
  },
  success(on: boolean) {
    if (!on) return
    ;[0, 2, 3, 4, 7].forEach((n, i) => tone(HIJAZ[n], i * 0.11, 0.5, 'triangle', 0.09))
  },
  achievement(on: boolean) {
    if (!on) return
    ;[4, 5, 7].forEach((n, i) => tone(HIJAZ[n], i * 0.09, 0.45, 'sine', 0.08))
    tone(HIJAZ[7] * 2, 0.3, 0.6, 'sine', 0.04)
  },
  discover(on: boolean) {
    if (!on) return
    tone(HIJAZ[3] * 2, 0, 0.25, 'sine', 0.06)
    tone(HIJAZ[6] * 2, 0.08, 0.35, 'sine', 0.05)
  },
  /** sparkling arpeggio for a new collectible */
  collect(on: boolean) {
    if (!on) return
    ;[0, 2, 4, 7].forEach((n, i) => tone(HIJAZ[n] * 2, i * 0.07, 0.6, 'sine', 0.06))
    tone(HIJAZ[7] * 4, 0.3, 0.9, 'triangle', 0.025)
  },
  footstep(on: boolean) { if (on) thud(0, 0.035, 220 + Math.random() * 60) },
  stamp(on: boolean) { if (on) thud(0) },
}
