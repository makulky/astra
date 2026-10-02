import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Scene from '../features/planet-lab/scene/Scene'
import { ControlPanel } from '../features/planet-lab/ui/ControlPanel'
import { LifeBar } from '../features/planet-lab/ui/LifeBar'

export default function PlanetLab() {
  const { t } = useTranslation()
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div className="lab">
      <div className="lab-stage">
        <Scene />
        <div className="lab-overlay">
          <LifeBar />
        </div>
        <p className="lab-hint">{t('lab.controls')}</p>
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
        <ControlPanel />
      </aside>
    </div>
  )
}
