import * as THREE from 'three';

export type EnvironmentTheme = 'city' | 'beach' | 'rainbow' | 'space' | 'antarctica' | 'sunset';

export const ALL_THEMES: EnvironmentTheme[] = [
  'beach',
  'city',
  'rainbow',
  'space',
  'antarctica',
  'sunset',
];

export interface ThemeConfig {
  name: string;
  skyColorTop: string;
  skyColorBottom: string;
  fogColor: number;
  sunColor: number;
  sunIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  terrainWaterColor: number;
  terrainLandColor: number;
  cloudColor: number;
  sunPosition: [number, number, number];
}

export const THEME_CONFIGS: Record<EnvironmentTheme, ThemeConfig> = {
  beach: {
    name: 'Lintasan 1: Pantai Tropis & Laut Biru',
    skyColorTop: '#0284c7', // Sky Blue
    skyColorBottom: '#7dd3fc', // Light Cyan
    fogColor: 0x7dd3fc,
    sunColor: 0xfffae0,
    sunIntensity: 2.2,
    hemiSkyColor: 0xbae6fd,
    hemiGroundColor: 0x0284c7,
    terrainWaterColor: 0x0ea5e9, // Turquoise ocean
    terrainLandColor: 0xfef08a, // Golden sand & tropical greens
    cloudColor: 0xffffff,
    sunPosition: [60, 90, -120],
  },
  city: {
    name: 'Lintasan 2: Kota Metropolitan Megah',
    skyColorTop: '#1e1b4b', // Deep night indigo
    skyColorBottom: '#312e81', // City skyline twilight
    fogColor: 0x1e1b4b,
    sunColor: 0xfef08a,
    sunIntensity: 1.8,
    hemiSkyColor: 0x6366f1,
    hemiGroundColor: 0x0f172a,
    terrainWaterColor: 0x020617,
    terrainLandColor: 0x1e293b,
    cloudColor: 0x475569,
    sunPosition: [30, 70, -150],
  },
  rainbow: {
    name: 'Lintasan 3: Langit Pelangi Ajaib',
    skyColorTop: '#4338ca', // Violet
    skyColorBottom: '#f472b6', // Pink pastel
    fogColor: 0xf472b6,
    sunColor: 0xfef9c3,
    sunIntensity: 2.3,
    hemiSkyColor: 0xf472b6,
    hemiGroundColor: 0x38bdf8,
    terrainWaterColor: 0x7c3aed,
    terrainLandColor: 0xa855f7,
    cloudColor: 0xfdf2f8,
    sunPosition: [-40, 80, -140],
  },
  space: {
    name: 'Lintasan 4: Luar Angkasa Kosmik & Nebula',
    skyColorTop: '#020617', // Black
    skyColorBottom: '#0f172a', // Deep cosmic navy
    fogColor: 0x020617,
    sunColor: 0x38bdf8,
    sunIntensity: 1.2,
    hemiSkyColor: 0x818cf8,
    hemiGroundColor: 0x0f172a,
    terrainWaterColor: 0x090d16,
    terrainLandColor: 0x1e1b4b,
    cloudColor: 0x1e293b,
    sunPosition: [0, 80, -160],
  },
  antarctica: {
    name: 'Lintasan 5: Kutub Antartika & Gletser Es',
    skyColorTop: '#0369a1', // Deep glacial blue
    skyColorBottom: '#e0f2fe', // Glacial white
    fogColor: 0xcfeafe,
    sunColor: 0xf8fafc,
    sunIntensity: 2.4,
    hemiSkyColor: 0xe0f2fe,
    hemiGroundColor: 0x0284c7,
    terrainWaterColor: 0x0369a1,
    terrainLandColor: 0xf8fafc, // Snow glacier
    cloudColor: 0xf1f5f9,
    sunPosition: [50, 75, -140],
  },
  sunset: {
    name: 'Lintasan 6: Pegunungan Senja Keemasan',
    skyColorTop: '#4c1d95', // Deep purple
    skyColorBottom: '#f97316', // Vibrant orange
    fogColor: 0xf97316,
    sunColor: 0xffedd5,
    sunIntensity: 2.5,
    hemiSkyColor: 0xfb923c,
    hemiGroundColor: 0x581c87,
    terrainWaterColor: 0x7c2d12,
    terrainLandColor: 0xb45309,
    cloudColor: 0xfed7aa,
    sunPosition: [10, 40, -160],
  },
};

export class GameEnvironment {
  public group: THREE.Group;
  public currentTheme: EnvironmentTheme = 'beach';

  private scene: THREE.Scene;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private sunMesh: THREE.Mesh;
  private sunGlowMesh: THREE.Mesh;
  private clouds: THREE.Group[] = [];
  private terrainTiles: THREE.Mesh[] = [];
  private waterTiles: THREE.Mesh[] = [];
  private starField: THREE.Points | null = null;
  private skySphere: THREE.Mesh;

  // Track Special 3D Scenery Elements
  private rainbowMesh: THREE.Group | null = null;
  private ringedPlanet: THREE.Group | null = null;
  private cityBuildings: THREE.Group | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Environment';
    this.scene.add(this.group);

    // 1. Sky Sphere
    const skyGeom = new THREE.SphereGeometry(450, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skySphere = new THREE.Mesh(skyGeom, skyMat);
    this.group.add(this.skySphere);

    // 2. Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    this.group.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffae0, 2.0);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 5;
    this.dirLight.shadow.camera.far = 280;
    this.dirLight.shadow.camera.left = -30;
    this.dirLight.shadow.camera.right = 30;
    this.dirLight.shadow.camera.top = 30;
    this.dirLight.shadow.camera.bottom = -30;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.group.add(this.dirLight);

    // 3. Glowing Sun Mesh
    const sunGeom = new THREE.SphereGeometry(14, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.group.add(this.sunMesh);

    const sunGlowGeom = new THREE.SphereGeometry(24, 24, 24);
    const sunGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.35,
    });
    this.sunGlowMesh = new THREE.Mesh(sunGlowGeom, sunGlowMat);
    this.group.add(this.sunGlowMesh);

    // 4. Starfield for cosmic & night
    this.createStarField();

    // 5. Special Track 3D Landmarks (Rainbow Arch, Saturn Planet, City Skyscrapers)
    this.createRainbowArch();
    this.createRingedPlanet();
    this.createCityBuildings();

    // 6. 3D Puffy Cartoon Clouds
    this.createClouds();

    // 7. Terrain & Water
    this.createTerrain();

    // Set initial theme
    this.setTheme('beach');
  }

  private createStarField() {
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 380 + Math.random() * 40;
      const sinPhi = Math.sin(phi);
      starPositions[i * 3] = r * sinPhi * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15;
      starPositions[i * 3 + 2] = r * sinPhi * Math.sin(theta);
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0,
    });
    this.starField = new THREE.Points(starGeom, starMat);
    this.group.add(this.starField);
  }

  private createRainbowArch() {
    this.rainbowMesh = new THREE.Group();
    const colors = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x38bdf8, 0x8b5cf6];
    colors.forEach((col, idx) => {
      const ringGeom = new THREE.TorusGeometry(85 + idx * 2.5, 1.2, 12, 48, Math.PI);
      const ringMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const arc = new THREE.Mesh(ringGeom, ringMat);
      arc.rotation.z = Math.PI;
      this.rainbowMesh!.add(arc);
    });
    this.rainbowMesh.position.set(0, -5, -220);
    this.rainbowMesh.visible = false;
    this.group.add(this.rainbowMesh);
  }

  private createRingedPlanet() {
    this.ringedPlanet = new THREE.Group();

    // Planet Sphere
    const pGeom = new THREE.SphereGeometry(28, 32, 32);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.6,
      metalness: 0.1,
    });
    const planet = new THREE.Mesh(pGeom, pMat);
    this.ringedPlanet.add(planet);

    // Planet Rings
    const ringGeom = new THREE.RingGeometry(35, 54, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2.5;
    ring.rotation.y = 0.3;
    this.ringedPlanet.add(ring);

    this.ringedPlanet.position.set(70, 60, -260);
    this.ringedPlanet.visible = false;
    this.group.add(this.ringedPlanet);
  }

  private createCityBuildings() {
    this.cityBuildings = new THREE.Group();
    const buildingGeom = new THREE.BoxGeometry(6, 1, 6);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.7,
    });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 40 City skyscrapers flanking the flight path
    for (let i = 0; i < 40; i++) {
      const bGroup = new THREE.Group();
      const height = 15 + Math.random() * 30;

      const tower = new THREE.Mesh(buildingGeom, buildingMat);
      tower.scale.set(1.2 + Math.random() * 0.8, height, 1.2 + Math.random() * 0.8);
      tower.position.y = height / 2;
      bGroup.add(tower);

      // Glowing roof beacon
      const beaconGeom = new THREE.SphereGeometry(0.5, 8, 8);
      const beacon = new THREE.Mesh(beaconGeom, windowMat);
      beacon.position.y = height + 0.5;
      bGroup.add(beacon);

      const side = Math.random() > 0.5 ? 1 : -1;
      const bx = side * (26 + Math.random() * 55);
      const bz = -250 + i * 14;
      bGroup.position.set(bx, -36, bz);

      this.cityBuildings.add(bGroup);
    }
    this.cityBuildings.visible = false;
    this.group.add(this.cityBuildings);
  }

  private createClouds() {
    const cloudGeom = new THREE.DodecahedronGeometry(1, 1);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.05,
      flatShading: true,
    });

    for (let i = 0; i < 24; i++) {
      const cluster = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 4);

      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(cloudGeom, cloudMat);
        const s = 3.5 + Math.random() * 3.5;
        puff.scale.set(s, s * 0.75, s);
        puff.position.set(
          (p - puffCount / 2) * 2.5 + (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 3
        );
        cluster.add(puff);
      }

      cluster.position.set(
        (Math.random() - 0.5) * 140,
        -5 + Math.random() * 25,
        -150 + i * 18 + (Math.random() - 0.5) * 10
      );
      this.group.add(cluster);
      this.clouds.push(cluster);
    }
  }

  private createTerrain() {
    const tileLength = 300;
    const tileWidth = 350;

    for (let i = 0; i < 3; i++) {
      const waterGeom = new THREE.PlaneGeometry(tileWidth, tileLength, 8, 8);
      waterGeom.rotateX(-Math.PI / 2);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.15,
        metalness: 0.7,
        flatShading: true,
      });
      const water = new THREE.Mesh(waterGeom, waterMat);
      water.position.set(0, -38, -i * tileLength);
      this.group.add(water);
      this.waterTiles.push(water);

      const terrainGeom = new THREE.PlaneGeometry(tileWidth, tileLength, 28, 28);
      terrainGeom.rotateX(-Math.PI / 2);

      const pos = terrainGeom.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j);
        const z = pos.getZ(j);

        const distFromCenter = Math.abs(x);
        let height = 0;

        if (distFromCenter > 25) {
          const m = (distFromCenter - 25) * 0.45;
          const noise = Math.sin(x * 0.05) * Math.cos(z * 0.04) * 8 + Math.sin(x * 0.1 + z * 0.1) * 4;
          height = Math.max(0, m + noise);
        } else {
          if (Math.sin(x * 0.15) * Math.cos(z * 0.15) > 0.6) {
            height = 5 + Math.random() * 4;
          }
        }
        pos.setY(j, height);
      }
      terrainGeom.computeVertexNormals();

      const terrainMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.75,
        metalness: 0.1,
        flatShading: true,
      });
      const terrain = new THREE.Mesh(terrainGeom, terrainMat);
      terrain.position.set(0, -37.5, -i * tileLength);
      terrain.receiveShadow = true;
      this.group.add(terrain);
      this.terrainTiles.push(terrain);
    }
  }

  public setTheme(theme: EnvironmentTheme) {
    this.currentTheme = theme;
    const cfg = THEME_CONFIGS[theme] || THEME_CONFIGS.beach;

    // 1. Sky Gradient Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, cfg.skyColorTop);
      grad.addColorStop(0.7, cfg.skyColorBottom);
      grad.addColorStop(1, cfg.skyColorBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 512);
    }
    const skyTex = new THREE.CanvasTexture(canvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    (this.skySphere.material as THREE.MeshBasicMaterial).map = skyTex;
    (this.skySphere.material as THREE.MeshBasicMaterial).needsUpdate = true;

    // 2. Fog
    this.scene.fog = new THREE.FogExp2(cfg.fogColor, theme === 'space' ? 0.003 : 0.0055);

    // 3. Lighting
    this.dirLight.color.setHex(cfg.sunColor);
    this.dirLight.intensity = cfg.sunIntensity;
    this.dirLight.position.set(...cfg.sunPosition);

    this.hemiLight.color.setHex(cfg.hemiSkyColor);
    this.hemiLight.groundColor.setHex(cfg.hemiGroundColor);

    this.sunMesh.position.set(...cfg.sunPosition);
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.setHex(cfg.sunColor);
    this.sunGlowMesh.position.set(...cfg.sunPosition);
    (this.sunGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(cfg.sunColor);

    // 4. Starfield
    if (this.starField) {
      const starMat = this.starField.material as THREE.PointsMaterial;
      starMat.opacity = theme === 'space' ? 1.0 : theme === 'city' ? 0.6 : 0;
    }

    // 5. Special Track Landmarks Visibility
    if (this.rainbowMesh) {
      this.rainbowMesh.visible = theme === 'rainbow';
    }
    if (this.ringedPlanet) {
      this.ringedPlanet.visible = theme === 'space';
    }
    if (this.cityBuildings) {
      this.cityBuildings.visible = theme === 'city';
    }

    // 6. Cloud colors
    this.clouds.forEach((cloudGroup) => {
      cloudGroup.children.forEach((puff) => {
        const mat = (puff as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.color.setHex(cfg.cloudColor);
      });
    });

    // 7. Terrain and Water colors
    this.waterTiles.forEach((water) => {
      const mat = water.material as THREE.MeshStandardMaterial;
      mat.color.setHex(cfg.terrainWaterColor);
    });

    this.terrainTiles.forEach((terrain) => {
      const mat = terrain.material as THREE.MeshStandardMaterial;
      mat.color.setHex(cfg.terrainLandColor);
    });
  }

  public update(delta: number, playerZ: number, _flightSpeed: number) {
    this.clouds.forEach((cloud) => {
      if (cloud.position.z > playerZ + 25) {
        cloud.position.z -= 320;
        cloud.position.x = (Math.random() - 0.5) * 140;
        cloud.position.y = -5 + Math.random() * 25;
      }
    });

    const tileLength = 300;
    this.terrainTiles.forEach((tile, index) => {
      const water = this.waterTiles[index];
      if (tile.position.z > playerZ + tileLength) {
        tile.position.z -= tileLength * 3;
        water.position.z = tile.position.z;
      }
    });

    // Landmarks follow player along flight corridor
    if (this.rainbowMesh && this.rainbowMesh.visible) {
      this.rainbowMesh.position.z = playerZ - 230;
    }
    if (this.ringedPlanet && this.ringedPlanet.visible) {
      this.ringedPlanet.position.z = playerZ - 270;
      this.ringedPlanet.rotation.y += delta * 0.05;
    }
    if (this.cityBuildings && this.cityBuildings.visible) {
      this.cityBuildings.children.forEach((b) => {
        if (b.position.z > playerZ + 40) {
          b.position.z -= 360;
        }
      });
    }

    this.sunMesh.position.z = playerZ - 280;
    this.sunGlowMesh.position.z = playerZ - 280;
    this.dirLight.position.z = playerZ - 280;
    this.dirLight.target.position.set(0, 0, playerZ);
    this.dirLight.target.updateMatrixWorld();

    this.skySphere.position.z = playerZ;
    if (this.starField) {
      this.starField.position.z = playerZ;
      if (this.currentTheme === 'space') {
        this.starField.rotation.y += delta * 0.01;
      }
    }
  }
}
