const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
}

const fixed = (v: number, digits: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })

/** 6.2 × 10⁻⁸ for very large/small numbers, plain otherwise. */
export function sci(v: number, digits = 2) {
  if (!Number.isFinite(v)) return '∞'
  if (v === 0) return '0'
  const exp = Math.floor(Math.log10(Math.abs(v)))
  if (exp >= -2 && exp < 5) return fixed(v, exp < 0 ? digits + 1 : digits)
  const mant = v / 10 ** exp
  const sup = String(exp).split('').map((c) => SUPERSCRIPT[c]).join('')
  return `${fixed(mant, digits)} × 10${sup}`
}

const AU = 1.496e11
const LY = 9.461e15

/** Picks km, AU or light-years for a length in metres. */
export function distance(m: number, units: { km: string; au: string }) {
  if (m < 1e3) return `${fixed(m, 1)} m`
  if (m < 0.05 * AU) return `${sci(m / 1e3)} ${units.km}`
  if (m < 0.1 * LY) return `${sci(m / AU)} ${units.au}`
  return `${sci(m / LY)} ly`
}
