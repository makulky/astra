import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { distance, sci } from '../../../lib/format'
import { computeDerived, L_SUN } from '../physics'
import { useBlackHoleLab } from '../store'

export function useDerived() {
  const params = useBlackHoleLab((s) => s.params)
  return useMemo(() => computeDerived(params), [params])
}

export function BHData() {
  const { t } = useTranslation()
  const d = useDerived()
  const units = { km: t('bh.units.km'), au: t('bh.units.au') }
  const rows: [string, string][] = [
    [t('bh.data.rs'), distance(d.rs, units)],
    [t('bh.data.horizon'), distance(d.horizon, units)],
    [t('bh.data.isco'), distance(d.isco, units)],
    [t('bh.data.shadow'), distance(2 * d.shadowRadius, units)],
    [t('bh.data.efficiency'), `${(d.efficiency * 100).toFixed(1)} %`],
    [t('bh.data.luminosity'), `${sci(d.luminosity / L_SUN)} ${t('bh.data.suns')}`],
    [t('bh.data.accretionRate'), `${sci(d.accretionRate)} ${t('bh.data.perYear')}`],
    [t('bh.data.diskTemp'), `${sci(d.diskPeakTemp, 1)} K`],
    [t('bh.data.hawking'), `${sci(d.hawkingTemp)} K`],
    [t('bh.data.evaporation'), `${sci(d.evaporationYears, 1)} ${t('bh.data.years')}`],
    [t('bh.data.density'), `${sci(d.density)} kg/m³`],
  ]
  return (
    <dl className="derived">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
