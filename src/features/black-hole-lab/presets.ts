import type { BlackHoleParams } from './physics'

export type BHPresetId = 'cygnusX1' | 'sgrA' | 'm87' | 'gw150914' | 'ton618'

export const PRESETS: Record<BHPresetId, BlackHoleParams> = {
  cygnusX1: { mass: 21.2, spin: 0.95, accretion: 0.02, diskOuter: 26, jets: true },
  sgrA: { mass: 4.3e6, spin: 0.9, accretion: 3e-7, diskOuter: 22, jets: false },
  m87: { mass: 6.5e9, spin: 0.9, accretion: 2e-5, diskOuter: 30, jets: true },
  gw150914: { mass: 62, spin: 0.67, accretion: 1e-9, diskOuter: 20, jets: false },
  ton618: { mass: 6.6e10, spin: 0.9, accretion: 1, diskOuter: 40, jets: true },
}

export const PRESET_ORDER: BHPresetId[] = ['cygnusX1', 'sgrA', 'm87', 'gw150914', 'ton618']
