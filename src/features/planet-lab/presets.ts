import type { PlanetParams } from './physics'

export type PresetId = 'earth' | 'mars' | 'venus' | 'superEarth' | 'ocean' | 'ice' | 'redDwarf'

const noMoon = { hasMoon: false, moonMass: 1, moonRadius: 1, moonDistance: 60 }

export const PRESETS: Record<PresetId, PlanetParams> = {
  earth: {
    star: 'G', mass: 1, radius: 1, distance: 1, rotationHours: 24, tidallyLocked: false, tilt: 23.4,
    pressure: 1, water: 0.71, albedo: 0.3, greenhouse: 1,
    hasMoon: true, moonMass: 1, moonRadius: 1, moonDistance: 60,
  },
  mars: {
    star: 'G', mass: 0.107, radius: 0.532, distance: 1.52, rotationHours: 24.6, tidallyLocked: false, tilt: 25.2,
    pressure: 0.006, water: 0.03, albedo: 0.25, greenhouse: 1, ...noMoon,
  },
  venus: {
    star: 'G', mass: 0.815, radius: 0.949, distance: 0.723, rotationHours: 5832, tidallyLocked: false, tilt: 177,
    pressure: 92, water: 0, albedo: 0.77, greenhouse: 1, ...noMoon,
  },
  superEarth: {
    star: 'K', mass: 4, radius: 1.5, distance: 0.6, rotationHours: 30, tidallyLocked: false, tilt: 15,
    pressure: 2.5, water: 0.55, albedo: 0.35, greenhouse: 0.7,
    hasMoon: true, moonMass: 3, moonRadius: 1.4, moonDistance: 40,
  },
  ocean: {
    star: 'G', mass: 1.4, radius: 1.12, distance: 1.05, rotationHours: 19, tidallyLocked: false, tilt: 12,
    pressure: 1.4, water: 0.97, albedo: 0.32, greenhouse: 0.9,
    hasMoon: true, moonMass: 0.6, moonRadius: 0.8, moonDistance: 45,
  },
  ice: {
    star: 'G', mass: 0.8, radius: 0.95, distance: 1.8, rotationHours: 28, tidallyLocked: false, tilt: 30,
    pressure: 0.7, water: 0.6, albedo: 0.55, greenhouse: 1,
    hasMoon: true, moonMass: 0.3, moonRadius: 0.6, moonDistance: 30,
  },
  redDwarf: {
    star: 'M', mass: 1.1, radius: 1.05, distance: 0.21, rotationHours: 24, tidallyLocked: true, tilt: 2,
    pressure: 1.2, water: 0.5, albedo: 0.3, greenhouse: 1, ...noMoon,
  },
}

export const PRESET_ORDER: PresetId[] = ['earth', 'mars', 'venus', 'superEarth', 'ocean', 'ice', 'redDwarf']
