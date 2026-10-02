import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Slider } from '../../../components/ui/Slider'
import { sci } from '../../../lib/format'
import { gwFrequencyAt, inspiralDuration, MERGE_SEPARATION, type MergerResult } from '../merger'
import { wave, WAVE_RATE } from '../scene/MergerSim'
import { useBlackHoleLab } from '../store'

/** Synthesises the chirp with the real frequency evolution (clamped to the audible range). */
function playChirp(r: MergerResult, s0: number) {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  const rate = ctx.sampleRate
  const chirpT = 3
  const ringT = 0.6
  const buf = ctx.createBuffer(1, Math.floor(rate * (chirpT + ringT)), rate)
  const data = buf.getChannelData(0)
  const clampF = (f: number) => Math.min(1500, Math.max(30, f))
  let phase = 0
  for (let i = 0; i < data.length; i++) {
    const t = i / rate
    let f: number
    let a: number
    if (t < chirpT) {
      const u = t / chirpT
      const s = Math.max(MERGE_SEPARATION, s0 * Math.pow(1 - u, 0.25) + MERGE_SEPARATION * u)
      f = clampF(gwFrequencyAt(r.peakFrequency, s))
      a = Math.min(1, MERGE_SEPARATION / s) ** 1.2 * Math.min(1, t * 4)
    } else {
      f = clampF(r.ringdownFrequency)
      a = Math.exp(-(t - chirpT) / 0.08)
    }
    phase += (2 * Math.PI * f) / rate
    data[i] = Math.sin(phase) * a * 0.5
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.onended = () => ctx.close()
  src.start()
}

export function Waveform() {
  const { t } = useTranslation()
  const canvas = useRef<HTMLCanvasElement>(null)
  const phase = useBlackHoleLab((s) => s.mergerPhase)
  const start = useBlackHoleLab((s) => s.startMerger)
  const merger = useBlackHoleLab((s) => s.merger)
  const result = useBlackHoleLab((s) => s.mergerResult)

  useEffect(() => {
    let raf = 0
    const draw = () => {
      const c = canvas.current
      if (c) {
        const dpr = window.devicePixelRatio || 1
        const w = c.clientWidth
        const h = c.clientHeight
        if (c.width !== Math.round(w * dpr)) {
          c.width = Math.round(w * dpr)
          c.height = Math.round(h * dpr)
        }
        const ctx = c.getContext('2d')!
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        ctx.strokeStyle = 'rgba(150,170,255,0.15)'
        ctx.beginPath()
        ctx.moveTo(0, h / 2)
        ctx.lineTo(w, h / 2)
        ctx.stroke()
        // Show the whole event: inspiral + ring-down, newest sample on the right.
        const span = Math.ceil((inspiralDuration(useBlackHoleLab.getState().merger.separation) + 3) * WAVE_RATE)
        const n = Math.min(wave.head, span)
        const grad = ctx.createLinearGradient(0, 0, w, 0)
        grad.addColorStop(0, '#6aa8ff')
        grad.addColorStop(1, '#b48cff')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.6
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const v = wave.at(wave.h, (n - 1 - i) / WAVE_RATE)
          const x = (i / Math.max(span - 1, 1)) * w
          const y = h / 2 - v * (h / 2 - 4)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="wave-card glass">
      <div className="wave-head">
        <span>{t('bh.merge.wave')}</span>
        <div className="btn-row">
          <span className={`phase ${phase === 'done' ? 'done' : ''}`}>{t(`bh.merge.phases.${phase}`)}</span>
          <button className="btn-ghost" onClick={() => playChirp(result, merger.separation)} title={t('bh.merge.audioNote')}>
            🔊 {t('bh.merge.listen')}
          </button>
          <button className="btn-primary" onClick={start} disabled={phase === 'inspiral' || phase === 'ringdown'}>
            {phase === 'idle' ? t('bh.merge.start') : `↺ ${t('bh.merge.restart')}`}
          </button>
        </div>
      </div>
      <canvas ref={canvas} className="wave-canvas" aria-label={t('bh.merge.wave')} />
    </div>
  )
}

export function MergerPanel() {
  const { t } = useTranslation()
  const merger = useBlackHoleLab((s) => s.merger)
  const setMerger = useBlackHoleLab((s) => s.setMerger)
  const phase = useBlackHoleLab((s) => s.mergerPhase)
  const r = useBlackHoleLab((s) => s.mergerResult)
  const sendToLab = useBlackHoleLab((s) => s.sendToLab)
  const busy = phase === 'inspiral' || phase === 'ringdown'

  const rows: [string, string][] = [
    [t('bh.merge.result.finalMass'), `${r.finalMass.toFixed(1)} M☉`],
    [t('bh.merge.result.finalSpin'), r.finalSpin.toFixed(2)],
    [t('bh.merge.result.radiated'), `${(r.radiatedFraction * 100).toFixed(1)} %`],
    [t('bh.merge.result.chirpMass'), `${r.chirpMass.toFixed(1)} M☉`],
    [t('bh.merge.result.peakFreq'), `${r.peakFrequency.toFixed(0)} Hz`],
    [t('bh.merge.result.ringFreq'), `${r.ringdownFrequency.toFixed(0)} Hz`],
    [t('bh.merge.result.timeToMerge'), `${sci(r.timeToMergeYears * 365.25 * 86400, 1)} s`],
  ]

  return (
    <>
      <section className="panel-section">
        <h3>{t('bh.sections.hole')}</h3>
        <Slider label={t('bh.merge.m1')} disabled={busy} value={merger.m1} min={5} max={150} step={0.5} unit="M☉" format={(v) => v.toFixed(0)} onChange={(v) => setMerger('m1', v)} />
        <Slider label={t('bh.merge.m2')} disabled={busy} value={merger.m2} min={5} max={150} step={0.5} unit="M☉" format={(v) => v.toFixed(0)} onChange={(v) => setMerger('m2', v)} />
        <Slider label={t('bh.merge.separation')} disabled={busy} value={merger.separation} min={8} max={40} step={0.5} unit="r_g" format={(v) => v.toFixed(0)} onChange={(v) => setMerger('separation', v)} />
      </section>

      <section className="panel-section">
        <h3>{t('bh.sections.data')}</h3>
        <dl className="derived">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="empty" style={{ marginTop: 10 }}>
          {t('bh.merge.radiatedText', { mass: (r.totalMass - r.finalMass).toFixed(1), energy: sci(r.radiatedEnergy, 1) })}
        </p>
        {phase === 'done' && (
          <button className="btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={() => sendToLab(r.finalMass, r.finalSpin)}>
            {t('bh.merge.toLab')} →
          </button>
        )}
      </section>
    </>
  )
}
