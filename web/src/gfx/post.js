// Cinematic grading pass: split-tone (cool shadows / warm highlights), saturation,
// contrast, gentle vignette, optional film grain. Runs in linear space, before OutputPass.
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export const GradingShader = {
  name: 'GradingShader',
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.34 },
    uSaturation: { value: 1.07 },
    uContrast: { value: 1.045 },
    uGrain: { value: 0.0 },
    uTime: { value: 0 },
    uResolution: { value: [1920, 1080] },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uGrain;
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      // split tone, kept subtle so gameplay signals stay readable
      vec3 tint = mix(vec3(0.965, 1.0, 1.055), vec3(1.045, 1.0, 0.945), smoothstep(0.1, 0.7, lum));
      c.rgb *= tint;
      c.rgb = mix(vec3(lum), c.rgb, uSaturation);
      c.rgb = (c.rgb - 0.18) * uContrast + 0.18;
      // vignette (radial falloff, corners only)
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - uVignette * dot(d, d) * 1.9;
      // film grain, weighted toward shadows
      if (uGrain > 0.001) {
        float g = (hash(vUv * uResolution + fract(uTime * 0.731) * 1731.0) - 0.5) * uGrain;
        c.rgb += g * (0.35 + 0.65 * (1.0 - smoothstep(0.0, 0.6, lum)));
      }
      gl_FragColor = c;
    }`,
};

export function createGradingPass() {
  return new ShaderPass(GradingShader);
}
