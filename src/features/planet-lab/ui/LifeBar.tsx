import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FactorBreakdown } from './FactorBreakdown'
import { useAnimatedNumber, useHabitability } from './useHabitability'

function level(p: number) {
  if (p < 5) return 'none'
  if (p < 25) return 'low'
  if (p < 50) return 'mid'
  if (p < 75) return 'high'
  return 'veryHigh'
}

export function LifeBar() {
  const { t } = useTranslation()
  const { probability, factors } = useHabitability()
  const shown = useAnimatedNumber(probability)
  const [open, setOpen] = useState(false)
  const lvl = level(shown)

  return (
    <div className="life-card glass">
      <div className="life-head">
        <span className="life-title">{t('lab.life.title')}</span>
        <span className={`life-level lvl-${lvl}`}>{t(`lab.life.levels.${lvl}`)}</span>
      </div>
      <div className="life-value">
        {shown.toFixed(shown < 10 ? 1 : 0)}
        <span>%</span>
      </div>
      <div
        className="life-bar"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(probability)}
        aria-label={t('lab.life.title')}
      >
        <div className="life-fill" style={{ clipPath: `inset(0 ${100 - shown}% 0 0 round 999px)` }} />
        <div className="life-marker" style={{ left: `${shown}%` }} />
      </div>
      <button className="link-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? t('lab.life.hide') : t('lab.life.details')}
        <span className={`chev ${open ? 'up' : ''}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && <FactorBreakdown factors={factors} />}
      <p className="disclaimer">{t('lab.life.disclaimer')}</p>
    </div>
  )
}
