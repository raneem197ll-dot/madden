import { INTERIORS, interiorInfo } from '../../../data/content'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { InfoContent } from '../../../data/types'
import { Collider, Column, Interactive, MemoryWall, PlayerController, SignPanel, Solid, collectibleInfo } from '../engine'
import { Atmosphere } from '../Atmosphere'
import { MAT } from '../../shared/materials'
import { archPaneGeometry, archWallGeometry, Palm } from '../../shared/parts'
import { sandTex, stoneBlocksTex, textPanel, tileFloorTex, woodTex } from '../../shared/textures'
import { registerGlow } from '../../shared/env'
import { Carriage, Locomotive } from '../../models/Train'
import { HejazModel } from '../../models/HejazModel'
import { useGame } from '../../../state/gameStore'


export const INFO = interiorInfo('hejaz', INTERIORS.hejaz)

function RouteMap({ p, rotY }: { p: [number, number, number]; rotY: number }) {
  const lang = useGame((s) => s.lang)
  const tex = useMemo(() => textPanel(`hejaz-map-${lang}`, 1024, 512, (g, W, H) => {
    g.fillStyle = '#efe1c2'; g.fillRect(0, 0, W, H)
    g.strokeStyle = '#a07d4a'; g.lineWidth = 12; g.strokeRect(10, 10, W - 20, H - 20)
    g.fillStyle = '#0f3d2e'; g.textAlign = 'center'; g.direction = 'rtl'
    g.font = '700 46px "Reem Kufi", "IBM Plex Sans Arabic", sans-serif'
    g.fillText(lang === 'ar' ? 'خط سكة حديد الحجاز' : 'The Hejaz Railway', W / 2, 70)
    const st = [
      ['دمشق', 'Damascus'], ['درعا', 'Daraa'], ['عمّان', 'Amman'], ['معان', 'Ma‘an'], ['تبوك', 'Tabuk'],
      ['مدائن صالح', 'Mada’in Salih'], ['العُلا', 'Al-Ula'], ['المدينة المنورة', 'Madinah'],
    ]
    // line from north (left) to south (right) on a gentle curve
    const pts = st.map((_, i) => [110 + (i / (st.length - 1)) * (W - 220), 250 + Math.sin(i * 0.9) * 40 + i * 14])
    g.strokeStyle = '#3d3b3d'; g.lineWidth = 10; g.setLineDash([])
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
    g.strokeStyle = '#efe1c2'; g.lineWidth = 4; g.setLineDash([16, 14])
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
    g.setLineDash([])
    pts.forEach(([x, y], i) => {
      const last = i === pts.length - 1
      g.fillStyle = last ? '#c9a24a' : '#0f3d2e'
      g.beginPath(); g.arc(x, y, last ? 18 : 12, 0, Math.PI * 2); g.fill()
      g.fillStyle = '#18201d'
      g.font = `${last ? 700 : 600} ${last ? 30 : 24}px "IBM Plex Sans Arabic", sans-serif`
      g.fillText(st[i][lang === 'ar' ? 0 : 1], x, y + (i % 2 ? 56 : -30))
    })
    g.fillStyle = '#5c6a64'; g.font = '500 26px "IBM Plex Sans Arabic", sans-serif'
    g.fillText(lang === 'ar' ? '≈ ١٣٠٠ كم · المحطة الأخيرة: المدينة المنورة (١٩٠٨م)' : '≈ 1,300 km · final stop: Madinah (1908)', W / 2, H - 50)
  }), [lang])
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <mesh material={MAT.woodDark}><boxGeometry args={[6.3, 3.3, 0.1]} /></mesh>
      <mesh position={[0, 0, 0.06]}><planeGeometry args={[6, 3]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>
    </group>
  )
}

function ArchWindow({ p, rotY, w = 1.4, h = 2.8 }: { p: [number, number, number]; rotY: number; w?: number; h?: number }) {
  const geo = archPaneGeometry(w, h)
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <mesh geometry={archPaneGeometry(w + 0.3, h + 0.15)} position={[0, -0.08, -0.005]} material={MAT.stoneTrim} />
      <mesh geometry={geo} material={daylight} />
    </group>
  )
}
const daylight = new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: '#ffe8b8', emissiveIntensity: 1.1, roughness: 1 })

export function HejazInterior() {
  const lang = useGame((s) => s.lang)
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ map: stoneBlocksTex('#4a4649', [5, 3]), roughness: 0.95 }), [])
  const wallShort = useMemo(() => new THREE.MeshStandardMaterial({ map: stoneBlocksTex('#4a4649', [3, 3]).clone(), roughness: 0.95 }), [])
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ map: tileFloorTex([11, 6]), roughness: 0.7 }), [])
  const ceiling = useMemo(() => new THREE.MeshStandardMaterial({ map: woodTex([6, 3]), roughness: 0.9 }), [])
  const ground = useMemo(() => new THREE.MeshStandardMaterial({ map: sandTex([16, 10], '#d4bb8c'), roughness: 1 }), [])
  const paving = useMemo(() => new THREE.MeshStandardMaterial({ map: tileFloorTex([16, 3]).clone(), color: '#d8c7a6', roughness: 0.9 }), [])
  const doorSpandrel = useMemo(() => archWallGeometry(4.2, 4.4, 0.42, 1, 3.9, 4.4), [])
  useEffect(() => {
    wallShort.map!.repeat.set(3, 3); wallShort.map!.needsUpdate = true
    paving.map!.repeat.set(16, 3); paving.map!.needsUpdate = true
  }, [wallShort, paving])
  useEffect(() => registerGlow(daylight, 1.1, 0.12), [])
  const sleepers = useMemo(() => Array.from({ length: 52 }, (_, i) => -18 + i * 0.7), [])

  return (
    <group>
      <Atmosphere sun={[-12, 26, -20]} sunIntensity={2} hemi={0.85} ambient={0.32} />
      <PlayerController spawn={[0, 4.6]} yaw={0} />

      {/* ================= STATION HALL ================= */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} material={floor}><planeGeometry args={[22, 12]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6, 0]} material={ceiling}><planeGeometry args={[22.4, 12.4]} /></mesh>
      {[-9, -6, -3, 0, 3, 6, 9].map((x) => <Solid key={x} p={[x, 5.82, 0]} s={[0.3, 0.36, 12]} m="woodDark" collide={false} />)}

      {/* walls */}
      <Solid p={[0, 3, 6.2]} s={[22.8, 6, 0.4]} mat={wall} />
      <Solid p={[-6.6, 3, -6.2]} s={[8.8, 6, 0.4]} mat={wall} />
      <Solid p={[6.6, 3, -6.2]} s={[8.8, 6, 0.4]} mat={wall} />
      <Solid p={[0, 5.2, -6.2]} s={[4.4, 1.6, 0.4]} mat={wall} collide={false} />
      <mesh geometry={doorSpandrel} position={[0, 0, -6.2]} material={wall} />
      <Solid p={[-11.2, 3, 0]} s={[0.4, 6, 12.8]} mat={wallShort} />
      <Solid p={[11.2, 3, 0]} s={[0.4, 6, 12.8]} mat={wallShort} />
      {/* trim bands */}
      <Solid p={[0, 0.15, 5.98]} s={[22, 0.3, 0.06]} m="stoneTrim" collide={false} />
      <Solid p={[0, 4.8, 5.98]} s={[22, 0.14, 0.06]} m="stoneTrim" collide={false} />

      {[-8, -4, 4, 8].map((x) => <ArchWindow key={x} p={[x, 1.3, 5.98]} rotY={Math.PI} />)}
      <ArchWindow p={[0, 1.6, 5.98]} rotY={Math.PI} w={1.8} h={3.0} />
      {[-4.4, 4.4].map((z) => <ArchWindow key={'w' + z} p={[-10.98, 1.3, z]} rotY={Math.PI / 2} />)}
      <ArchWindow p={[10.98, 1.3, -4.6]} rotY={-Math.PI / 2} />
      <ArchWindow p={[10.98, 1.3, 5.0]} rotY={-Math.PI / 2} w={1.0} h={2.4} />

      {/* columns with beams */}
      {[-7, -3.5, 3.5, 7].map((x) => [-2.6, 2.6].map((z) => <Column key={`${x}${z}`} x={x} z={z} h={5.65} m="basaltLight" />))}
      {[-2.6, 2.6].map((z) => <Solid key={'b' + z} p={[0, 5.5, z]} s={[22, 0.4, 0.5]} m="stoneTrim" collide={false} />)}

      {/* warm hall lights */}
      <pointLight position={[0, 4.8, 0]} intensity={14} distance={16} decay={1.5} color="#ffd9a0" />
      <pointLight position={[-7, 4.6, 0]} intensity={9} distance={12} decay={1.5} color="#ffd9a0" />
      <pointLight position={[7, 4.6, 0]} intensity={9} distance={12} decay={1.5} color="#ffd9a0" />
      {[-5.25, 0, 5.25].map((x) => (
        <group key={x} position={[x, 5.2, 0]}>
          <mesh material={MAT.iron} position={[0, 0.4, 0]}><cylinderGeometry args={[0.015, 0.015, 0.8, 4]} /></mesh>
          <mesh material={MAT.brass}><torusGeometry args={[0.45, 0.04, 6, 20]} /></mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} material={MAT.glowWarm} position={[Math.cos((i / 6) * Math.PI * 2) * 0.45, 0.08, Math.sin((i / 6) * Math.PI * 2) * 0.45]}><sphereGeometry args={[0.06, 8, 6]} /></mesh>
          ))}
        </group>
      ))}

      {/* 1. welcome stand */}
      <Interactive info={INFO.welcome} marker={[2.2, 2.35, 3.4]}>
        <SignPanel id="welcome" p={[2.2, 1.45, 3.4]} rotY={-0.8} w={1.1} h={0.75} lines={lang === 'ar' ? ['محطة المدينة', 'سكة حديد الحجاز · ١٩٠٨م', 'تمثيل مبسّط في اللعبة'] : ['Madinah Station', 'Hejaz Railway · 1908', 'Simplified game representation']} />
      </Interactive>
      <Collider minX={1.9} maxX={2.5} minZ={3.2} maxZ={3.6} />

      {/* 2. station model on a round table — the first thing you see */}
      <Interactive info={INFO.model} marker={[0, 2.5, 0]}>
        <mesh position={[0, 0.45, 0]} material={MAT.woodDark}><cylinderGeometry args={[1.35, 1.2, 0.9, 28]} /></mesh>
        <mesh position={[0, 0.91, 0]} material={MAT.stoneTrim}><cylinderGeometry args={[1.4, 1.4, 0.04, 28]} /></mesh>
        <group position={[0, 0.93, 0]} scale={0.19}><HejazModel /></group>
        <mesh position={[0, 1.5, 0]} material={MAT.glass}><cylinderGeometry args={[1.32, 1.32, 1.15, 28, 1, true]} /></mesh>
      </Interactive>
      <Collider minX={-1.45} maxX={1.45} minZ={-1.45} maxZ={1.45} />

      {/* 3. route map on the west wall */}
      <Interactive info={INFO.map} marker={[-10.3, 4.7, 0]}>
        <RouteMap p={[-10.94, 2.9, 0]} rotY={Math.PI / 2} />
      </Interactive>

      {/* 4. ticket window (east, north end) */}
      <Interactive info={INFO.tickets} marker={[9.3, 3.2, -3.2]}>
        <Solid p={[10.1, 1.15, -3.2]} s={[1.8, 2.3, 3.2]} m="wood" />
        <Solid p={[9.18, 1.35, -3.2]} s={[0.04, 0.8, 1.6]} m="opening" collide={false} />
        {[-0.6, -0.3, 0, 0.3, 0.6].map((z) => <Solid key={z} p={[9.15, 1.35, -3.2 + z]} s={[0.03, 0.8, 0.03]} m="brass" collide={false} />)}
        <Solid p={[9.05, 0.95, -3.2]} s={[0.3, 0.06, 2]} m="woodDark" collide={false} />
        <SignPanel id="tickets" p={[9.17, 2.6, -3.2]} rotY={-Math.PI / 2} w={1.6} h={0.4} post={false} lines={lang === 'ar' ? ['شباك التذاكر'] : ['Tickets']} />
      </Interactive>

      {/* 5. tools case */}
      <Interactive info={INFO.tools} marker={[-6, 2.4, 4.4]}>
        <Solid p={[-6, 0.5, 4.4]} s={[2.4, 1, 1.2]} m="woodDark" />
        <mesh position={[-6, 1.45, 4.4]} material={MAT.glass}><boxGeometry args={[2.3, 0.9, 1.1]} /></mesh>
        <mesh position={[-6.6, 1.15, 4.4]} material={MAT.brass}><cylinderGeometry args={[0.12, 0.14, 0.3, 8]} /></mesh>
        <mesh position={[-6.6, 1.33, 4.4]} material={MAT.glowWarm}><sphereGeometry args={[0.08, 8, 6]} /></mesh>
        <mesh position={[-5.8, 1.04, 4.3]} rotation={[0, 0.4, 0]} material={MAT.iron}><boxGeometry args={[0.6, 0.06, 0.08]} /></mesh>
        <mesh position={[-5.3, 1.05, 4.5]} rotation={[0, -0.6, 0]} material={MAT.wood}><boxGeometry args={[0.5, 0.05, 0.05]} /></mesh>
        <mesh position={[-5.1, 1.08, 4.5]} rotation={[0, -0.6, 0]} material={MAT.iron}><boxGeometry args={[0.08, 0.1, 0.18]} /></mesh>
      </Interactive>

      {/* 6. documents case */}
      <Interactive info={INFO.docs} marker={[6, 2.4, 4.4]}>
        <Solid p={[6, 0.5, 4.4]} s={[2.4, 1, 1.2]} m="woodDark" />
        <mesh position={[6, 1.45, 4.4]} material={MAT.glass}><boxGeometry args={[2.3, 0.9, 1.1]} /></mesh>
        {[[-0.6, 0.1], [0.05, -0.05], [0.65, 0.12]].map(([x, r], i) => (
          <mesh key={i} position={[6 + x, 1.02, 4.4]} rotation={[-Math.PI / 2, 0, r]} material={MAT.plaster}><planeGeometry args={[0.55, 0.42]} /></mesh>
        ))}
        <mesh position={[6.05, 1.03, 4.4]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.ironRed}><circleGeometry args={[0.07, 12]} /></mesh>
      </Interactive>

      {/* 7. vintage lamp */}
      <Interactive info={INFO.lamp} marker={[-8.6, 3.6, -3.9]}>
        <mesh position={[-8.6, 1.4, -3.9]} material={MAT.iron}><cylinderGeometry args={[0.06, 0.12, 2.8, 8]} /></mesh>
        <mesh position={[-8.6, 0.1, -3.9]} material={MAT.iron}><cylinderGeometry args={[0.3, 0.35, 0.2, 10]} /></mesh>
        <mesh position={[-8.6, 3.0, -3.9]} material={MAT.glowWarm}><sphereGeometry args={[0.22, 12, 10]} /></mesh>
        <mesh position={[-8.6, 3.25, -3.9]} material={MAT.iron}><coneGeometry args={[0.28, 0.2, 10]} /></mesh>
      </Interactive>
      <Collider minX={-8.9} maxX={-8.3} minZ={-4.2} maxZ={-3.6} />

      {/* 8. arches plaque by the gate */}
      <Interactive info={INFO.arches} marker={[3.2, 2.9, -5.6]}>
        <SignPanel id="arches" p={[3.2, 1.8, -5.97]} w={1.3} h={0.8} post={false} lines={lang === 'ar' ? ['١٧ قوسًا', 'حجر بركاني محلي'] : ['17 arches', 'Local volcanic stone']} />
      </Interactive>

      {/* 9. memory wall */}
      <MemoryWall landmark="hejaz" p={[10.95, 0, 2.6]} rotY={-Math.PI / 2} />

      {/* hidden: old ticket by the ticket booth */}
      <Interactive info={collectibleInfo('hejaz', 'ticket')} kind="hidden" marker={[8.9, 0.25, -1.3]}>
        <mesh position={[8.9, 0.02, -1.3]} rotation={[-Math.PI / 2, 0, 0.5]} material={MAT.plaster}><planeGeometry args={[0.18, 0.09]} /></mesh>
      </Interactive>

      {/* ================= PLATFORM (outside) ================= */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -16]} material={ground}><planeGeometry args={[60, 30]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -8.8]} material={paving}><planeGeometry args={[34, 4.8]} /></mesh>
      <Solid p={[0, 0.08, -11.3]} s={[34, 0.16, 0.3]} m="stoneTrim" collide={false} />
      {/* ballast + track (1050 mm gauge) */}
      <mesh position={[0, 0.04, -13]} material={MAT.basaltLight}><boxGeometry args={[38, 0.08, 3]} /></mesh>
      <instancedMesh
        ref={(im) => {
          if (!im) return
          const o = new THREE.Object3D()
          sleepers.forEach((x, i) => { o.position.set(x, 0.12, -13); o.updateMatrix(); im.setMatrixAt(i, o.matrix) })
          im.instanceMatrix.needsUpdate = true
          im.computeBoundingSphere()
        }}
        args={[undefined, MAT.woodDark, sleepers.length]}
      >
        <boxGeometry args={[0.24, 0.1, 2.1]} />
      </instancedMesh>
      {[-13.525, -12.475].map((z) => <Solid key={z} p={[0, 0.22, z]} s={[37, 0.12, 0.07]} m="iron" collide={false} />)}

      <Interactive info={INFO.loco} marker={[-3, 4.7, -13]}>
        <group position={[-1.5, 0.16, -13]}><Locomotive /></group>
      </Interactive>
      <Interactive info={INFO.carriage} marker={[10.6, 4.4, -13]}>
        <group position={[10.6, 0.16, -13]}><Carriage /></group>
      </Interactive>
      <Collider minX={-7.1} maxX={15.4} minZ={-14.4} maxZ={-11.6} />

      {/* canopy */}
      {[-12, -8, -4, 0, 4, 8, 12].map((x) => <Column key={'c' + x} x={x} z={-10.6} h={4.3} r={0.09} m="iron" cap="iron" />)}
      <Solid p={[0, 4.45, -8.6]} s={[26, 0.14, 4.8]} m="woodDark" collide={false} />
      <Solid p={[0, 4.6, -8.6]} s={[26.4, 0.1, 5.2]} m="ironRed" collide={false} />

      {/* water tower (four tanks) */}
      <Interactive info={INFO.tower} marker={[-13.5, 6.4, -17.5]}>
        <group position={[-13.5, 0, -17.5]}>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x * 1.3, 2, z * 1.3]} material={MAT.iron}><boxGeometry args={[0.2, 4, 0.2]} /></mesh>)}
          <mesh position={[0, 4.05, 0]} material={MAT.iron}><boxGeometry args={[3.2, 0.2, 3.2]} /></mesh>
          {[[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]].map(([x, z]) => <mesh key={`t${x}${z}`} position={[x, 4.85, z]} material={MAT.ironRed}><cylinderGeometry args={[0.65, 0.65, 1.4, 14]} /></mesh>)}
        </group>
      </Interactive>
      <Collider minX={-15} maxX={-12} minZ={-19} maxZ={-16} />

      {/* bench + hidden pocket watch */}
      <Solid p={[-14.5, 0.25, -8]} s={[0.6, 0.5, 2]} m="wood" />
      <Interactive info={collectibleInfo('hejaz', 'watch')} kind="hidden" marker={[-14.45, 0.75, -7.6]}>
        <mesh position={[-14.45, 0.53, -7.6]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.gold}><cylinderGeometry args={[0.07, 0.07, 0.02, 14]} /></mesh>
      </Interactive>

      {/* hidden: signal lantern near the tender */}
      <Interactive info={collectibleInfo('hejaz', 'lantern')} kind="hidden" marker={[5.9, 0.6, -11.0]}>
        <mesh position={[5.9, 0.18, -11.0]} material={MAT.ironRed}><boxGeometry args={[0.18, 0.26, 0.18]} /></mesh>
        <mesh position={[5.9, 0.2, -10.9]} material={MAT.glowWarm}><boxGeometry args={[0.1, 0.12, 0.02]} /></mesh>
      </Interactive>

      {/* boundaries */}
      <Collider minX={-17.8} maxX={-17.2} minZ={-22} maxZ={-6} />
      <Collider minX={17.2} maxX={17.8} minZ={-22} maxZ={-6} />
      <Collider minX={-18} maxX={18} minZ={-21.6} maxZ={-21} />
      {Array.from({ length: 37 }).map((_, i) => <mesh key={'f' + i} position={[-18 + i, 0.5, -21.3]} material={MAT.iron}><boxGeometry args={[0.06, 1, 0.06]} /></mesh>)}
      <Solid p={[0, 0.9, -21.3]} s={[36, 0.05, 0.05]} m="iron" collide={false} />
      {[-17.5, 17.5].map((x) => <Solid key={x} p={[x, 0.9, -13.6]} s={[0.05, 0.05, 15.4]} m="iron" collide={false} />)}

      {/* backdrop */}
      {[[-24, -34, 8, 5], [-8, -38, 10, 7], [10, -36, 9, 6], [26, -32, 7, 4.5]].map(([x, z, s, h], i) => (
        <mesh key={i} position={[x, 0, z]} scale={[s, h, s * 0.6]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={i % 2 ? '#a8603f' : '#4a4442'} flatShading roughness={1} /></mesh>
      ))}
      {[[-16, -24], [-10, -25], [12, -24.5], [18, -23]].map(([x, z], i) => <Palm key={i} p={[x, 0, z]} h={4.5} scale={1.6} rotY={i} lean={0.05} />)}
    </group>
  )
}
