// Sky dome (gradient shader), sun/moon sprite, stars, fog + lighting rig.
import * as THREE from 'three';

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const SKY_FRAG = `
uniform vec3 top;
uniform vec3 bottom;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 c = mix(bottom, top, pow(h, 0.75));
  gl_FragColor = vec4(c, 1.0);
}`;

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(400, 20, 12),
      new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: {
        top: { value: new THREE.Color(0x8fb8d8) }, bottom: { value: new THREE.Color(0xe8e0cc) },
      }, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.dome.renderOrder = -999;
    scene.add(this.dome);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1.0);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 120;
    this.sun.shadow.camera.left = -38; this.sun.shadow.camera.right = 38;
    this.sun.shadow.camera.top = 38; this.sun.shadow.camera.bottom = -38;
    this.sun.shadow.bias = -0.0015;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // stars for night regions
    const starGeo = new THREE.BufferGeometry();
    const n = 300;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.5;
      arr[i * 3] = Math.cos(th) * Math.cos(ph) * 380;
      arr[i * 3 + 1] = Math.sin(ph) * 380 + 30;
      arr[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * 380;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0 }));
    this.stars.frustumCulled = false;
    scene.add(this.stars);
    this.sunSprite = null;
  }

  set(def) {
    const u = this.dome.material.uniforms;
    u.top.value.setHex(def.sky.top);
    u.bottom.value.setHex(def.sky.bottom);
    this.scene.fog = new THREE.FogExp2(def.sky.bottom, def.sky.fogDensity);
    this.scene.background = null;
    this.hemi.color.setHex(def.light.ambient);
    this.hemi.intensity = def.light.ambientIntensity;
    this.hemi.groundColor.setHex(def.palette.dirt);
    this.sun.color.setHex(def.light.sun);
    this.sun.intensity = def.light.sunIntensity;
    const [az, el] = def.light.sunAngle;
    const d = 80;
    this.sun.position.set(Math.cos(az) * d, Math.sin(el) * d, Math.sin(az) * d);
    this.stars.material.opacity = def.light.night ? 0.85 : 0;
  }

  update(playerPos) {
    this.dome.position.set(playerPos.x, 0, playerPos.z);
    this.stars.position.set(playerPos.x, 0, playerPos.z);
    this.sun.target.position.set(playerPos.x, 0, playerPos.z);
    this.sun.position.set(playerPos.x + Math.cos(1.0) * 60, Math.sin(1.2) * 70, playerPos.z + Math.sin(1.0) * 60);
    this.sun.target.updateMatrixWorld();
  }

  dispose() {
    this.dome.geometry.dispose(); this.dome.material.dispose();
    this.stars.geometry.dispose(); this.stars.material.dispose();
  }
}
