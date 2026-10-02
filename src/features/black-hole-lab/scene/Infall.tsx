import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CAPTURE_R, predictPath, tidalRadiusRg, type BodyKind } from '../infall'
import { SHADOW_RG } from '../physics'
import { getLab, useBlackHoleLab } from '../store'
import { runtime } from './runtime'

const MAX_POINTS = 3000
const PATH_POINTS = 242
/** Throw speed (c) per rg of drag. */
const DRAG_TO_SPEED = 0.034
const MAX_VISUAL_DISRUPTION = 18

const COLORS: Record<BodyKind, THREE.Color> = {
  gas: new THREE.Color('#ff9a52'),
  star: new THREE.Color('#fff1d6'),
  planet: new THREE.Color('#6fa8ff'),
  debris: new THREE.Color('#ffb070'),
}
const SIZES: Record<BodyKind, number> = { gas: 1.4, star: 4.2, planet: 2.2, debris: 1.0 }
const WHITE = new THREE.Color('#ffffff')
export const TOOL_COLORS = { gas: '#ff9a52', star: '#fff1d6', planet: '#6fa8ff' } as const

const pointsVertex = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * 140.0 / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`
const pointsFragment = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = 1.0 - smoothstep(0.0, 0.5, d);
  float a = smoothstep(0.0, 0.35, core) * vAlpha;
  if (a < 0.01) discard;
  // Bright core with a dark rim keeps matter readable even in front of the glowing disk.
  vec3 c = mix(vColor * 0.25, vColor * 1.6 + 0.4 * pow(core, 4.0), smoothstep(0.1, 0.6, core));
  gl_FragColor = vec4(c, a);
}
`

export function Infall() {
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null
  const camera = useThree((s) => s.camera)
  const addMass = useBlackHoleLab((s) => s.addMass)
  const logEvents = useBlackHoleLab((s) => s.logEvents)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MAX_POINTS), 1).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(MAX_POINTS), 1).setUsage(THREE.DynamicDrawUsage))
    g.setDrawRange(0, 0)
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pointsVertex,
        fragmentShader: pointsFragment,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  const pathGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PATH_POINTS * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setDrawRange(0, 0)
    return g
  }, [])
  const ringGeom = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2
      pts.push(Math.cos(a), 0, Math.sin(a))
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  }, [])

  const pathLine = useMemo(
    () => new THREE.Line(pathGeom, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 })),
    [pathGeom],
  )
  const tidalRing = useRef<THREE.LineLoop>(null!)
  const drag = useRef<{ start: THREE.Vector3; end: THREE.Vector3 } | null>(null)
  const pending = useRef({ mass: 0, t: 0 })
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const color = useMemo(() => new THREE.Color(), [])

  // Simulation runs before the ray marcher reads the flare.
  useFrame((_, dt) => {
    const lab = getLab()
    const { events, massGain } = runtime.feed.step(dt, { mass: lab.params.mass, exaggerate: lab.exaggerate })
    if (events.length) logEvents(events)
    pending.current.mass += massGain
    pending.current.t += dt
    if (pending.current.t > 0.3 && pending.current.mass > 0) {
      addMass(pending.current.mass)
      pending.current = { mass: 0, t: 0 }
    }
  }, -1)

  useFrame(() => {
    const scale = runtime.scale
    const bodies = runtime.feed.bodies
    const pos = geometry.attributes.position.array as Float32Array
    const col = geometry.attributes.aColor.array as Float32Array
    const size = geometry.attributes.aSize.array as Float32Array
    const alpha = geometry.attributes.aAlpha.array as Float32Array

    // Hide matter that sits behind the black hole's shadow (points are not lensed).
    const camRg = tmp.copy(camera.position).divideScalar(scale)
    const camDist = camRg.length()
    const shadowCos = Math.cos(Math.asin(Math.min(1, SHADOW_RG / camDist)))

    const n = Math.min(bodies.length, MAX_POINTS)
    for (let i = 0; i < n; i++) {
      const b = bodies[i]
      pos[i * 3] = b.x * scale
      pos[i * 3 + 1] = b.y * scale
      pos[i * 3 + 2] = b.z * scale
      const dx = b.x - camRg.x
      const dy = b.y - camRg.y
      const dz = b.z - camRg.z
      const dBody = Math.hypot(dx, dy, dz)
      const cosAng = -(dx * camRg.x + dy * camRg.y + dz * camRg.z) / (dBody * camDist)
      const hidden = dBody > camDist && cosAng > shadowCos
      // Redshift and fade as it approaches the horizon.
      const r = Math.hypot(b.x, b.y, b.z)
      const red = Math.min(1, Math.max(0, (r - CAPTURE_R) / 8))
      color.copy(COLORS[b.kind]).lerp(WHITE, b.heat * 0.4)
      col[i * 3] = color.r
      col[i * 3 + 1] = color.g * (0.35 + 0.65 * red)
      col[i * 3 + 2] = color.b * (0.15 + 0.85 * red)
      size[i] = SIZES[b.kind] * scale * 2.5
      alpha[i] = hidden ? 0 : b.alpha
    }
    geometry.setDrawRange(0, n)
    for (const name of ['position', 'aColor', 'aSize', 'aAlpha']) geometry.attributes[name].needsUpdate = true

    const lab = getLab()
    const rt = tidalRadiusRg(lab.params.mass, lab.tool === 'planet' ? 'planet' : 'star')
    const showRing = lab.tool !== 'gas' && rt > CAPTURE_R
    tidalRing.current.visible = showRing
    tidalRing.current.scale.setScalar(Math.min(rt, MAX_VISUAL_DISRUPTION) * scale)
  })

  const updatePreview = () => {
    const d = drag.current
    if (!d) return
    const scale = runtime.scale
    const start: [number, number, number] = [d.start.x / scale, 0, d.start.z / scale]
    const vel: [number, number, number] = [
      ((d.end.x - d.start.x) / scale) * DRAG_TO_SPEED,
      0,
      ((d.end.z - d.start.z) / scale) * DRAG_TO_SPEED,
    ]
    const path = predictPath(start, vel, getLab().tool, PATH_POINTS - 2)
    const arr = pathGeom.attributes.position.array as Float32Array
    const count = Math.min(path.length / 3, PATH_POINTS)
    for (let i = 0; i < count * 3; i++) arr[i] = path[i] * scale
    pathGeom.setDrawRange(0, count)
    pathGeom.attributes.position.needsUpdate = true
    ;(pathLine.material as THREE.LineBasicMaterial).color.set(TOOL_COLORS[getLab().tool])
    return { start, vel }
  }

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    if (controls) controls.enabled = false
    drag.current = { start: e.point.clone(), end: e.point.clone() }
    updatePreview()
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    drag.current.end.copy(e.point)
    updatePreview()
  }
  const onUp = () => {
    const throwData = updatePreview()
    drag.current = null
    pathGeom.setDrawRange(0, 0)
    if (controls) controls.enabled = true
    if (throwData) runtime.feed.launch(getLab().tool, throwData.start, throwData.vel)
  }

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <primitive object={pathLine} frustumCulled={false} />
      <lineLoop ref={tidalRing} geometry={ringGeom}>
        <lineBasicMaterial color="#ff8a5c" transparent opacity={0.35} />
      </lineLoop>
    </group>
  )
}
