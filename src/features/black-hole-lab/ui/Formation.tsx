import { useTranslation } from 'react-i18next'
import { Slider } from '../../../components/ui/Slider'
import { sci } from '../../../lib/format'
import { useBlackHoleLab } from '../store'

const STAGES = [0, 1, 2, 3, 4] as const

function formatYears(y: number, t: (k: string) => string) {
  return `${sci(y, 1)} ${t('bh.data.years')}`
}

export function FormationTimeline() {
  const { t } = useTranslation()
  const stage = useBlackHoleLab((s) => s.stage)
  const o = useBlackHoleLab((s) => s.outcome)
  const advance = useBlackHoleLab((s) => s.advanceStage)
  const reset = useBlackHoleLab((s) => s.resetFormation)
  const sendToLab = useBlackHoleLab((s) => s.sendToLab)

  const isWD = o.remnant === 'whiteDwarf'
  const text =
    stage === 0
      ? t('bh.form.stageText.0', { time: formatYears(o.lifetimeYears, t) })
      : stage === 1
        ? t('bh.form.stageText.1', { radius: Math.round(o.giantRadius) })
        : stage === 2
          ? t(isWD ? 'bh.form.stageText.2wd' : 'bh.form.stageText.2')
          : stage === 3
            ? t('bh.form.stageText.3', { death: t(`bh.form.deaths.${o.death}`) })
            : null

  return (
    <div className="bh-card glass">
      <ol className="timeline">
        {STAGES.map((s) => (
          <li key={s} className={s < stage ? 'done' : s === stage ? 'current' : ''}>
            {t(`bh.form.stages.${s}`)}
          </li>
        ))}
      </ol>

      {stage < 4 ? (
        <div className="stage-row">
          <p className="stage-text">{text}</p>
          {stage === 0 && (
            <button className="btn-primary" onClick={advance}>
              {t('bh.form.buttons.evolve')} →
            </button>
          )}
          {stage === 1 && (
            <button className="btn-primary" onClick={advance}>
              {isWD ? t('bh.form.buttons.next') : `💥 ${t('bh.form.buttons.collapse')}`}
            </button>
          )}
          {(stage === 2 || stage === 3) && (
            <button className="btn-primary" disabled>
              …
            </button>
          )}
        </div>
      ) : (
        <div className="stage-row">
          <div className={`outcome stage-text ${o.remnant}`}>
            <strong>
              {o.remnant === 'none'
                ? t('bh.form.remnants.none')
                : t('bh.form.stageText.4', { remnant: t(`bh.form.remnants.${o.remnant}`), mass: o.remnantMass.toFixed(1) })}
            </strong>
            <p>{t(`bh.form.remnantText.${o.remnant}`)}</p>
          </div>
          <div className="btn-row">
            {o.remnant === 'blackHole' && (
              <button className="btn-primary" onClick={() => sendToLab(o.remnantMass, o.spin)}>
                {t('bh.form.buttons.toLab')} →
              </button>
            )}
            <button className="btn-ghost" onClick={reset}>
              ↺ {t('bh.form.buttons.reset')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function FormationPanel() {
  const { t } = useTranslation()
  const star = useBlackHoleLab((s) => s.star)
  const setStar = useBlackHoleLab((s) => s.setStar)
  const stage = useBlackHoleLab((s) => s.stage)
  const o = useBlackHoleLab((s) => s.outcome)
  const locked = stage > 0

  const facts: [string, string][] = [
    [t('bh.form.facts.lifetime'), formatYears(o.lifetimeYears, t)],
    [t('bh.form.facts.windLoss'), `${Math.round(o.windLoss * 100)} %`],
    [t('bh.form.facts.finalMass'), `${o.finalMass.toFixed(1)} M☉`],
    [t('bh.form.facts.heliumCore'), `${o.heliumCore.toFixed(1)} M☉`],
    [t('bh.form.facts.remnantMass'), o.remnant === 'none' ? '—' : `${o.remnantMass.toFixed(1)} M☉`],
    [t('bh.form.facts.spin'), o.remnant === 'blackHole' ? o.spin.toFixed(2) : '—'],
  ]

  return (
    <>
      <section className="panel-section">
        <h3>{t('bh.form.star')}</h3>
        <Slider label={t('bh.form.mass')} disabled={locked} value={star.mass} min={3} max={300} step={0.1} log unit="M☉" format={(v) => v.toFixed(v < 10 ? 1 : 0)} onChange={(v) => setStar('mass', v)} />
        <Slider
          label={t('bh.form.metallicity')}
          hint={t('bh.form.metallicityHint')}
          disabled={locked}
          value={star.metallicity}
          min={1e-4}
          max={0.04}
          step={1e-5}
          log
          unit="Z"
          format={(v) => (v < 0.001 ? v.toExponential(1) : v.toFixed(3))}
          onChange={(v) => setStar('metallicity', v)}
        />
        <Slider
          label={t('bh.form.rotation')}
          hint={t('bh.form.rotationHint')}
          disabled={locked}
          value={star.rotation}
          min={0}
          max={1}
          step={0.01}
          unit="%"
          format={(v) => `${Math.round(v * 100)}`}
          onChange={(v) => setStar('rotation', v)}
        />
        {locked && <p className="empty">{t('bh.form.locked')}</p>}
      </section>

      <section className="panel-section">
        <h3>{t('bh.form.prediction')}</h3>
        <div className={`outcome ${o.remnant}`}>
          <strong>{t(`bh.form.remnants.${o.remnant}`)}</strong>
          <p>{t(`bh.form.deaths.${o.death}`)}.</p>
        </div>
        <dl className="derived" style={{ marginTop: 10 }}>
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
