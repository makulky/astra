import { describe, expect, it } from 'vitest'
import { evolveStar, SOLAR_Z } from './formation'
import { FeedSim, circularSpeed, tidalRadiusRg } from './infall'
import { mergerResult } from './merger'
import { computeDerived, efficiency, hawkingTemperature, horizonRg, iscoRg, photonSphereRg, schwarzschildRadius } from './physics'
import { PRESETS } from './presets'

describe('black-hole physics', () => {
  it('gives the textbook Schwarzschild radius', () => {
    expect(schwarzschildRadius(1) / 1000).toBeCloseTo(2.95, 2)
  })

  it('reproduces Kerr ISCO, horizon and photon orbit', () => {
    expect(iscoRg(0)).toBeCloseTo(6, 6)
    expect(iscoRg(0.998)).toBeCloseTo(1.24, 1)
    expect(iscoRg(-0.998)).toBeCloseTo(9, 0)
    expect(horizonRg(0)).toBeCloseTo(2)
    expect(horizonRg(1)).toBeCloseTo(1)
    expect(photonSphereRg(0)).toBeCloseTo(3)
  })

  it('has 5.7 % efficiency without spin and ~32 % at a = 0.998', () => {
    expect(efficiency(0)).toBeCloseTo(0.057, 3)
    expect(efficiency(0.998)).toBeGreaterThan(0.3)
  })

  it('gives the Hawking temperature of a solar-mass hole', () => {
    expect(hawkingTemperature(1)).toBeCloseTo(6.17e-8, 9)
  })

  it('tears a star apart near Sgr A* but swallows it whole at M87*', () => {
    expect(computeDerived(PRESETS.sgrA).sunSwallowedWhole).toBe(false)
    expect(computeDerived(PRESETS.m87).sunSwallowedWhole).toBe(true)
    expect(tidalRadiusRg(4.3e6, 'star')).toBeGreaterThan(10)
  })

  it('spaghettifies at stellar holes but not at supermassive ones', () => {
    expect(computeDerived(PRESETS.cygnusX1).tidalAtHorizon).toBeGreaterThan(1e5)
    expect(computeDerived(PRESETS.m87).tidalAtHorizon).toBeLessThan(1e-3)
  })
})

describe('stellar collapse', () => {
  const solar = (mass: number) => evolveStar({ mass, metallicity: SOLAR_Z, rotation: 0.3 })
  const pristine = (mass: number) => evolveStar({ mass, metallicity: 1e-4, rotation: 0.3 })

  it('makes white dwarfs, neutron stars and black holes in order', () => {
    expect(solar(3).remnant).toBe('whiteDwarf')
    expect(solar(10).remnant).toBe('neutronStar')
    expect(solar(30).remnant).toBe('blackHole')
    expect(solar(60).remnant).toBe('blackHole')
  })

  it('leaves nothing after a pair-instability supernova', () => {
    const o = pristine(200)
    expect(o.death).toBe('pairInstability')
    expect(o.remnant).toBe('none')
  })

  it('collapses very massive pristine stars directly', () => {
    expect(pristine(300).remnant).toBe('blackHole')
    expect(pristine(300).remnantMass).toBeGreaterThan(130)
  })

  it('loses more mass to winds at high metallicity', () => {
    expect(solar(60).finalMass).toBeLessThan(pristine(60).finalMass)
  })
})

describe('binary merger', () => {
  it('matches GW150914-like numbers for equal masses', () => {
    const r = mergerResult({ m1: 30, m2: 30, separation: 20 })
    expect(r.finalSpin).toBeCloseTo(0.69, 1)
    expect(r.radiatedFraction).toBeGreaterThan(0.045)
    expect(r.radiatedFraction).toBeLessThan(0.05)
    expect(r.peakFrequency).toBeGreaterThan(60)
    expect(r.peakFrequency).toBeLessThan(90)
  })
})

describe('infall simulation', () => {
  it('keeps a circular orbit roughly circular', () => {
    const sim = new FeedSim()
    const r0 = 20
    sim.launch('planet', [r0, 0, 0], [0, 0, circularSpeed(r0)])
    for (let i = 0; i < 200; i++) sim.step(1 / 60, { mass: 1e9, exaggerate: false })
    const b = sim.bodies[0]
    expect(Math.hypot(b.x, b.y, b.z)).toBeCloseTo(r0, 0)
  })

  it('captures a radial plunge and reports mass gain', () => {
    const sim = new FeedSim()
    sim.launch('planet', [15, 0, 0], [-0.1, 0, 0])
    let gained = 0
    for (let i = 0; i < 1200 && sim.bodies.length; i++) gained += sim.step(1 / 60, { mass: 1e9, exaggerate: false }).massGain
    expect(sim.bodies.length).toBe(0)
    expect(gained).toBeGreaterThan(0)
  })

  it('shreds a star near a stellar-mass hole', () => {
    const sim = new FeedSim()
    sim.launch('star', [30, 0, 0], [-0.05, 0, 0.1])
    const types = new Set<string>()
    for (let i = 0; i < 600; i++) sim.step(1 / 60, { mass: 10, exaggerate: true }).events.forEach((e) => types.add(e.type))
    expect(types.has('disrupted')).toBe(true)
  })
})
