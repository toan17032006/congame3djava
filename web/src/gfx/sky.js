// Sky v2: gradient + sun disc/halo + procedural fbm clouds + night stars,
// plus PMREM environment lighting (PBR reflections/ambient from the sky itself).
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
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform float cloudCover;   // 0..1
uniform float night;        // 0..1
uniform float time;
varying vec3 vDir;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += vnoise(p) * a; p = p * 2.13 + 17.3; a *= 0.5; }
  return v;
}
float starLayer(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float h = hash(i);
  if (h < 0.978) return 0.0;
  vec2 c = vec2(hash(i + 3.1), hash(i + 7.7));
  float d = length(f - c);
  return smoothstep(0.10, 0.0, d) * (0.4 + 0.6 * hash(i + 11.0));
}

void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(bottom, top, pow(h, 0.72));

  float sd = max(dot(dir, normalize(sunDir)), 0.0);
  // sun disc + tight glow + wide halo
  float disc = smoothstep(0.9993, 0.9997, sd);
  float glow = pow(sd, 900.0) * 0.9 + pow(sd, 40.0) * 0.22 + pow(sd, 6.0) * 0.10;
  sky += sunColor * (disc * 3.2 + glow) * (1.0 - night * 0.85);

  // clouds (projected on a virtual plane above, fade at horizon)
  vec2 cp = dir.xz / max(dir.y + 0.18, 0.06) * 0.30 + vec2(time * 0.006, time * 0.0023);
  float cf = fbm(cp * 1.6);
  float cd = fbm(cp * 3.7 + 40.0);
  float cover = smoothstep(1.0 - cloudCover, 1.0 - cloudCover + 0.42, cf * 0.72 + cd * 0.38);
  cover *= smoothstep(0.015, 0.16, dir.y);
  vec3 cloudLit = mix(vec3(1.0), sunColor, 0.35) * (0.62 + 0.5 * cd);
  vec3 cloudDark = mix(top, bottom, 0.5) * 0.55;
  vec3 cloud = mix(cloudDark, cloudLit, smoothstep(0.35, 0.75, cf));
  cloud = mix(cloud * 0.22, cloud, 1.0 - night * 0.75);
  sky = mix(sky, cloud, cover * 0.9);

  // stars at night, masked by clouds
  float st = 0.0;
  if (night > 0.05 && dir.y > 0.0) {
    vec2 sp = dir.xz / (dir.y + 0.35) * 34.0;
    st = (starLayer(sp) + starLayer(sp * 1.7 + 91.0) * 0.6) * night * (1.0 - cover) * smoothstep(0.02, 0.2, dir.y);
    st *= 0.75 + 0.25 * sin(time * 2.0 + hash(floor(sp)) * 40.0);
  }
  sky += vec3(0.85, 0.9, 1.0) * st;

  // moon at night (opposite-ish the sun)
  vec3 moonDir = normalize(vec3(-sunDir.x, max(sunDir.y, 0.35), -sunDir.z));
  float md = max(dot(dir, moonDir), 0.0);
  sky += vec3(0.75, 0.8, 0.95) * (smoothstep(0.9995, 0.9998, md) * 1.6 + pow(md, 300.0) * 0.35) * night;

  gl_FragColor = vec4(sky, 1.0);
}`;

export class Sky {
  constructor(engine) {
    this.engine = engine;
    const scene = engine.scene;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      uniforms: {
        top: { value: new THREE.Color(0x8fb8d8) }, bottom: { value: new THREE.Color(0xe8e0cc) },
        sunDir: { value: new THREE.Vector3(0.5, 0.7, 0.5) }, sunColor: { value: new THREE.Color(0xfff0d0) },
        cloudCover: { value: 0.45 }, night: { value: 0 }, time: { value: 0 },
      },
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(420, 28, 16), this.mat);
    this.dome.renderOrder = -999;
    scene.add(this.dome);

    // separate tiny scene (same material) rendered into a PMREM cubemap for env lighting
    this.envScene = new THREE.Scene();
    this.envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 14), this.mat);
    this.envScene.add(this.envDome);
    this.pmrem = new THREE.PMREMGenerator(engine.renderer);
    this._envRT = null;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1.0);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 140;
    this.sun.shadow.camera.left = -40; this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40; this.sun.shadow.camera.bottom = -40;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 4;
    scene.add(this.sun);
    scene.add(this.sun.target);
  }

  set(def) {
    const u = this.mat.uniforms;
    u.top.value.setHex(def.sky.top);
    u.bottom.value.setHex(def.sky.bottom);
    u.sunColor.value.setHex(def.light.sun);
    u.night.value = def.light.night ? 1 : 0;
    u.cloudCover.value = def.weather === 'rain' ? 0.85 : def.weather === 'fog' ? 0.6 : def.weather === 'embers' ? 0.55 : 0.42;

    this.scene_fog = this.engine.scene;
    this.scene_fog.fog = new THREE.FogExp2(def.sky.bottom, def.sky.fogDensity);
    this.hemi.color.setHex(def.light.ambient);
    this.hemi.intensity = def.light.ambientIntensity * (def.light.night ? 0.55 : 1);
    this.hemi.groundColor.setHex(def.palette.dirt);
    this.sun.color.setHex(def.light.sun);
    this.sun.intensity = def.light.sunIntensity * (def.light.night ? 1.4 : 1);
    this.engine.renderer.toneMappingExposure = def.light.night ? 0.92 : 1.06;

    const [az, el] = def.light.sunAngle;
    const d = 80;
    this.sunDir = new THREE.Vector3(Math.cos(az) * Math.cos(el * 0.5), Math.sin(el), Math.sin(az) * Math.cos(el * 0.5)).normalize();
    u.sunDir.value.copy(this.sunDir);
    this.sun.position.set(this.sunDir.x * d, this.sunDir.y * d, this.sunDir.z * d);

    // env lighting from this sky (reflections + ambient for PBR materials)
    if (this._envRT) this._envRT.dispose();
    this._envRT = this.pmrem.fromScene(this.envScene, 0.04, 1, 120);
    this.engine.scene.environment = this._envRT.texture;
    this.engine.scene.environmentIntensity = def.light.night ? 0.32 : 0.55;
  }

  update(playerPos) {
    this.mat.uniforms.time.value += 1 / 60;
    this.dome.position.set(playerPos.x, 0, playerPos.z);
    this.sun.target.position.set(playerPos.x, 0, playerPos.z);
    this.sun.position.set(playerPos.x + this.sunDir.x * 60, Math.max(18, this.sunDir.y * 60), playerPos.z + this.sunDir.z * 60);
    this.sun.target.updateMatrixWorld();
  }

  dispose() {
    this.dome.geometry.dispose(); this.envDome.geometry.dispose(); this.mat.dispose();
    this.pmrem.dispose();
    if (this._envRT) this._envRT.dispose();
  }
}
