import { INFO_COUNT } from '../../data/content'
import type { LandmarkId } from '../../data/types'
import { InteriorProvider } from './engine'
import { HejazInterior } from './scenes/HejazInterior'
import { QubaInterior } from './scenes/QubaInterior'
import { QiblatainInterior } from './scenes/QiblatainInterior'
import { UhudSite } from './scenes/UhudSite'
import { HaramCourtyard } from './scenes/HaramCourtyard'

const SCENES: Partial<Record<LandmarkId, () => React.JSX.Element>> = {
  haram: HaramCourtyard,
  hejaz: HejazInterior,
  quba: QubaInterior,
  qiblatain: QiblatainInterior,
  uhud: UhudSite,
}

/** Count of info points per scene, for HUD progress. */
export const SCENE_INFO_COUNT: Record<LandmarkId, number> = INFO_COUNT

export function InteriorWorld({ id }: { id: LandmarkId }) {
  const Scene = SCENES[id]
  if (!Scene) return null
  return (
    <InteriorProvider scene={id}>
      <Scene />
    </InteriorProvider>
  )
}
