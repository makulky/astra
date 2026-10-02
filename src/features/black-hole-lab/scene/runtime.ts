import { FeedSim } from '../infall'

/**
 * Per-frame simulation state shared between scene components without React re-renders.
 * Simulation components write it (useFrame priority −1), the ray marcher reads it.
 */
export const runtime = {
  /** Smoothed world units per rg, written by the ray marcher. */
  scale: 0.4,
  feed: new FeedSim(),
  merger: {
    active: false,
    bh1: [0, 0, 0] as [number, number, number],
    bh2: [0, 0, 0] as [number, number, number],
    q1: 0.5,
    q2: 0.5,
    spin: 0,
    wobble: 0,
    flash: 0,
  },
  formation: {
    flash: 0,
  },
}
