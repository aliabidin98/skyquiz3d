import * as THREE from 'three';

export interface AirplaneColors {
  body: number;
  wings: number;
  trim: number;
  canopy: number;
}

export const AIRPLANE_COLOR_PRESETS: { name: string; colors: AirplaneColors }[] = [
  {
    name: 'Red Falcon (Merah Berani)',
    colors: {
      body: 0xef4444, // Red
      wings: 0xf59e0b, // Amber
      trim: 0xffffff, // White
      canopy: 0x38bdf8, // Sky glass
    },
  },
  {
    name: 'Sky Blue Jay (Biru Samudra)',
    colors: {
      body: 0x0ea5e9, // Bright Sky Blue
      wings: 0x38bdf8, // Light Blue
      trim: 0xfacc15, // Yellow trim
      canopy: 0x67e8f9, // Cyan glass
    },
  },
  {
    name: 'Emerald Swift (Hijau Zamrud)',
    colors: {
      body: 0x10b981, // Emerald Green
      wings: 0x34d399, // Mint
      trim: 0xfbbf24, // Warm gold
      canopy: 0x93c5fd, // Tinted
    },
  },
  {
    name: 'Cosmic Violet (Ungu Fantasi)',
    colors: {
      body: 0x8b5cf6, // Purple
      wings: 0xec4899, // Pink
      trim: 0xffffff, // White
      canopy: 0xc084fc, // Translucent
    },
  },
];

export class Airplane {
  public mesh: THREE.Group;
  public propeller: THREE.Group;
  public wingLeftTip: THREE.Vector3 = new THREE.Vector3();
  public wingRightTip: THREE.Vector3 = new THREE.Vector3();

  // Dynamic animation properties
  private propellerSpeed: number = 25;
  private colors: AirplaneColors;
  private bodyMaterial: THREE.MeshStandardMaterial;
  private wingsMaterial: THREE.MeshStandardMaterial;
  private trimMaterial: THREE.MeshStandardMaterial;
  private canopyMaterial: THREE.MeshPhysicalMaterial;

  constructor(colors: AirplaneColors = AIRPLANE_COLOR_PRESETS[0].colors) {
    this.colors = colors;
    this.mesh = new THREE.Group();
    this.mesh.name = 'Airplane';

    // 1. Materials with physical roughness & metalness contrast per directives
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.colors.body,
      roughness: 0.35,
      metalness: 0.15,
    });

    this.wingsMaterial = new THREE.MeshStandardMaterial({
      color: this.colors.wings,
      roughness: 0.45,
      metalness: 0.1,
    });

    this.trimMaterial = new THREE.MeshStandardMaterial({
      color: this.colors.trim,
      roughness: 0.3,
      metalness: 0.25,
    });

    this.canopyMaterial = new THREE.MeshPhysicalMaterial({
      color: this.colors.canopy,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      thickness: 0.8,
      ior: 1.5,
      transparent: true,
      opacity: 0.9,
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.15,
    });

    const darkRubberMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.05,
    });

    // 2. Main Fuselage Body
    const bodyGroup = new THREE.Group();

    // Main fuselage tube
    const fuselageGeom = new THREE.CylinderGeometry(0.55, 0.3, 2.8, 16);
    fuselageGeom.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeom, this.bodyMaterial);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    bodyGroup.add(fuselage);

    // Front Nose Cone
    const noseGeom = new THREE.ConeGeometry(0.55, 0.8, 16);
    noseGeom.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeom, this.trimMaterial);
    nose.position.z = -1.8;
    nose.castShadow = true;
    bodyGroup.add(nose);

    // Engine Cowling Rim
    const cowlingGeom = new THREE.TorusGeometry(0.56, 0.08, 12, 24);
    const cowling = new THREE.Mesh(cowlingGeom, chromeMaterial);
    cowling.position.z = -1.4;
    cowling.castShadow = true;
    bodyGroup.add(cowling);

    // Bubble Cockpit Glass Canopy
    const canopyGeom = new THREE.SphereGeometry(0.5, 16, 16);
    canopyGeom.scale(0.85, 0.75, 1.4);
    const canopy = new THREE.Mesh(canopyGeom, this.canopyMaterial);
    canopy.position.set(0, 0.42, -0.3);
    canopy.castShadow = true;
    bodyGroup.add(canopy);

    // Cockpit Pilot Head
    const pilotHeadGeom = new THREE.SphereGeometry(0.2, 12, 12);
    const pilotHeadMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
    const pilotHead = new THREE.Mesh(pilotHeadGeom, pilotHeadMat);
    pilotHead.position.set(0, 0.38, -0.25);
    bodyGroup.add(pilotHead);

    const gogglesGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.28, 8);
    gogglesGeom.rotateZ(Math.PI / 2);
    const gogglesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
    const goggles = new THREE.Mesh(gogglesGeom, gogglesMat);
    goggles.position.set(0, 0.42, -0.38);
    bodyGroup.add(goggles);

    // 3. Wings
    const wingGeom = new THREE.BoxGeometry(4.6, 0.1, 0.9);
    const wings = new THREE.Mesh(wingGeom, this.wingsMaterial);
    wings.position.set(0, 0.1, -0.2);
    wings.castShadow = true;
    wings.receiveShadow = true;
    bodyGroup.add(wings);

    // Wingtips
    const wingtipLeftGeom = new THREE.BoxGeometry(0.25, 0.14, 0.92);
    const wingtipLeft = new THREE.Mesh(wingtipLeftGeom, this.trimMaterial);
    wingtipLeft.position.set(-2.3, 0.1, -0.2);
    bodyGroup.add(wingtipLeft);

    const wingtipRight = new THREE.Mesh(wingtipLeftGeom, this.trimMaterial);
    wingtipRight.position.set(2.3, 0.1, -0.2);
    bodyGroup.add(wingtipRight);

    // Beacons
    const beaconLeftGeom = new THREE.SphereGeometry(0.06, 8, 8);
    const beaconLeftMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const beaconLeft = new THREE.Mesh(beaconLeftGeom, beaconLeftMat);
    beaconLeft.position.set(-2.45, 0.1, -0.2);
    bodyGroup.add(beaconLeft);

    const beaconRightMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const beaconRight = new THREE.Mesh(beaconLeftGeom, beaconRightMat);
    beaconRight.position.set(2.45, 0.1, -0.2);
    bodyGroup.add(beaconRight);

    // 4. Tail
    const tailFinShape = new THREE.Shape();
    tailFinShape.moveTo(0, 0);
    tailFinShape.lineTo(0, 1.1);
    tailFinShape.lineTo(0.5, 1.0);
    tailFinShape.lineTo(0.9, 0);
    tailFinShape.closePath();

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const tailFinGeom = new THREE.ExtrudeGeometry(tailFinShape, extrudeSettings);
    tailFinGeom.rotateY(Math.PI / 2);
    const tailFin = new THREE.Mesh(tailFinGeom, this.wingsMaterial);
    tailFin.position.set(-0.04, 0.25, 1.0);
    tailFin.castShadow = true;
    bodyGroup.add(tailFin);

    const finStripeGeom = new THREE.BoxGeometry(0.1, 0.35, 0.3);
    const finStripe = new THREE.Mesh(finStripeGeom, this.trimMaterial);
    finStripe.position.set(0, 0.95, 1.35);
    bodyGroup.add(finStripe);

    const hTailGeom = new THREE.BoxGeometry(1.6, 0.08, 0.5);
    const hTail = new THREE.Mesh(hTailGeom, this.wingsMaterial);
    hTail.position.set(0, 0.3, 1.3);
    hTail.castShadow = true;
    bodyGroup.add(hTail);

    // 5. Landing Gear
    const gearStrutGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.55);
    const wheelGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12);
    wheelGeom.rotateZ(Math.PI / 2);

    const leftStrut = new THREE.Mesh(gearStrutGeom, chromeMaterial);
    leftStrut.position.set(-0.65, -0.4, -0.1);
    leftStrut.rotation.z = 0.2;
    bodyGroup.add(leftStrut);
    const leftWheel = new THREE.Mesh(wheelGeom, darkRubberMaterial);
    leftWheel.position.set(-0.75, -0.65, -0.1);
    bodyGroup.add(leftWheel);

    const rightStrut = new THREE.Mesh(gearStrutGeom, chromeMaterial);
    rightStrut.position.set(0.65, -0.4, -0.1);
    rightStrut.rotation.z = -0.2;
    bodyGroup.add(rightStrut);
    const rightWheel = new THREE.Mesh(wheelGeom, darkRubberMaterial);
    rightWheel.position.set(0.75, -0.65, -0.1);
    bodyGroup.add(rightWheel);

    const rearWheelGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10);
    rearWheelGeom.rotateZ(Math.PI / 2);
    const rearWheel = new THREE.Mesh(rearWheelGeom, darkRubberMaterial);
    rearWheel.position.set(0, -0.3, 1.25);
    bodyGroup.add(rearWheel);

    this.mesh.add(bodyGroup);

    // 6. Propeller Assembly
    this.propeller = new THREE.Group();
    this.propeller.position.set(0, 0, -2.25);

    const spinnerGeom = new THREE.ConeGeometry(0.2, 0.38, 16);
    spinnerGeom.rotateX(-Math.PI / 2);
    const spinner = new THREE.Mesh(spinnerGeom, chromeMaterial);
    this.propeller.add(spinner);

    const bladeGeom = new THREE.BoxGeometry(0.12, 0.95, 0.03);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.2,
      metalness: 0.8,
    });

    const bladeTipMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    for (let i = 0; i < 3; i++) {
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.z = (i * Math.PI * 2) / 3;

      const blade = new THREE.Mesh(bladeGeom, bladeMat);
      blade.position.y = 0.45;
      bladeHolder.add(blade);

      const bladeTipGeom = new THREE.BoxGeometry(0.13, 0.18, 0.04);
      const bladeTip = new THREE.Mesh(bladeTipGeom, bladeTipMat);
      bladeTip.position.y = 0.85;
      bladeHolder.add(bladeTip);

      this.propeller.add(bladeHolder);
    }

    this.mesh.add(this.propeller);

    this.wingLeftTip.set(-2.3, 0.1, -0.2);
    this.wingRightTip.set(2.3, 0.1, -0.2);
  }

  public setColors(colors: AirplaneColors) {
    this.colors = colors;
    this.bodyMaterial.color.setHex(colors.body);
    this.wingsMaterial.color.setHex(colors.wings);
    this.trimMaterial.color.setHex(colors.trim);
    this.canopyMaterial.color.setHex(colors.canopy);
  }

  public update(delta: number, speedMultiplier: number = 1.0) {
    this.propeller.rotation.z += this.propellerSpeed * delta * speedMultiplier;
  }
}
