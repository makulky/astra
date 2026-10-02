import * as THREE from 'three'

/** Approximate sRGB colour of a black body at temperature T (K), returned as a linear THREE.Color. */
export function blackbodyColor(temp: number, target = new THREE.Color()) {
  const t = Math.min(40000, Math.max(1000, temp)) / 100
  const r = t <= 66 ? 1 : Math.min(1, Math.max(0, 1.292936 * (t - 60) ** -0.1332047592))
  const g =
    t <= 66
      ? Math.min(1, Math.max(0, 0.3900815788 * Math.log(t) - 0.6318414438))
      : Math.min(1, Math.max(0, 1.129890861 * (t - 60) ** -0.0755148492))
  const b = t >= 66 ? 1 : t <= 19 ? 0 : Math.min(1, Math.max(0, 0.5432067891 * Math.log(t - 10) - 1.19625408914))
  return target.setRGB(r, g, b, THREE.SRGBColorSpace)
}
