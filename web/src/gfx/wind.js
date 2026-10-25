// Shared wind uniform + material factory that injects vertex sway (works with InstancedMesh).
import * as THREE from 'three';

export const WIND = { uTime: { value: 0 } };
const _mats = [];

export function makeSwayMaterial(params, { amp = 0.05, freq = 1.6, heightRef = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial(params);
  const uAmp = { value: amp }, uFreq = { value: freq }, uHRef = { value: heightRef };
  m.userData.windUniforms = { uAmp, uFreq, uHRef };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = WIND.uTime;
    shader.uniforms.uAmp = uAmp;
    shader.uniforms.uFreq = uFreq;
    shader.uniforms.uHRef = uHRef;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uAmp;\nuniform float uFreq;\nuniform float uHRef;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float swayPh = position.y * 1.35;
          #ifdef USE_INSTANCING
            swayPh += instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.43;
          #endif
          float swayF = pow(max(position.y, 0.0) / max(uHRef, 0.001), 1.5);
          swayF = min(swayF, 1.0);
          transformed.x += sin(uTime * uFreq + swayPh) * uAmp * swayF;
          transformed.z += cos(uTime * uFreq * 0.83 + swayPh * 1.21) * uAmp * 0.72 * swayF;
        }`);
  };
  _mats.push(m);
  return m;
}

export function disposeSwayMaterials() {
  for (const m of _mats) m.dispose();
  _mats.length = 0;
}
