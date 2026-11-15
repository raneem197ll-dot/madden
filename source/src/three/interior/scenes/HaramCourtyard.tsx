import { useMemo } from 'react'
import * as THREE from 'three'
import { INTERIORS, interiorInfo } from '../../../data/content'
import { Collider, Interactive, PlayerController, SignPanel, Solid } from '../engine'
import { Atmosphere } from '../Atmosphere'
import { MAT } from '../../shared/materials'
import { archWallGeometry, Dome, Minaret } from '../../shared/parts'
import { facadeTex, plazaTex } from '../../shared/textures'
import { Umbrellas } from '../../models/HaramModel'
import { useGame } from '../../../state/gameStore'

export const INFO = interiorInfo('haram', INTERIORS.haram)

/** Umbrella grid over the northern plaza (scene units ≈ metres, compressed). */
const UMBRELLAS: [number, number][] = (() => {
  const pts: [number, number][] = []
  for (const x of [-37.5, -22.5, -7.5, 7.5, 22.5, 37.5]) for (const z of [-17, -2, 13]) pts.push([x, z])
  return pts
})()

/**
 * The northern plazas of the Prophet's Mosque, simplified: marble paving, retractable
 * umbrellas that open by day and fold at night, the north façade with its main gate and
 * minarets, and the Green Dome seen in the distance. Out of respect there is no prayer
 * hall interior, no Rawdah and no Prophet's chamber — and no games or hidden items here.
 */
export function HaramCourtyard() {
  const lang = useGame((s) => s.lang)
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ map: plazaTex([24, 18]), roughness: 0.32 }), [])
  const band = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9b38c', roughness: 0.6 }), [])
  const facade = useMemo(() => archWallGeometry(80, 12, 1.2, 16, 2.6, 6.4, 0.4), [])
  const towers = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: facadeTex(5, 4, false, 7), roughness: 0.9 })
    m.map!.repeat.set(3, 4)
    return m
  }, [])
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  return (
    <group>
      <Atmosphere sunIntensity={2.4} ambient={0.3} />
      <PlayerController spawn={[0, -24]} yaw={Math.PI} speed={4.2} />

      {/* marble plaza with stone bands */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]} material={floor} receiveShadow><planeGeometry args={[96, 72]} /></mesh>
      {[-22.5, -7.5, 7.5, 22.5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, -4]} material={band}><planeGeometry args={[0.35, 60]} /></mesh>
      ))}
      {[-24.5, -9.5, 5.5].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]} material={band}><planeGeometry args={[80, 0.35]} /></mesh>
      ))}

      <Umbrellas points={UMBRELLAS} scale={10} pole={0.95} poleR={0.028} />
      {UMBRELLAS.map(([x, z], i) => <Collider key={i} minX={x - 0.4} maxX={x + 0.4} minZ={z - 0.4} maxZ={z + 0.4} />)}

      {/* north façade of the mosque with the main gate (doors closed — the hall is not modelled) */}
      <mesh geometry={facade} position={[0, 0, 26]} rotation={[0, Math.PI, 0]} material={MAT.whiteWarm} castShadow receiveShadow />
      <Solid p={[0, 6, 26.9]} s={[80, 12, 0.6]} m="opening" />
      <Solid p={[0, 12.4, 26]} s={[82, 0.8, 1.6]} m="stoneTrim" collide={false} />
      <Solid p={[0, 8, 25.4]} s={[12, 16, 1.8]} m="whiteWarm" collide={false} />
      <Solid p={[0, 4.5, 24.45]} s={[6.4, 9, 0.2]} m="woodDark" collide={false} />
      <Solid p={[0, 9.4, 24.4]} s={[7.4, 0.5, 0.2]} m="gold" collide={false} />
      <Collider minX={-41} maxX={41} minZ={24.2} maxZ={28} />
      <Minaret p={[-16, 0, 27.5]} h={44} r={1.7} />
      <Minaret p={[16, 0, 27.5]} h={44} r={1.7} />

      {/* the Green Dome, far to the south-east beyond the roof line */}
      <group position={[34, 0, 120]}>
        <mesh position={[0, 15, 0]} material={MAT.whiteWarm}><cylinderGeometry args={[7.5, 7.5, 6, 24]} /></mesh>
        <Dome p={[0, 18, 0]} r={8} m="greenDome" seg={24} squash={1.15} />
      </group>
      <Solid p={[0, 6, 70]} s={[200, 12, 80]} m="whiteWarm" collide={false} />

      {/* hotel towers of the central area behind the northern plaza */}
      {[-48, -30, -12, 8, 26, 44].map((x, i) => (
        <mesh key={x} position={[x, 18 + (i % 3) * 5, -62]} material={towers}><boxGeometry args={[15, 36 + (i % 3) * 10, 12]} /></mesh>
      ))}
      <Collider minX={-46} maxX={46} minZ={-42} maxZ={-40} />
      <Collider minX={-46} maxX={-44} minZ={-42} maxZ={26} />
      <Collider minX={44} maxX={46} minZ={-42} maxZ={26} />

      {/* information markers — no collectibles in the Haram */}
      <Interactive info={INFO.welcome} marker={[-3.2, 2.6, -20.6]}>
        <SignPanel id="haram-w" p={[-3.2, 1.45, -20.6]} rotY={0.2} w={1.5} h={0.8} lines={[L('ساحات المسجد النبوي', 'The Prophet’s Mosque plazas'), L('تمثيل مبسّط', 'Simplified')]} />
      </Interactive>
      <Collider minX={-3.7} maxX={-2.7} minZ={-20.9} maxZ={-20.3} />
      <Interactive info={INFO.umbrellas} marker={[2.2, 2.6, -2]}>
        <SignPanel id="haram-u" p={[2.2, 1.45, -2]} rotY={Math.PI / 2} w={1.4} h={0.8} lines={[L('٢٥٠ مظلة متحركة', '250 retractable umbrellas'), L('≈ ١٤٣ ألف م²', '≈ 143,000 m²')]} />
      </Interactive>
      <Collider minX={1.9} maxX={2.5} minZ={-2.5} maxZ={-1.5} />
      <Interactive info={INFO.minarets} marker={[-12.5, 2.6, 21]}>
        <SignPanel id="haram-m" p={[-12.5, 1.45, 21]} rotY={Math.PI} w={1.3} h={0.75} lines={[L('عشر مآذن', 'Ten minarets')]} />
      </Interactive>
      <Collider minX={-13} maxX={-12} minZ={20.7} maxZ={21.3} />
      <Interactive info={INFO.expansion} marker={[5.6, 2.6, 21]}>
        <SignPanel id="haram-e" p={[5.6, 1.45, 21]} rotY={Math.PI} w={1.4} h={0.8} lines={[L('١ هـ — التأسيس', '1 AH — founded'), L('١٩٨٥م — التوسعة الثانية', '1985 — 2nd Saudi expansion')]} />
      </Interactive>
      <Collider minX={5.1} maxX={6.1} minZ={20.7} maxZ={21.3} />
      <Interactive info={INFO.dome} marker={[22, 2.6, 18]}>
        <SignPanel id="haram-d" p={[22, 1.45, 18]} rotY={Math.PI * 0.85} w={1.4} h={0.8} lines={[L('القبة الخضراء', 'The Green Dome'), L('↘ جنوب شرق المسجد', '↘ south-east of the mosque')]} />
      </Interactive>
      <Collider minX={21.5} maxX={22.5} minZ={17.7} maxZ={18.3} />
      <Interactive info={INFO.etiquette} marker={[-14, 2.6, -8]}>
        <SignPanel id="haram-x" p={[-14, 1.45, -8]} rotY={-Math.PI / 2} w={1.3} h={0.75} lines={[L('آداب الزيارة', 'Visiting etiquette')]} />
      </Interactive>
      <Collider minX={-14.3} maxX={-13.7} minZ={-8.5} maxZ={-7.5} />
    </group>
  )
}
