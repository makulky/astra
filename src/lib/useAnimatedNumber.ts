import { useEffect, useRef, useState } from 'react'

/** Eases a displayed number towards its target, matching the progressive 3D transitions. */
export function useAnimatedNumber(target: number, lambda = 4) {
  const [value, setValue] = useState(target)
  const current = useRef(target)
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      current.current += (target - current.current) * (1 - Math.exp(-lambda * dt))
      if (Math.abs(target - current.current) < Math.max(0.05, Math.abs(target) * 1e-4)) current.current = target
      setValue(current.current)
      if (current.current !== target) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, lambda])
  return value
}
