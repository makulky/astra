import { clamp, smoothstep } from '../../lib/math'
import { MAX_SPIN } from './physics'

// Simplified massive-star evolution, loosely following Heger et al. 2003 and Fryer et al. 2012.

export const SOLAR_Z = 0.014

export interface StarParams {
  mass: number // initial mass, M☉
  metallicity: number // Z (Sun ≈ 0.014)
  rotation: number // 0–1, fraction of break-up speed
}

export type RemnantKind = 'whiteDwarf' | 'neutronStar' | 'blackHole' | 'none'
export type Death = 'planetaryNebula' | 'supernova' | 'fallbackSupernova' | 'directCollapse' | 'pulsationalPairInstability' | 'pairInstability'

export interface Outcome {
  finalMass: number // after winds, M☉
  heliumCore: number // M☉
  windLoss: number // fraction of initial mass lost
  death: Death
  remnant: RemnantKind
  remnantMass: number // M☉
  spin: number // BH spin (a*) or 0
  lifetimeYears: number // main-sequence lifetime
  msTemp: number // main-sequence effective temperature (K)
  msRadius: number // R☉
  giantTemp: number // supergiant temperature (K)
  giantRadius: number // R☉
}

export function evolveStar({ mass, metallicity, rotation }: StarParams): Outcome {
  // Line-driven winds scale with metallicity and luminosity (∝ mass); rotation enhances them.
  const windLoss = clamp(0.08 * (metallicity / SOLAR_Z) ** 0.7 * (mass / 20) ** 1.2 * (1 + 0.5 * rotation), 0, 0.85)
  const finalMass = mass * (1 - (mass < 8 ? 0 : windLoss))
  const heliumCore = finalMass * Math.min(0.6, 0.25 + 0.0035 * finalMass)

  let death: Death
  let remnant: RemnantKind
  let remnantMass: number

  if (mass < 8) {
    death = 'planetaryNebula'
    remnant = 'whiteDwarf'
    remnantMass = Math.min(1.35, 0.5 + 0.1 * mass)
  } else if (heliumCore < 6) {
    death = 'supernova'
    remnant = 'neutronStar'
    remnantMass = 1.25 + 0.06 * heliumCore
  } else if (heliumCore < 11) {
    // Part of the ejected envelope falls back onto the proto-neutron star.
    const fallback = (heliumCore - 6) / 5
    death = 'fallbackSupernova'
    remnant = 'blackHole'
    remnantMass = 1.8 + fallback * (0.9 * finalMass - 1.8)
  } else if (heliumCore < 35) {
    death = 'directCollapse'
    remnant = 'blackHole'
    remnantMass = 0.9 * finalMass
  } else if (heliumCore < 64) {
    // Pair-instability pulses shed mass until the core is stable: the "upper mass gap".
    death = 'pulsationalPairInstability'
    remnant = 'blackHole'
    remnantMass = Math.min(0.9 * finalMass, 38 + 0.12 * (heliumCore - 35))
  } else if (heliumCore < 133) {
    death = 'pairInstability'
    remnant = 'none'
    remnantMass = 0
  } else {
    death = 'directCollapse'
    remnant = 'blackHole'
    remnantMass = 0.9 * finalMass
  }

  // Core angular momentum survives better when little mass is lost to winds.
  const spin = remnant === 'blackHole' ? clamp(0.05 + 0.9 * rotation * (1 - 0.6 * windLoss), 0, MAX_SPIN) : 0

  const msTemp = Math.min(55000, 5778 * mass ** 0.55)
  const msRadius = mass ** 0.65
  const hot = smoothstep(40, 80, finalMass) * (1 - smoothstep(0.004, 0.02, metallicity) * 0.5)
  const giantTemp = 3600 + hot * 18000
  const giantRadius = (300 + 9 * mass) * (1 - 0.8 * hot)

  return {
    finalMass,
    heliumCore,
    windLoss: mass < 8 ? 0 : windLoss,
    death,
    remnant,
    remnantMass,
    spin,
    lifetimeYears: Math.max(2.5e6, 1e10 * mass ** -2.5),
    msTemp,
    msRadius,
    giantTemp,
    giantRadius,
  }
}
