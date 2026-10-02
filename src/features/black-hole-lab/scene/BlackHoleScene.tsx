import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useBlackHoleLab } from '../store'
import { CameraRig } from './CameraRig'
import { Infall } from './Infall'
import { MergerSim } from './MergerSim'
import { RaymarchQuad } from './RaymarchQuad'
import { SpacetimeGrid } from './SpacetimeGrid'
import { StellarEvolution } from './StellarEvolution'

const DPR = { low: 0.6, medium: 1, high: 1.5 } as const

export default function BlackHoleScene() {
  const quality = useBlackHoleLab((s) => s.quality)
  const mode = useBlackHoleLab((s) => s.mode)

  return (
    <Canvas
      camera={{ position: [0, 3.2, 17], fov: 50, near: 0.05, far: 2000 }}
      dpr={Math.min(DPR[quality], window.devicePixelRatio || 1)}
      gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
    >
      <RaymarchQuad />
      {mode === 'feed' && <Infall />}
      {mode === 'form' && <StellarEvolution />}
      {mode === 'merge' && (
        <>
          <MergerSim />
          <SpacetimeGrid />
        </>
      )}
      <CameraRig mode={mode} />
      <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={90} enableDamping dampingFactor={0.06} />
    </Canvas>
  )
}
