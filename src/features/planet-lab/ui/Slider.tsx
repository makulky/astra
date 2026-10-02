import { useId } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  log?: boolean
  unit?: string
  hint?: string
  disabled?: boolean
  format?: (v: number) => string
  onChange: (v: number) => void
}

const RESOLUTION = 1000

export function Slider({ label, value, min, max, step = 0.01, log, unit, hint, disabled, format, onChange }: SliderProps) {
  const id = useId()
  const toPos = (v: number) =>
    log ? (Math.log(v / min) / Math.log(max / min)) * RESOLUTION : ((v - min) / (max - min)) * RESOLUTION
  const fromPos = (pos: number) => {
    const t = pos / RESOLUTION
    const raw = log ? min * (max / min) ** t : min + t * (max - min)
    return Math.round(raw / step) * step
  }
  const pct = Math.min(100, Math.max(0, toPos(value) / 10))
  const shown = format ? format(value) : value.toLocaleString(undefined, { maximumFractionDigits: 2 })

  return (
    <div className={`slider ${disabled ? 'is-disabled' : ''}`}>
      <div className="slider-head">
        <label htmlFor={id} title={hint}>
          {label}
          {hint && <span className="hint-dot" aria-hidden>?</span>}
        </label>
        <output htmlFor={id}>
          {shown}
          {unit && <span className="unit"> {unit}</span>}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={RESOLUTION}
        step={1}
        disabled={disabled}
        value={toPos(value)}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(Math.min(max, Math.max(min, fromPos(Number(e.target.value)))))}
      />
    </div>
  )
}

export function Toggle({ label, checked, hint, onChange }: { label: string; checked: boolean; hint?: string; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle" title={hint}>
      <span>
        {label}
        {hint && <span className="hint-dot" aria-hidden>?</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden>
        <span className="toggle-thumb" />
      </span>
    </label>
  )
}
