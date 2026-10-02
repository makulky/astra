// Black-hole astrophysics. Geometric quantities use rg = GM/c² unless stated otherwise;
// masses are in solar masses (M☉).

export const G = 6.674e-11
export const C = 2.998e8
export const M_SUN = 1.989e30
export const R_SUN = 6.957e8
export const L_SUN = 3.828e26
export const AU = 1.496e11
export const YEAR = 3.156e7
const HBAR = 1.0546e-34
const K_B = 1.380649e-23
const SIGMA_SB = 5.670e-8
const G_EARTH = 9.81

export const MAX_SPIN = 0.998

export interface BlackHoleParams {
  mass: number // M☉
  spin: number // dimensionless a*, negative = retrograde disk
  accretion: number // fraction of the Eddington rate
  diskOuter: number // rg
  jets: boolean
}

/** Gravitational radius GM/c² in metres. */
export const gravRadius = (mass: number) => (G * mass * M_SUN) / C ** 2
export const schwarzschildRadius = (mass: number) => 2 * gravRadius(mass)

/** Outer event horizon r+ in rg. */
export const horizonRg = (spin: number) => 1 + Math.sqrt(1 - Math.min(spin * spin, 1))

/** Innermost stable circular orbit in rg (Bardeen, Press & Teukolsky 1972). Negative spin = retrograde. */
export function iscoRg(spin: number) {
  const a = Math.min(Math.abs(spin), 1)
  const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a))
  const z2 = Math.sqrt(3 * a * a + z1 * z1)
  const root = Math.sqrt((3 - z1) * (3 + z1 + 2 * z2))
  return 3 + z2 - Math.sign(spin || 1) * root
}

/** Circular photon orbit in rg (prograde for spin ≥ 0). */
export const photonSphereRg = (spin: number) => 2 * (1 + Math.cos((2 / 3) * Math.acos(-spin)))

/** Apparent shadow radius in rg (spin changes it by only a few %). */
export const SHADOW_RG = Math.sqrt(27)

/** Radiative efficiency η = 1 − E_isco. */
export const efficiency = (spin: number) => 1 - Math.sqrt(1 - 2 / (3 * iscoRg(spin)))

export const eddingtonLuminosity = (mass: number) => 1.26e31 * mass // W

/** Time dilation factor dτ/dt for a circular equatorial orbit at r (rg). */
export function orbitTimeFactor(r: number, spin: number) {
  const s = Math.sqrt(r)
  const denom = r ** 0.75 * Math.sqrt(Math.max(r * s - 3 * s + 2 * spin, 1e-9))
  return denom / (r * s + spin)
}

export const hawkingTemperature = (mass: number) => (HBAR * C ** 3) / (8 * Math.PI * G * mass * M_SUN * K_B)
export const evaporationYears = (mass: number) => (5120 * Math.PI * G ** 2 * (mass * M_SUN) ** 3) / (HBAR * C ** 4) / YEAR

/** Distance (m) at which tides tear apart a body of given mass (M☉) and radius (m). */
export const tidalRadius = (bhMass: number, bodyMass: number, bodyRadius: number) =>
  bodyRadius * Math.cbrt(bhMass / bodyMass)

export interface Derived {
  rg: number // m
  rs: number // m
  horizon: number // m
  horizonRg: number
  isco: number // m
  iscoRg: number
  photonSphere: number // m
  shadowRadius: number // m
  efficiency: number
  luminosity: number // W
  accretionRate: number // M☉/yr
  diskPeakTemp: number // K
  hawkingTemp: number // K
  evaporationYears: number
  density: number // kg/m³ (mass / volume inside r+)
  tidalAtHorizon: number // stretching on a 2 m person at r+, in g
  timeDilationIsco: number // seconds far away per second at the ISCO
  sunTidalRadius: number // m
  sunSwallowedWhole: boolean
}

/** Peak of the Novikov–Thorne/Shakura–Sunyaev temperature profile (at r ≈ 49/36 r_in). */
function diskPeakTemperature(mass: number, mdot: number, rIn: number) {
  const r = (49 / 36) * rIn
  const flux = ((3 * G * mass * M_SUN * mdot) / (8 * Math.PI * r ** 3)) * (1 - Math.sqrt(rIn / r))
  return (flux / SIGMA_SB) ** 0.25
}

export function computeDerived(p: BlackHoleParams): Derived {
  const rg = gravRadius(p.mass)
  const hRg = horizonRg(p.spin)
  const iRg = iscoRg(p.spin)
  const eta = efficiency(p.spin)
  const lumEdd = eddingtonLuminosity(p.mass)
  // Eddington accretion rate defined with the conventional η = 0.1.
  const mdot = (p.accretion * lumEdd) / (0.1 * C ** 2) // kg/s
  const horizon = hRg * rg
  const sunTidal = tidalRadius(p.mass, 1, R_SUN)

  return {
    rg,
    rs: 2 * rg,
    horizon,
    horizonRg: hRg,
    isco: iRg * rg,
    iscoRg: iRg,
    photonSphere: photonSphereRg(Math.max(p.spin, -1)) * rg,
    shadowRadius: SHADOW_RG * rg,
    efficiency: eta,
    luminosity: eta * mdot * C ** 2,
    accretionRate: (mdot * YEAR) / M_SUN,
    diskPeakTemp: mdot > 0 ? diskPeakTemperature(p.mass, mdot, iRg * rg) : 0,
    hawkingTemp: hawkingTemperature(p.mass),
    evaporationYears: evaporationYears(p.mass),
    density: (p.mass * M_SUN) / ((4 / 3) * Math.PI * horizon ** 3),
    tidalAtHorizon: ((2 * G * p.mass * M_SUN) / horizon ** 3) * 2 / G_EARTH,
    timeDilationIsco: 1 / orbitTimeFactor(iRg, p.spin),
    sunTidalRadius: sunTidal,
    sunSwallowedWhole: sunTidal < horizon,
  }
}

/**
 * Visual scale: world units per rg. Logarithmic in mass so the horizon visibly grows
 * with mass while both stellar and supermassive holes stay on screen.
 */
export const visualScale = (mass: number) => 0.4 * (1 + 0.12 * Math.log10(Math.max(mass, 1e-3) / 10))
