import type { ComponentType } from 'react'
import type { LandmarkId } from '../../data/types'
import { QubaModel, QUBA_PARTS } from './QubaModel'
import { UhudModel, UHUD_PARTS } from './UhudModel'
import { HejazModel, HEJAZ_PARTS } from './HejazModel'
import { QiblatainModel, QIBLATAIN_PARTS } from './QiblatainModel'
import { HaramModel, HARAM_PARTS } from './HaramModel'
import { GhamamaModel, GHAMAMA_PARTS, IjabahModel, IJABAH_PARTS, JumuahModel, JUMUAH_PARTS, ManaratainModel, MANARATAIN_PARTS, MiqatModel, MIQAT_PARTS } from './MosqueModels'
import { AqiqModel, AQIQ_PARTS, BaqiModel, BAQI_PARTS, QuranComplexModel, QURAN_PARTS, RumahModel, RUMAH_PARTS, SabaaModel, SABAA_PARTS } from './SiteModels'

export interface ModelMeta {
  Component: ComponentType
  parts: number
  /** label height in world units (after the landmark's scale) */
  labelY: number
  /** plot radius (world units) used to keep houses and roads clear around the landmark */
  clearRadius: number
  /** rectangular plot half-extents [x, z] instead of a circle (the Haram plazas) */
  clearBox?: [number, number]
  /** camera target height when focusing */
  focusY: number
  /** door / approach point in local coords for the "enter" camera move */
  door: [number, number, number]
  crane: boolean
}

export const MODELS: Record<LandmarkId, ModelMeta> = {
  haram: { Component: HaramModel, parts: HARAM_PARTS, labelY: 7.6, clearRadius: 9.4, clearBox: [7.4, 9.5], focusY: 1.4, door: [0, 0.9, -9.6], crane: false },
  quba: { Component: QubaModel, parts: QUBA_PARTS, labelY: 6.4, clearRadius: 6.2, focusY: 1.2, door: [0, 1, -4.2], crane: true },
  uhud: { Component: UhudModel, parts: UHUD_PARTS, labelY: 7.8, clearRadius: 7.5, focusY: 1.5, door: [0, 1, 4.2], crane: false },
  hejaz: { Component: HejazModel, parts: HEJAZ_PARTS, labelY: 4.6, clearRadius: 7.0, focusY: 1.0, door: [0, 0.8, 0.4], crane: true },
  qiblatain: { Component: QiblatainModel, parts: QIBLATAIN_PARTS, labelY: 5.8, clearRadius: 5.6, focusY: 1.2, door: [0, 1, -3.4], crane: true },
  ghamama: { Component: GhamamaModel, parts: GHAMAMA_PARTS, labelY: 3.4, clearRadius: 3.2, focusY: 0.9, door: [0, 0.8, -2.4], crane: false },
  baqi: { Component: BaqiModel, parts: BAQI_PARTS, labelY: 2.2, clearRadius: 4.3, focusY: 0.4, door: [-3.9, 0.6, 0], crane: false },
  jumuah: { Component: JumuahModel, parts: JUMUAH_PARTS, labelY: 4.0, clearRadius: 3.2, focusY: 0.9, door: [0, 0.8, -2.8], crane: false },
  sabaa: { Component: SabaaModel, parts: SABAA_PARTS, labelY: 4.4, clearRadius: 4.6, focusY: 0.9, door: [-1.2, 0.8, -3.2], crane: false },
  manaratain: { Component: ManaratainModel, parts: MANARATAIN_PARTS, labelY: 3.7, clearRadius: 3.6, focusY: 0.9, door: [0, 0.8, -2.4], crane: false },
  ijabah: { Component: IjabahModel, parts: IJABAH_PARTS, labelY: 3.0, clearRadius: 2.8, focusY: 0.8, door: [0, 0.8, -2.2], crane: false },
  miqat: { Component: MiqatModel, parts: MIQAT_PARTS, labelY: 9.0, clearRadius: 4.9, focusY: 1.2, door: [0, 0.8, -4.2], crane: true },
  quranComplex: { Component: QuranComplexModel, parts: QURAN_PARTS, labelY: 4.0, clearRadius: 5.0, focusY: 0.9, door: [2.3, 0.8, -1.9], crane: true },
  rumah: { Component: RumahModel, parts: RUMAH_PARTS, labelY: 3.0, clearRadius: 4.3, focusY: 0.6, door: [0, 0.6, -3.6], crane: false },
  aqiq: { Component: AqiqModel, parts: AQIQ_PARTS, labelY: 2.8, clearRadius: 4.8, focusY: 0.5, door: [1.4, 0.6, -4.2], crane: false },
}
