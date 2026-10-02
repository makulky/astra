import * as THREE from 'three'
import { computeHabitability } from '../habitability'
import { moonRadiusInEarthRadii, smoothstep, STARS, type PlanetParams } from '../physics'

/** Flat record of numbers so every visual property can be interpolated independently. */
export type VisualState = ReturnType<typeof visualTargets>

export const LIGHT_DIR = new THREE.Vector3(5, 1.2, 3).normalize()

// Inverse normal CDF (Acklam) — turns "fraction of surface covered by water" into a
// height threshold on the roughly-normal fBm height distribution.
function probit(p: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924]
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857]
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878]
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742]
  const pl = 0.02425
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - pl) return -probit(1 - p)
  const q = p - 0.5
  const r = q * q
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

/** Height threshold below which terrain is ocean. */
export function seaLevel(water: number) {
  if (water < 0.002) return -1
  if (water > 0.998) return 2
  return 0.5 + 0.12 * probit(water)
}

/** Compress astronomical sizes so everything fits on screen while keeping order. */
export const visualPlanetRadius = (r: number) => r ** 0.7

const tmp = new THREE.Color()

export function visualTargets(p: PlanetParams) {
  const { derived: d, probability } = computeHabitability(p)
  const star = STARS[p.star]
  const T = d.surfaceTemp

  const frozen = 1 - smoothstep(250, 275, T)
  const boiled = smoothstep(d.boilingPoint - 25, d.boilingPoint, T)
  const liquid = Math.max(0, 1 - frozen - boiled)

  const thick = smoothstep(3, 60, p.pressure)
  const hotAir = smoothstep(330, 650, T)
  const atmDensity = smoothstep(0.003, 1.5, p.pressure) * 0.85 + thick * 0.4

  // Atmosphere colour: Rayleigh blue → dusty salmon (thin & dry) → sulphuric yellow (hot & thick)
  const atm = new THREE.Color('#4f8dff')
  atm.lerp(tmp.set('#d89a78'), (1 - smoothstep(0.05, 0.6, p.pressure)) * (1 - p.water))
  atm.lerp(tmp.set('#f2c98a'), Math.max(hotAir, thick * 0.7))

  const cloudColor = new THREE.Color('#ffffff').lerp(tmp.set('#e8cf8f'), Math.max(hotAir, thick) * 0.85)
  // Clouds need air; water vapour and very thick atmospheres add more.
  const cloudCover =
    smoothstep(0.02, 0.8, p.pressure) * (0.15 + 0.45 * p.water * (1 - frozen * 0.6)) + thick * 1.1

  const light = new THREE.Color(star.color)
  const lightIntensity = Math.min(2, 0.35 + 0.75 * d.flux ** 0.25)
  light.multiplyScalar(lightIntensity)

  const moonEarthR = moonRadiusInEarthRadii(p.moonRadius)
  const planetR = visualPlanetRadius(p.radius)
  // Colder worlds grow larger caps, but a dry world has little water to freeze.
  const capFromTemp = THREE.MathUtils.clamp((T - 225) / 70, 0, 1.15)

  return {
    radius: planetR,
    tilt: THREE.MathUtils.degToRad(p.tilt),
    spinSpeed: (Math.PI * 2) / (12 * Math.sqrt(d.dayHours / 24)),
    sea: seaLevel(p.water),
    temp: T,
    liquid,
    frozen,
    cap: capFromTemp + (1 - smoothstep(0, 0.3, p.water)) * Math.max(0, 0.92 - capFromTemp),
    veg: smoothstep(25, 75, probability),
    lava: smoothstep(650, 1100, T),
    dry: 1 - smoothstep(0.05, 0.4, p.water),
    cloudCover: Math.min(1.4, cloudCover), // >1 closes every gap (Venus-like overcast)
    atmDensity: Math.min(1.2, atmDensity),
    atmShell: 1.03 + 0.05 * Math.min(1.2, atmDensity),
    atmR: atm.r,
    atmG: atm.g,
    atmB: atm.b,
    cloudR: cloudColor.r,
    cloudG: cloudColor.g,
    cloudB: cloudColor.b,
    lightR: light.r,
    lightG: light.g,
    lightB: light.b,
    sunSize: Math.min(40, Math.max(1.5, (9 * (star.luminosity ** 0.4)) / p.distance)),
    moonVisible: p.hasMoon ? 1 : 0,
    moonRadius: moonEarthR ** 0.7,
    moonOrbit: planetR * (1.6 + 0.45 * Math.sqrt(p.moonDistance)),
    moonSpeed: p.hasMoon ? (Math.PI * 2) / (20 * Math.sqrt(d.moonPeriodDays / 27.32)) : 0,
  }
}
