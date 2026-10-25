// Base entity: transform, velocity, radius.
import * as THREE from 'three';

let NEXT_ID = 1;

export class Entity {
  constructor(x, y, z) {
    this.id = NEXT_ID++;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.radius = 0.45;
    this.dead = false;
    this.rig = null;
    this.disposed = false;
  }

  syncRig() {
    if (this.rig) {
      this.rig.group.position.copy(this.pos);
      this.rig.group.rotation.y = this.yaw;
    }
  }

  dispose(game) {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rig) {
      game.engine.scene.remove(this.rig.group);
      this.rig.dispose();
    }
  }

  update(dt, game) {}
}
