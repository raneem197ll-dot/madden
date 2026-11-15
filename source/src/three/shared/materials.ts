import * as THREE from 'three'
import { createContext, useContext } from 'react'
import { registerGlow } from './env'

/** One shared set of materials keeps draw calls & shader programs low. */
function std(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra })
}

export const MAT = {
  white: std('#f5f1e8', { roughness: 0.75, emissive: '#ffeccc', emissiveIntensity: 0 }),
  whiteWarm: std('#efe6d3', { emissive: '#ffe6bf', emissiveIntensity: 0 }),
  plaster: std('#e8dcc3'),
  marble: std('#ece7dd', { roughness: 0.4 }),
  basalt: std('#3f3d40', { roughness: 0.95 }),
  basaltLight: std('#57545a', { roughness: 0.95 }),
  stoneTrim: std('#cdb58a', { roughness: 0.9 }),
  sand: std('#d9c296'),
  sandDark: std('#bfa173'),
  opening: std('#2a2623', { roughness: 1 }),
  openingWarm: new THREE.MeshStandardMaterial({ color: '#3a2c1e', emissive: '#ffb45c', emissiveIntensity: 0.05, roughness: 1 }),
  gold: std('#c9a24a', { metalness: 0.65, roughness: 0.32 }),
  brass: std('#b8913f', { metalness: 0.6, roughness: 0.4 }),
  wood: std('#7a5234'),
  woodDark: std('#4e3220'),
  iron: std('#2a2b2e', { metalness: 0.4, roughness: 0.55 }),
  ironRed: std('#7f2a22', { metalness: 0.2, roughness: 0.6 }),
  carriageGreen: std('#2f4a3c', { roughness: 0.7 }),
  granite: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
  palmTrunk: std('#8a6a45'),
  palmLeaf: std('#4f7f3a', { side: THREE.DoubleSide }),
  grass: std('#86a85a'),
  water: new THREE.MeshStandardMaterial({ color: '#4aa3b5', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }),
  fence: std('#c8743a'),
  crane: std('#e0a526', { roughness: 0.6 }),
  glowWarm: new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffc062', emissiveIntensity: 0.2 }),
  windowGlow: new THREE.MeshStandardMaterial({ color: '#3a2e22', emissive: '#ffcf86', emissiveIntensity: 0.1, roughness: 1 }),
  green: std('#1f6b4f'),
  rug: std('#8d1f2a'),
  greenDome: std('#2f8a5f', { roughness: 0.45, metalness: 0.15 }),
  silverDome: std('#b9bcbf', { roughness: 0.35, metalness: 0.55 }),
  canopy: std('#f7f3ea', { roughness: 0.6, side: THREE.DoubleSide, emissive: '#fff2d9', emissiveIntensity: 0 }),
  wallStone: std('#c9b38c', { roughness: 0.95 }),
  lava: std('#4d4542', { roughness: 1 }),
  rock: std('#86644f', { roughness: 1, flatShading: true }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#d8efe9', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.22, depthWrite: false }),
}

/** Translucent "blueprint" look for locked landmarks. */
export const GHOST = new THREE.MeshStandardMaterial({
  color: '#f1dfb4', emissive: '#c9a24a', emissiveIntensity: 0.22, transparent: true, opacity: 0.32,
  depthWrite: false, roughness: 1,
})
export const GHOST_EDGE = new THREE.LineBasicMaterial({ color: '#c9a24a', transparent: true, opacity: 0.6 })

type MatSet = typeof MAT
/** Models read materials through this context so a ghost version is free. */
export const MatContext = createContext<MatSet>(MAT)
export const useMats = () => useContext(MatContext)
export const GHOST_SET: MatSet = Object.fromEntries(Object.keys(MAT).map((k) => [k, GHOST])) as unknown as MatSet

// floodlit white mosques & glowing openings at night
registerGlow(MAT.white, 0, 0.32)
registerGlow(MAT.whiteWarm, 0, 0.26)
registerGlow(MAT.windowGlow, 0.1, 1.6)
registerGlow(MAT.openingWarm, 0.05, 1.2)
registerGlow(MAT.glowWarm, 0.25, 2.4)
registerGlow(MAT.canopy, 0, 0.35)
