import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { inspiralDuration, orbitalSpeed, separationAt } from '../merger'
import { getLab } from '../store'
import { runtime } from './runtime'

const RINGDOWN_TIME = 2.2
/** Samples of the wave per second kept for the chart and the grid's retarded time. */
export const WAVE_RATE = 60
const WAVE_SECONDS = 30

/** Ring buffers shared with the grid (retarded phase) and the waveform chart. */
export const wave = {
  h: new Float32Array(WAVE_RATE * WAVE_SECONDS),
  phase: new Float32Array(WAVE_RATE * WAVE_SECONDS),
  amp: new Float32Array(WAVE_RATE * WAVE_SECONDS),
  head: 0, // total samples written
  acc: 0,
  reset() {
    this.h.fill(0)
    this.phase.fill(0)
    this.amp.fill(0)
    this.head = 0
    this.acc = 0
  },
  /** Value `secondsAgo` in the past (0 when out of range). */
  at(buf: Float32Array, secondsAgo: number) {
    const back = Math.floor(secondsAgo * WAVE_RATE)
    if (back < 0 || back >= Math.min(this.head, buf.length)) return 0
    return buf[(this.head - 1 - back) % buf.length]
  },
}

export function MergerSim() {
  const sim = useRef({ run: -1, u: 0, phi: 0, t: 0, ringT: 0, endPhase: 0, endAmp: 0 })

  useEffect(() => {
    runtime.merger.active = true
    return () => {
      runtime.merger.active = false
    }
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const lab = getLab()
    const { m1, m2, separation } = lab.merger
    const M = m1 + m2
    const q1 = m1 / M
    const q2 = m2 / M
    const st = sim.current
    const m = runtime.merger

    if (lab.mergerRun !== st.run) {
      st.run = lab.mergerRun
      st.u = 0
      st.ringT = 0
      wave.reset()
    }

    let s = separation
    let amp = 0
    let h = 0
    const phase = lab.mergerPhase

    if (phase === 'idle' || phase === 'inspiral') {
      if (phase === 'inspiral') st.u = Math.min(1, st.u + dt / inspiralDuration(separation))
      s = separationAt(separation, phase === 'inspiral' ? st.u : 0)
      st.phi += orbitalSpeed(s) * dt
      m.q1 = q1
      m.q2 = q2
      m.spin = 0
      m.wobble = 0
      m.bh1 = [-q2 * s * Math.cos(st.phi), 0, -q2 * s * Math.sin(st.phi)]
      m.bh2 = [q1 * s * Math.cos(st.phi), 0, q1 * s * Math.sin(st.phi)]
      amp = phase === 'inspiral' ? Math.min(1, 2.4 / s) : 0
      h = amp * Math.cos(2 * st.phi)
      if (phase === 'inspiral' && st.u >= 1) {
        st.endPhase = 2 * st.phi
        st.endAmp = amp
        st.ringT = 0
        m.flash = 1.6
        lab.setMergerPhase('ringdown')
      }
    } else {
      // Remnant: a single, spinning hole that rings like a struck bell, then settles.
      const r = lab.mergerResult
      st.ringT += dt
      m.q1 = r.finalMass / M
      m.q2 = 0
      m.spin = r.finalSpin
      m.bh1 = [0, 0, 0]
      m.bh2 = [0, 0, 0]
      m.wobble = 0.14 * Math.exp(-st.ringT / 0.5) * Math.sin(st.ringT * 2 * Math.PI * 2.5)
      amp = st.endAmp * Math.exp(-st.ringT / 0.25)
      h = amp * Math.cos(st.endPhase + st.ringT * 2 * Math.PI * 3)
      if (phase === 'ringdown' && st.ringT > RINGDOWN_TIME) lab.setMergerPhase('done')
    }

    m.flash *= Math.exp(-dt * 2.2)

    // Record at a fixed rate for the chart and the grid ripples.
    if (phase === 'inspiral' || phase === 'ringdown') {
      wave.acc += dt * WAVE_RATE
      while (wave.acc >= 1) {
        const i = wave.head % wave.h.length
        wave.h[i] = h
        wave.phase[i] = phase === 'inspiral' ? 2 * st.phi : st.endPhase + st.ringT * 2 * Math.PI * 3
        wave.amp[i] = amp
        wave.head++
        wave.acc -= 1
      }
    }
  }, -1)

  return null
}
