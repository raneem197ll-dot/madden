import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { snapshot } from '../../lib/snapshot'

/** Lets the UI grab a JPEG of the current city view (render + read in one go). */
export function SnapshotBridge() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    snapshot.capture = () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/jpeg', 0.9)
    }
    return () => { snapshot.capture = null }
  }, [gl, scene, camera])
  return null
}
