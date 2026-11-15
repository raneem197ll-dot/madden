import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { useGame } from '../../state/gameStore'
import { env, glowMaterials } from './env'
import { madinahHour, sampleEnv } from './environment'

/** Shared sky + fog values, read by the sky dome and clouds. */
export const sky = {
  top: new THREE.Color('#7fb6d9'),
  bot: new THREE.Color('#f6dfb7'),
  sun: new THREE.Color('#fff1d6'),
  sunDir: new THREE.Vector3(0.5, 0.8, 0.3),
  sunVis: 1,
}

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    top: { value: sky.top },
    bottom: { value: sky.bot },
    sunCol: { value: sky.sun },
    sunDir: { value: sky.sunDir },
    sunVis: { value: 1 },
  },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunCol; uniform vec3 sunDir; uniform float sunVis; varying vec3 vP;
    void main(){
      float h = clamp(vP.y*1.15+0.08,0.0,1.0);
      vec3 c = mix(bottom, top, pow(h,0.75));
      float d = max(dot(normalize(vP), normalize(sunDir)), 0.0);
      c += sunCol * (pow(d, 220.0) * 1.4 + pow(d, 12.0) * 0.22) * sunVis;
      gl_FragColor = vec4(c,1.0);
      #include <colorspace_fragment>
    }`,
})

function SkyDome({ radius = 400 }: { radius?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => {
    skyMat.uniforms.sunVis.value = sky.sunVis
    ref.current?.position.copy(camera.position)
  })
  return (
    <mesh ref={ref} material={skyMat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[radius, 32, 16]} />
    </mesh>
  )
}

/**
 * Drives env.hour / env.night from the time mode (manual target, live Madinah
 * time, or a 4-minute cycle) and applies the sampled look to lights, fog, sky
 * and every glow material.
 */
export function EnvironmentRig({ shadows = false, shadowSize = 2048, ambient = 0, sunScale = 1, fogRange = [90, 230] as [number, number], skyRadius = 400, follow = false }: {
  shadows?: boolean; shadowSize?: number; ambient?: number; sunScale?: number; fogRange?: [number, number]; skyRadius?: number
  /** city view: the shadow frustum and fog follow what the camera looks at, so shadows stay crisp when zoomed in */
  follow?: boolean
}) {
  const { scene, camera } = useThree()
  const look = useMemo(() => ({ dir: new THREE.Vector3(), at: new THREE.Vector3(), half: 0 }), [])
  const sun = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const stars = useRef<THREE.Group>(null)
  const fog = useMemo(() => new THREE.Fog('#f1dcb8', fogRange[0], fogRange[1]), [fogRange])
  const initialised = useRef(false)

  useEffect(() => {
    scene.fog = fog
    return () => { scene.fog = null }
  }, [scene, fog])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    env.time += dt
    const s = useGame.getState()
    let target = s.hour
    if (s.timeMode === 'live') target = madinahHour()
    if (s.timeMode === 'cycle') {
      env.hour = (env.hour + dt * (24 / 240)) % 24
    } else if (!initialised.current) {
      env.hour = target
    } else {
      let d = target - env.hour
      if (d > 12) d -= 24
      if (d < -12) d += 24
      env.hour = (env.hour + d * Math.min(1, dt * 1.8) + 24) % 24
    }
    initialised.current = true
    const e = sampleEnv(env.hour, s.weather)
    env.night = e.glow
    env.weather = s.weather

    if (sun.current) {
      sun.current.intensity = e.si * sunScale
      sun.current.color.copy(e.sun)
      if (follow) {
        // ground point under the view centre; frustum size grows with zoom distance
        camera.getWorldDirection(look.dir)
        const t = look.dir.y < -0.05 ? -camera.position.y / look.dir.y : 60
        look.at.copy(camera.position).addScaledVector(look.dir, Math.min(t, 220)).setY(0)
        const lim = 58
        look.at.x = THREE.MathUtils.clamp(look.at.x, -lim, lim); look.at.z = THREE.MathUtils.clamp(look.at.z, -lim, lim)
        const dist = camera.position.distanceTo(look.at)
        const half = THREE.MathUtils.clamp(Math.round(dist * 0.62), 16, 72)
        sun.current.position.copy(e.sunDir).multiplyScalar(90).add(look.at)
        sun.current.target.position.copy(look.at)
        sun.current.target.updateMatrixWorld()
        if (half !== look.half) {
          const sc = sun.current.shadow.camera
          sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.far = 220
          sc.updateProjectionMatrix()
          look.half = half
        }
        fog.near = Math.max(60, dist * 1.05)
        fog.far = Math.max(180, dist * 2.8)
      } else {
        sun.current.position.copy(e.sunDir).multiplyScalar(60)
        sun.current.target.position.set(0, 0, 0)
      }
    }
    if (hemi.current) {
      hemi.current.intensity = e.hi
      hemi.current.color.copy(e.hs)
      hemi.current.groundColor.copy(e.hg)
    }
    fog.color.copy(e.fog)
    sky.top.copy(e.top)
    sky.bot.copy(e.bot)
    sky.sun.copy(e.sun)
    sky.sunDir.copy(e.sunDir)
    sky.sunVis = e.isMoon ? 0.25 : s.weather === 'rain' ? 0.15 : s.weather === 'cloudy' ? 0.5 : 1
    for (const g of glowMaterials) g.m.emissiveIntensity = THREE.MathUtils.lerp(g.day, g.night, e.glow)
    if (stars.current) stars.current.visible = e.glow > 0.55 && s.weather !== 'rain'
  })

  return (
    <>
      <SkyDome radius={skyRadius} />
      {ambient > 0 && <ambientLight intensity={ambient} />}
      <hemisphereLight ref={hemi} args={['#cfe6f5', '#d9b98a', 1.1]} />
      <directionalLight
        ref={sun}
        position={[28, 42, 18]}
        intensity={2.5}
        castShadow={shadows}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-near={1}
        shadow-camera-far={150}
      />
      <group ref={stars} visible={false}>
        <Stars radius={180} depth={40} count={1600} factor={5} saturation={0} fade speed={0.4} />
      </group>
    </>
  )
}
