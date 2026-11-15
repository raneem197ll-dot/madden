import { useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Bakes a static model into one mesh per material after it mounts (hiding the originals),
 * so a landmark built from dozens of boxes, domes and palms costs a handful of draw calls.
 * Instanced meshes, multi-material meshes and anything under an object with
 * `userData.noMerge` are left alone (e.g. animated umbrellas or a moving train).
 */
export function StaticMerge({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!enabled) return
    let added: THREE.Mesh[] = []
    let hidden: THREE.Object3D[] = []
    // wait a couple of frames so child effects (instance matrices, BuildPart bases) have run
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const g = ref.current
        if (!g) return
        g.updateMatrixWorld(true)
        const inv = new THREE.Matrix4().copy(g.matrixWorld).invert()
        const groups = new Map<THREE.Material, THREE.BufferGeometry[]>()
        const m4 = new THREE.Matrix4()
        const skip = (o: THREE.Object3D) => { for (let p: THREE.Object3D | null = o; p && p !== g; p = p.parent) if (p.userData.noMerge || !p.visible) return true; return false }
        g.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (!mesh.isMesh || (o as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material) || skip(o)) return
          const src = mesh.geometry
          if (!src.attributes.position) return
          let geo = src.index ? src.toNonIndexed() : src.clone()
          const vc = !!(mesh.material as THREE.MeshStandardMaterial).vertexColors
          for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', ...(vc ? ['color'] : [])].includes(name)) geo.deleteAttribute(name)
          if (vc && !geo.attributes.color) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3))
          if (!geo.attributes.normal) geo.computeVertexNormals()
          if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2))
          geo.morphAttributes = {}
          geo.applyMatrix4(m4.multiplyMatrices(inv, mesh.matrixWorld))
          geo = geo.index ? geo.toNonIndexed() : geo
          const list = groups.get(mesh.material) ?? []
          list.push(geo)
          groups.set(mesh.material, list)
          hidden.push(mesh)
        })
        if (hidden.length < 4) { hidden = []; return }
        for (const [mat, geos] of groups) {
          const merged = mergeGeometries(geos, false)
          geos.forEach((x) => x.dispose())
          if (!merged) continue
          const transparent = (mat as THREE.Material).transparent
          const out = new THREE.Mesh(merged, mat)
          out.castShadow = !transparent
          out.receiveShadow = true
          g.add(out)
          added.push(out)
        }
        for (const h of hidden) h.visible = false
      })
    })
    return () => {
      cancelAnimationFrame(raf)
      for (const m of added) { m.removeFromParent(); m.geometry.dispose() }
      for (const h of hidden) h.visible = true
      added = []; hidden = []
    }
  }, [enabled])
  return <group ref={ref}>{children}</group>
}
