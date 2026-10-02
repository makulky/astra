import { create } from 'zustand'
import type { PlanetParams, StarType } from './physics'
import { PRESETS, type PresetId } from './presets'

interface PlanetLabState {
  params: PlanetParams
  preset: PresetId | null
  seed: number
  set: <K extends keyof PlanetParams>(key: K, value: PlanetParams[K]) => void
  applyPreset: (id: PresetId) => void
  randomize: () => void
  reset: () => void
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const logRand = (a: number, b: number) => Math.exp(rand(Math.log(a), Math.log(b)))
const STAR_TYPES: StarType[] = ['M', 'K', 'G', 'F']

export const usePlanetLab = create<PlanetLabState>((set) => ({
  params: { ...PRESETS.earth },
  preset: 'earth',
  seed: 1.7,
  set: (key, value) => set((s) => ({ params: { ...s.params, [key]: value }, preset: null })),
  applyPreset: (id) => set({ params: { ...PRESETS[id] }, preset: id }),
  reset: () => set({ params: { ...PRESETS.earth }, preset: 'earth', seed: 1.7 }),
  randomize: () =>
    set({
      preset: null,
      seed: rand(0, 100),
      params: {
        star: STAR_TYPES[Math.floor(Math.random() * 4)],
        mass: logRand(0.2, 6),
        radius: rand(0.5, 1.8),
        distance: logRand(0.15, 3),
        rotationHours: logRand(8, 200),
        tidallyLocked: Math.random() < 0.15,
        tilt: rand(0, 60),
        pressure: logRand(0.05, 20),
        water: rand(0, 1),
        albedo: rand(0.15, 0.6),
        greenhouse: rand(0.3, 2),
        hasMoon: Math.random() < 0.7,
        moonMass: logRand(0.1, 5),
        moonRadius: rand(0.4, 1.8),
        moonDistance: rand(15, 90),
      },
    }),
}))
