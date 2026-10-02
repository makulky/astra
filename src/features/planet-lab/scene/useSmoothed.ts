import { useRef } from 'react'
import * as THREE from 'three'

/**
 * Keeps a numeric record that eases towards a target every frame (frame-rate independent
 * exponential damping), so parameter changes morph progressively instead of jumping.
 */
export function useSmoothed<T extends Record<string, number>>(initial: () => T) {
  const state = useRef<T | null>(null)
  if (state.current === null) state.current = initial()

  const step = (target: T, dt: number, lambda = 2.5) => {
    const cur = state.current as Record<string, number>
    const k = Math.min(dt, 0.1) // avoid huge jumps after the tab was hidden
    for (const key in target) cur[key] = THREE.MathUtils.damp(cur[key], target[key], lambda, k)
    return state.current as T
  }

  return step
}
