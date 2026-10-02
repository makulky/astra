import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePlanetLab } from '../store'
import { createCloudMaterial, createGlowMaterial } from '../shaders/atmosphere'
import { createPlanetMaterial } from '../shaders/planet'
import { useSmoothed } from '../../../lib/useSmoothed'
import { LIGHT_DIR, visualTargets, type VisualState } from './visuals'

const ORBIT_INCLINATION = THREE.MathUtils.degToRad(5)
const SUN_DISTANCE = 120

function makeSunTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.12, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function orbitPoints(segments = 128) {
  const pts: number[] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(Math.cos(a), 0, Math.sin(a))
  }
  return new Float32Array(pts)
}

export function PlanetSystem() {
  const planetMat = useMemo(() => createPlanetMaterial(), [])
  const moonMat = useMemo(
    () => createPlanetMaterial({ uSea: -1, uTemp: 220, uVeg: 0, uDry: 0.05, uCap: 2, uAtmDensity: 0, uCraters: 1, uSeed: 42 }),
    [],
  )
  const cloudMat = useMemo(() => createCloudMaterial(), [])
  const glowMat = useMemo(() => createGlowMaterial(), [])
  const sunTex = useMemo(makeSunTexture, [])
  const orbitGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(orbitPoints(), 3))
    return g
  }, [])

  const tiltGroup = useRef<THREE.Group>(null!)
  const planet = useRef<THREE.Mesh>(null!)
  const clouds = useRef<THREE.Mesh>(null!)
  const glow = useRef<THREE.Mesh>(null!)
  const moonPivot = useRef<THREE.Group>(null!)
  const moon = useRef<THREE.Mesh>(null!)
  const orbit = useRef<THREE.LineLoop>(null!)
  const sun = useRef<THREE.Sprite>(null!)

  const cache = useRef<{ params: unknown; target: VisualState } | null>(null)
  const getTarget = () => {
    const params = usePlanetLab.getState().params
    if (cache.current?.params !== params) cache.current = { params, target: visualTargets(params) }
    return cache.current.target
  }
  const step = useSmoothed<VisualState>(() => ({ ...getTarget() }))
  const angles = useRef({ spin: 0, clouds: 0, moon: 0.8 })

  useFrame((state, dt) => {
    const v = step(getTarget(), dt)
    const seed = usePlanetLab.getState().seed
    const a = angles.current
    const dtc = Math.min(dt, 0.1)
    a.spin += v.spinSpeed * dtc
    a.clouds += v.spinSpeed * 1.15 * dtc
    a.moon += v.moonSpeed * dtc

    const lightColor = new THREE.Color(v.lightR, v.lightG, v.lightB)
    const atmColor = new THREE.Color(v.atmR, v.atmG, v.atmB)

    // Planet + clouds share the tilted spin axis.
    tiltGroup.current.rotation.z = v.tilt
    tiltGroup.current.scale.setScalar(v.radius)
    planet.current.rotation.y = a.spin
    clouds.current.rotation.y = a.clouds

    const pu = planetMat.uniforms
    pu.uSeed.value = seed
    pu.uSea.value = v.sea
    pu.uTemp.value = v.temp
    pu.uLiquid.value = v.liquid
    pu.uFrozen.value = v.frozen
    pu.uCap.value = v.cap
    pu.uVeg.value = v.veg
    pu.uLava.value = v.lava
    pu.uDry.value = v.dry
    pu.uLightDir.value.copy(LIGHT_DIR)
    pu.uLightColor.value.copy(lightColor)
    pu.uAtmColor.value.copy(atmColor)
    pu.uAtmDensity.value = v.atmDensity

    const cu = cloudMat.uniforms
    cu.uTime.value = state.clock.elapsedTime
    cu.uSeed.value = seed
    cu.uCover.value = v.cloudCover
    cu.uCloudColor.value.setRGB(v.cloudR, v.cloudG, v.cloudB)
    cu.uLightDir.value.copy(LIGHT_DIR)
    cu.uLightColor.value.copy(lightColor)
    clouds.current.visible = v.cloudCover > 0.01

    const gu = glowMat.uniforms
    gu.uAtmColor.value.copy(atmColor)
    gu.uLightDir.value.copy(LIGHT_DIR)
    gu.uLightColor.value.copy(lightColor)
    gu.uDensity.value = v.atmDensity
    gu.uShell.value = v.atmShell
    glow.current.scale.setScalar(v.radius * v.atmShell)
    glow.current.visible = v.atmDensity > 0.01

    // Moon: grows/shrinks in when toggled, orbit radius and speed ease too.
    moonPivot.current.rotation.set(ORBIT_INCLINATION, a.moon, 0)
    moon.current.position.set(v.moonOrbit, 0, 0)
    moon.current.scale.setScalar(Math.max(v.moonRadius * v.moonVisible, 1e-4))
    moon.current.visible = v.moonVisible > 0.01
    const mu = moonMat.uniforms
    mu.uLightDir.value.copy(LIGHT_DIR)
    mu.uLightColor.value.copy(lightColor)
    orbit.current.scale.setScalar(v.moonOrbit)
    ;(orbit.current.material as THREE.LineBasicMaterial).opacity = 0.18 * v.moonVisible
    orbit.current.visible = v.moonVisible > 0.01

    sun.current.scale.setScalar(v.sunSize)
    ;(sun.current.material as THREE.SpriteMaterial).color.copy(lightColor).multiplyScalar(1.5)
  })

  return (
    <group>
      <group ref={tiltGroup}>
        <mesh ref={planet} material={planetMat}>
          <sphereGeometry args={[1, 128, 128]} />
        </mesh>
        <mesh ref={clouds} material={cloudMat} scale={1.012}>
          <sphereGeometry args={[1, 96, 96]} />
        </mesh>
      </group>
      <mesh ref={glow} material={glowMat}>
        <sphereGeometry args={[1, 96, 96]} />
      </mesh>

      <group rotation={[ORBIT_INCLINATION, 0, 0]}>
        <lineLoop ref={orbit} geometry={orbitGeom}>
          <lineBasicMaterial color="#9fb8ff" transparent opacity={0.18} depthWrite={false} />
        </lineLoop>
      </group>
      <group ref={moonPivot}>
        <mesh ref={moon} material={moonMat}>
          <sphereGeometry args={[1, 64, 64]} />
        </mesh>
      </group>

      <sprite ref={sun} position={LIGHT_DIR.clone().multiplyScalar(SUN_DISTANCE)}>
        <spriteMaterial map={sunTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  )
}
