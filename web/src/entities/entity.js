// Base entity: framework BaseEntity + Vector3 của three.js + rig sync.
// Hỗ trợ component runtime: entity.addComponent(new BaseComponent-derived()).
import * as THREE from 'three';
import { BaseEntity } from '../framework/core/entity.js';

export class Entity extends BaseEntity {
  constructor(x, y, z) {
    super(x, y, z, { vec3: (vx, vy, vz) => new THREE.Vector3(vx, vy, vz) });
    this.radius = 0.45;
    this.dead = false;
    this.rig = null;
  }

  syncRig() {
    if (this.rig) {
      this.rig.group.position.copy(this.pos);
      this.rig.group.rotation.y = this.yaw;
    }
  }

  onDispose(game) {
    if (this.rig) {
      game.engine.scene.remove(this.rig.group);
      this.rig.dispose();
    }
  }

  update(dt, game) {
    super.update(dt, game); // component system + onUpdate hook
  }
}
