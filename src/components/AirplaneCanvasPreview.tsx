import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Aircraft, AircraftType } from '../game/aircraft';

interface AirplaneCanvasPreviewProps {
  aircraftType: AircraftType;
  className?: string;
}

export const AirplaneCanvasPreview: React.FC<AirplaneCanvasPreviewProps> = ({
  aircraftType,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const aircraftRef = useRef<Aircraft | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const manualRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 220;

    // 1. Scene & Camera
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.8);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0284c7, 1.2);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffae0, 2.0);
    sunLight.position.set(5, 10, 6);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    rimLight.position.set(-6, -2, -4);
    scene.add(rimLight);

    // 4. Aircraft
    const aircraft = new Aircraft(aircraftType);
    scene.add(aircraft.mesh);
    aircraftRef.current = aircraft;

    // 5. Drifting Clouds in background for flight illusion
    const cloudsGroup = new THREE.Group();
    scene.add(cloudsGroup);

    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      transparent: true,
      opacity: 0.75,
    });

    const clouds: THREE.Mesh[] = [];
    const cloudGeom = new THREE.DodecahedronGeometry(0.55, 1);

    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(cloudGeom, cloudMaterial);
      const angle = (i / 7) * Math.PI * 2;
      const radius = 3.2 + Math.random() * 1.5;
      c.position.set(
        Math.cos(angle) * radius,
        -0.8 + (Math.random() - 0.5) * 1.5,
        -1.5 - Math.random() * 4.0
      );
      const s = 0.6 + Math.random() * 0.8;
      c.scale.set(s * 1.4, s * 0.8, s);
      cloudsGroup.add(c);
      clouds.push(c);
    }

    // 6. Ring / Airflow particle illusion
    const speedLinesGroup = new THREE.Group();
    scene.add(speedLinesGroup);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    const speedLines: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const lineGeom = new THREE.CylinderGeometry(0.015, 0.015, 2.5, 4);
      lineGeom.rotateX(Math.PI / 2);
      const lineMesh = new THREE.Mesh(lineGeom, lineMat);
      lineMesh.position.set(
        (Math.random() - 0.5) * 4.5,
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 5
      );
      speedLinesGroup.add(lineMesh);
      speedLines.push(lineMesh);
    }

    // Interactive Drag to Rotate Aircraft
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      manualRotRef.current.y += dx * 0.01;
      manualRotRef.current.x = Math.max(-0.6, Math.min(0.6, manualRotRef.current.x + dy * 0.01));
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      // Aircraft update (propellers, rotors, afterburners)
      aircraft.update(delta, 1.4);

      // Return manual rotation slowly to center when not dragging
      if (!isDraggingRef.current) {
        manualRotRef.current.y *= 0.96;
        manualRotRef.current.x *= 0.96;
      }

      // Gentle flight aerodynamic physics (bobbing, pitch, roll bank)
      const baseBank = Math.sin(time * 1.2) * 0.22;
      const basePitch = Math.cos(time * 1.5) * 0.08;
      const baseAltitude = Math.sin(time * 1.8) * 0.18;

      aircraft.mesh.position.y = baseAltitude;
      aircraft.mesh.rotation.z = -baseBank + manualRotRef.current.y * 0.2;
      aircraft.mesh.rotation.x = basePitch + manualRotRef.current.x;
      aircraft.mesh.rotation.y = Math.PI + Math.sin(time * 0.8) * 0.15 + manualRotRef.current.y;

      // Drift clouds forward towards camera and reset
      clouds.forEach((cloud) => {
        cloud.position.z += delta * 1.6;
        if (cloud.position.z > 2.0) {
          cloud.position.z = -5.0;
          cloud.position.x = (Math.random() - 0.5) * 5.5;
        }
      });

      // Speed lines drift
      speedLines.forEach((line) => {
        line.position.z += delta * 5.5;
        if (line.position.z > 3.0) {
          line.position.z = -4.0;
          line.position.x = (Math.random() - 0.5) * 5.0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [aircraftType]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden touch-none ${className}`}
      title="Geser untuk memutar sudut pesawat 3D"
    />
  );
};
