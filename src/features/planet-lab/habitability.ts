import { clamp, computeDerived, smoothstep, type Derived, type PlanetParams } from './physics'

export type FactorId =
  | 'temperature'
  | 'water'
  | 'atmosphere'
  | 'size'
  | 'habitableZone'
  | 'magnetic'
  | 'rotation'
  | 'stability'
  | 'star'

export interface Factor {
  id: FactorId
  score: number // 0–1
  weight: number // exponent: 1 = critical, lower = secondary
}

export interface Habitability {
  probability: number // 0–100
  factors: Factor[]
  derived: Derived
}

const STAR_SCORE = { M: 0.55, K: 1, G: 0.95, F: 0.7 } as const

function temperatureScore(t: number) {
  const width = t < 290 ? 35 : 30
  return Math.exp(-(((t - 290) / width) ** 2))
}

function liquidWaterScore(p: PlanetParams, d: Derived) {
  if (p.water <= 0) return 0
  const amount = smoothstep(0, 0.25, p.water) * (p.water > 0.9 ? 0.85 : 1)
  const liquid =
    smoothstep(255, 275, d.surfaceTemp) *
    (1 - smoothstep(d.boilingPoint - 20, d.boilingPoint, d.surfaceTemp)) *
    smoothstep(0.006, 0.08, p.pressure)
  return amount * liquid
}

/** Fraction of an N₂-dominated atmosphere kept over geological time (Jeans-escape rule of thumb). */
export function atmosphereRetention(d: Derived) {
  const exosphereTemp = d.surfaceTemp * 3.5
  const vRmsN2 = 0.0298 * Math.sqrt(exosphereTemp) // km/s
  return smoothstep(0.8, 1.6, d.escapeVelocity / (6 * vRmsN2))
}

function atmosphereScore(p: PlanetParams, d: Derived) {
  const pressureOk = smoothstep(0.05, 0.5, p.pressure) * (1 - 0.9 * smoothstep(8, 60, p.pressure))
  return atmosphereRetention(d) * pressureOk
}

function sizeScore(p: PlanetParams, d: Derived) {
  const radiusOk = smoothstep(0.35, 0.7, p.radius) * (1 - smoothstep(1.6, 2.6, p.radius))
  const gravityOk = 1 - 0.7 * smoothstep(2, 4, d.gravity)
  return radiusOk * gravityOk
}

function habitableZoneScore(d: Derived) {
  const x = d.hzPosition
  return smoothstep(-0.35, 0, x) * (1 - smoothstep(1, 1.5, x))
}

function rotationScore(p: PlanetParams) {
  if (p.tidallyLocked) return 0.35
  return smoothstep(3, 10, p.rotationHours) * (1 - 0.6 * smoothstep(100, 2000, p.rotationHours))
}

function stabilityScore(p: PlanetParams, d: Derived) {
  const tilt = p.tilt > 90 ? 180 - p.tilt : p.tilt
  const tiltOk = 1 - 0.5 * smoothstep(35, 80, tilt)
  const moonOk = 0.6 + 0.4 * smoothstep(0.001, 0.01, d.moonToPlanetMass)
  return tiltOk * moonOk
}

export function computeHabitability(p: PlanetParams): Habitability {
  const d = computeDerived(p)
  const factors: Factor[] = [
    { id: 'temperature', score: temperatureScore(d.surfaceTemp), weight: 1 },
    { id: 'water', score: liquidWaterScore(p, d), weight: 1 },
    { id: 'atmosphere', score: atmosphereScore(p, d), weight: 1 },
    { id: 'size', score: sizeScore(p, d), weight: 0.8 },
    { id: 'habitableZone', score: habitableZoneScore(d), weight: 0.5 },
    { id: 'magnetic', score: 0.3 + 0.7 * smoothstep(0.05, 0.5, d.magneticField), weight: 0.5 },
    { id: 'rotation', score: rotationScore(p), weight: 0.5 },
    { id: 'stability', score: stabilityScore(p, d), weight: 0.4 },
    { id: 'star', score: STAR_SCORE[p.star], weight: 0.6 },
  ]
  // Weighted product: any critical factor near zero drives the total towards zero.
  const probability = factors.reduce((acc, f) => acc * clamp(f.score) ** f.weight, 1)
  return { probability: probability * 100, factors, derived: d }
}
