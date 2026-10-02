import { OrbitControls, Stars } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { PlanetSystem } from './PlanetSystem'

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 1.6, 7.5], fov: 45, near: 0.05, far: 1000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <color attach="background" args={['#03040a']} />
      <Stars radius={300} depth={80} count={6000} factor={6} saturation={0.15} fade speed={0.4} />
      <PlanetSystem />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={40} enableDamping dampingFactor={0.06} />
    </Canvas>
  )
}
