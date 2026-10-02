import { useMemo } from 'react'
import { computeHabitability } from '../habitability'
import { usePlanetLab } from '../store'

export { useAnimatedNumber } from '../../../lib/useAnimatedNumber'

export function useHabitability() {
  const params = usePlanetLab((s) => s.params)
  return useMemo(() => computeHabitability(params), [params])
}
