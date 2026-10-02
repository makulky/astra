import { useTranslation } from 'react-i18next'
import { STARS, type PlanetParams, type StarType } from '../physics'
import { usePlanetLab } from '../store'
import { DerivedData } from './DerivedData'
import { Presets } from './Presets'
import { Slider, Toggle } from '../../../components/ui/Slider'

const fmt = (digits: number) => (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
const pct = (v: number) => `${Math.round(v * 100)}`

export function ControlPanel() {
  const { t } = useTranslation()
  const params = usePlanetLab((s) => s.params)
  const set = usePlanetLab((s) => s.set)
  const L = (k: keyof PlanetParams) => t(`lab.params.${k}`)
  const H = (k: string) => (t(`lab.hints.${k}`, { defaultValue: '' }) as string) || undefined

  return (
    <div className="panel-scroll">
      <Presets />

      <section className="panel-section">
        <h3>{t('lab.sections.star')}</h3>
        <div className="star-picker" role="radiogroup">
          {(Object.keys(STARS) as StarType[]).map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={params.star === s}
              className={params.star === s ? 'active' : ''}
              onClick={() => set('star', s)}
            >
              <span className="star-dot" style={{ background: STARS[s].color, boxShadow: `0 0 12px ${STARS[s].color}` }} />
              <strong>{s}</strong>
              <small>{t(`lab.stars.${s}`)}</small>
            </button>
          ))}
        </div>
        <Slider label={L('distance')} value={params.distance} min={0.05} max={5} step={0.001} log unit={t('lab.units.au')} format={fmt(2)} onChange={(v) => set('distance', v)} />
      </section>

      <section className="panel-section">
        <h3>{t('lab.sections.planet')}</h3>
        <Slider label={L('mass')} value={params.mass} min={0.05} max={10} step={0.001} log unit="M⊕" format={fmt(2)} onChange={(v) => set('mass', v)} />
        <Slider label={L('radius')} value={params.radius} min={0.3} max={3} step={0.001} unit="R⊕" format={fmt(2)} onChange={(v) => set('radius', v)} />
        <Slider
          label={L('rotationHours')}
          value={params.rotationHours}
          min={2}
          max={6000}
          step={0.1}
          log
          unit="h"
          disabled={params.tidallyLocked}
          format={(v) => (v < 100 ? fmt(1)(v) : Math.round(v).toLocaleString())}
          onChange={(v) => set('rotationHours', v)}
        />
        <Toggle label={L('tidallyLocked')} hint={H('tidallyLocked')} checked={params.tidallyLocked} onChange={(v) => set('tidallyLocked', v)} />
        <Slider label={L('tilt')} value={params.tilt} min={0} max={180} step={0.1} unit="°" format={fmt(1)} onChange={(v) => set('tilt', v)} />
      </section>

      <section className="panel-section">
        <h3>{t('lab.sections.surface')}</h3>
        <Slider
          label={L('pressure')}
          value={Math.max(params.pressure, 0.001)}
          min={0.001}
          max={100}
          step={0.001}
          log
          unit="atm"
          format={(v) => (v < 0.1 ? fmt(3)(v) : v < 10 ? fmt(2)(v) : fmt(0)(v))}
          onChange={(v) => set('pressure', v)}
        />
        <Slider label={L('water')} value={params.water} min={0} max={1} step={0.01} unit="%" format={pct} onChange={(v) => set('water', v)} />
        <Slider label={L('albedo')} hint={H('albedo')} value={params.albedo} min={0.05} max={0.9} step={0.01} format={fmt(2)} onChange={(v) => set('albedo', v)} />
        <Slider label={L('greenhouse')} hint={H('greenhouse')} value={params.greenhouse} min={0} max={3} step={0.01} unit="×" format={fmt(2)} onChange={(v) => set('greenhouse', v)} />
      </section>

      <section className="panel-section">
        <h3>{t('lab.sections.moon')}</h3>
        <Toggle label={L('hasMoon')} checked={params.hasMoon} onChange={(v) => set('hasMoon', v)} />
        <Slider label={L('moonMass')} hint={H('moonMass')} disabled={!params.hasMoon} value={params.moonMass} min={0.01} max={20} step={0.01} log unit="M☾" format={fmt(2)} onChange={(v) => set('moonMass', v)} />
        <Slider label={L('moonRadius')} hint={H('moonRadius')} disabled={!params.hasMoon} value={params.moonRadius} min={0.2} max={3} step={0.01} unit="R☾" format={fmt(2)} onChange={(v) => set('moonRadius', v)} />
        <Slider label={L('moonDistance')} hint={H('moonDistance')} disabled={!params.hasMoon} value={params.moonDistance} min={5} max={100} step={0.5} unit="R" format={fmt(0)} onChange={(v) => set('moonDistance', v)} />
      </section>

      <section className="panel-section">
        <h3>{t('lab.sections.data')}</h3>
        <DerivedData />
      </section>
    </div>
  )
}
