import type { AudioPrefs, Lang, LandmarkId, Weather } from '../data/types'

/**
 * Procedural audio (no files): ambience layers, generative background music in
 * the Hijaz scale, sound-effect bus, and narration via the device's speech engine.
 * Recorded narration files can be dropped into src/assets/narration/{id}-{lang}.mp3
 * and will be preferred automatically.
 */
export type AudioScene = 'city' | 'mosque' | 'museum' | 'outdoor'

const HIJAZ = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33]

const FILES = import.meta.glob('../assets/narration/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const recorded = (id: LandmarkId, lang: Lang) => Object.entries(FILES).find(([p]) => p.endsWith(`/${id}-${lang}.mp3`))?.[1]

class Engine {
  ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private ambientBus!: GainNode
  private sfxBus!: GainNode
  private duck!: GainNode
  private layers: Record<string, GainNode> = {}
  private noise: AudioBuffer | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private musicOn = false
  private nextNote = 0
  private phrase = 0
  private degree = 4
  private drone: OscillatorNode[] = []
  private droneGain: GainNode | null = null
  prefs: AudioPrefs = { master: true, music: false, musicVol: 0.5, ambient: true, ambientVol: 0.6, sfx: true, voiceLang: 'ar' }
  scene: AudioScene = 'city'
  glow = 0
  weather: Weather = 'clear'
  private lastChirp = 0
  private voiceEl: HTMLAudioElement | null = null

  /** Must be called from a user gesture the first time. */
  ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!C) return null
        const ctx = new C()
        this.ctx = ctx
        this.master = ctx.createGain()
        this.duck = ctx.createGain()
        this.musicBus = ctx.createGain()
        this.ambientBus = ctx.createGain()
        this.sfxBus = ctx.createGain()
        this.musicBus.connect(this.duck)
        this.ambientBus.connect(this.duck)
        this.duck.connect(this.master)
        this.sfxBus.connect(this.master)
        this.master.connect(ctx.destination)
        this.buildNoise()
        this.buildAmbience()
        this.apply(this.prefs)
        this.timer = setInterval(() => this.tick(), 120)
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
      return this.ctx
    } catch {
      return null
    }
  }

  sfxOut(): AudioNode | null {
    const c = this.ensure()
    return c ? this.sfxBus : null
  }

  private buildNoise() {
    const ctx = this.ctx!
    const len = ctx.sampleRate * 4
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18
    }
    this.noise = buf
  }

  private noiseLayer(name: string, filter: BiquadFilterType, freq: number, q = 0.7) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    src.playbackRate.value = 0.8 + Math.random() * 0.4
    const f = ctx.createBiquadFilter()
    f.type = filter
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.value = 0
    src.connect(f).connect(g).connect(this.ambientBus)
    src.start()
    this.layers[name] = g
    return { src, f, g }
  }

  private buildAmbience() {
    const ctx = this.ctx!
    const wind = this.noiseLayer('wind', 'bandpass', 420, 0.6)
    // slow gusts
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.07
    lfoGain.gain.value = 180
    lfo.connect(lfoGain).connect(wind.f.frequency)
    lfo.start()
    this.noiseLayer('murmur', 'lowpass', 320, 0.5)
    this.noiseLayer('room', 'lowpass', 170, 0.4)
    this.noiseLayer('rain', 'highpass', 1400, 0.3)
  }

  apply(p: AudioPrefs) {
    this.prefs = p
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.setTargetAtTime(p.master ? 0.9 : 0, t, 0.08)
    this.ambientBus.gain.setTargetAtTime(p.ambient ? p.ambientVol : 0, t, 0.3)
    this.sfxBus.gain.setTargetAtTime(p.sfx ? 1 : 0, t, 0.05)
    this.updateMusic()
    this.mix()
  }

  setScene(scene: AudioScene, glow: number, weather: Weather) {
    this.scene = scene
    this.glow = glow
    this.weather = weather
    this.mix()
    this.updateMusic()
  }

  /** Crossfade ambience layers for the current scene, time of day and weather. */
  private mix() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const out = this.scene === 'city' || this.scene === 'outdoor'
    const day = 1 - this.glow
    const set = (k: string, v: number) => this.layers[k]?.gain.setTargetAtTime(v, t, 0.8)
    set('wind', this.scene === 'outdoor' ? 0.32 : out ? 0.12 : 0.025)
    set('murmur', this.scene === 'city' ? 0.06 + 0.06 * day : 0.0)
    set('room', out ? 0 : 0.08)
    set('rain', this.weather === 'rain' ? (out ? 0.22 : 0.05) : 0)
  }

  private musicAllowed() {
    // background music pauses inside mosques, out of respect
    return this.prefs.master && this.prefs.music && this.scene !== 'mosque'
  }

  private updateMusic() {
    if (!this.ctx) return
    const want = this.musicAllowed()
    const t = this.ctx.currentTime
    this.musicBus.gain.setTargetAtTime(want ? this.prefs.musicVol * 0.55 : 0, t, 0.6)
    if (want && !this.musicOn) {
      this.musicOn = true
      this.nextNote = t + 0.3
      this.startDrone()
    } else if (!want && this.musicOn) {
      this.musicOn = false
      this.stopDrone()
    }
  }

  private startDrone() {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(0.06, ctx.currentTime, 2)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 520
    lp.connect(g).connect(this.musicBus)
    this.drone = [73.42, 110.0, 146.83].map((f, i) => {
      const o = ctx.createOscillator()
      o.type = i === 1 ? 'triangle' : 'sine'
      o.frequency.value = f
      o.detune.value = (i - 1) * 4
      o.connect(lp)
      o.start()
      return o
    })
    this.droneGain = g
  }

  private stopDrone() {
    const ctx = this.ctx!
    const g = this.droneGain
    const osc = this.drone
    if (g) g.gain.setTargetAtTime(0, ctx.currentTime, 0.8)
    setTimeout(() => osc.forEach((o) => { try { o.stop() } catch { /* ignore */ } }), 3000)
    this.drone = []
    this.droneGain = null
  }

  /** Plucked, oud-like note. */
  private pluck(freq: number, when: number, vel = 1) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(3200, when)
    lp.frequency.exponentialRampToValueAtTime(700, when + 0.9)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(0.16 * vel, when + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.6)
    lp.connect(g).connect(this.musicBus)
    for (const [type, mult, amp] of [['triangle', 1, 1], ['sine', 2, 0.35], ['sawtooth', 1, 0.08]] as const) {
      const o = ctx.createOscillator()
      const og = ctx.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq * mult * 1.006, when)
      o.frequency.exponentialRampToValueAtTime(freq * mult, when + 0.05)
      og.gain.value = amp
      o.connect(og).connect(lp)
      o.start(when)
      o.stop(when + 1.7)
    }
  }

  private chirp(when: number, night: boolean) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.connect(g).connect(this.ambientBus)
    o.start(when)
    if (night) {
      o.frequency.setValueAtTime(4300, when)
      const am = ctx.createOscillator()
      const amg = ctx.createGain()
      am.frequency.value = 32
      amg.gain.value = 0.5
      am.connect(amg).connect(g.gain)
      am.start(when)
      am.stop(when + 0.35)
      g.gain.setValueAtTime(0.0001, when)
      g.gain.linearRampToValueAtTime(0.018, when + 0.03)
      g.gain.linearRampToValueAtTime(0.0001, when + 0.33)
      o.stop(when + 0.36)
    } else {
      const f0 = 2400 + Math.random() * 1600
      o.frequency.setValueAtTime(f0, when)
      o.frequency.exponentialRampToValueAtTime(f0 * (1.3 + Math.random() * 0.4), when + 0.07)
      o.frequency.exponentialRampToValueAtTime(f0 * 0.9, when + 0.12)
      g.gain.setValueAtTime(0.0001, when)
      g.gain.exponentialRampToValueAtTime(0.03, when + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.13)
      o.stop(when + 0.15)
    }
  }

  private tick() {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    // nature: birds by day, crickets at night (outdoors, not in rain)
    const out = this.scene === 'city' || this.scene === 'outdoor'
    if (out && this.prefs.ambient && this.weather !== 'rain' && now - this.lastChirp > 0.6) {
      const night = this.glow > 0.6
      if (Math.random() < (night ? 0.35 : 0.22)) {
        const n = night ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 3)
        for (let i = 0; i < n; i++) this.chirp(now + 0.05 + i * (night ? 0.42 : 0.16), night)
        this.lastChirp = now + n * 0.3
      }
    }
    // generative melody, scheduled slightly ahead
    if (this.musicOn) {
      while (this.nextNote < now + 0.4) {
        if (this.phrase <= 0) {
          this.phrase = 5 + Math.floor(Math.random() * 6)
          this.nextNote += 1.4 + Math.random() * 1.8
          this.degree = [4, 3, 0, 7][Math.floor(Math.random() * 4)]
          continue
        }
        const step = [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]
        this.degree = Math.max(0, Math.min(7, this.degree + step))
        const octave = Math.random() < 0.15 ? 0.5 : 1
        this.pluck(HIJAZ[this.degree] * octave, this.nextNote, 0.7 + Math.random() * 0.3)
        if (Math.random() < 0.18) this.pluck(HIJAZ[this.degree] * octave, this.nextNote + 0.11, 0.45)
        this.nextNote += [0.42, 0.42, 0.63, 0.84, 1.26][Math.floor(Math.random() * 5)]
        this.phrase--
      }
    }
  }

  /* ---------------- narration ---------------- */
  narrationMode(id: LandmarkId, lang: Lang): 'recorded' | 'voice' | 'none' {
    if (recorded(id, lang)) return 'recorded'
    return this.voiceFor(lang) ? 'voice' : 'none'
  }

  voiceFor(lang: Lang): SpeechSynthesisVoice | null {
    try {
      const vs = window.speechSynthesis?.getVoices() ?? []
      const pref = lang === 'ar' ? ['ar-SA', 'ar'] : ['en-GB', 'en-US', 'en']
      for (const p of pref) {
        const v = vs.find((x) => x.lang?.toLowerCase().startsWith(p.toLowerCase()))
        if (v) return v
      }
      return null
    } catch {
      return null
    }
  }

  narrate(id: LandmarkId, lang: Lang, text: string, onEnd: () => void, onProgress?: (charIndex: number) => void): boolean {
    this.stopNarration()
    this.setDuck(true)
    const end = () => { this.setDuck(false); onEnd() }
    const file = recorded(id, lang)
    if (file) {
      const a = new Audio(file)
      this.voiceEl = a
      a.onended = end
      a.onerror = end
      a.ontimeupdate = () => { if (a.duration > 0) onProgress?.(Math.floor((text.length * a.currentTime) / a.duration)) }
      a.play().catch(end)
      return true
    }
    const voice = this.voiceFor(lang)
    if (!voice || !window.speechSynthesis) { this.setDuck(false); return false }
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = lang === 'ar' ? 0.92 : 0.98
    u.onend = end
    u.onerror = end
    u.onboundary = (e) => onProgress?.(e.charIndex)
    window.speechSynthesis.speak(u)
    return true
  }

  stopNarration() {
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    if (this.voiceEl) { this.voiceEl.pause(); this.voiceEl = null }
    this.setDuck(false)
  }

  private setDuck(on: boolean) {
    if (!this.ctx) return
    this.duck.gain.setTargetAtTime(on ? 0.25 : 1, this.ctx.currentTime, 0.25)
  }
}

export const audio = new Engine()

// voices load asynchronously on some browsers
try { window.speechSynthesis?.addEventListener?.('voiceschanged', () => {}) } catch { /* ignore */ }
