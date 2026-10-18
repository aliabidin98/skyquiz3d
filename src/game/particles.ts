import * as THREE from 'three';
import { createGlowParticleTexture } from './textures';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  alpha: number;
}

export class ParticleSystem {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private pointsMesh: THREE.Points;
  private geom: THREE.BufferGeometry;
  private posAttr: THREE.BufferAttribute;
  private colAttr: THREE.BufferAttribute;
  private maxParticles = 600;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'ParticleSystem';
    scene.add(this.group);

    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);

    this.geom = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    this.colAttr = new THREE.BufferAttribute(colors, 3);
    this.geom.setAttribute('position', this.posAttr);
    this.geom.setAttribute('color', this.colAttr);

    const texture = createGlowParticleTexture();
    const material = new THREE.PointsMaterial({
      size: 1.8,
      map: texture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.geom, material);
    this.group.add(this.pointsMesh);
  }

  public emitTrail(leftTip: THREE.Vector3, rightTip: THREE.Vector3) {
    if (this.particles.length >= this.maxParticles - 4) return;

    const trailCol = new THREE.Color(0xffffff);

    // Left wingtip
    this.particles.push({
      pos: leftTip.clone(),
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, 0.4),
      life: 0,
      maxLife: 0.8,
      size: 0.9,
      color: trailCol.clone(),
      alpha: 0.6,
    });

    // Right wingtip
    this.particles.push({
      pos: rightTip.clone(),
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, 0.4),
      life: 0,
      maxLife: 0.8,
      size: 0.9,
      color: trailCol.clone(),
      alpha: 0.6,
    });
  }

  public emitGateBurst(center: THREE.Vector3, isCorrect: boolean) {
    const count = 45;
    const baseColor = isCorrect ? new THREE.Color(0x34d399) : new THREE.Color(0xf87171);
    const goldColor = new THREE.Color(0xfde047);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 6
      );

      this.particles.push({
        pos: center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0)),
        vel,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.6,
        size: 1.6 + Math.random() * 1.5,
        color: isCorrect && Math.random() > 0.5 ? goldColor.clone() : baseColor.clone(),
        alpha: 1.0,
      });
    }
  }

  public update(delta: number) {
    const pos = this.posAttr.array as Float32Array;
    const col = this.colAttr.array as Float32Array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.pos.addScaledVector(p.vel, delta);
      p.vel.multiplyScalar(0.96); // drag

      const fade = 1 - p.life / p.maxLife;

      const idx = i * 3;
      pos[idx] = p.pos.x;
      pos[idx + 1] = p.pos.y;
      pos[idx + 2] = p.pos.z;

      col[idx] = p.color.r * fade;
      col[idx + 1] = p.color.g * fade;
      col[idx + 2] = p.color.b * fade;
    }

    // Zero out unused slots
    for (let i = this.particles.length; i < this.maxParticles; i++) {
      const idx = i * 3;
      pos[idx] = 0;
      pos[idx + 1] = 0;
      pos[idx + 2] = 0;
      col[idx] = 0;
      col[idx + 1] = 0;
      col[idx + 2] = 0;
    }

    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }
}
