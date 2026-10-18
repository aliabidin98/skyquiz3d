import * as THREE from 'three';
import { Question } from '../types/game';
import { createAnswerGateTexture } from './textures';

export interface GateItem {
  index: number;
  letter: string;
  text: string;
  isCorrect: boolean;
  group: THREE.Group;
  archMesh: THREE.Mesh;
  signMesh: THREE.Mesh;
  beaconLight: THREE.PointLight;
  position: THREE.Vector3;
  radius: number; // For collision detection
  passed: boolean;
}

export class QuestionGateSet {
  public group: THREE.Group;
  public gates: GateItem[] = [];
  public question: Question;
  public spawnZ: number;
  public isResolved: boolean = false;
  public selectedGateIndex: number | null = null;

  constructor(scene: THREE.Scene, question: Question, spawnZ: number) {
    this.question = question;
    this.spawnZ = spawnZ;
    this.group = new THREE.Group();
    this.group.name = `GateSet_${question.id}`;
    scene.add(this.group);

    this.createGates();
  }

  private createGates() {
    const letters = ['A', 'B', 'C', 'D'];
    const count = this.question.options.length;

    // Spacing configuration for clear flight paths
    // For 3 options: x = -10, 0, 10
    // For 4 options: x = -15, -5, 5, 15
    const spacing = count === 4 ? 10.5 : 11.5;
    const startX = -((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const isCorrect = i === this.question.correctIndex;
      const letter = letters[i];
      const text = this.question.options[i];
      const posX = startX + i * spacing;
      const posY = 1.0; // comfortable flight altitude
      const posZ = this.spawnZ;

      const gateGroup = new THREE.Group();
      gateGroup.position.set(posX, posY, posZ);

      // 1. Round Archway Portal Ring (Gerbang Bulat)
      const ringRadius = 3.8;
      const tubeRadius = 0.32;
      const ringGeom = new THREE.TorusGeometry(ringRadius, tubeRadius, 20, 40);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.85,
      });
      const archMesh = new THREE.Mesh(ringGeom, ringMat);
      archMesh.castShadow = true;
      gateGroup.add(archMesh);

      // Inner translucent energy membrane inside the round ring portal
      const shieldGeom = new THREE.CircleGeometry(ringRadius - 0.2, 32);
      const shieldMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      });
      const shield = new THREE.Mesh(shieldGeom, shieldMat);
      gateGroup.add(shield);

      // Support pylons
      const pylonGeom = new THREE.CylinderGeometry(0.2, 0.26, 10, 16);
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });

      const leftPylon = new THREE.Mesh(pylonGeom, pylonMat);
      leftPylon.position.set(-ringRadius - 0.2, -1.8, 0);
      gateGroup.add(leftPylon);

      const rightPylon = new THREE.Mesh(pylonGeom, pylonMat);
      rightPylon.position.set(ringRadius + 0.2, -1.8, 0);
      gateGroup.add(rightPylon);

      // 2. Procedural Gate Badge Signboard directly above the round ring
      const signTex = createAnswerGateTexture(letter, '', 'normal');
      const signGeom = new THREE.PlaneGeometry(4.2, 2.1);
      const signMat = new THREE.MeshBasicMaterial({
        map: signTex,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const signMesh = new THREE.Mesh(signGeom, signMat);
      signMesh.position.set(0, ringRadius + 1.6, 0);
      gateGroup.add(signMesh);

      // 3. Ambient Beacon Light in the portal
      const beaconLight = new THREE.PointLight(0x38bdf8, 1.4, 16);
      beaconLight.position.set(0, 0, 0);
      gateGroup.add(beaconLight);

      // 4. Subtle holographic beam going upwards to help align flight path from afar
      const beamGeom = new THREE.CylinderGeometry(0.08, 0.6, 24, 8, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.set(0, 12, 0);
      gateGroup.add(beam);

      this.group.add(gateGroup);

      this.gates.push({
        index: i,
        letter,
        text,
        isCorrect,
        group: gateGroup,
        archMesh,
        signMesh,
        beaconLight,
        position: new THREE.Vector3(posX, posY, posZ),
        radius: ringRadius, // Round gate collision radius
        passed: false,
      });
    }
  }

  public update(delta: number, playerPos: THREE.Vector3): { answered: boolean; isCorrect: boolean; gateIndex: number } | null {
    // Gentle pulse animation on rings
    const time = Date.now() * 0.003;
    this.gates.forEach((gate, idx) => {
      if (!this.isResolved) {
        gate.archMesh.rotation.z = Math.sin(time + idx * 0.7) * 0.08;
      }
    });

    if (this.isResolved) return null;

    // In Three.js flight along -Z:
    // When plane is before the gate: playerPos.z > this.spawnZ
    // When plane reaches and penetrates through: playerPos.z <= this.spawnZ
    // distanceRemaining > 0 means still approaching
    const distanceRemaining = playerPos.z - this.spawnZ;

    // Check if the airplane has reached and is actively piercing through the gate plane:
    // Nose touches at distanceRemaining <= 0.8, center pierces through up to -3.8
    if (distanceRemaining <= 0.8 && distanceRemaining >= -3.8) {
      // Find the closest gate to the plane's (x, y) coordinates
      let closestGate: GateItem = this.gates[0];
      let minDistance = Infinity;

      this.gates.forEach((gate) => {
        const dx = playerPos.x - gate.position.x;
        const dy = playerPos.y - gate.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDistance) {
          minDistance = dist;
          closestGate = gate;
        }
      });

      // Airplane penetrates the chosen gate!
      this.resolveGate(closestGate);
      return {
        answered: true,
        isCorrect: closestGate.isCorrect,
        gateIndex: closestGate.index,
      };
    }

    // Fallback: If player flew completely past without triggering earlier
    if (distanceRemaining < -4.0 && !this.isResolved) {
      let closestGate = this.gates[0];
      let minDistance = Infinity;
      this.gates.forEach((gate) => {
        const dx = Math.abs(playerPos.x - gate.position.x);
        if (dx < minDistance) {
          minDistance = dx;
          closestGate = gate;
        }
      });
      this.resolveGate(closestGate);
      return {
        answered: true,
        isCorrect: closestGate.isCorrect,
        gateIndex: closestGate.index,
      };
    }

    return null;
  }

  public resolveGate(chosenGate: GateItem) {
    this.isResolved = true;
    this.selectedGateIndex = chosenGate.index;

    this.gates.forEach((gate) => {
      if (gate.index === chosenGate.index) {
        if (gate.isCorrect) {
          // Success styling
          (gate.archMesh.material as THREE.MeshStandardMaterial).color.setHex(0x10b981);
          (gate.archMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x059669);
          (gate.archMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
          gate.beaconLight.color.setHex(0x10b981);
          gate.beaconLight.intensity = 3.0;

          // Replace signboard texture with correct theme
          const newTex = createAnswerGateTexture(gate.letter, gate.text, 'correct');
          (gate.signMesh.material as THREE.MeshBasicMaterial).map = newTex;
          (gate.signMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
        } else {
          // Wrong styling
          (gate.archMesh.material as THREE.MeshStandardMaterial).color.setHex(0xef4444);
          (gate.archMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xb91c1c);
          (gate.archMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
          gate.beaconLight.color.setHex(0xef4444);

          const newTex = createAnswerGateTexture(gate.letter, gate.text, 'wrong');
          (gate.signMesh.material as THREE.MeshBasicMaterial).map = newTex;
          (gate.signMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
      } else if (gate.isCorrect) {
        // Highlight correct gate in green so student learns
        (gate.archMesh.material as THREE.MeshStandardMaterial).color.setHex(0x10b981);
        (gate.archMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x059669);
        (gate.archMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
        const newTex = createAnswerGateTexture(gate.letter, gate.text, 'correct');
        (gate.signMesh.material as THREE.MeshBasicMaterial).map = newTex;
        (gate.signMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
      } else {
        // Dim unselected wrong gates
        (gate.archMesh.material as THREE.MeshStandardMaterial).color.setHex(0x475569);
        (gate.archMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      }
    });
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.gates.forEach((gate) => {
      gate.archMesh.geometry.dispose();
      (gate.archMesh.material as THREE.Material).dispose();
      gate.signMesh.geometry.dispose();
      const signMat = gate.signMesh.material as THREE.MeshBasicMaterial;
      if (signMat.map) signMat.map.dispose();
      signMat.dispose();
    });
  }
}
