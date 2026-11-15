import { useEffect, useRef, useState } from 'react'
import { useGame, useT } from '../state/gameStore'
import { LANDMARK_MAP } from '../data/landmarks'
import { HIDDEN_TOTAL } from '../data/progression'
import { SCENE_INFO_COUNT } from '../three/interior/InteriorWorld'
import { input } from '../three/interior/engine'
import { exitBuilding } from '../state/director'
import { num } from '../lib/format'
import { Icon } from './components/Icon'
import { Btn, Modal } from './components/Sheet'
import { COLLECTIBLE_MAP, LANDMARK_SOURCES } from '../data/collectibles'
import { CollectibleCardModal, SourceList, TruthBadge } from './Collection'
import { AudioGuideMini } from './AudioGuide'

const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/** Virtual joystick (left) + swipe-to-look (right) + tap-to-inspect. Mouse: drag or pointer-lock. */
export function TouchControls() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const joy = useRef<{ id: number; ox: number; oy: number } | null>(null)
  const looks = useRef(new Map<number, { x: number; y: number; sx: number; sy: number; t: number; moved: number; touch: boolean }>())
  const R = 52

  const placeBase = (x?: number, y?: number) => {
    const b = base.current
    if (!b) return
    if (x === undefined || y === undefined) { b.style.left = ''; b.style.top = ''; b.style.bottom = ''; b.classList.remove('active'); return }
    b.style.left = `${x - 60}px`; b.style.top = `${y - 60}px`; b.style.bottom = 'auto'; b.classList.add('active')
  }
  const setKnob = (dx: number, dy: number) => { if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)` }

  useEffect(() => () => { input.joy.x = input.joy.y = 0 }, [])

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ touchAction: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
      onDoubleClick={(e) => {
        if (coarse) return
        try { const p = (e.currentTarget as HTMLElement).requestPointerLock?.() as unknown as Promise<void> | undefined; p?.catch?.(() => {}) } catch { /* not allowed here */ }
      }}
      onPointerDown={(e) => {
        const el = e.currentTarget as HTMLElement
        try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
        const touch = e.pointerType !== 'mouse'
        if (touch && !joy.current && e.clientX < window.innerWidth * 0.45 && e.clientY > window.innerHeight * 0.32) {
          joy.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY }
          placeBase(e.clientX, e.clientY)
          setKnob(0, 0)
          return
        }
        if (document.pointerLockElement) { input.interact = true; return }
        looks.current.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0, touch })
      }}
      onPointerMove={(e) => {
        const j = joy.current
        if (j && j.id === e.pointerId) {
          let dx = e.clientX - j.ox, dy = e.clientY - j.oy
          const m = Math.hypot(dx, dy)
          if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R }
          input.joy.x = dx / R
          input.joy.y = dy / R
          setKnob(dx, dy)
          return
        }
        const l = looks.current.get(e.pointerId)
        if (!l) return
        const dx = e.clientX - l.x, dy = e.clientY - l.y
        const k = l.touch ? 1.5 : 1.1
        input.look.dx += dx * k
        input.look.dy += dy * k
        l.moved += Math.abs(dx) + Math.abs(dy)
        l.x = e.clientX; l.y = e.clientY
      }}
      onPointerUp={(e) => {
        const j = joy.current
        if (j && j.id === e.pointerId) {
          joy.current = null
          input.joy.x = input.joy.y = 0
          placeBase(); setKnob(0, 0)
          return
        }
        const l = looks.current.get(e.pointerId)
        if (l) {
          if (l.moved < 12 && performance.now() - l.t < 380) input.taps.push({ x: e.clientX, y: e.clientY })
          looks.current.delete(e.pointerId)
        }
      }}
      onPointerCancel={(e) => {
        if (joy.current?.id === e.pointerId) { joy.current = null; input.joy.x = input.joy.y = 0; placeBase(); setKnob(0, 0) }
        looks.current.delete(e.pointerId)
      }}
    >
      <div
        ref={base}
        className="joy-base pointer-events-none absolute grid h-[120px] w-[120px] place-items-center rounded-full border-2 border-white/40 bg-pine-950/25 backdrop-blur-sm"
        style={{ left: 'max(22px, env(safe-area-inset-left))', bottom: 'max(34px, calc(env(safe-area-inset-bottom) + 24px))', direction: 'ltr' }}
      >
        <div ref={knob} className="h-14 w-14 rounded-full bg-sand-50/85 shadow-lg ring-4 ring-gold-400/50" />
      </div>
    </div>
  )
}

export function InteriorHud() {
  const t = useT()
  const id = useGame((s) => s.interiorId)
  const lang = useGame((s) => s.lang)
  const focus = useGame((s) => s.focusHint)
  const discoveries = useGame((s) => s.discoveries)
  const night = useGame((s) => s.night)
  const [hint, setHint] = useState(true)
  useEffect(() => { setHint(true); const tm = setTimeout(() => setHint(false), 7000); return () => clearTimeout(tm) }, [id])
  if (!id) return null
  const lm = LANDMARK_MAP[id]
  const infoSeen = Object.keys(discoveries).filter((k) => k.startsWith(`info:${id}:`)).length
  const hiddenSeen = Object.keys(discoveries).filter((k) => k.startsWith(`hidden:${id}:`)).length
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 safe-top safe-x px-3">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-2 rounded-[22px] glass-dark px-2.5 py-2 text-sand-50 shadow-xl">
          <button onClick={() => exitBuilding()} aria-label={t('backToCity')} className="btn-press flex h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-white/12 px-2.5 text-[calc(13px*var(--fs))] font-semibold">
            <Icon name={lang === 'ar' ? 'chevron' : 'back'} size={18} /> <span className="hidden sm:inline">{t('backToCity')}</span><span className="sm:hidden">{lang === 'ar' ? 'خروج' : 'Exit'}</span>
          </button>
          <div className="min-w-0 flex-1 px-1">
            <div className="truncate font-display text-[calc(16px*var(--fs))] font-semibold leading-tight">{lm.name[lang]}</div>
            <div className="flex items-center gap-1.5 whitespace-nowrap text-[calc(11px*var(--fs))] text-sand-200/90">
              <span>💡{num(infoSeen, lang)}/{num(SCENE_INFO_COUNT[id], lang)}</span>
              <span>✨{num(hiddenSeen, lang)}/{num(HIDDEN_TOTAL[id], lang)}</span>
              <span className="truncate rounded-full bg-gold-400/20 px-1.5 text-gold-300">{lm.interior === 'full' ? t('fullInterior') : t('simplifiedBadge')}</span>
            </div>
          </div>
          <button onClick={() => useGame.getState().toggleNight()} className="btn-press grid h-10 w-9 shrink-0 place-items-center rounded-2xl bg-white/12" aria-label="day/night">
            <Icon name={night ? 'moon' : 'sun'} size={18} />
          </button>
          <button onClick={() => useGame.getState().setUi({ guideFor: useGame.getState().guideFor ? null : id })} className="btn-press grid h-10 w-9 shrink-0 place-items-center rounded-2xl bg-white/12" aria-label="audio guide">
            <Icon name="headphones" size={18} />
          </button>
          <button onClick={() => useGame.getState().setUi({ galleryFor: id })} className="btn-press grid h-10 w-9 shrink-0 place-items-center rounded-2xl bg-white/12" aria-label={t('memoriesHere')}>
            <Icon name="image" size={18} />
          </button>
        </div>
      </div>

      <AudioGuideMini />

      {/* crosshair */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-[0_0_0_3px_rgba(8,36,27,.35)]" />

      {/* interact prompt */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+36px)] z-30 flex justify-center px-4" style={{ paddingLeft: coarse ? 150 : 16, paddingRight: 16 }}>
        {focus && (
          <button
            key={focus.id}
            onClick={() => { input.interact = true }}
            className="pointer-events-auto btn-press anim-pop flex max-w-[80vw] items-center gap-2 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-3 text-[calc(15px*var(--fs))] font-bold text-pine-950 shadow-xl"
          >
            <Icon name="hand" size={18} /> <span className="truncate">{t('inspect')}: {focus.title[lang]}</span>
          </button>
        )}
      </div>

      {hint && (
        <div className="pointer-events-none absolute inset-x-0 top-[88px] z-20 flex justify-center px-4 anim-fade">
          <div className="max-w-md rounded-2xl bg-pine-950/70 px-4 py-2.5 text-center text-[calc(12.5px*var(--fs))] leading-relaxed text-sand-100 backdrop-blur">
            {coarse ? t('moveHint') : t('desktopHint')}
          </div>
        </div>
      )}
    </>
  )
}

export function InspectCard() {
  const t = useT()
  const info = useGame((s) => s.inspect)
  const lang = useGame((s) => s.lang)
  if (!info) return null
  const close = () => useGame.getState().setUi({ inspect: null })
  const scene = info.scene
  if (info.tag === 'hidden' && scene && COLLECTIBLE_MAP[`${scene}:${info.id}`]) {
    const c = COLLECTIBLE_MAP[`${scene}:${info.id}`]
    const at = useGame.getState().discoveries[`hidden:${scene}:${info.id}`]
    return <CollectibleCardModal c={c} at={typeof at === 'string' ? at : undefined} onClose={close} lang={lang} fresh />
  }
  const kind = info.kind ?? 'verified'
  return (
    <Modal open onClose={close} z={72} title={
      <div>
        <div className="mb-1"><TruthBadge kind={kind} /></div>
        <div>{info.title[lang]}</div>
      </div>
    }>
      <p className="text-[calc(15px*var(--fs))] leading-[1.9] text-ink-700">{info.body[lang]}</p>
      {kind === 'verified' && scene && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[calc(12.5px*var(--fs))] font-semibold text-pine-700">{lang === 'ar' ? 'المصادر' : 'Sources'}</summary>
          <div className="mt-2"><SourceList sources={LANDMARK_SOURCES[scene]} /></div>
        </details>
      )}
      <Btn tone="primary" full className="mt-4" onClick={close}>{t('close')}</Btn>
    </Modal>
  )
}
