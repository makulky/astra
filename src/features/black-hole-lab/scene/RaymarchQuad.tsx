import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { useSmoothed } from '../../../lib/useSmoothed'
import { createBlackHoleMaterial } from '../shaders/blackhole'
import { getLab } from '../store'
import { runtime } from './runtime'
import { renderTargets, type RenderTargets } from './targets'

export const QUALITY_STEPS = { low: 140, medium: 230, high: 360 } as const

export function RaymarchQuad() {
  const material = useMemo(createBlackHoleMaterial, [])
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const step = useSmoothed<RenderTargets>(() => renderTargets(getLab()))

  useFrame((state, dt) => {
    const lab = getLab()
    const v = step(renderTargets(lab), dt, 2.2)
    const u = material.uniforms
    camera.updateMatrixWorld()
    u.uCamPos.value.copy(camera.position)
    u.uInvProj.value.copy(camera.projectionMatrixInverse)
    u.uCamWorld.value.copy(camera.matrixWorld)
    u.uAspect.value = size.width / size.height
    u.uTime.value = state.clock.elapsedTime
    u.uSteps.value = QUALITY_STEPS[lab.quality]
    u.uScale.value = v.scale
    runtime.scale = v.scale
    u.uFar.value = Math.max(70, camera.position.length() / v.scale + 15)

    const m = runtime.merger
    if (lab.mode === 'merge' && m.active) {
      u.uBH1.value.set(...m.bh1)
      u.uBH2.value.set(...m.bh2)
      u.uM1.value = m.q1
      u.uM2.value = m.q2
      u.uSpin.value = m.spin
      u.uWobble.value = m.wobble
      u.uFlash.value = m.flash
    } else {
      u.uBH1.value.set(0, 0, 0)
      u.uM1.value = v.m1 < 0.005 ? 0 : v.m1
      u.uM2.value = 0
      u.uSpin.value = v.spin
      u.uWobble.value = 0
      u.uFlash.value = lab.mode === 'form' ? runtime.formation.flash : 0
    }
    u.uDiskOn.value = v.disk
    u.uRin.value = v.rin
    u.uRout.value = v.rout
    u.uDiskTemp.value = v.diskTemp
    u.uJet.value = v.jet
    u.uFlare.value = lab.mode === 'feed' ? runtime.feed.flare : 0
  })

  return (
    <mesh material={material} frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
