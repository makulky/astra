import { useTranslation } from 'react-i18next'
import { PRESET_ORDER } from '../presets'
import { usePlanetLab } from '../store'

export function Presets() {
  const { t } = useTranslation()
  const active = usePlanetLab((s) => s.preset)
  const applyPreset = usePlanetLab((s) => s.applyPreset)
  const randomize = usePlanetLab((s) => s.randomize)
  const reset = usePlanetLab((s) => s.reset)

  return (
    <section className="panel-section">
      <div className="section-head">
        <h3>{t('lab.presets')}</h3>
        <div className="actions">
          <button className="btn-ghost" onClick={randomize}>
            🎲 {t('lab.random')}
          </button>
          <button className="btn-ghost" onClick={reset}>
            ↺ {t('lab.reset')}
          </button>
        </div>
      </div>
      <div className="chips">
        {PRESET_ORDER.map((id) => (
          <button key={id} className={`chip ${active === id ? 'active' : ''}`} onClick={() => applyPreset(id)}>
            {t(`lab.presetNames.${id}`)}
          </button>
        ))}
      </div>
    </section>
  )
}
