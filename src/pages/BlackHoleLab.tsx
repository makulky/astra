import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BlackHoleScene from '../features/black-hole-lab/scene/BlackHoleScene'
import { useBlackHoleLab, type Mode, type Quality } from '../features/black-hole-lab/store'
import { FeedPanel, FeedToolbar } from '../features/black-hole-lab/ui/Feed'
import { FormationPanel, FormationTimeline } from '../features/black-hole-lab/ui/Formation'
import { LabPanel } from '../features/black-hole-lab/ui/LabPanel'
import { MergerPanel, Waveform } from '../features/black-hole-lab/ui/Merger'
import { VisitorCard } from '../features/black-hole-lab/ui/VisitorCard'

const MODES: Mode[] = ['form', 'lab', 'feed', 'merge']
const QUALITIES: Quality[] = ['low', 'medium', 'high']

export default function BlackHoleLab() {
  const { t } = useTranslation()
  const [panelOpen, setPanelOpen] = useState(false)
  const mode = useBlackHoleLab((s) => s.mode)
  const setMode = useBlackHoleLab((s) => s.setMode)
  const quality = useBlackHoleLab((s) => s.quality)
  const setQuality = useBlackHoleLab((s) => s.setQuality)

  return (
    <div className="lab bh-lab">
      <div className="lab-stage">
        <BlackHoleScene />

        <div className="mode-tabs glass" role="tablist">
          {MODES.map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
              {t(`bh.modes.${m}`)}
            </button>
          ))}
        </div>

        {(mode === 'lab' || mode === 'feed') && (
          <div className="lab-overlay">
            <VisitorCard />
          </div>
        )}

        <div className="bh-bottom">
          {mode === 'form' && <FormationTimeline />}
          {mode === 'feed' && <FeedToolbar />}
          {mode === 'merge' && <Waveform />}
          {mode === 'lab' && <p className="lab-hint static">{t('bh.controls')}</p>}
        </div>

        <button className="panel-toggle" onClick={() => setPanelOpen(true)}>
          ⚙ {t('lab.openPanel')}
        </button>
      </div>

      <aside className={`lab-panel glass ${panelOpen ? 'open' : ''}`}>
        <div className="sheet-handle">
          <button className="btn-ghost" onClick={() => setPanelOpen(false)}>
            ✕ {t('lab.closePanel')}
          </button>
        </div>
        <div className="panel-scroll">
          <section className="panel-section">
            <p className="mode-hint">{t(`bh.modeHints.${mode}`)}</p>
            <div className="quality">
              <span>{t('bh.quality')}</span>
              <div className="lang">
                {QUALITIES.map((q) => (
                  <button key={q} className={quality === q ? 'active' : ''} aria-pressed={quality === q} onClick={() => setQuality(q)}>
                    {t(`bh.qualities.${q}`)}
                  </button>
                ))}
              </div>
            </div>
          </section>
          {mode === 'form' && <FormationPanel />}
          {mode === 'lab' && <LabPanel />}
          {mode === 'feed' && <FeedPanel />}
          {mode === 'merge' && <MergerPanel />}
          <p className="disclaimer">{t('bh.disclaimer')}</p>
        </div>
      </aside>
    </div>
  )
}
