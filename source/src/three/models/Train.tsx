import * as THREE from 'three'
import { useMats } from '../shared/materials'
import { Box, Cyl, Dome } from '../shared/parts'

type V3 = [number, number, number]

function Wheel({ p, r, m = 'ironRed' as const }: { p: V3; r: number; m?: 'ironRed' | 'iron' }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0, 0]} r={r} h={0.14} seg={16} m={m} rot={[Math.PI / 2, 0, 0]} />
      <Cyl p={[0, 0, 0.08]} r={r * 0.3} h={0.06} seg={8} m="iron" rot={[Math.PI / 2, 0, 0]} />
    </group>
  )
}

/**
 * Simplified steam locomotive with a 2-8-0 wheel arrangement
 * (one leading axle + four coupled axles) and tender. Units ≈ metres, front at −x.
 */
export function Locomotive({ withTender = true }: { withTender?: boolean }) {
  const M = useMats()
  const drivers = [-2.0, -0.7, 0.6, 1.9]
  return (
    <group>
      {/* frame & running boards */}
      <Box p={[-0.6, 0.95, 0]} s={[8.2, 0.3, 2.0]} m="iron" />
      <Box p={[-1.0, 1.28, 1.1]} s={[6.0, 0.06, 0.32]} m="iron" />
      <Box p={[-1.0, 1.28, -1.1]} s={[6.0, 0.06, 0.32]} m="iron" />
      {/* boiler */}
      <mesh position={[-1.25, 2.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={M.iron as THREE.Material}>
        <cylinderGeometry args={[0.78, 0.78, 5.2, 18]} />
      </mesh>
      {[-3.2, -1.9, -0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 2.05, 0]} rotation={[0, 0, Math.PI / 2]} material={M.brass as THREE.Material}>
          <cylinderGeometry args={[0.8, 0.8, 0.07, 18]} />
        </mesh>
      ))}
      {/* smokebox + door */}
      <mesh position={[-4.1, 2.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={M.iron as THREE.Material}>
        <cylinderGeometry args={[0.82, 0.82, 0.7, 18]} />
      </mesh>
      <mesh position={[-4.47, 2.05, 0]} rotation={[0, 0, Math.PI / 2]} material={M.basalt as THREE.Material}>
        <cylinderGeometry args={[0.64, 0.64, 0.06, 18]} />
      </mesh>
      {/* chimney, domes */}
      <Cyl p={[-3.95, 3.25, 0]} r={0.22} h={1.0} seg={12} m="iron" />
      <Cyl p={[-3.95, 3.8, 0]} r={0.3} rTop={0.34} h={0.16} seg={12} m="iron" />
      <Dome p={[-1.6, 2.78, 0]} r={0.38} m="brass" finial={false} seg={12} />
      <Dome p={[0.15, 2.78, 0]} r={0.32} m="iron" finial={false} seg={12} />
      <Cyl p={[0.9, 2.95, 0]} r={0.06} h={0.4} seg={6} m="brass" />
      {/* headlamp */}
      <Box p={[-4.55, 3.0, 0]} s={[0.3, 0.32, 0.32]} m="glowWarm" />
      {/* cab */}
      <Box p={[2.4, 2.35, 0]} s={[2.0, 2.3, 2.4]} m="iron" />
      <Box p={[2.4, 3.56, 0]} s={[2.4, 0.12, 2.7]} m="iron" />
      <Box p={[2.15, 2.75, 1.21]} s={[0.8, 0.7, 0.02]} m="windowGlow" />
      <Box p={[2.15, 2.75, -1.21]} s={[0.8, 0.7, 0.02]} m="windowGlow" />
      <Box p={[1.39, 2.9, 0.6]} s={[0.02, 0.5, 0.5]} m="windowGlow" />
      <Box p={[1.39, 2.9, -0.6]} s={[0.02, 0.5, 0.5]} m="windowGlow" />
      {/* buffer beam & cowcatcher */}
      <Box p={[-4.75, 1.05, 0]} s={[0.15, 0.36, 2.3]} m="ironRed" />
      <Box p={[-5.0, 0.55, 0]} s={[0.55, 0.5, 1.9]} m="ironRed" r={[0, 0, 0.55]} />
      {/* wheels: 1 leading axle + 4 coupled axles */}
      {[1, -1].map((side) => (
        <group key={side}>
          <Wheel p={[-3.5, 0.45, side * 0.95]} r={0.42} />
          {drivers.map((x) => <Wheel key={x} p={[x, 0.66, side * 0.95]} r={0.62} />)}
          <Box p={[-0.05, 0.66, side * 1.05]} s={[4.2, 0.1, 0.05]} m="iron" />
          <Box p={[-2.95, 1.1, side * 1.02]} s={[0.9, 0.5, 0.25]} m="iron" />
        </group>
      ))}
      {withTender && (
        <group position={[5.2, 0, 0]}>
          <Box p={[0, 0.95, 0]} s={[3.6, 0.3, 2.1]} m="iron" />
          <Box p={[0, 1.95, 0]} s={[3.4, 1.7, 2.3]} m="iron" />
          <Box p={[0, 2.86, 0]} s={[3.1, 0.18, 2.0]} m="basalt" />
          <Box p={[0, 2.0, 1.16]} s={[3.0, 0.05, 0.02]} m="brass" />
          <Box p={[0, 2.0, -1.16]} s={[3.0, 0.05, 0.02]} m="brass" />
          {[1, -1].map((side) => [-1.1, 0, 1.1].map((x) => <Wheel key={`${side}${x}`} p={[x, 0.48, side * 0.95]} r={0.45} />))}
        </group>
      )}
    </group>
  )
}

/** Simplified passenger carriage (≈ 9 m). */
export function Carriage() {
  const M = useMats()
  return (
    <group>
      <Box p={[0, 0.95, 0]} s={[8.6, 0.3, 2.1]} m="iron" />
      <Box p={[0, 2.05, 0]} s={[9.0, 2.0, 2.5]} m="carriageGreen" />
      <mesh position={[0, 3.05, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.38, 1, 1]} castShadow material={M.iron as THREE.Material}>
        <cylinderGeometry args={[1.32, 1.32, 9.1, 14, 1, false, 0, Math.PI]} />
      </mesh>
      {[1, -1].map((side) => (
        <group key={side}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i} p={[-3.6 + i * 1.03, 2.35, side * 1.26]} s={[0.6, 0.65, 0.02]} m="windowGlow" cast={false} />
          ))}
          <Box p={[0, 1.62, side * 1.26]} s={[9.0, 0.06, 0.02]} m="stoneTrim" cast={false} />
          {[-3.4, -2.3, 2.3, 3.4].map((x) => <Wheel key={x} p={[x, 0.48, side * 0.95]} r={0.45} m="iron" />)}
        </group>
      ))}
      <Box p={[-4.6, 1.35, 0]} s={[0.4, 0.06, 2.0]} m="iron" />
      <Box p={[4.6, 1.35, 0]} s={[0.4, 0.06, 2.0]} m="iron" />
    </group>
  )
}
