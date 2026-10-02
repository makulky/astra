import { useTranslation } from 'react-i18next'
import { useHabitability } from './useHabitability'

const n = (v: number, d = 2) => v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d })

export function DerivedData() {
  const { t } = useTranslation()
  const { derived: d } = useHabitability()
  const celsius = (k: number) => `${Math.round(k - 273.15)} °C`
  const hz =
    d.hzPosition < 0 ? t('lab.derived.tooHot') : d.hzPosition > 1 ? t('lab.derived.tooCold') : t('lab.derived.inside')
  const hzClass = d.hzPosition < 0 ? 'bad-hot' : d.hzPosition > 1 ? 'bad-cold' : 'good'
  const days = t('lab.derived.days')

  const rows: [string, string, string?][] = [
    [t('lab.derived.surfaceTemp'), celsius(d.surfaceTemp)],
    [t('lab.derived.equilibriumTemp'), celsius(d.equilibriumTemp)],
    [t('lab.derived.gravity'), `${n(d.gravity)} g`],
    [t('lab.derived.density'), `${n(d.density)} g/cm³`],
    [t('lab.derived.escapeVelocity'), `${n(d.escapeVelocity, 1)} km/s`],
    [t('lab.derived.flux'), `${n(d.flux)} S⊕`],
    [t('lab.derived.yearDays'), `${n(d.yearDays, 0)} ${days}`],
    [t('lab.derived.magneticField'), `${n(d.magneticField)} B⊕`],
    [t('lab.derived.moonPeriodDays'), d.moonPeriodDays ? `${n(d.moonPeriodDays, 1)} ${days}` : '—'],
    [t('lab.derived.hz'), `${n(d.hzInner)}–${n(d.hzOuter)} ${t('lab.units.au')}`, hz],
  ]

  return (
    <dl className="derived">
      {rows.map(([k, v, extra]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>
            {v}
            {extra && <span className={`tag ${hzClass}`}>{extra}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
