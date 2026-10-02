import { useTranslation } from 'react-i18next'
import { Toggle } from '../../../components/ui/Slider'
import { distance, sci } from '../../../lib/format'
import { useAnimatedNumber } from '../../../lib/useAnimatedNumber'
import type { ThrowableKind } from '../infall'
import { gravRadius } from '../physics'
import { TOOL_COLORS } from '../scene/Infall'
import { runtime } from '../scene/runtime'
import { useBlackHoleLab } from '../store'
import { BHData, useDerived } from './BHData'

const TOOLS: ThrowableKind[] = ['gas', 'star', 'planet']

export function FeedToolbar() {
  const { t } = useTranslation()
  const tool = useBlackHoleLab((s) => s.tool)
  const setTool = useBlackHoleLab((s) => s.setTool)
  return (
    <div className="bh-card glass">
      <div className="tools" role="radiogroup">
        {TOOLS.map((k) => (
          <button key={k} role="radio" aria-checked={tool === k} className={`tool ${tool === k ? 'active' : ''}`} onClick={() => setTool(k)}>
            <span className="tool-icon" style={{ background: TOOL_COLORS[k], boxShadow: `0 0 10px ${TOOL_COLORS[k]}` }} />
            {t(`bh.feed.tools.${k}`)}
          </button>
        ))}
      </div>
      <p className="feed-help">{t('bh.feed.instructions')}</p>
    </div>
  )
}

export function FeedPanel() {
  const { t } = useTranslation()
  const mass = useBlackHoleLab((s) => s.params.mass)
  const exaggerate = useBlackHoleLab((s) => s.exaggerate)
  const setExaggerate = useBlackHoleLab((s) => s.setExaggerate)
  const events = useBlackHoleLab((s) => s.events)
  const clearEvents = useBlackHoleLab((s) => s.clearEvents)
  const d = useDerived()
  const shownMass = useAnimatedNumber(mass, 3)
  const units = { km: t('bh.units.km'), au: t('bh.units.au') }

  return (
    <>
      <section className="panel-section">
        <h3>{t('bh.sections.hole')}</h3>
        <div className="life-value">
          {sci(shownMass, 3)}
          <span> M☉</span>
        </div>
        <Toggle label={t('bh.feed.exaggerate')} hint={t('bh.feed.exaggerateHint')} checked={exaggerate} onChange={setExaggerate} />
        <p className="empty">
          {d.sunSwallowedWhole
            ? t('bh.visitor.starWhole')
            : t('bh.feed.tidalNote', { distance: `${distance(d.sunTidalRadius, units)} (${sci(d.sunTidalRadius / gravRadius(mass), 1)} r_g)` })}
        </p>
      </section>

      <section className="panel-section">
        <div className="section-head">
          <h3>{t('bh.feed.log')}</h3>
          <button
            className="btn-ghost"
            onClick={() => {
              clearEvents()
              runtime.feed.clear()
            }}
          >
            {t('bh.feed.clear')}
          </button>
        </div>
        {events.length === 0 ? (
          <p className="empty">{t('bh.feed.empty')}</p>
        ) : (
          <ul className="event-log" aria-live="polite">
            {events.map((e) => (
              <li key={e.id} className={`ev-${e.type}`}>
                <span>{t(`bh.feed.events.${e.type}.${e.kind}`)}</span>
                {e.massGain > 0 && <span className="gain">+{sci(e.massGain, 2)} M☉</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-section">
        <h3>{t('bh.sections.data')}</h3>
        <BHData />
      </section>
    </>
  )
}
