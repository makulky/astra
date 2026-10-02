import * as THREE from 'three'
import { noiseGLSL } from './noise'

const sharedVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vNormalV;
varying vec3 vPosW;
void main() {
  vObj = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vNormalV = normalize(normalMatrix * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPosW = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const cloudFragment = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uCover;
uniform vec3 uCloudColor;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vNormalV;
varying vec3 vPosW;

${noiseGLSL}

void main() {
  vec3 p = normalize(vObj);
  // Latitude-stretched noise gives banded, wind-swept clouds.
  vec3 q = vec3(p.x, p.y * 1.6, p.z) * 2.4 + vec3(uTime * 0.015, 0.0, uSeed);
  q += 0.22 * vec3(snoise(q + 4.0), snoise(q + 9.0), snoise(q + 2.0));
  float n = fbm(q) * 0.5 + 0.5;
  // fBm values cluster around 0.5 (σ≈0.12): map coverage onto that distribution.
  float threshold = 0.5 - (uCover - 0.5) * 0.42;
  float a = smoothstep(threshold - 0.02, threshold + 0.07, n) * smoothstep(0.0, 0.08, uCover);
  float diff = smoothstep(-0.15, 0.6, dot(vNormalW, normalize(uLightDir)));
  vec3 col = uCloudColor * uLightColor * (0.03 + diff);
  gl_FragColor = vec4(col, a * 0.88);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const glowFragment = /* glsl */ `
uniform vec3 uAtmColor;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform float uDensity;
uniform float uShell; // outer radius / planet radius
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vNormalV;
varying vec3 vPosW;

void main() {
  // Back faces only: k = 0 at the outer edge of the shell, kMax at the planet's limb.
  float k = -vNormalV.z;
  float kMax = sqrt(max(1.0 - 1.0 / (uShell * uShell), 1e-4));
  float intensity = pow(clamp(k / kMax, 0.0, 1.0), 3.0);
  float day = smoothstep(-0.35, 0.45, dot(vNormalW, normalize(uLightDir)));
  vec3 col = uAtmColor * uLightColor * intensity * day * uDensity * 1.6;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function createCloudMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: sharedVertex,
    fragmentShader: cloudFragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: 1.7 },
      uCover: { value: 0.4 },
      uCloudColor: { value: new THREE.Color('#ffffff') },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
      uLightColor: { value: new THREE.Color('#ffffff') },
    },
  })
}

export function createGlowMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: sharedVertex,
    fragmentShader: glowFragment,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uAtmColor: { value: new THREE.Color('#5c9dff') },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
      uLightColor: { value: new THREE.Color('#ffffff') },
      uDensity: { value: 0.5 },
      uShell: { value: 1.08 },
    },
  })
}
