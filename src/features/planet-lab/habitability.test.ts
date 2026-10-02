import { describe, expect, it } from 'vitest'
import { computeHabitability } from './habitability'
import { computeDerived } from './physics'
import { PRESETS } from './presets'

describe('derived physics', () => {
  const earth = computeDerived(PRESETS.earth)

  it('reproduces Earth reference values', () => {
    expect(earth.gravity).toBeCloseTo(1)
    expect(earth.escapeVelocity).toBeCloseTo(11.19, 1)
    expect(earth.equilibriumTemp).toBeGreaterThan(250)
    expect(earth.equilibriumTemp).toBeLessThan(259)
    expect(earth.surfaceTemp).toBeGreaterThan(283)
    expect(earth.surfaceTemp).toBeLessThan(293)
    expect(earth.moonPeriodDays).toBeCloseTo(27.32, 0)
    expect(earth.yearDays).toBeCloseTo(365.25, 0)
    expect(earth.magneticField).toBeCloseTo(1, 1)
    expect(earth.hzPosition).toBeGreaterThan(0)
    expect(earth.hzPosition).toBeLessThan(0.5)
  })

  it('makes Venus hot and Mars cold', () => {
    expect(computeDerived(PRESETS.venus).surfaceTemp).toBeGreaterThan(650)
    expect(computeDerived(PRESETS.mars).surfaceTemp).toBeLessThan(230)
  })

  it('raises the boiling point with pressure', () => {
    const d = computeDerived(PRESETS.venus)
    expect(d.boilingPoint).toBeGreaterThan(500)
  })
})

describe('habitability', () => {
  const prob = (id: keyof typeof PRESETS) => computeHabitability(PRESETS[id]).probability

  it('ranks Earth high', () => expect(prob('earth')).toBeGreaterThan(80))
  it('ranks Venus very low', () => expect(prob('venus')).toBeLessThan(10))
  it('ranks Mars low', () => expect(prob('mars')).toBeLessThan(25))
  it('ranks the ice world below Earth', () => expect(prob('ice')).toBeLessThan(prob('earth')))
  it('stays within 0–100', () => {
    for (const id of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
      expect(prob(id)).toBeGreaterThanOrEqual(0)
      expect(prob(id)).toBeLessThanOrEqual(100)
    }
  })
})
