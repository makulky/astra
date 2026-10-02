import { useTranslation } from 'react-i18next'
import { Slider, Toggle } from '../../../components/ui/Slider'
import { sci } from '../../../lib/format'
import { MAX_SPIN } from '../physics'
import { PRESET_ORDER } from '../presets'
import { useBlackHoleLab } from '../store'
import { BHData } from './BHData'

export function LabPanel() {
  const { t } = useTranslation()
  const params = useBlackHoleLab((s) => s.params)
  const set = useBlackHoleLab((s) => s.set)
  const preset = useBlackHoleLab((s) => s.preset)
  const applyPreset = useBlackHoleLab((s) => s.applyPreset)

  return (
    <>
      <section className="panel-section">
        <h3>{t('bh.presets')}</h3>
        <div className="chips">
          {PRESET_ORDER.map((id) => (
            <button key={id} className={`chip ${preset === id ? 'active' : ''}`} onClick={() => applyPreset(id)}>
              {t(`bh.presetNames.${id}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h3>{t('bh.sections.hole')}</h3>
        <Slider label={t('bh.params.mass')} value={params.mass} min={3} max={1e11} step={0.01} log unit="M☉" format={(v) => sci(v, 2)} onChange={(v) => set('mass', v)} />
        <Slider
          label={t('bh.params.spin')}
          hint={t('bh.hints.spin')}
          value={params.spin}
          min={-MAX_SPIN}
          max={MAX_SPIN}
          step={0.001}
          format={(v) => v.toFixed(3)}
          onChange={(v) => set('spin', v)}
        />
      </section>

      <section className="panel-section">
        <h3>{t('bh.sections.disk')}</h3>
        <Slider
          label={t('bh.params.accretion')}
          hint={t('bh.hints.accretion')}
          value={Math.max(params.accretion, 1e-9)}
          min={1e-9}
          max={10}
          step={1e-10}
          log
          unit="× Edd"
          format={(v) => sci(v, 1)}
          onChange={(v) => set('accretion', v)}
        />
        <Slider label={t('bh.params.diskOuter')} hint={t('bh.hints.diskOuter')} value={params.diskOuter} min={10} max={60} step={0.5} unit="r_g" format={(v) => v.toFixed(0)} onChange={(v) => set('diskOuter', v)} />
        <Toggle label={t('bh.params.jets')} hint={t('bh.hints.jets')} checked={params.jets} onChange={(v) => set('jets', v)} />
      </section>

      <section className="panel-section">
        <h3>{t('bh.sections.data')}</h3>
        <BHData />
      </section>
    </>
  )
}
