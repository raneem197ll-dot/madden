import { useGame } from '../../state/gameStore'
import { TIER_SETTINGS } from '../../lib/device'
import { EnvironmentRig } from '../shared/Environment'
import { Clouds, Rain } from '../shared/Weather'

const isSmall = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700

/** City lighting: time of day (sunrise · day · sunset · night), dynamic sun shadows, weather. */
export function DayNight() {
  const high = useGame((s) => TIER_SETTINGS[s.tier].shadows)
  return (
    <>
      <EnvironmentRig shadows={high} shadowSize={isSmall ? 1024 : 2048} follow fogRange={[110, 320]} skyRadius={520} />
      <Clouds radius={80} height={[34, 50]} />
      <Rain count={800} />
    </>
  )
}
