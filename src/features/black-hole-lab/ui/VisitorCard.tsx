import { useTranslation } from 'react-i18next'
import { distance, sci } from '../../../lib/format'
import { useAnimatedNumber } from '../../../lib/useAnimatedNumber'
import { useDerived } from './BHData'

function tideLevel(g: number) {
  if (g < 1) return 'none'
  if (g < 100) return 'uncomfortable'
  return 'deadly'
}

/** Logarithmic 0–100 % position for the tide meter: 10⁻⁶ g … 10¹⁰ g. */
const tidePct = (g: number) => Math.min(100, Math.max(0, ((Math.log10(Math.max(g, 1e-12)) + 6) / 16) * 100))

export function VisitorCard() {
  const { t } = useTranslation()
  const d = useDerived()
  const pct = useAnimatedNumber(tidePct(d.tidalAtHorizon))
  const level = tideLevel(d.tidalAtHorizon)
  const units = { km: t('bh.units.km'), au: t('bh.units.au') }

  return (
    <div className="life-card glass visitor">
      <div className="life-head">
        <span className="life-title">{t('bh.sections.visitor')}</span>
        <span className={`life-level tide-${level}`}>{t(`bh.visitor.tideLevels.${level}`)}</span>
      </div>

      <p className="visitor-label">{t('bh.visitor.tides')}</p>
      <div className="visitor-value">
        {sci(d.tidalAtHorizon, 1)} <span>g</span>
      </div>
      <div className="life-bar tide-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t('bh.visitor.tides')}>
        <div className="life-fill" style={{ clipPath: `inset(0 ${100 - pct}% 0 0 round 999px)` }} />
        <div className="life-marker" style={{ left: `${pct}%` }} />
      </div>

      <p className="visitor-label">{t('bh.visitor.time')}</p>
      <p className="visitor-text">{t('bh.visitor.timeText', { value: `${sci(d.timeDilationIsco, 2)} ${t('bh.units.hours')}` })}</p>

      <p className="visitor-label">{t('bh.visitor.star')}</p>
      <p className="visitor-text">
        {d.sunSwallowedWhole ? t('bh.visitor.starWhole') : t('bh.visitor.starTorn', { distance: distance(d.sunTidalRadius, units) })}
      </p>
    </div>
  )
}
