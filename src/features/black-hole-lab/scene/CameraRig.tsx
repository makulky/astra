import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { Mode } from '../store'
import { runtime } from './runtime'

/** Preferred camera elevation (degrees above the disk plane) per mode. */
const ELEVATION: Record<Mode, number> = { form: 8, lab: 11, feed: 38, merge: 24 }

/**
 * Glides the camera to a comfortable elevation whenever the mode changes,
 * keeping the user's distance and azimuth. Stops as soon as the user grabs the view.
 */
export function CameraRig({ mode }: { mode: Mode }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as { addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void; update: () => void } | null
  const target = useRef<number | null>(null)
  const spherical = useRef(new THREE.Spherical())
  const lastScale = useRef(runtime.scale)

  useEffect(() => {
    target.current = THREE.MathUtils.degToRad(90 - ELEVATION[mode])
  }, [mode])

  useEffect(() => {
    if (!controls) return
    const stop = () => (target.current = null)
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])

  useFrame((_, dt) => {
    // Pull back partially as the hole grows: growth stays visible, framing stays usable.
    const ratio = runtime.scale / lastScale.current
    lastScale.current = runtime.scale
    const zoom = Math.abs(ratio - 1) > 1e-5
    if (target.current === null && !zoom) return
    const s = spherical.current.setFromVector3(camera.position)
    if (zoom) s.radius = THREE.MathUtils.clamp(s.radius * ratio ** 0.65, 3, 90)
    if (target.current !== null) {
      s.phi = THREE.MathUtils.damp(s.phi, target.current, 3, dt)
      if (Math.abs(s.phi - target.current) < 0.002) target.current = null
    }
    camera.position.setFromSpherical(s)
    camera.lookAt(0, 0, 0)
    controls?.update()
  })

  return null
}
