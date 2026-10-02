import { C, G, M_SUN, YEAR } from './physics'

// Binary black-hole coalescence (non-spinning progenitors).

export interface MergerParams {
  m1: number // M☉
  m2: number // M☉
  separation: number // initial separation in rg of the total mass
}

export interface MergerResult {
  totalMass: number
  symmetricMassRatio: number
  chirpMass: number
  radiatedFraction: number
  radiatedEnergy: number // J
  finalMass: number
  finalSpin: number
  peakFrequency: number // Hz, GW frequency near merger
  ringdownFrequency: number // Hz
  timeToMergeYears: number // from the initial separation (Peters 1964)
}

export function mergerResult({ m1, m2, separation }: MergerParams): MergerResult {
  const M = m1 + m2
  const eta = (m1 * m2) / M ** 2
  // Fits to numerical relativity: Barausse et al. 2012 (energy), Rezzolla et al. 2008 (spin).
  const radiatedFraction = 0.0559745 * eta + 0.580951 * eta ** 2 - 0.960673 * eta ** 3 + 3.35241 * eta ** 4
  const finalSpin = 2 * Math.sqrt(3) * eta - 3.871 * eta ** 2 + 4.028 * eta ** 3
  const finalMass = M * (1 - radiatedFraction)
  const mTotalKg = M * M_SUN
  const a = (separation * G * mTotalKg) / C ** 2
  const peters = (5 / 256) * (C ** 5 * a ** 4) / (G ** 3 * m1 * m2 * M_SUN ** 2 * mTotalKg)
  // ISCO GW frequency: f = c³ / (6^{3/2} π G M)
  const peakFrequency = C ** 3 / (6 ** 1.5 * Math.PI * G * mTotalKg)
  // Fundamental quasi-normal mode (Berti et al. 2006 fit)
  const ringdownFrequency =
    ((C ** 3 / (2 * Math.PI * G * finalMass * M_SUN)) * (1.5251 - 1.1568 * (1 - finalSpin) ** 0.1292))

  return {
    totalMass: M,
    symmetricMassRatio: eta,
    chirpMass: (m1 * m2) ** 0.6 / M ** 0.2,
    radiatedFraction,
    radiatedEnergy: radiatedFraction * mTotalKg * C ** 2,
    finalMass,
    finalSpin,
    peakFrequency,
    ringdownFrequency,
    timeToMergeYears: peters / YEAR,
  }
}

/** Separation (rg) at which the two horizons touch and the merger is declared. */
export const MERGE_SEPARATION = 2.4

/** Animation length (s) for the accelerated inspiral. */
export const inspiralDuration = (separation: number) => 10 * (separation / 20) ** 1.5 + 4

/** Separation along the accelerated inspiral, u ∈ [0, 1] (quadrupole decay a ∝ (1−u)^¼). */
export const separationAt = (s0: number, u: number) =>
  Math.max(MERGE_SEPARATION, s0 * Math.pow(Math.max(1 - u, 0), 0.25) + MERGE_SEPARATION * u)

/** Visual orbital angular speed (rad/s) — Kepler, rescaled so the motion is watchable. */
export const orbitalSpeed = (s: number) => 187 * s ** -1.5

/** GW frequency (Hz) of the real system when its separation is s rg. */
export const gwFrequencyAt = (peakFrequency: number, s: number) => peakFrequency * (6 / s) ** 1.5
