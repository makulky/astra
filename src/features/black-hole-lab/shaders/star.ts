import * as THREE from 'three'
import { noiseGLSL } from '../../planet-lab/shaders/noise'

const vertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalV;
void main() {
  vObj = position;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uBrightness;
uniform float uTurbulence;
varying vec3 vObj;
varying vec3 vNormalV;

${noiseGLSL}

void main() {
  vec3 p = normalize(vObj);
  float mu = max(dot(vNormalV, vec3(0.0, 0.0, 1.0)), 0.0);
  // Convection cells (granulation) slowly boiling, plus larger turbulent patches.
  float gran = fbm(p * 9.0 + vec3(0.0, uTime * 0.05, 0.0)) * 0.5 + 0.5;
  float spots = smoothstep(0.55, 0.8, fbm(p * 2.2 - uTime * 0.02) * 0.5 + 0.5);
  float tex = mix(0.75, 1.2, gran) * (1.0 - 0.35 * spots * uTurbulence);
  float limb = 0.35 + 0.65 * pow(mu, 0.5); // limb darkening
  vec3 col = uColor * tex * limb * uBrightness;
  col += uColor * pow(1.0 - mu, 3.0) * 0.6 * uBrightness;
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.4); // keep cool stars visibly orange
  col = max(col, 0.0);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function createStarMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uColor: { value: new THREE.Color('#ffffff') },
      uTime: { value: 0 },
      uBrightness: { value: 2 },
      uTurbulence: { value: 0 },
    },
  })
}
