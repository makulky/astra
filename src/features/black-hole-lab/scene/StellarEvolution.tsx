import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { blackbodyColor } from '../../../lib/blackbody'
import { useSmoothed } from '../../../lib/useSmoothed'
import type { Death, Outcome } from '../formation'
import { createStarMaterial } from '../shaders/star'
import { getLab } from '../store'
import { runtime } from './runtime'

/** How long the automatic stages last (s). */
const COLLAPSE_TIME = 1.8
const EXPLOSION_TIME = 4.5
const SHELL_PARTICLES = 3500

const shellVertex = /* glsl */ `
attribute vec3 aDir;
attribute float aSpeed;
attribute float aHue;
uniform float uT;
uniform float uR0;
uniform float uSpeed;
uniform float uFade;
varying float vHue;
varying float vAlpha;
void main() {
  vHue = aHue;
  float r = uR0 + aSpeed * uSpeed * uT;
  vAlpha = uFade * exp(-uT / 3.5) * smoothstep(0.0, 0.15, uT);
  vec4 mv = modelViewMatrix * vec4(aDir * r, 1.0);
  gl_PointSize = (1.0 + 1.5 * aSpeed) * 14.0 / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`
const shellFragment = /* glsl */ `
uniform vec3 uHot;
uniform vec3 uCool;
uniform float uT;
varying float vHue;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = pow(1.0 - smoothstep(0.0, 0.5, d), 2.0) * vAlpha * 0.55;
  vec3 c = mix(uHot, uCool, clamp(uT * 0.4 + vHue * 0.5, 0.0, 1.0));
  gl_FragColor = vec4(c * 1.6, a);
}
`

type ShellKind = 'none' | 'nebula' | 'weak' | 'full' | 'huge'
const SHELL: Record<Death, ShellKind> = {
  planetaryNebula: 'nebula',
  supernova: 'full',
  fallbackSupernova: 'weak',
  directCollapse: 'none',
  pulsationalPairInstability: 'weak',
  pairInstability: 'huge',
}
const FLASH: Record<ShellKind, number> = { none: 0.25, nebula: 0, weak: 0.7, full: 1.4, huge: 2.4 }

function makeGlowTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function starTargets(stage: number, o: Outcome, stageTime: number) {
  const msR = o.msRadius ** 0.3
  const giantR = Math.min(3.6, 0.6 * o.giantRadius ** 0.3)
  const remnantVisible = o.remnant === 'whiteDwarf' || o.remnant === 'neutronStar'
  const remnantR = o.remnant === 'whiteDwarf' ? 0.22 : 0.14
  const remnantT = o.remnant === 'whiteDwarf' ? 25000 : 40000
  switch (stage) {
    case 0:
      return { radius: msR, temp: o.msTemp, bright: 0.95, turb: 0, glow: 0.8 }
    case 1:
      return { radius: giantR, temp: o.giantTemp, bright: 1.1, turb: 1, glow: 0.8 }
    case 2: {
      // Core collapse: the envelope trembles and dims, then everything races inwards.
      const k = Math.min(1, stageTime / COLLAPSE_TIME)
      const tremble = 1 + 0.04 * Math.sin(stageTime * 40) * k
      if (o.remnant === 'whiteDwarf') return { radius: giantR * (1 - 0.5 * k), temp: o.giantTemp + 8000 * k, bright: 1.6, turb: 1, glow: 1 }
      return { radius: giantR * (1 - 0.15 * k) * tremble, temp: o.giantTemp, bright: 1.1 - 0.5 * k, turb: 1, glow: 0.8 - 0.3 * k }
    }
    default:
      if (remnantVisible) return { radius: remnantR, temp: remnantT, bright: 3, turb: 0, glow: 0.5 }
      return { radius: 0, temp: o.giantTemp, bright: 0.5, turb: 0, glow: 0 }
  }
}

export function StellarEvolution() {
  const starMat = useMemo(createStarMaterial, [])
  const glowTex = useMemo(makeGlowTexture, [])
  const shellMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shellVertex,
        fragmentShader: shellFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uT: { value: 0 },
          uR0: { value: 1 },
          uSpeed: { value: 3 },
          uFade: { value: 0 },
          uHot: { value: new THREE.Color('#fff4e0') },
          uCool: { value: new THREE.Color('#8a4bff') },
        },
      }),
    [],
  )
  const shellGeom = useMemo(() => {
    const dirs = new Float32Array(SHELL_PARTICLES * 3)
    const speeds = new Float32Array(SHELL_PARTICLES)
    const hues = new Float32Array(SHELL_PARTICLES)
    // Clumpy ejecta: most particles follow a few dozen filaments.
    const filaments = Array.from({ length: 40 }, () => new THREE.Vector3().randomDirection())
    const v = new THREE.Vector3()
    for (let i = 0; i < SHELL_PARTICLES; i++) {
      if (Math.random() < 0.7) {
        const f = filaments[Math.floor(Math.random() * filaments.length)]
        v.copy(f).add(new THREE.Vector3().randomDirection().multiplyScalar(0.25)).normalize()
      } else v.randomDirection()
      dirs.set([v.x, v.y, v.z], i * 3)
      speeds[i] = 0.6 + Math.random() * 0.7
      hues[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SHELL_PARTICLES * 3), 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    g.setAttribute('aHue', new THREE.BufferAttribute(hues, 1))
    return g
  }, [])

  const star = useRef<THREE.Mesh>(null!)
  const glow = useRef<THREE.Sprite>(null!)
  const beams = useRef<THREE.Group>(null!)
  const shell = useRef<THREE.Points>(null!)
  const timeline = useRef({ stage: -1, start: 0, explodedAt: -1, giantR: 1 })
  const step = useSmoothed(() => starTargets(0, getLab().outcome, 0))
  const color = useMemo(() => new THREE.Color(), [])

  useFrame((state, dt) => {
    const lab = getLab()
    const now = state.clock.elapsedTime
    const tl = timeline.current
    if (lab.stage !== tl.stage) {
      tl.stage = lab.stage
      tl.start = now
      if (lab.stage === 0) tl.explodedAt = -1
      if (lab.stage === 3) {
        tl.explodedAt = now
        tl.giantR = Math.min(3.6, 0.6 * lab.outcome.giantRadius ** 0.3)
        runtime.formation.flash = FLASH[SHELL[lab.outcome.death]]
      }
    }
    const stageTime = now - tl.start
    if (lab.stage === 2 && stageTime > COLLAPSE_TIME) lab.advanceStage()
    if (lab.stage === 3 && stageTime > EXPLOSION_TIME) lab.advanceStage()

    const o = lab.outcome
    const collapsing = lab.stage >= 3
    const v = step(starTargets(lab.stage, o, stageTime), dt, collapsing ? 7 : 2.5)
    star.current.scale.setScalar(Math.max(v.radius, 1e-4))
    star.current.visible = v.radius > 0.01
    blackbodyColor(v.temp, color)
    starMat.uniforms.uColor.value.copy(color)
    starMat.uniforms.uTime.value = now
    starMat.uniforms.uBrightness.value = v.bright
    starMat.uniforms.uTurbulence.value = v.turb
    glow.current.scale.setScalar(Math.max(v.radius, 0.15) * 4.2)
    ;(glow.current.material as THREE.SpriteMaterial).color.copy(color).multiplyScalar(v.glow * 1.2)
    glow.current.visible = v.glow > 0.02

    beams.current.visible = lab.stage >= 3 && o.remnant === 'neutronStar'
    beams.current.rotation.y = now * 5

    const kind = SHELL[o.death]
    const t = tl.explodedAt >= 0 ? now - tl.explodedAt : 0
    shell.current.visible = tl.explodedAt >= 0 && kind !== 'none'
    const su = shellMat.uniforms
    su.uT.value = t
    su.uR0.value = tl.giantR * 0.8
    su.uSpeed.value = kind === 'nebula' ? 0.8 : kind === 'huge' ? 6 : kind === 'weak' ? 2 : 3.5
    su.uFade.value = kind === 'weak' ? 0.5 : 1
    su.uHot.value.set(kind === 'nebula' ? '#a8fff4' : '#fff1d8')
    su.uCool.value.set(kind === 'nebula' ? '#ff5d8a' : '#7d45ff')

    runtime.formation.flash *= Math.exp(-dt * 1.6)
  })

  return (
    <group>
      <mesh ref={star} material={starMat}>
        <sphereGeometry args={[1, 96, 96]} />
      </mesh>
      <sprite ref={glow}>
        <spriteMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <group ref={beams} rotation-z={0.4}>
        {[1, -1].map((s) => (
          <mesh key={s} position={[0, s * 3.2, 0]} rotation-x={s > 0 ? Math.PI : 0}>
            <coneGeometry args={[0.45, 6, 32, 1, true]} />
            <meshBasicMaterial color="#6f9dff" transparent opacity={0.09} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <points ref={shell} geometry={shellGeom} material={shellMat} frustumCulled={false} />
    </group>
  )
}
