import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { wave } from './MergerSim'
import { runtime } from './runtime'

const LINES = 48 // per direction
const SEGMENTS = 96 // vertices per line − 1
const HALF = 42 // grid half-size in rg
const DEPTH = 7 // plane offset below the holes, rg
/** Visual propagation speed of the ripples (rg per second). */
const WAVE_SPEED = 26

/**
 * A rubber-sheet picture of space-time below the binary: a gravity well under each hole
 * plus quadrupolar ripples emitted with the orbital phase at the retarded time t − r/c.
 */
export function SpacetimeGrid() {
  const { geometry, base } = useMemo(() => {
    const verts: number[] = []
    const index: number[] = []
    let v = 0
    for (let dir = 0; dir < 2; dir++) {
      for (let i = 0; i < LINES; i++) {
        const a = -HALF + (i / (LINES - 1)) * 2 * HALF
        for (let j = 0; j <= SEGMENTS; j++) {
          const b = -HALF + (j / SEGMENTS) * 2 * HALF
          verts.push(dir === 0 ? a : b, 0, dir === 0 ? b : a)
          if (j > 0) index.push(v - 1, v)
          v++
        }
      }
    }
    const g = new THREE.BufferGeometry()
    const base = new Float32Array(verts)
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aFade', new THREE.BufferAttribute(new Float32Array(verts.length / 3), 1))
    g.setIndex(index)
    return { geometry: g, base }
  }, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute float aFade;
          varying float vFade;
          void main() {
            vFade = aFade;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          varying float vFade;
          void main() { gl_FragColor = vec4(vec3(0.45, 0.62, 1.0) * vFade, vFade); }`,
      }),
    [],
  )

  useFrame(() => {
    const scale = runtime.scale
    const m = runtime.merger
    const pos = geometry.attributes.position.array as Float32Array
    const fade = geometry.attributes.aFade.array as Float32Array
    for (let k = 0; k < base.length; k += 3) {
      const x = base[k]
      const z = base[k + 2]
      const d1 = Math.hypot(x - m.bh1[0], z - m.bh1[2])
      const d2 = Math.hypot(x - m.bh2[0], z - m.bh2[2])
      let y = -DEPTH - (6 * m.q1) / Math.sqrt(d1 * d1 + 6) - (m.q2 > 0 ? (6 * m.q2) / Math.sqrt(d2 * d2 + 6) : 0)
      const r = Math.hypot(x, z)
      const ago = r / WAVE_SPEED
      const amp = wave.at(wave.amp, ago)
      if (amp > 0) {
        const phase = wave.at(wave.phase, ago)
        const theta = Math.atan2(z, x)
        y += (amp * 2.2 * Math.cos(2 * theta - phase)) / Math.max(1, r / 8)
      }
      pos[k] = x * scale
      pos[k + 1] = y * scale
      pos[k + 2] = z * scale
      fade[k / 3] = 0.42 * (1 - Math.min(1, r / HALF) ** 2)
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aFade.needsUpdate = true
  })

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />
}
