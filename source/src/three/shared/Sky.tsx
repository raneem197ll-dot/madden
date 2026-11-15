import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { env } from './env'

/** Gradient sky dome whose colours follow env.night. */
export function SkyDome({ radius = 400, day = ['#7fb6d9', '#f6dfb7'], night = ['#071330', '#27304f'] }: { radius?: number; day?: [string, string]; night?: [string, string] }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(day[0]) },
      bottom: { value: new THREE.Color(day[1]) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = clamp(vP.y*1.15+0.08,0.0,1.0); vec3 c = mix(bottom, top, pow(h,0.75)); gl_FragColor = vec4(c,1.0);
      #include <colorspace_fragment>
      }`,
  }), [])
  const dt = useMemo(() => day.map((c) => new THREE.Color(c)), [day])
  const nt = useMemo(() => night.map((c) => new THREE.Color(c)), [night])
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => {
    mat.uniforms.top.value.lerpColors(dt[0], nt[0], env.night)
    mat.uniforms.bottom.value.lerpColors(dt[1], nt[1], env.night)
    ref.current?.position.copy(camera.position)
  })
  return (
    <mesh ref={ref} material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[radius, 24, 12]} />
    </mesh>
  )
}
