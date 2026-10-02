import { smoothstep } from '../../../lib/math'
import { computeDerived, iscoRg, visualScale, type BlackHoleParams } from '../physics'
import type { useBlackHoleLab } from '../store'

type LabState = ReturnType<typeof useBlackHoleLab.getState>

/** Disk brightness from the Eddington ratio: faint ADAF glow → bright thin disk → quasar. */
export function diskBrightness(accretion: number) {
  const L = Math.log10(Math.max(accretion, 1e-12))
  return 0.25 * smoothstep(-8.5, -6.5, L) + 0.75 * smoothstep(-6.5, -1, L) + 0.35 * smoothstep(-1, 1, L)
}

/** Maps the real peak temperature (10⁵ K for quasars … 10⁷ K for X-ray binaries) to a display colour. */
export function diskDisplayTemp(params: BlackHoleParams) {
  const t = computeDerived(params).diskPeakTemp
  return 1900 + 6200 * smoothstep(4.3, 7.6, Math.log10(Math.max(t, 1)))
}

export function jetStrength(p: BlackHoleParams) {
  if (!p.jets) return 0
  const L = Math.log10(Math.max(p.accretion, 1e-12))
  return smoothstep(0.2, 0.9, Math.abs(p.spin)) * smoothstep(-7.5, -4, L)
}

export function renderTargets(s: LabState) {
  const p = s.params
  switch (s.mode) {
    case 'form': {
      const o = s.outcome
      // Direct collapse swallows the star while it is still shrinking; otherwise the hole appears after the blast.
      const direct = o.death === 'directCollapse' || o.death === 'pulsationalPairInstability'
      const born = o.remnant === 'blackHole' && (s.stage === 4 || (s.stage === 3 && direct))
      return {
        scale: visualScale(o.remnant === 'blackHole' ? o.remnantMass : 30),
        m1: born ? 1 : 0,
        spin: o.spin,
        rin: iscoRg(o.spin),
        rout: 20,
        disk: 0,
        diskTemp: 6000,
        jet: 0,
      }
    }
    case 'merge':
      return {
        scale: visualScale(s.merger.m1 + s.merger.m2),
        m1: 1,
        spin: 0,
        rin: 6,
        rout: 20,
        disk: 0,
        diskTemp: 6000,
        jet: 0,
      }
    default:
      return {
        scale: visualScale(p.mass),
        m1: 1,
        spin: p.spin,
        rin: iscoRg(p.spin),
        rout: p.diskOuter,
        disk: diskBrightness(p.accretion),
        diskTemp: diskDisplayTemp(p),
        jet: jetStrength(p),
      }
  }
}

export type RenderTargets = ReturnType<typeof renderTargets>
