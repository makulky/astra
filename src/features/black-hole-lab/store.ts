import { create } from 'zustand'
import { evolveStar, SOLAR_Z, type Outcome, type StarParams } from './formation'
import type { FeedEvent, ThrowableKind } from './infall'
import { mergerResult, type MergerParams, type MergerResult } from './merger'
import { MAX_SPIN, type BlackHoleParams } from './physics'
import { PRESETS, type BHPresetId } from './presets'

export type Mode = 'form' | 'lab' | 'feed' | 'merge'
export type Quality = 'low' | 'medium' | 'high'

/** Formation timeline: 0 main sequence → 1 supergiant → 2 core collapse → 3 explosion → 4 remnant. */
export type FormationStage = 0 | 1 | 2 | 3 | 4
export type MergerPhase = 'idle' | 'inspiral' | 'ringdown' | 'done'

export interface LoggedEvent extends FeedEvent {
  id: number
  holeMass: number
}

interface BlackHoleLabState {
  mode: Mode
  quality: Quality
  params: BlackHoleParams
  preset: BHPresetId | null

  star: StarParams
  stage: FormationStage
  outcome: Outcome

  tool: ThrowableKind
  exaggerate: boolean
  events: LoggedEvent[]

  merger: MergerParams
  mergerPhase: MergerPhase
  mergerResult: MergerResult
  /** Bumped on every (re)start so the scene can reset its simulation. */
  mergerRun: number

  setMode: (m: Mode) => void
  setQuality: (q: Quality) => void
  set: <K extends keyof BlackHoleParams>(key: K, value: BlackHoleParams[K]) => void
  applyPreset: (id: BHPresetId) => void

  setStar: <K extends keyof StarParams>(key: K, value: StarParams[K]) => void
  advanceStage: () => void
  resetFormation: () => void

  setTool: (t: ThrowableKind) => void
  setExaggerate: (v: boolean) => void
  addMass: (dm: number) => void
  logEvents: (events: FeedEvent[]) => void
  clearEvents: () => void

  setMerger: <K extends keyof MergerParams>(key: K, value: MergerParams[K]) => void
  startMerger: () => void
  setMergerPhase: (p: MergerPhase) => void

  /** Load a black hole produced by another mode into the lab. */
  sendToLab: (mass: number, spin: number) => void
}

const initialStar: StarParams = { mass: 40, metallicity: SOLAR_Z, rotation: 0.4 }
const initialMerger: MergerParams = { m1: 36, m2: 29, separation: 22 }
let eventId = 0

export const useBlackHoleLab = create<BlackHoleLabState>((set) => ({
  mode: 'lab',
  quality: 'medium',
  params: { ...PRESETS.cygnusX1 },
  preset: 'cygnusX1',

  star: initialStar,
  stage: 0,
  outcome: evolveStar(initialStar),

  tool: 'star',
  exaggerate: true,
  events: [],

  merger: initialMerger,
  mergerPhase: 'idle',
  mergerResult: mergerResult(initialMerger),
  mergerRun: 0,

  setMode: (mode) => set({ mode }),
  setQuality: (quality) => set({ quality }),
  set: (key, value) => set((s) => ({ params: { ...s.params, [key]: value }, preset: null })),
  applyPreset: (id) => set({ params: { ...PRESETS[id] }, preset: id }),

  setStar: (key, value) =>
    set((s) => {
      const star = { ...s.star, [key]: value }
      return { star, outcome: evolveStar(star) }
    }),
  advanceStage: () => set((s) => ({ stage: Math.min(4, s.stage + 1) as FormationStage })),
  resetFormation: () => set({ stage: 0 }),

  setTool: (tool) => set({ tool }),
  setExaggerate: (exaggerate) => set({ exaggerate }),
  addMass: (dm) => set((s) => ({ params: { ...s.params, mass: Math.min(2e11, s.params.mass + dm) }, preset: null })),
  logEvents: (events) =>
    set((s) => ({
      events: [
        ...events.map((e) => ({ ...e, id: ++eventId, holeMass: s.params.mass })).reverse(),
        ...s.events,
      ].slice(0, 30),
    })),
  clearEvents: () => set({ events: [] }),

  setMerger: (key, value) =>
    set((s) => {
      const merger = { ...s.merger, [key]: value }
      return { merger, mergerResult: mergerResult(merger), mergerPhase: 'idle' }
    }),
  startMerger: () => set((s) => ({ mergerPhase: 'inspiral', mergerRun: s.mergerRun + 1 })),
  setMergerPhase: (mergerPhase) => set({ mergerPhase }),

  sendToLab: (mass, spin) =>
    set((s) => ({
      mode: 'lab',
      preset: null,
      params: { ...s.params, mass, spin: Math.min(MAX_SPIN, spin), accretion: Math.max(s.params.accretion, 0.01) },
    })),
}))

/** Non-reactive access for frame loops. */
export const getLab = () => useBlackHoleLab.getState()
