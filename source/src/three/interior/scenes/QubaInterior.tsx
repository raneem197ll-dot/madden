import { INTERIORS, interiorInfo } from '../../../data/content'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { InfoContent } from '../../../data/types'
import { Collider, Column, Interactive, MemoryWall, PlayerController, SignPanel, Solid, collectibleInfo } from '../engine'
import { Atmosphere } from '../Atmosphere'
import { MAT } from '../../shared/materials'
import { carpetTex, marbleTex } from '../../shared/textures'
import { DomeField, Minaret } from '../../shared/parts'
import { Chandelier, DomeBay, Mihrab } from './MosqueParts'
import { useGame } from '../../../state/gameStore'

export const INFO = interiorInfo('quba', INTERIORS.quba)

export function QubaInterior() {
  const lang = useGame((s) => s.lang)
  const marble = useMemo(() => new THREE.MeshStandardMaterial({ map: marbleTex([6, 4]), roughness: 0.35 }), [])
  const carpet = useMemo(() => new THREE.MeshStandardMaterial({ map: carpetTex([10, 4]), roughness: 1 }), [])
  const smallDomes = useMemo(() => {
    const p: [number, number, number][] = []
    for (let x = -9; x <= 9.01; x += 2) p.push([x, 4.6, -8.5])
    for (let z = -6.5; z <= 0.01; z += 2.2) { p.push([-8.5, 4.6, z]); p.push([8.5, 4.6, z]) }
    return p
  }, [])

  return (
    <group>
      <Atmosphere sun={[14, 30, -16]} sunIntensity={2.1} hemi={0.95} ambient={0.32} />
      <PlayerController spawn={[0, -8.6]} yaw={Math.PI} />

      {/* floors */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -4]} material={marble}><planeGeometry args={[20, 12]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 5]} material={carpet}><planeGeometry args={[20, 8]} /></mesh>

      {/* outer walls */}
      <Solid p={[0, 3, 9.2]} s={[20.8, 6, 0.4]} m="white" />
      <Solid p={[-10.2, 3, -0.5]} s={[0.4, 6, 19.8]} m="white" />
      <Solid p={[10.2, 3, -0.5]} s={[0.4, 6, 19.8]} m="white" />
      <Solid p={[-6, 2.4, -10.2]} s={[8.4, 4.8, 0.4]} m="white" />
      <Solid p={[6, 2.4, -10.2]} s={[8.4, 4.8, 0.4]} m="white" />
      <Solid p={[0, 4.1, -10.2]} s={[3.6, 1.4, 0.4]} m="white" collide={false} />
      <Collider minX={-1.8} maxX={1.8} minZ={-11} maxZ={-10.6} />
      {/* basalt dado */}
      <Solid p={[0, 0.35, 8.98]} s={[20, 0.7, 0.05]} m="basalt" collide={false} />

      {/* arcades on W / E / N around the courtyard */}
      <Solid p={[0, 4.5, -8.5]} s={[20, 0.3, 3]} m="whiteWarm" collide={false} />
      <Solid p={[-8.5, 4.5, -3]} s={[3, 0.3, 8]} m="whiteWarm" collide={false} />
      <Solid p={[8.5, 4.5, -3]} s={[3, 0.3, 8]} m="whiteWarm" collide={false} />
      <DomeField points={smallDomes} r={0.75} />
      {[-4.6, -2.3, 2.3, 4.6].map((x) => <Column key={'n' + x} x={x} z={-7} h={4.4} r={0.22} />)}
      {[-7, -4.5, -2, 0.5].map((z) => <Column key={'w' + z} x={-7} z={z} h={4.4} r={0.22} />)}
      {[-7, -4.5, -2, 0.5].map((z) => <Column key={'e' + z} x={7} z={z} h={4.4} r={0.22} />)}

      {/* prayer hall: six domed bays (3 × 2) */}
      {[-6.67, 0, 6.67].map((x) => [3, 7].map((z) => (
        <DomeBay key={`${x}${z}`} x={x} z={z} w={6.67} d={4} y={6} r={1.75} drum={x === 0 && z === 7 ? 0.8 : 0.3} windows={x === 0 && z === 7 ? 10 : 0} />
      )))}
      {[-10, -3.33, 3.33, 10].map((x) => [1, 5, 9].map((z) => (
        <Column key={`c${x}${z}`} x={Math.max(-9.7, Math.min(9.7, x))} z={Math.min(8.7, z)} h={6} r={0.3} />
      )))}
      {[1, 5].map((z) => <Solid key={'beam' + z} p={[0, 5.85, z]} s={[20, 0.3, 0.4]} m="whiteWarm" collide={false} />)}
      {[-3.33, 3.33].map((x) => <Solid key={'beamx' + x} p={[x, 5.85, 5]} s={[0.4, 0.3, 8]} m="whiteWarm" collide={false} />)}
      {[-6.67, 0, 6.67].map((x) => [3, 7].map((z) => <Chandelier key={`ch${x}${z}`} p={[x, 4.1, z]} />))}
      <pointLight position={[0, 4.5, 5]} intensity={16} distance={18} decay={1.5} color="#ffe2b0" />

      {/* mihrab on the qibla wall (south) + simple minbar */}
      <Interactive info={INFO.mihrab} marker={[0, 4.4, 8.6]}>
        <Mihrab z={8.99} levels={2} />
      </Interactive>
      <Collider minX={-1.2} maxX={1.2} minZ={8.3} maxZ={9} />
      {[0, 1, 2, 3].map((i) => <Solid key={'mb' + i} p={[2.4, 0.2 + i * 0.2, 8.2 - i * 0.35]} s={[0.9, 0.4 + i * 0.4, 0.36]} m="woodDark" />)}

      {/* info points */}
      <Interactive info={INFO.gate} marker={[-2.6, 2.6, -9.2]}>
        <SignPanel id="quba-gate" p={[-2.6, 1.5, -9.75]} w={1.3} h={0.75} lines={lang === 'ar' ? ['مسجد قباء', 'أول مسجد في الإسلام', 'تمثيل مبسّط'] : ['Quba Mosque', 'The first mosque in Islam', 'Simplified']} />
      </Interactive>
      <Interactive info={INFO.court} marker={[0, 1.4, -3.2]}>
        <mesh position={[0, 0.02, -3.2]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.gold}><ringGeometry args={[0.8, 0.95, 32]} /></mesh>
      </Interactive>
      <Interactive info={INFO.domes} marker={[0, 3.2, 3]}>
        <mesh position={[0, 0.02, 3]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.gold}><ringGeometry args={[0.6, 0.72, 32]} /></mesh>
      </Interactive>
      <Interactive info={INFO.virtue} marker={[8.5, 2.6, -1.5]}>
        <SignPanel id="quba-virtue" p={[9.95, 1.6, -1.5]} rotY={-Math.PI / 2} w={1.4} h={0.8} post={false} lines={lang === 'ar' ? ['فضل الصلاة في قباء', 'وآداب الزيارة'] : ['Virtue of praying here', '& visiting etiquette']} />
      </Interactive>
      <Interactive info={INFO.expansion} marker={[-8.5, 2.6, -1.5]}>
        <SignPanel id="quba-exp" p={[-9.95, 1.6, -1.5]} rotY={Math.PI / 2} w={1.4} h={0.8} post={false} lines={lang === 'ar' ? ['توسعة ٢٠٢٢م', 'مشروع الملك سلمان'] : ['2022 expansion', 'King Salman project']} />
      </Interactive>
      <MemoryWall landmark="quba" p={[-9.95, 0, -5.5]} rotY={Math.PI / 2} />
      {/* collectibles (symbolic objects carrying verified facts) */}
      <Interactive info={collectibleInfo('quba', 'stone')} kind="hidden" marker={[6.75, 1.5, -6.75]}>
        <group position={[6.75, 1.2, -6.75]}>
          <mesh material={MAT.plaster}><boxGeometry args={[0.5, 0.06, 0.5]} /></mesh>
          <mesh position={[0, 0.13, 0]} rotation={[-0.3, 0.4, 0]} material={MAT.stoneTrim}><boxGeometry args={[0.32, 0.22, 0.05]} /></mesh>
          <mesh position={[0, 0.15, 0.03]} rotation={[-0.3, 0.4, 0]} material={MAT.gold}><circleGeometry args={[0.04, 12]} /></mesh>
        </group>
      </Interactive>
      <Interactive info={collectibleInfo('quba', 'saturday')} kind="hidden" marker={[-7.6, 0.95, 8.1]}>
        <mesh position={[-7.6, 0.3, 8.1]} material={MAT.woodDark}><boxGeometry args={[0.36, 0.6, 0.36]} /></mesh>
        <mesh position={[-7.6, 0.68, 8.1]} rotation={[-0.4, 0, 0]} material={MAT.plaster}><boxGeometry args={[0.26, 0.2, 0.02]} /></mesh>
        <mesh position={[-7.6, 0.76, 8.08]} rotation={[-0.4, 0, 0]} material={MAT.green}><boxGeometry args={[0.26, 0.05, 0.025]} /></mesh>
      </Interactive>
      <Collider minX={-7.85} maxX={-7.35} minZ={7.85} maxZ={8.35} />
      <Interactive info={collectibleInfo('quba', 'minaret')} kind="hidden" marker={[8.9, 0.9, -8.9]}>
        <group position={[8.9, 0, -8.9]} scale={0.12}><Minaret p={[0, 0, 0]} h={5} r={0.5} /></group>
      </Interactive>

      {/* minarets seen from the courtyard */}
      <Minaret p={[-10.6, 0, -10.6]} h={16} r={0.8} />
      <Minaret p={[10.6, 0, -10.6]} h={16} r={0.8} />
      <Minaret p={[-10.6, 0, 9.6]} h={16} r={0.8} />
      <Minaret p={[10.6, 0, 9.6]} h={16} r={0.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -16]} material={MAT.marble}><planeGeometry args={[40, 12]} /></mesh>
    </group>
  )
}
