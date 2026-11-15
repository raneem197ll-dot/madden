import { INTERIORS, interiorInfo } from '../../../data/content'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { InfoContent } from '../../../data/types'
import { Collider, Interactive, MemoryWall, PlayerController, SignPanel, Solid, collectibleInfo } from '../engine'
import { Atmosphere } from '../Atmosphere'
import { MAT } from '../../shared/materials'
import { archPaneGeometry, holedSlabGeometry } from '../../shared/parts'
import { carpetTex, textPanel } from '../../shared/textures'
import { ArchRowWall, Chandelier, DomeBay, Mihrab, VaultShell } from './MosqueParts'
import { useGame } from '../../../state/gameStore'

export const INFO = interiorInfo('qiblatain', INTERIORS.qiblatain)

function Compass() {
  const lang = useGame((s) => s.lang)
  const tex = useMemo(() => textPanel(`qib-compass2-${lang}`, 512, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H)
    g.fillStyle = 'rgba(248,240,224,0.95)'; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 6, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#c9a24a'; g.lineWidth = 10; g.stroke()
    // the mesh is turned so the text faces a visitor entering from the north:
    // canvas top = south (Makkah), canvas bottom = north (Jerusalem)
    g.fillStyle = '#1f6b4f'; g.beginPath(); g.moveTo(W / 2, 40); g.lineTo(W / 2 - 40, H / 2 - 10); g.lineTo(W / 2 + 40, H / 2 - 10); g.fill()
    g.fillStyle = '#6e6e6e'; g.beginPath(); g.moveTo(W / 2, H - 40); g.lineTo(W / 2 - 34, H / 2 + 10); g.lineTo(W / 2 + 34, H / 2 + 10); g.fill()
    g.textAlign = 'center'
    g.font = '700 32px "IBM Plex Sans Arabic", sans-serif'
    g.fillStyle = '#0f3d2e'
    g.fillText(lang === 'ar' ? 'الكعبة · مكة — الجنوب' : 'Ka‘bah · Makkah — South', W / 2, H / 2 - 44)
    g.font = '600 28px "IBM Plex Sans Arabic", sans-serif'
    g.fillStyle = '#18201d'
    g.fillText(lang === 'ar' ? 'بيت المقدس — الشمال' : 'Jerusalem — North', W / 2, H / 2 + 66)
  }), [lang])
  return (
    <mesh rotation={[-Math.PI / 2, 0, Math.PI]} position={[0, 0.02, -3.2]}>
      <circleGeometry args={[1.3, 48]} />
      <meshStandardMaterial map={tex} transparent roughness={0.6} />
    </mesh>
  )
}

export function QiblatainInterior() {
  const lang = useGame((s) => s.lang)
  const carpet = useMemo(() => new THREE.MeshStandardMaterial({ map: carpetTex([9, 7], '#7d1d26'), roughness: 1 }), [])
  const lightPatch = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff3cf', transparent: true, opacity: 0.35, depthWrite: false }), [])
  const H = 6
  return (
    <group>
      <Atmosphere sun={[10, 30, 20]} sunIntensity={1.6} hemi={0.9} ambient={0.34} />
      <PlayerController spawn={[0, -6]} yaw={Math.PI} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} material={carpet}><planeGeometry args={[18, 14]} /></mesh>

      {/* walls: entrance on the north (−z), qibla wall on the south (+z) */}
      <Solid p={[0, H / 2, 7.2]} s={[18.8, H, 0.4]} />
      <Solid p={[-9.2, H / 2, 0]} s={[0.4, H, 14.8]} />
      <Solid p={[9.2, H / 2, 0]} s={[0.4, H, 14.8]} />
      <Solid p={[-5.4, H / 2, -7.2]} s={[7.6, H, 0.4]} />
      <Solid p={[5.4, H / 2, -7.2]} s={[7.6, H, 0.4]} />
      <Solid p={[0, 4.6, -7.2]} s={[3.2, 2.8, 0.4]} collide={false} />
      <Collider minX={-1.6} maxX={1.6} minZ={-8} maxZ={-7.5} />
      <mesh position={[0, 1.6, -7.45]} material={MAT.wood}><boxGeometry args={[3.2, 3.2, 0.1]} /></mesh>
      {[-6, 6].map((x) => [-3.6, 3.6].map((z) => (
        <mesh key={`${x}${z}`} geometry={archPaneGeometry(1.2, 2.4)} position={[x < 0 ? -8.99 : 8.99, 1.4, z]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} material={MAT.glowWarm} />
      )))}

      {/* arch rows parallel to the qibla wall */}
      <ArchRowWall z={-2.4} width={18} height={H} count={5} archW={2.6} archH={4.6} />
      <ArchRowWall z={2.4} width={18} height={H} count={5} archW={2.6} archH={4.6} />

      {/* side vaults */}
      {[[-4.7, 4.6], [0, 4.8], [4.7, 4.6]].map(([z, w]) => (
        <group key={z}>
          <VaultShell x={-5.8} z={z} y={H} r={w / 2} len={6.4} />
          <VaultShell x={5.8} z={z} y={H} r={w / 2} len={6.4} />
        </group>
      ))}
      {/* central axis: two domes towards Makkah (south) */}
      <DomeBay x={0} z={4.7} w={5.2} d={4.6} y={H} r={2.2} drum={1.1} windows={12} />
      <DomeBay x={0} z={0} w={5.2} d={4.8} y={H} r={1.9} drum={0.25} />
      <mesh geometry={holedSlabGeometry(5.2, 4.6, 0.01)} position={[0, H, -4.7]} material={MAT.white} />
      <Chandelier p={[0, 4.4, 4.7]} r={1.1} />
      <Chandelier p={[0, 4.4, 0]} r={0.9} />
      <pointLight position={[0, 4.6, 2]} intensity={14} distance={16} decay={1.5} color="#ffe2b0" />

      {/* mihrab with two recessed levels */}
      <Interactive info={INFO.mihrab} marker={[0, 4.6, 6.4]}>
        <Mihrab z={6.99} levels={2} w={1.8} h={3.4} />
      </Interactive>
      <Collider minX={-1.3} maxX={1.3} minZ={6.5} maxZ={7} />

      {/* symbolic marker of the first qibla on the north wall, above the entrance */}
      <Interactive info={INFO.marker} marker={[0, 5.6, -6.6]}>
        <group position={[0, 3.3, -6.99]}>
          <mesh geometry={archPaneGeometry(1.0, 1.4)} material={MAT.stoneTrim} />
          <mesh geometry={archPaneGeometry(0.75, 1.15)} position={[0, 0.06, 0.004]} material={MAT.whiteWarm} />
        </group>
      </Interactive>

      <Interactive info={INFO.compass} marker={[0, 0.9, -3.2]}><Compass /></Interactive>
      <Interactive info={INFO.gate} marker={[-3.2, 2.5, -6.3]}>
        <SignPanel id="qib-gate" p={[-3.2, 1.45, -6.6]} w={1.3} h={0.75} lines={lang === 'ar' ? ['مسجد القبلتين', 'تحويل القبلة · ٢ هـ', 'تمثيل مبسّط'] : ['Qiblatain Mosque', 'Qibla change · 2 AH', 'Simplified']} />
      </Interactive>
      <Interactive info={INFO.arches} marker={[-5.4, 2.6, -2.85]} />
      <Interactive info={INFO.open} marker={[3.2, 2.5, -6.3]}>
        <SignPanel id="qib-open" p={[3.2, 1.45, -6.6]} w={1.3} h={0.75} lines={lang === 'ar' ? ['مفتوح ٢٤ ساعة', 'منذ أكتوبر ٢٠٢٥م'] : ['Open 24 hours', 'since October 2025']} />
      </Interactive>
      <MemoryWall landmark="qiblatain" p={[8.95, 0, -4.8]} rotY={-Math.PI / 2} />
      <Interactive info={collectibleInfo('qiblatain', 'light')} kind="hidden" marker={[0.6, 0.5, 5.0]}>
        <mesh position={[0.6, 0.015, 5.0]} rotation={[-Math.PI / 2, 0, 0]} material={lightPatch}><circleGeometry args={[0.7, 24]} /></mesh>
      </Interactive>

      <Interactive info={collectibleInfo('qiblatain', 'months')} kind="hidden" marker={[7.6, 0.95, 5.8]}>
        <mesh position={[7.6, 0.3, 5.8]} material={MAT.woodDark}><boxGeometry args={[0.36, 0.6, 0.36]} /></mesh>
        <mesh position={[7.6, 0.68, 5.8]} rotation={[-0.4, 0, 0]} material={MAT.plaster}><boxGeometry args={[0.26, 0.2, 0.02]} /></mesh>
      </Interactive>
      <Collider minX={7.35} maxX={7.85} minZ={5.55} maxZ={6.05} />
      <Interactive info={collectibleInfo('qiblatain', 'verse')} kind="hidden" marker={[-8.2, 0.95, 1.2]}>
        <mesh position={[-8.2, 0.3, 1.2]} material={MAT.woodDark}><boxGeometry args={[0.4, 0.6, 0.4]} /></mesh>
        <mesh position={[-8.2, 0.66, 1.2]} rotation={[-0.5, 0, 0]} material={MAT.green}><boxGeometry args={[0.3, 0.22, 0.03]} /></mesh>
        <mesh position={[-8.2, 0.68, 1.21]} rotation={[-0.5, 0, 0]} material={MAT.gold}><boxGeometry args={[0.2, 0.012, 0.035]} /></mesh>
      </Interactive>
      <Collider minX={-8.45} maxX={-7.95} minZ={0.95} maxZ={1.45} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -14]} material={MAT.marble}><planeGeometry args={[40, 12]} /></mesh>
    </group>
  )
}
