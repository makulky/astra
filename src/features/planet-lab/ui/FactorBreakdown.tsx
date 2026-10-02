import { useTranslation } from 'react-i18next'
import type { Factor } from '../habitability'

const hue = (score: number) => Math.round(score * 130) // red → green

export function FactorBreakdown({ factors }: { factors: Factor[] }) {
  const { t } = useTranslation()
  return (
    <ul className="factors">
      {factors.map((f) => (
        <li key={f.id} title={t(`lab.factors.${f.id}.info`)}>
          <div className="factor-row">
            <span className="factor-name">
              {t(`lab.factors.${f.id}.name`)}
              {f.weight >= 1 && <span className="critical" aria-hidden>●</span>}
            </span>
            <span className="factor-score">{Math.round(f.score * 100)}%</span>
          </div>
          <div className="factor-bar">
            <div style={{ width: `${f.score * 100}%`, background: `hsl(${hue(f.score)} 75% 52%)` }} />
          </div>
          <p className="factor-info">{t(`lab.factors.${f.id}.info`)}</p>
        </li>
      ))}
    </ul>
  )
}
