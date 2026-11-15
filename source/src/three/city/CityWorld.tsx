import { LANDMARKS } from '../../data/landmarks'
import { CityEnvironment } from './CityEnvironment'
import { DayNight } from './DayNight'
import { CameraRig } from './CameraRig'
import { LandmarkSlot } from './LandmarkSlot'
import { Decorations } from './Decorations'
import { ReplayRoute } from './ReplayRoute'
import { LabelProjector } from './LabelProjector'
import { CityLife } from './CityLife'
import { NavPaths } from './NavPaths'
import { SnapshotBridge } from './SnapshotBridge'

export function CityWorld() {
  return (
    <>
      <DayNight />
      <CameraRig />
      <CityEnvironment />
      {LANDMARKS.map((l) => <LandmarkSlot key={l.id} lm={l} />)}
      <Decorations />
      <ReplayRoute />
      <CityLife />
      <NavPaths />
      <SnapshotBridge />
      <LabelProjector />
    </>
  )
}
