import { INTERIORS, interiorInfo } from '../../../data/content'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { InfoContent } from '../../../data/types'
import { Collider, Interactive, MemoryWall, PlayerController, SignPanel, Solid, collectibleInfo } from '../engine'
import { Atmosphere } from '../Atmosphere'
import { MAT } from '../../shared/materials'
import { Palm } from '../../shared/parts'
import { sandTex, tileFloorTex } from '../../shared/textures'
import { mountainGeometry } from '../../models/UhudModel'
import { rng } from '../../shared/env'
import { useGame } from '../../../state/gameStore'

export const INFO = interiorInfo('uhud', INTERIORS.uhud)

export function UhudSite() {
  const lang = useGame((s) => s.lang)
  const ground = useMemo(() => new THREE.MeshStandardMaterial({ map: sandTex([24, 24], '#d6b88a'), roughness: 1 }), [])
  const path = useMemo(() => new THREE.MeshStandardMaterial({ map: tileFloorTex([2, 14]).clone(), color: '#e6d6b8', roughness: 0.9 }), [])
  const mountain = useMemo(() => mountainGeometry(150, 46, 34, 12, 70, 26), [])
  const hill = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const r = rng(4)
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 0) pos.setY(i, 0)
      pos.setX(i, pos.getX(i) * (0.92 + r() * 0.16))
      pos.setZ(i, pos.getZ(i) * (0.92 + r() * 0.16))
    }
    g.computeVertexNormals()
    return g
  }, [])
  const hillMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a7623f', flatShading: true, roughness: 1 }), [])
  const rocks = useMemo(() => {
    const r = rng(21)
    return Array.from({ length: 18 }, () => ({ x: (r() - 0.5) * 50, z: -4 + (r() - 0.5) * 36, s: 0.4 + r() * 1.1, rot: r() * 6 }))
      .filter((k) => Math.abs(k.x) > 2.5 && !(k.x > 3 && k.x < 21 && k.z > -15 && k.z < -1) && !(k.x < -3 && k.x > -17 && k.z > -12 && k.z < 0))
  }, [])

  return (
    <group>
      <Atmosphere sunIntensity={2.4} ambient={0.28} rain />
      <PlayerController spawn={[0, 20]} yaw={0} speed={3.6} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} material={ground}><planeGeometry args={[160, 120]} /></mesh>
      <mesh geometry={mountain} position={[0, -0.2, -52]} material={MAT.granite} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 8]} material={path}><planeGeometry args={[3, 28]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -4]} material={path}><circleGeometry args={[4.5, 32]} /></mesh>

      {/* Archers' Hill */}
      <Interactive info={INFO.archers} marker={[-10, 6.2, -6]}>
        <mesh geometry={hill} position={[-10, 0, -6]} scale={[6.5, 4.5, 5.5]} material={hillMat} />
      </Interactive>
      <Collider minX={-16} maxX={-4.2} minZ={-11} maxZ={-1.2} />
      <SignPanel id="uhud-archers" p={[-4.4, 1.3, 0.6]} rotY={0.5} w={1.2} h={0.7} lines={lang === 'ar' ? ['جبل الرماة', '٥٠ راميًا'] : ['Archers’ Hill', '50 archers']} />

      {/* Martyrs' cemetery — symbolic enclosure only */}
      <Interactive info={INFO.martyrs} marker={[12, 3.6, -2.6]}>
        <Solid p={[12, 1.1, -14]} s={[16, 2.2, 0.5]} m="plaster" />
        <Solid p={[4.2, 1.1, -8]} s={[0.5, 2.2, 12.5]} m="plaster" />
        <Solid p={[19.8, 1.1, -8]} s={[0.5, 2.2, 12.5]} m="plaster" />
        <Solid p={[7.2, 1.1, -2]} s={[6.5, 2.2, 0.5]} m="plaster" />
        <Solid p={[16.8, 1.1, -2]} s={[6.5, 2.2, 0.5]} m="plaster" />
        <Solid p={[12, 1.1, -2]} s={[3.5, 2.2, 0.15]} m="iron" />
        <Solid p={[12, 2.3, -2]} s={[16, 0.2, 0.6]} m="stoneTrim" collide={false} />
      </Interactive>
      {[[7, -6], [10, -11], [15, -5], [18, -10], [13, -8]].map(([x, z], i) => <Palm key={i} p={[x, 0, z]} h={4.2} scale={1.5} rotY={i * 1.3} lean={0.04} />)}

      {/* info signs along the path */}
      <Interactive info={INFO.mountain} marker={[2.2, 2.3, 14]}>
        <SignPanel id="uhud-m" p={[2.2, 1.3, 14]} rotY={-0.6} w={1.2} h={0.7} lines={lang === 'ar' ? ['جبل أحد', '≈ ١٠٧٧ م · ≈ ٧ كم'] : ['Mount Uhud', '≈ 1,077 m · ≈ 7 km']} />
      </Interactive>
      <Collider minX={1.8} maxX={2.6} minZ={13.7} maxZ={14.3} />
      <Interactive info={INFO.battle} marker={[-2.2, 2.3, 8]}>
        <SignPanel id="uhud-b" p={[-2.2, 1.3, 8]} rotY={0.6} w={1.2} h={0.7} lines={lang === 'ar' ? ['غزوة أحد', '٣ هـ / ٦٢٥م'] : ['Battle of Uhud', '3 AH / 625 CE']} />
      </Interactive>
      <Collider minX={-2.6} maxX={-1.8} minZ={7.7} maxZ={8.3} />
      <Interactive info={INFO.love} marker={[0, 2.4, -7.4]}>
        <SignPanel id="uhud-l" p={[0, 1.4, -7.4]} w={1.6} h={0.6} lines={lang === 'ar' ? ['«أُحُدٌ جبلٌ يحبّنا ونحبّه»'] : ['“Uhud loves us, and we love it”']} />
      </Interactive>
      <Collider minX={-0.9} maxX={0.9} minZ={-7.7} maxZ={-7.1} />
      <Interactive info={INFO.tips} marker={[2.6, 2.3, 2.5]}>
        <SignPanel id="uhud-t" p={[2.6, 1.3, 2.5]} rotY={-0.9} w={1.1} h={0.6} lines={lang === 'ar' ? ['نصائح الزيارة'] : ['Visiting tips']} />
      </Interactive>
      <MemoryWall landmark="uhud" p={[-3.4, 0, -1.6]} rotY={0.9} />

      {rocks.map((k, i) => (
        <group key={i}>
          <mesh position={[k.x, k.s * 0.35, k.z]} rotation={[k.rot, k.rot * 2, 0]} scale={k.s} material={hillMat}><dodecahedronGeometry args={[1, 0]} /></mesh>
          {k.s > 0.7 && <Collider minX={k.x - k.s * 0.8} maxX={k.x + k.s * 0.8} minZ={k.z - k.s * 0.8} maxZ={k.z + k.s * 0.8} />}
        </group>
      ))}
      <Interactive info={collectibleInfo('uhud', 'granite')} kind="hidden" marker={[-6.2, 0.35, 11.5]}>
        <mesh position={[-6.2, 0.07, 11.5]} material={hillMat}><dodecahedronGeometry args={[0.09, 0]} /></mesh>
      </Interactive>
      <mesh position={[-6.8, 0.5, 11.2]} material={hillMat} scale={0.8}><dodecahedronGeometry args={[1, 0]} /></mesh>
      <Collider minX={-7.4} maxX={-6.2} minZ={10.6} maxZ={11.8} />
      {[[-6, 18], [6, 17], [-8, 4], [8, 12], [-14, 14], [14, 18]].map(([x, z], i) => <Palm key={'p' + i} p={[x, 0, z]} h={4} scale={1.5} rotY={i} lean={0.05} />)}

      <Interactive info={collectibleInfo('uhud', 'aynayn')} kind="hidden" marker={[-15.4, 1.1, 0.6]}>
        <mesh position={[-15.4, 0.25, 0.6]} material={hillMat}><boxGeometry args={[0.35, 0.5, 0.25]} /></mesh>
        <mesh position={[-15.4, 0.75, 0.6]} material={MAT.iron}><boxGeometry args={[0.03, 0.6, 0.03]} /></mesh>
        <mesh position={[-15.28, 0.95, 0.6]} material={MAT.fence}><boxGeometry args={[0.22, 0.14, 0.01]} /></mesh>
      </Interactive>
      <Collider minX={-15.6} maxX={-15.2} minZ={0.45} maxZ={0.75} />
      <Interactive info={collectibleInfo('uhud', 'jubayr')} kind="hidden" marker={[-3.4, 0.45, -11.8]}>
        <mesh position={[-3.4, 0.05, -11.8]} rotation={[0, 0.6, Math.PI / 2 - 0.08]} material={MAT.wood}><cylinderGeometry args={[0.012, 0.012, 0.7, 5]} /></mesh>
        <mesh position={[-3.12, 0.07, -11.6]} rotation={[0, 0.6, -Math.PI / 2]} material={MAT.iron}><coneGeometry args={[0.03, 0.09, 4]} /></mesh>
      </Interactive>
      {/* bounds */}
      <Collider minX={-26} maxX={26} minZ={-26} maxZ={-25} />
      <Collider minX={-26} maxX={26} minZ={25} maxZ={26} />
      <Collider minX={-26} maxX={-25} minZ={-26} maxZ={26} />
      <Collider minX={25} maxX={26} minZ={-26} maxZ={26} />
    </group>
  )
}
