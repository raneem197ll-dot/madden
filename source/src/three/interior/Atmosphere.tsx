import { EnvironmentRig } from '../shared/Environment'
import { Rain } from '../shared/Weather'

/** Lights + sky for interiors, following the same time-of-day and weather as the city. */
export function Atmosphere({ sunIntensity = 1.8, ambient = 0.25, rain = false }: { sun?: [number, number, number]; sunIntensity?: number; hemi?: number; ambient?: number; rain?: boolean }) {
  return (
    <>
      <EnvironmentRig ambient={ambient} sunScale={sunIntensity / 2.6} fogRange={[60, 260]} skyRadius={300} />
      {rain && <Rain count={500} box={[34, 18, 34]} />}
    </>
  )
}
