import * as THREE from 'three'
import { noiseGLSL } from './noise'

const vertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vPosW;
void main() {
  vObj = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPosW = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragment = /* glsl */ `
uniform mat4 modelMatrix;
uniform float uSeed;
uniform float uSea;       // height threshold for oceans (-1 none, 2 everywhere)
uniform float uTemp;      // surface temperature (K)
uniform float uLiquid;    // share of water that is liquid
uniform float uFrozen;    // share of water that is frozen
uniform float uCap;       // |sin latitude| where polar caps begin
uniform float uVeg;       // vegetation amount
uniform float uLava;      // volcanic activity glow
uniform float uDry;       // aridity, pushes land towards rusty colours
uniform float uCraters;   // crater density (moons)
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAtmColor;
uniform float uAtmDensity;
varying vec3 vObj;
varying vec3 vPosW;

${noiseGLSL}

vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }

float height(vec3 p) {
  vec3 q = p * 1.5 + uSeed;
  q += 0.35 * vec3(snoise(q * 0.8 + 3.1), snoise(q * 0.8 + 7.7), snoise(q * 0.8 + 1.3));
  float h = fbm(q) * 0.5 + 0.5;
  if (uCraters > 0.0) {
    // cheap maria/basins: smooth depressions so the bump map stays clean
    float c = snoise(p * 3.5 + uSeed) * 0.6 + snoise(p * 9.0 - uSeed) * 0.4;
    h -= uCraters * 0.08 * smoothstep(0.2, 0.7, c);
  }
  return h;
}

void main() {
  vec3 p = normalize(vObj);
  float h = height(p);

  // Bump mapping from the height field (finite differences on the tangent plane).
  vec3 up = abs(p.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(p, up));
  vec3 t2 = cross(p, t1);
  float e = 0.004;
  float hx = height(normalize(p + t1 * e));
  float hy = height(normalize(p + t2 * e));
  float land = smoothstep(uSea - 0.004, uSea + 0.004, h);
  float elev = max(h - uSea, 0.0);
  vec3 grad = ((hx - h) * t1 + (hy - h) * t2) / e;
  vec3 nObj = normalize(p - grad * 0.06 * (0.25 + 0.75 * land));

  mat3 m = mat3(modelMatrix);
  vec3 N = normalize(m * nObj);
  vec3 S = normalize(m * p);
  float lat = abs(p.y);

  float detail = snoise(p * 14.0 + uSeed) * 0.5 + 0.5;
  float patchN = snoise(p * 3.3 - uSeed) * 0.5 + 0.5;

  // ---- Land palette driven by temperature and aridity ----
  float hot = smoothstep(305.0, 360.0, uTemp);
  float scorch = smoothstep(420.0, 700.0, uTemp);
  vec3 rock = mix(vec3(0.36, 0.33, 0.30), vec3(0.52, 0.48, 0.43), detail);
  vec3 rust = mix(vec3(0.55, 0.27, 0.14), vec3(0.74, 0.44, 0.26), detail);
  vec3 sand = mix(vec3(0.74, 0.58, 0.36), vec3(0.88, 0.74, 0.52), detail);
  vec3 green = mix(vec3(0.08, 0.24, 0.07), vec3(0.24, 0.40, 0.13), detail);
  vec3 basalt = mix(vec3(0.17, 0.14, 0.12), vec3(0.30, 0.24, 0.19), detail);

  vec3 landCol = mix(rock, rust, uDry);
  landCol = mix(landCol, sand, hot * (1.0 - scorch) * 0.8);
  float vegMask = uVeg * (1.0 - smoothstep(0.08, 0.2, elev)) * smoothstep(0.3, 0.6, patchN + 0.25 * (1.0 - lat));
  landCol = mix(landCol, green, vegMask);
  landCol = mix(landCol, basalt, scorch);
  float snowLine = clamp((uTemp - 240.0) / 60.0, 0.0, 2.0) * 0.2;
  float snow = smoothstep(snowLine, snowLine + 0.03, elev) * (1.0 - hot) * (1.0 - uDry);
  landCol = mix(landCol, vec3(0.92, 0.94, 0.97), snow);

  // ---- Oceans: liquid, frozen or evaporated (salt flats) ----
  float depth = clamp((uSea - h) * 7.0, 0.0, 1.0);
  vec3 oceanLiquid = mix(vec3(0.06, 0.36, 0.56), vec3(0.01, 0.06, 0.20), depth);
  vec3 oceanIce = mix(vec3(0.78, 0.86, 0.94), vec3(0.62, 0.76, 0.90), detail);
  vec3 seabed = mix(landCol * 0.8, vec3(0.80, 0.76, 0.68), 0.35);
  float boiled = clamp(1.0 - uLiquid - uFrozen, 0.0, 1.0);
  vec3 oceanCol = oceanLiquid * uLiquid + oceanIce * uFrozen + seabed * boiled;

  vec3 col = mix(oceanCol, landCol, land);

  // ---- Polar caps ----
  float ice = smoothstep(uCap - 0.03, uCap + 0.03, lat + snoise(p * 4.0 + uSeed) * 0.07);
  col = mix(col, vec3(0.93, 0.95, 0.98), ice);
  col = srgb(col);

  // ---- Lighting ----
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(cameraPosition - vPosW);
  float ndl = dot(N, L);
  float diff = max(ndl, 0.0);
  float oceanMask = (1.0 - land) * uLiquid * (1.0 - ice);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(S, H), 0.0), 70.0) * oceanMask * 0.7 * step(0.0, dot(S, L));
  vec3 lit = col * uLightColor * diff + uLightColor * spec + col * 0.012;

  // ---- Lava cracks (glow strongest on the night side) ----
  float crack = 1.0 - smoothstep(0.0, 0.06, abs(snoise(p * 5.0 + uSeed * 0.7)));
  float lavaMask = uLava * crack;
  lit += vec3(1.0, 0.28, 0.04) * 1.8 * lavaMask * (0.35 + 0.65 * (1.0 - diff));

  // ---- Atmospheric haze on the limb ----
  float fres = pow(1.0 - max(dot(S, V), 0.0), 2.5);
  float dayside = smoothstep(-0.25, 0.4, dot(S, L));
  lit = mix(lit, uAtmColor * uLightColor * dayside, clamp(fres * uAtmDensity, 0.0, 0.85));
  lit += uAtmColor * uLightColor * dayside * uAtmDensity * 0.04;

  gl_FragColor = vec4(lit, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export interface PlanetUniforms {
  [key: string]: THREE.IUniform
  uSeed: THREE.IUniform<number>
  uSea: THREE.IUniform<number>
  uTemp: THREE.IUniform<number>
  uLiquid: THREE.IUniform<number>
  uFrozen: THREE.IUniform<number>
  uCap: THREE.IUniform<number>
  uVeg: THREE.IUniform<number>
  uLava: THREE.IUniform<number>
  uDry: THREE.IUniform<number>
  uCraters: THREE.IUniform<number>
  uLightDir: THREE.IUniform<THREE.Vector3>
  uLightColor: THREE.IUniform<THREE.Color>
  uAtmColor: THREE.IUniform<THREE.Color>
  uAtmDensity: THREE.IUniform<number>
}

export function createPlanetMaterial(init: Partial<Record<string, number>> = {}) {
  const uniforms: PlanetUniforms = {
    uSeed: { value: 1.7 },
    uSea: { value: 0.5 },
    uTemp: { value: 288 },
    uLiquid: { value: 1 },
    uFrozen: { value: 0 },
    uCap: { value: 0.85 },
    uVeg: { value: 0.8 },
    uLava: { value: 0 },
    uDry: { value: 0.2 },
    uCraters: { value: 0 },
    uLightDir: { value: new THREE.Vector3(1, 0, 0) },
    uLightColor: { value: new THREE.Color('#ffffff') },
    uAtmColor: { value: new THREE.Color('#5c9dff') },
    uAtmDensity: { value: 0.5 },
  }
  for (const [k, v] of Object.entries(init)) if (v !== undefined) uniforms[k].value = v
  return new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms })
}
