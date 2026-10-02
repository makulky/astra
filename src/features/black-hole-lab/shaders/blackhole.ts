import * as THREE from 'three'
import { noiseGLSL } from '../../planet-lab/shaders/noise'

// Full-screen ray marcher. Each pixel's light ray is traced backwards from the camera
// through curved space-time (all lengths in rg = GM/c² of the reference mass).

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragment = /* glsl */ `
uniform vec3 uCamPos;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform float uScale;      // world units per rg
uniform float uTime;
uniform int uSteps;
uniform float uFar;

uniform vec3 uBH1;         // positions in rg
uniform float uM1;         // mass in units of the reference mass (0 = absent)
uniform float uSpin;
uniform float uWobble;     // ring-down oscillation of the horizon
uniform vec3 uBH2;
uniform float uM2;

uniform float uDiskOn;     // overall disk brightness (0 = no disk)
uniform float uRin;
uniform float uRout;
uniform float uDiskTemp;   // display colour temperature at the hottest radius (K)
uniform float uFlare;
uniform float uJet;
uniform float uFlash;
uniform float uAspect;

varying vec2 vUv;

${noiseGLSL}

vec3 blackbody(float t) {
  t = clamp(t, 1000.0, 40000.0) / 100.0;
  vec3 c;
  c.r = t <= 66.0 ? 1.0 : clamp(1.292936 * pow(t - 60.0, -0.1332047592), 0.0, 1.0);
  c.g = t <= 66.0 ? clamp(0.3900815788 * log(t) - 0.6318414438, 0.0, 1.0)
                  : clamp(1.129890861 * pow(t - 60.0, -0.0755148492), 0.0, 1.0);
  c.b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : clamp(0.5432067891 * log(t - 10.0) - 1.19625408914, 0.0, 1.0));
  return pow(c, vec3(2.2));
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

vec3 starLayer(vec3 d, float scale, float threshold, float gain) {
  vec3 q = d * scale;
  vec3 cell = floor(q);
  vec3 f = fract(q) - 0.5;
  float h = hash13(cell);
  if (h < threshold) return vec3(0.0);
  vec3 off = vec3(hash13(cell + 7.1), hash13(cell + 3.7), hash13(cell + 11.3)) - 0.5;
  float dist = length(f - off * 0.6);
  float b = pow(max(0.0, 1.0 - dist * 2.6), 8.0);
  float temp = mix(3200.0, 14000.0, hash13(cell + 1.9));
  return blackbody(temp) * b * gain * (0.3 + 0.7 * (h - threshold) / (1.0 - threshold));
}

vec3 background(vec3 d) {
  vec3 col = starLayer(d, 160.0, 0.982, 5.0) + starLayer(d, 380.0, 0.965, 1.6);
  // Galactic band
  vec3 n = normalize(vec3(0.25, 1.0, 0.35));
  float band = exp(-pow(dot(d, n) * 3.2, 2.0));
  float neb = fbm(d * 3.5) * 0.5 + 0.5;
  float dust = smoothstep(0.45, 0.75, fbm(d * 7.0 + 4.0) * 0.5 + 0.5);
  vec3 glow = mix(vec3(0.30, 0.24, 0.42), vec3(0.95, 0.72, 0.52), neb);
  col += glow * band * neb * neb * 0.22 * (1.0 - 0.7 * dust);
  return col;
}

// Thin accretion disk in the equatorial plane of hole 1. Returns premultiplied colour + alpha.
vec4 disk(vec3 x, float rr, vec3 rayDir) {
  float edge = smoothstep(uRin * 0.82, uRin * 1.02, rr) * (1.0 - smoothstep(uRout * 0.55, uRout, rr));
  if (edge <= 0.0) return vec4(0.0);
  float xr = max(rr / uRin, 1.0001);
  // Shakura–Sunyaev profile, normalised to 1 at its peak (r = 49/36 r_in)
  float prof = pow(xr, -0.75) * pow(max(1.0 - sqrt(1.0 / xr), 0.0), 0.25) / 0.488;
  prof = max(prof, 0.18 * smoothstep(uRin * 0.82, uRin, rr)); // glowing plunging region

  float vorb = clamp(inversesqrt(max(rr - 1.0, 0.4)), 0.0, 0.72);
  vec3 tang = normalize(vec3(-x.z, 0.0, x.x));
  float gamma = inversesqrt(1.0 - vorb * vorb);
  // Relativistic Doppler factor for light leaving towards the camera (−rayDir), times gravitational redshift.
  float D = 1.0 / (gamma * (1.0 - dot(tang * vorb, -rayDir)));
  float g = D * sqrt(max(1.0 - 2.0 / rr, 0.03));

  float ang = atan(x.z, x.x) + uTime * pow(rr, -1.5) * 22.0;
  vec3 np = vec3(cos(ang) * 2.2, sin(ang) * 2.2, rr * 0.55);
  float n = fbm(np) * 0.5 + 0.5;
  float rings = snoise(vec3(rr * 0.9, cos(ang) * 0.6, sin(ang) * 0.6)) * 0.5 + 0.5;
  float tex = mix(0.3, 1.4, n * n * 1.6) * mix(0.7, 1.2, rings);

  float temp = uDiskTemp * pow(prof, 0.6) * g;
  float intensity = prof * prof * pow(g, 3.5) * tex * uDiskOn * (1.0 + uFlare) * 0.9;
  vec3 c = blackbody(temp) * intensity;
  float alpha = edge * clamp((0.15 + 0.7 * tex * prof) * min(uDiskOn * 3.0, 1.0), 0.0, 0.9);
  return vec4(c * edge, alpha);
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 v = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 dir = normalize((uCamWorld * vec4(normalize(v.xyz / v.w), 0.0)).xyz);
  vec3 p = uCamPos / uScale;

  vec3 col = vec3(0.0);
  float trans = 1.0;
  bool captured = false;
  float rh1 = uM1 * (1.0 + sqrt(max(1.0 - uSpin * uSpin, 0.0))) * (1.0 + uWobble);
  float rh2 = uM2 * 2.0;
  vec3 J = vec3(0.0, uSpin * uM1 * uM1, 0.0);

  for (int i = 0; i < 600; i++) {
    if (i >= uSteps) break;
    vec3 d1 = p - uBH1;
    float r1 = length(d1);
    vec3 d2 = p - uBH2;
    float r2 = uM2 > 0.0 ? length(d2) : 1e5;
    if (r1 < rh1 || r2 < rh2) { captured = true; break; }

    float near = min(uM1 > 0.0 ? r1 : 1e5, r2);
    float h = clamp(0.07 * near, 0.012, 3.0);

    vec3 acc = vec3(0.0);
    if (uM1 > 0.0) {
      vec3 hv = cross(d1, dir);
      acc -= 3.0 * uM1 * dot(hv, hv) * d1 / pow(r1, 5.0);
      // Gravitomagnetic (frame-dragging) term — approximates the Kerr shadow asymmetry.
      vec3 rhat = d1 / r1;
      vec3 Bg = (3.0 * dot(J, rhat) * rhat - J) / (r1 * r1 * r1);
      acc += 2.0 * cross(dir, Bg);
    }
    if (uM2 > 0.0) {
      vec3 hv = cross(d2, dir);
      acc -= 3.0 * uM2 * dot(hv, hv) * d2 / pow(r2, 5.0);
    }

    vec3 prev = p;
    dir = normalize(dir + acc * h);
    p += dir * h;

    if (uDiskOn > 0.0005) {
      float y0 = prev.y - uBH1.y;
      float y1 = p.y - uBH1.y;
      if (y0 * y1 < 0.0) {
        vec3 x = mix(prev, p, y0 / (y0 - y1)) - uBH1;
        float rr = length(x.xz);
        if (rr < uRout) {
          vec4 dc = disk(x, rr, dir);
          col += trans * dc.rgb;
          trans *= 1.0 - dc.a;
          if (trans < 0.02) break;
        }
      }
    }

    if (uJet > 0.001) {
      vec3 q = p - uBH1;
      float ay = abs(q.y);
      if (ay > rh1 * 1.2 && ay < 90.0) {
        float w = 0.18 + 0.05 * ay;
        float rho = length(q.xz);
        float dens = exp(-rho * rho / (w * w)) * exp(-ay / 40.0) * smoothstep(rh1, rh1 * 3.0, ay);
        float knots = 0.55 + 0.45 * sin(ay * 0.55 - uTime * 7.0);
        col += trans * vec3(0.38, 0.52, 1.0) * dens * knots * uJet * h * 0.12;
      }
    }

    if (near > uFar && dot(dir, p - uBH1) > 0.0) break;
  }

  if (!captured) col += trans * background(dir);

  vec2 sc = vec2(ndc.x * uAspect, ndc.y);
  col += uFlash * vec3(1.0, 0.93, 0.85) * (exp(-length(sc) * 2.2) * 2.0 + 0.25);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function createBlackHoleMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uCamPos: { value: new THREE.Vector3() },
      uInvProj: { value: new THREE.Matrix4() },
      uCamWorld: { value: new THREE.Matrix4() },
      uScale: { value: 0.4 },
      uTime: { value: 0 },
      uSteps: { value: 220 },
      uFar: { value: 80 },
      uBH1: { value: new THREE.Vector3() },
      uM1: { value: 1 },
      uSpin: { value: 0 },
      uWobble: { value: 0 },
      uBH2: { value: new THREE.Vector3() },
      uM2: { value: 0 },
      uDiskOn: { value: 1 },
      uRin: { value: 6 },
      uRout: { value: 25 },
      uDiskTemp: { value: 8000 },
      uFlare: { value: 0 },
      uJet: { value: 0 },
      uFlash: { value: 0 },
      uAspect: { value: 1 },
    },
  })
}
