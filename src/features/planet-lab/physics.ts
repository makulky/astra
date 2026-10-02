// Simplified astrophysics used by the planet lab. All units relative to Earth / Sun
// unless stated otherwise. Formulas are deliberately approximate but physically motivated.

export type StarType = 'M' | 'K' | 'G' | 'F'

export interface StarData {
  luminosity: number // L☉
  mass: number // M☉
  temperature: number // K
  color: string
  // Effective stellar flux limits of the habitable zone (Kopparapu et al. 2013, simplified)
  seffInner: number // runaway greenhouse
  seffOuter: number // maximum greenhouse
}

export const STARS: Record<StarType, StarData> = {
  M: { luminosity: 0.04, mass: 0.45, temperature: 3400, color: '#ffae6b', seffInner: 0.92, seffOuter: 0.24 },
  K: { luminosity: 0.3, mass: 0.75, temperature: 4600, color: '#ffd59a', seffInner: 0.99, seffOuter: 0.29 },
  G: { luminosity: 1, mass: 1, temperature: 5780, color: '#fff4e0', seffInner: 1.107, seffOuter: 0.356 },
  F: { luminosity: 3, mass: 1.3, temperature: 6600, color: '#e3ecff', seffInner: 1.2, seffOuter: 0.42 },
}

export interface PlanetParams {
  star: StarType
  mass: number // M⊕
  radius: number // R⊕
  distance: number // AU
  rotationHours: number
  tidallyLocked: boolean
  tilt: number // degrees
  pressure: number // atm
  water: number // surface water fraction 0–1
  albedo: number // 0–1
  greenhouse: number // greenhouse efficiency, Earth = 1
  hasMoon: boolean
  moonMass: number // in lunar masses
  moonRadius: number // in lunar radii
  moonDistance: number // in planet radii (Earth–Moon ≈ 60)
}

export interface Derived {
  gravity: number // g
  density: number // g/cm³
  escapeVelocity: number // km/s
  flux: number // S⊕
  equilibriumTemp: number // K
  greenhouseDelta: number // K
  surfaceTemp: number // K
  boilingPoint: number // K
  yearDays: number
  dayHours: number // effective rotation period
  moonPeriodDays: number
  moonToPlanetMass: number
  magneticField: number // relative to Earth
  hzInner: number // AU
  hzOuter: number // AU
  hzPosition: number // 0 = inner edge, 1 = outer edge
}

const EARTH_DENSITY = 5.51
const MOON_EARTH_MASS = 0.0123
const MOON_RADIUS_EARTH = 0.2727

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

export function moonRadiusInEarthRadii(moonRadius: number) {
  return moonRadius * MOON_RADIUS_EARTH
}

export function computeDerived(p: PlanetParams): Derived {
  const star = STARS[p.star]
  const gravity = p.mass / p.radius ** 2
  const density = (EARTH_DENSITY * p.mass) / p.radius ** 3
  const escapeVelocity = 11.19 * Math.sqrt(p.mass / p.radius)
  const flux = star.luminosity / p.distance ** 2

  const equilibriumTemp = (278.6 * star.luminosity ** 0.25 * (1 - p.albedo) ** 0.25) / Math.sqrt(p.distance)
  // Calibrated so Earth (1 atm) gets ~33 K and Venus (92 atm) ~500 K.
  const greenhouseDelta = 33 * p.greenhouse * Math.max(p.pressure, 0) ** 0.6
  const surfaceTemp = equilibriumTemp + greenhouseDelta

  // Clausius–Clapeyron for water: 1/T = 1/373 − (R/L)·ln(P)
  const boilingPoint = p.pressure > 0.0061 ? 1 / (1 / 373.15 - 2.045e-4 * Math.log(p.pressure)) : 273.16

  const yearDays = 365.25 * Math.sqrt(p.distance ** 3 / star.mass)
  const dayHours = p.tidallyLocked ? yearDays * 24 : p.rotationHours

  // Kepler's third law scaled from the Earth–Moon system.
  const moonToPlanetMass = p.hasMoon ? (p.moonMass * MOON_EARTH_MASS) / p.mass : 0
  const moonPeriodDays = p.hasMoon
    ? 27.32 *
      Math.sqrt(
        ((p.moonDistance / 60.27) ** 3 * p.radius ** 3) /
          ((p.mass + p.moonMass * MOON_EARTH_MASS) / (1 + MOON_EARTH_MASS)),
      )
    : 0

  // Dynamo needs a sizeable, iron-rich, still-molten core and benefits from fast rotation.
  const coreFactor = smoothstep(0.12, 0.45, p.mass) * smoothstep(3, 5, density)
  const rotationFactor = clamp((24 / dayHours) ** 0.3, 0.05, 1.6)
  const magneticField = Math.sqrt(p.mass) * coreFactor * rotationFactor

  const hzInner = Math.sqrt(star.luminosity / star.seffInner)
  const hzOuter = Math.sqrt(star.luminosity / star.seffOuter)
  const hzPosition = (p.distance - hzInner) / (hzOuter - hzInner)

  return {
    gravity,
    density,
    escapeVelocity,
    flux,
    equilibriumTemp,
    greenhouseDelta,
    surfaceTemp,
    boilingPoint,
    yearDays,
    dayHours,
    moonPeriodDays,
    moonToPlanetMass,
    magneticField,
    hzInner,
    hzOuter,
    hzPosition,
  }
}
