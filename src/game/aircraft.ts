import * as THREE from 'three';

export type AircraftType = 'PROPELLER' | 'JET' | 'HELICOPTER' | 'SPACESHIP';

export interface AircraftInfo {
  id: AircraftType;
  name: string;
  tagline: string;
  icon: string;
  colorHex: string;
}

export const AIRCRAFT_MODELS: AircraftInfo[] = [
  {
    id: 'PROPELLER',
    name: 'Pesawat Baling-Baling',
    tagline: 'Pesawat klasik lincah dengan baling-baling berputar',
    icon: 'Plane',
    colorHex: '#ef4444',
  },
  {
    id: 'JET',
    name: 'Pesawat Jet Supersonic',
    tagline: 'Jet tempur gesit dengan sayap delta & afterburner',
    icon: 'Rocket',
    colorHex: '#0284c7',
  },
  {
    id: 'HELICOPTER',
    name: 'Helikopter Penjelajah',
    tagline: 'Helikopter stabil dengan baling-baling atas & ekor',
    icon: 'Compass',
    colorHex: '#f59e0b',
  },
  {
    id: 'SPACESHIP',
    name: 'Pesawat Luar Angkasa',
    tagline: 'Wahana antariksa futuristik dengan mesin ion',
    icon: 'Sparkles',
    colorHex: '#8b5cf6',
  },
];

export class Aircraft {
  public mesh: THREE.Group;
  public currentType: AircraftType = 'PROPELLER';
  public wingLeftTip: THREE.Vector3 = new THREE.Vector3(-2.3, 0.1, -0.2);
  public wingRightTip: THREE.Vector3 = new THREE.Vector3(2.3, 0.1, -0.2);

  // Rotating parts
  private frontPropeller: THREE.Group | null = null;
  private mainRotor: THREE.Group | null = null;
  private tailRotor: THREE.Group | null = null;
  private jetAfterburners: THREE.Mesh[] = [];

  constructor(type: AircraftType = 'PROPELLER') {
    this.mesh = new THREE.Group();
    this.mesh.name = 'Aircraft';
    this.setAircraftType(type);
  }

  public setAircraftType(type: AircraftType) {
    this.currentType = type;

    // Clear existing children
    while (this.mesh.children.length > 0) {
      const child = this.mesh.children[0];
      this.mesh.remove(child);
    }
    this.frontPropeller = null;
    this.mainRotor = null;
    this.tailRotor = null;
    this.jetAfterburners = [];

    switch (type) {
      case 'PROPELLER':
        this.buildPropellerPlane();
        break;
      case 'JET':
        this.buildJetFighter();
        break;
      case 'HELICOPTER':
        this.buildHelicopter();
        break;
      case 'SPACESHIP':
        this.buildSpaceShip();
        break;
    }
  }

  // 1. Model: Pesawat Baling-Baling Klasik (Propeller Airplane)
  private buildPropellerPlane() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.15 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45, metalness: 0.1 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.2 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transmission: 0.85, roughness: 0.05, transparent: true, opacity: 0.9 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.15 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });

    const group = new THREE.Group();

    // Fuselage
    const fuseGeom = new THREE.CylinderGeometry(0.55, 0.3, 2.8, 16);
    fuseGeom.rotateX(Math.PI / 2);
    const fuse = new THREE.Mesh(fuseGeom, bodyMat);
    fuse.castShadow = true;
    group.add(fuse);

    // Nose
    const noseGeom = new THREE.ConeGeometry(0.55, 0.8, 16);
    noseGeom.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeom, trimMat);
    nose.position.z = -1.8;
    group.add(nose);

    // Bubble Canopy
    const canopyGeom = new THREE.SphereGeometry(0.5, 16, 16);
    canopyGeom.scale(0.85, 0.75, 1.4);
    const canopy = new THREE.Mesh(canopyGeom, glassMat);
    canopy.position.set(0, 0.42, -0.3);
    group.add(canopy);

    // Wings
    const wingGeom = new THREE.BoxGeometry(4.6, 0.1, 0.9);
    const wings = new THREE.Mesh(wingGeom, wingMat);
    wings.position.set(0, 0.1, -0.2);
    wings.castShadow = true;
    group.add(wings);

    // Wingtips with beacons
    [-2.3, 2.3].forEach((wx, i) => {
      const tipGeom = new THREE.BoxGeometry(0.25, 0.14, 0.92);
      const tip = new THREE.Mesh(tipGeom, trimMat);
      tip.position.set(wx, 0.1, -0.2);
      group.add(tip);

      const beaconGeom = new THREE.SphereGeometry(0.06, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0xff0044 : 0x00ff88 });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.set(wx + (i === 0 ? -0.15 : 0.15), 0.1, -0.2);
      group.add(beacon);
    });

    // Tail fin
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 1.1);
    finShape.lineTo(0.5, 1.0);
    finShape.lineTo(0.9, 0);
    finShape.closePath();
    const tailFinGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    tailFinGeom.rotateY(Math.PI / 2);
    const tailFin = new THREE.Mesh(tailFinGeom, wingMat);
    tailFin.position.set(-0.04, 0.25, 1.0);
    group.add(tailFin);

    // Horizontal stabilizer
    const hTailGeom = new THREE.BoxGeometry(1.6, 0.08, 0.5);
    const hTail = new THREE.Mesh(hTailGeom, wingMat);
    hTail.position.set(0, 0.3, 1.3);
    group.add(hTail);

    // Landing gear wheels
    [-0.7, 0.7].forEach((gx) => {
      const wheelGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12);
      wheelGeom.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeom, rubberMat);
      wheel.position.set(gx, -0.6, -0.1);
      group.add(wheel);

      const strutGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
      const strut = new THREE.Mesh(strutGeom, chromeMat);
      strut.position.set(gx * 0.8, -0.35, -0.1);
      group.add(strut);
    });

    // Propeller
    this.frontPropeller = new THREE.Group();
    this.frontPropeller.position.set(0, 0, -2.25);
    const spinnerGeom = new THREE.ConeGeometry(0.2, 0.38, 16);
    spinnerGeom.rotateX(-Math.PI / 2);
    const spinner = new THREE.Mesh(spinnerGeom, chromeMat);
    this.frontPropeller.add(spinner);

    const bladeGeom = new THREE.BoxGeometry(0.12, 0.95, 0.03);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.8 });
    for (let i = 0; i < 3; i++) {
      const bHolder = new THREE.Group();
      bHolder.rotation.z = (i * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(bladeGeom, bladeMat);
      blade.position.y = 0.45;
      bHolder.add(blade);
      this.frontPropeller.add(bHolder);
    }
    group.add(this.frontPropeller);

    this.wingLeftTip.set(-2.3, 0.1, -0.2);
    this.wingRightTip.set(2.3, 0.1, -0.2);
    this.mesh.add(group);
  }

  // 2. Model: Pesawat Jet Tempur Supersonic (Supersonic Fighter Jet)
  private buildJetFighter() {
    const jetBodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.4 });
    const jetWingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 });
    const canopyMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, transmission: 0.85, roughness: 0.1, transparent: true, opacity: 0.85 });
    const exhaustMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const group = new THREE.Group();

    // Streamlined needle fuselage
    const noseGeom = new THREE.ConeGeometry(0.48, 1.6, 16);
    noseGeom.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeom, jetBodyMat);
    nose.position.z = -1.8;
    group.add(nose);

    const bodyGeom = new THREE.CylinderGeometry(0.48, 0.52, 2.6, 16);
    bodyGeom.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, jetBodyMat);
    body.position.z = 0.2;
    group.add(body);

    // Jet cockpit canopy (tinted golden amber)
    const cockpitGeom = new THREE.SphereGeometry(0.4, 16, 16);
    cockpitGeom.scale(0.7, 0.65, 1.6);
    const cockpit = new THREE.Mesh(cockpitGeom, canopyMat);
    cockpit.position.set(0, 0.38, -0.6);
    group.add(cockpit);

    // Delta Swept Wings
    const deltaShape = new THREE.Shape();
    deltaShape.moveTo(0, 0.6);
    deltaShape.lineTo(-2.8, -1.2);
    deltaShape.lineTo(-2.8, -1.6);
    deltaShape.lineTo(0, -1.4);
    deltaShape.lineTo(2.8, -1.6);
    deltaShape.lineTo(2.8, -1.2);
    deltaShape.closePath();

    const deltaGeom = new THREE.ExtrudeGeometry(deltaShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    deltaGeom.rotateX(Math.PI / 2);
    const deltaWings = new THREE.Mesh(deltaGeom, jetWingMat);
    deltaWings.position.set(0, 0, 0);
    group.add(deltaWings);

    // Twin Canted Vertical Stabilizers
    [-0.45, 0.45].forEach((vx) => {
      const vFinShape = new THREE.Shape();
      vFinShape.moveTo(0, 0);
      vFinShape.lineTo(0.3, 0.9);
      vFinShape.lineTo(0.8, 0.9);
      vFinShape.lineTo(1.1, 0);
      vFinShape.closePath();

      const finGeom = new THREE.ExtrudeGeometry(vFinShape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.01 });
      finGeom.rotateY(Math.PI / 2);
      const fin = new THREE.Mesh(finGeom, jetWingMat);
      fin.position.set(vx, 0.2, 0.8);
      fin.rotation.z = vx < 0 ? 0.25 : -0.25; // canted outward
      group.add(fin);
    });

    // Twin Afterburner Thruster Nozzles with glowing flame
    [-0.25, 0.25].forEach((ex) => {
      const nozzleGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.4, 12);
      nozzleGeom.rotateX(Math.PI / 2);
      const nozzle = new THREE.Mesh(nozzleGeom, new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 }));
      nozzle.position.set(ex, 0, 1.55);
      group.add(nozzle);

      // Glowing plasma thruster
      const flameGeom = new THREE.ConeGeometry(0.15, 0.7, 12);
      flameGeom.rotateX(Math.PI / 2);
      const flame = new THREE.Mesh(flameGeom, exhaustMat);
      flame.position.set(ex, 0, 1.95);
      group.add(flame);
      this.jetAfterburners.push(flame);
    });

    this.wingLeftTip.set(-2.8, 0, -1.2);
    this.wingRightTip.set(2.8, 0, -1.2);
    this.mesh.add(group);
  }

  // 3. Model: Helikopter Penjelajah (Explorer Helicopter)
  private buildHelicopter() {
    const heliBodyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.2 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x67e8f9, transmission: 0.85, roughness: 0.05, transparent: true, opacity: 0.9 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });

    const group = new THREE.Group();

    // Rounded Cockpit Cabin Pod
    const cabinGeom = new THREE.SphereGeometry(0.85, 16, 16);
    cabinGeom.scale(0.8, 0.95, 1.4);
    const cabin = new THREE.Mesh(cabinGeom, heliBodyMat);
    cabin.position.set(0, 0.2, -0.4);
    group.add(cabin);

    // Large Curved Windshield Canopy
    const windGeom = new THREE.SphereGeometry(0.82, 16, 16);
    windGeom.scale(0.78, 0.9, 1.2);
    const windshield = new THREE.Mesh(windGeom, glassMat);
    windshield.position.set(0, 0.25, -0.65);
    group.add(windshield);

    // Tail Boom Tube
    const boomGeom = new THREE.CylinderGeometry(0.18, 0.1, 2.8, 12);
    boomGeom.rotateX(Math.PI / 2);
    const boom = new THREE.Mesh(boomGeom, heliBodyMat);
    boom.position.set(0, 0.35, 1.7);
    group.add(boom);

    // Vertical Tail Fin
    const finGeom = new THREE.BoxGeometry(0.06, 0.9, 0.45);
    const tailFin = new THREE.Mesh(finGeom, frameMat);
    tailFin.position.set(0, 0.55, 3.0);
    group.add(tailFin);

    // Landing Skids
    [-0.65, 0.65].forEach((sx) => {
      const skidGeom = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8);
      skidGeom.rotateX(Math.PI / 2);
      const skid = new THREE.Mesh(skidGeom, chromeMat);
      skid.position.set(sx, -0.7, -0.2);
      group.add(skid);

      // Struts
      [-0.6, 0.4].forEach((sz) => {
        const strutGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
        const strut = new THREE.Mesh(strutGeom, chromeMat);
        strut.position.set(sx * 0.7, -0.42, sz);
        strut.rotation.z = sx < 0 ? 0.3 : -0.3;
        group.add(strut);
      });
    });

    // Top Main Rotor Hub & 4 Blades
    this.mainRotor = new THREE.Group();
    this.mainRotor.position.set(0, 1.25, -0.4);
    const mastGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 12);
    const mast = new THREE.Mesh(mastGeom, chromeMat);
    mast.position.y = -0.15;
    this.mainRotor.add(mast);

    const rotorBladeGeom = new THREE.BoxGeometry(0.14, 0.03, 4.4);
    const rotorBlade1 = new THREE.Mesh(rotorBladeGeom, frameMat);
    this.mainRotor.add(rotorBlade1);
    const rotorBlade2 = new THREE.Mesh(rotorBladeGeom, frameMat);
    rotorBlade2.rotation.y = Math.PI / 2;
    this.mainRotor.add(rotorBlade2);
    group.add(this.mainRotor);

    // Rear Tail Rotor
    this.tailRotor = new THREE.Group();
    this.tailRotor.position.set(0.12, 0.6, 3.0);
    const tailBladeGeom = new THREE.BoxGeometry(0.02, 0.75, 0.08);
    const tb = new THREE.Mesh(tailBladeGeom, frameMat);
    this.tailRotor.add(tb);
    group.add(this.tailRotor);

    this.wingLeftTip.set(-0.8, -0.7, -0.2);
    this.wingRightTip.set(0.8, -0.7, -0.2);
    this.mesh.add(group);
  }

  // 4. Model: Pesawat Luar Angkasa / Sci-Fi Shuttle (Space Cruiser)
  private buildSpaceShip() {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.25, metalness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.3 });
    const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x06b6d4, transmission: 0.9, roughness: 0.05, transparent: true, opacity: 0.9 });

    const group = new THREE.Group();

    // Sci-Fi Angular Hull Body
    const hullGeom = new THREE.ConeGeometry(0.75, 3.4, 6);
    hullGeom.rotateX(-Math.PI / 2);
    const hull = new THREE.Mesh(hullGeom, hullMat);
    hull.position.z = -0.4;
    group.add(hull);

    // Front Visor
    const visorGeom = new THREE.BoxGeometry(0.65, 0.3, 0.8);
    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.position.set(0, 0.3, -1.1);
    group.add(visor);

    // Forward swept Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.4);
    wingShape.lineTo(-3.2, 0.2);
    wingShape.lineTo(-2.9, -1.0);
    wingShape.lineTo(0, -0.8);
    wingShape.lineTo(2.9, -1.0);
    wingShape.lineTo(3.2, 0.2);
    wingShape.closePath();

    const wingGeom = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02 });
    wingGeom.rotateX(Math.PI / 2);
    const wings = new THREE.Mesh(wingGeom, whiteMat);
    wings.position.set(0, 0, 0);
    group.add(wings);

    // Wingtip Vertical Strakes
    [-3.1, 3.1].forEach((wx) => {
      const strakeGeom = new THREE.BoxGeometry(0.08, 0.7, 0.9);
      const strake = new THREE.Mesh(strakeGeom, cyanNeonMat);
      strake.position.set(wx, 0.2, -0.3);
      group.add(strake);
    });

    // Dual Ion Engines
    [-0.38, 0.38].forEach((ix) => {
      const ionGeom = new THREE.CylinderGeometry(0.24, 0.28, 0.6, 12);
      ionGeom.rotateX(Math.PI / 2);
      const ion = new THREE.Mesh(ionGeom, new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9 }));
      ion.position.set(ix, 0, 1.4);
      group.add(ion);

      const glowGeom = new THREE.ConeGeometry(0.2, 0.8, 12);
      glowGeom.rotateX(Math.PI / 2);
      const glow = new THREE.Mesh(glowGeom, cyanNeonMat);
      glow.position.set(ix, 0, 1.85);
      group.add(glow);
      this.jetAfterburners.push(glow);
    });

    this.wingLeftTip.set(-3.2, 0.2, -0.3);
    this.wingRightTip.set(3.2, 0.2, -0.3);
    this.mesh.add(group);
  }

  public update(delta: number, speedMultiplier: number = 1.0) {
    // 1. Spin front propeller if available
    if (this.frontPropeller) {
      this.frontPropeller.rotation.z += 28 * delta * speedMultiplier;
    }

    // 2. Spin helicopter rotors
    if (this.mainRotor) {
      this.mainRotor.rotation.y += 24 * delta * speedMultiplier;
    }
    if (this.tailRotor) {
      this.tailRotor.rotation.x += 35 * delta * speedMultiplier;
    }

    // 3. Pulse jet/ion thrusters
    if (this.jetAfterburners.length > 0) {
      const s = 1.0 + Math.sin(Date.now() * 0.02) * 0.25 * speedMultiplier;
      this.jetAfterburners.forEach((flame) => {
        flame.scale.set(s, s * 1.3, s);
      });
    }
  }
}
