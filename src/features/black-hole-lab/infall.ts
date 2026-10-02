import { gravRadius, R_SUN, tidalRadius } from './physics'

// Matter thrown at the hole, integrated in units of rg (G = M = c = 1) with the
// Paczyński–Wiita potential Φ = −1/(r − 2), which reproduces the ISCO at 6 rg and the plunge.

export type ThrowableKind = 'gas' | 'star' | 'planet'
export type BodyKind = ThrowableKind | 'debris'

export interface Body {
  kind: BodyKind
  group: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  mass: number // M☉ carried by this body
  alpha: number
  heat: number // 0–1, shifts colour towards hot/white when compressed by tides
  alive: boolean
}

export type FeedEventType = 'disrupted' | 'swallowedWhole' | 'plunged' | 'gasAccreted'

export interface FeedEvent {
  type: FeedEventType
  kind: ThrowableKind
  massGain: number
}

export interface HoleState {
  mass: number // M☉
  exaggerate: boolean
}

/** rg of simulated time per real second. */
export const TIME_SCALE = 120
export const CAPTURE_R = 2.3
const ESCAPE_R = 260
const MAX_BODIES = 3000

const BODY_MASS: Record<ThrowableKind, number> = { gas: 0.05, star: 1, planet: 9.5e-4 }
const BODY_RADIUS: Record<'star' | 'planet', number> = { star: R_SUN, planet: 7.0e7 }
/** Tidal disruption is shown at min(real radius, this) so it happens on screen. */
const MAX_VISUAL_DISRUPTION = 18

export function tidalRadiusRg(holeMass: number, kind: 'star' | 'planet') {
  return tidalRadius(holeMass, BODY_MASS[kind], BODY_RADIUS[kind]) / gravRadius(holeMass)
}

function accel(x: number, y: number, z: number) {
  const r = Math.sqrt(x * x + y * y + z * z)
  const k = -1 / ((r - 2) * (r - 2) * r)
  return [k * x, k * y, k * z, r] as const
}

/** Circular-orbit speed in the PW potential. */
export const circularSpeed = (r: number) => Math.sqrt(r) / (r - 2)

function substep(b: Body, h: number, drag: number) {
  const [ax, ay, az, r] = accel(b.x, b.y, b.z)
  b.vx += ax * h
  b.vy += ay * h
  b.vz += az * h
  if (drag > 0) {
    // Viscous gas relaxes towards a slightly sub-circular orbit in the disk plane → slow inspiral.
    const vc = circularSpeed(r) * 0.96
    const tx = -b.z / r
    const tz = b.x / r
    const sign = b.vx * tx + b.vz * tz >= 0 ? 1 : -1
    const k = Math.min(1, drag * h)
    b.vx += (sign * vc * tx - b.vx) * k
    b.vz += (sign * vc * tz - b.vz) * k
    b.vy += (-b.vy - b.y * 0.02) * k
  }
  b.x += b.vx * h
  b.y += b.vy * h
  b.z += b.vz * h
  return r
}

const stepSize = (r: number) => Math.min(0.5, Math.max(0.004, 0.03 * (r - 2) * Math.sqrt(r)))

export class FeedSim {
  bodies: Body[] = []
  flare = 0
  private nextGroup = 1
  private reported = new Set<number>()

  launch(kind: ThrowableKind, pos: [number, number, number], vel: [number, number, number]) {
    const group = this.nextGroup++
    const [x, y, z] = pos
    const [vx, vy, vz] = vel
    if (kind === 'gas') {
      const n = 60
      for (let i = 0; i < n; i++) {
        const s = 1.6
        this.add({
          kind, group, x: x + (Math.random() - 0.5) * s, y: y + (Math.random() - 0.5) * s * 0.4, z: z + (Math.random() - 0.5) * s,
          vx: vx * (1 + (Math.random() - 0.5) * 0.06), vy, vz: vz * (1 + (Math.random() - 0.5) * 0.06),
          mass: BODY_MASS.gas / n, alpha: 1, heat: 0, alive: true,
        })
      }
    } else {
      this.add({ kind, group, x, y, z, vx, vy, vz, mass: BODY_MASS[kind], alpha: 1, heat: 0, alive: true })
    }
  }

  private add(b: Body) {
    if (this.bodies.length >= MAX_BODIES) this.bodies.shift()
    this.bodies.push(b)
  }

  clear() {
    this.bodies = []
    this.flare = 0
  }

  private gain(mass: number, hole: HoleState) {
    // Real infall barely changes a big hole; "exaggerate" makes a star worth 3 % of its mass.
    return hole.exaggerate ? mass * Math.max(1, 0.03 * hole.mass) : mass
  }

  private disrupt(star: Body) {
    star.alive = false
    const n = 180
    const v = Math.hypot(star.vx, star.vy, star.vz)
    const r = Math.hypot(star.x, star.y, star.z)
    const rx = star.x / r
    const rz = star.z / r
    for (let i = 0; i < n; i++) {
      // Spread in orbital energy: roughly half the debris is bound, half escapes.
      const spread = (i / (n - 1) - 0.5) * 0.55
      const jitter = (Math.random() - 0.5) * 0.04
      this.add({
        kind: 'debris',
        group: star.group,
        x: star.x + rx * spread * 1.2 + (Math.random() - 0.5) * 0.4,
        y: star.y + (Math.random() - 0.5) * 0.2,
        z: star.z + rz * spread * 1.2 + (Math.random() - 0.5) * 0.4,
        vx: star.vx * (1 + spread + jitter),
        vy: star.vy + (Math.random() - 0.5) * 0.01 * v,
        vz: star.vz * (1 + spread + jitter),
        mass: (star.mass * 0.5) / (n / 2),
        alpha: 1,
        heat: 0.6,
        alive: true,
      })
    }
  }

  step(dtReal: number, hole: HoleState) {
    const events: FeedEvent[] = []
    let massGain = 0
    const dt = Math.min(dtReal, 0.05) * TIME_SCALE
    const rtStar = tidalRadiusRg(hole.mass, 'star')
    const rtPlanet = tidalRadiusRg(hole.mass, 'planet')

    for (const b of this.bodies) {
      if (!b.alive) continue
      const drag = b.kind === 'gas' || b.kind === 'debris' ? 0.004 : 0
      let t = 0
      let r = Math.hypot(b.x, b.y, b.z)
      // Gravitational time dilation: matter appears to slow down as it nears the horizon.
      const slow = Math.min(1, Math.max(0.04, (r - CAPTURE_R) / 6))
      const target = dt * slow
      while (t < target && r > CAPTURE_R) {
        const h = Math.min(stepSize(r), target - t)
        r = substep(b, h, drag)
        t += h
      }
      b.alpha = Math.min(1, Math.max(0, (r - CAPTURE_R) / 2))
      if (b.kind === 'debris') b.heat = Math.min(1, b.heat + 0.002 * slow)

      if (b.kind === 'star' || b.kind === 'planet') {
        const rt = b.kind === 'star' ? rtStar : rtPlanet
        if (rt > CAPTURE_R && r < Math.min(rt, MAX_VISUAL_DISRUPTION)) {
          this.disrupt(b)
          events.push({ type: 'disrupted', kind: b.kind, massGain: 0 })
          this.flare = Math.min(4, this.flare + 0.6)
          continue
        }
      }

      if (r <= CAPTURE_R + 0.05) {
        b.alive = false
        const kind: ThrowableKind = b.kind === 'debris' ? 'star' : b.kind
        const g = this.gain(b.mass, hole)
        massGain += g
        if (b.kind === 'star' || b.kind === 'planet') {
          const whole = (b.kind === 'star' ? rtStar : rtPlanet) <= CAPTURE_R
          events.push({ type: whole ? 'swallowedWhole' : 'plunged', kind, massGain: g })
          this.flare = Math.min(4, this.flare + (b.kind === 'star' ? 0.8 : 0.2))
        } else {
          this.flare = Math.min(4, this.flare + (b.kind === 'gas' ? 0.02 : 0.025))
          if (b.kind === 'gas' && !this.reported.has(b.group)) {
            this.reported.add(b.group)
            events.push({ type: 'gasAccreted', kind: 'gas', massGain: 0 })
          }
        }
      } else if (r > ESCAPE_R) {
        b.alive = false
      }
    }

    this.bodies = this.bodies.filter((b) => b.alive)
    this.flare *= Math.exp(-Math.min(dtReal, 0.1) / 2.5)
    return { events, massGain }
  }
}

/** Ballistic preview of a throw (no tides), for the aiming line. */
export function predictPath(pos: [number, number, number], vel: [number, number, number], kind: ThrowableKind, points = 240) {
  const b: Body = { kind, group: 0, x: pos[0], y: pos[1], z: pos[2], vx: vel[0], vy: vel[1], vz: vel[2], mass: 0, alpha: 1, heat: 0, alive: true }
  const out: number[] = [b.x, b.y, b.z]
  const drag = kind === 'gas' ? 0.004 : 0
  for (let i = 0; i < points; i++) {
    let t = 0
    let r = Math.hypot(b.x, b.y, b.z)
    while (t < 2 && r > CAPTURE_R) {
      const h = Math.min(stepSize(r), 2 - t)
      r = substep(b, h, drag)
      t += h
    }
    out.push(b.x, b.y, b.z)
    if (r <= CAPTURE_R || r > ESCAPE_R) break
  }
  return out
}
