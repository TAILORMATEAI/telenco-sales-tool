import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D();

function LiquidGlassBlob() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a highly detailed base geometry
  // Icosahedron with detail 20 has enough vertices for smooth distortion
  const baseGeometry = useMemo(() => new THREE.IcosahedronGeometry(3, 30), []);
  const initialPositions = useMemo(() => baseGeometry.attributes.position.array.slice(), [baseGeometry]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime() * 0.3; // Snelheid van de vloeistof
    const positions = meshRef.current.geometry.attributes.position.array;

    // Loop over all vertices
    for (let i = 0; i < positions.length; i += 3) {
      // Original vertex positions
      const ox = initialPositions[i];
      const oy = initialPositions[i + 1];
      const oz = initialPositions[i + 2];

      const v = new THREE.Vector3(ox, oy, oz);
      v.normalize(); // Get the direction pointing outward from center

      // Simplex noise in 3D scale
      const noise = noise3D(ox * 0.4 + t, oy * 0.4 + t, oz * 0.4 + t);
      
      // Displace the vertex along its normal
      const displacement = 0.8 * noise; // 0.8 is the amplitude of the waves
      
      positions[i] = ox + v.x * displacement;
      positions[i + 1] = oy + v.y * displacement;
      positions[i + 2] = oz + v.z * displacement;
    }

    // Tell Three.js to re-render the geometry
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals(); // Crucial for realistic lighting and refraction
    
    // Slow majestic rotation
    meshRef.current.rotation.y = t * 0.5;
    meshRef.current.rotation.z = t * 0.2;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={1} position={[0, -0.5, 0]}>
      <mesh ref={meshRef} castShadow receiveShadow geometry={baseGeometry}>
        {/* Ultra-premium glass material */}
        <MeshTransmissionMaterial 
          backside={true}           // Rendered on both sides for double refraction
          thickness={4.5}           // Massief dik glas 
          roughness={0.03}          // Extreem gepolijst
          transmission={1}          // 100% glazen doorkijk
          ior={1.45}                // Brekingsindex (Glas/Water)
          chromaticAberration={0.12}// Regenbogen splitten the lichtranden op (Premium feel)
          anisotropy={0.2}          // Reflectie textuur
          color="#ffffff"           // Kraakhelder glas
          attenuationDistance={10}
          attenuationColor="#f8fafc"
        />
      </mesh>
    </Float>
  );
}

// Parallax die zacht reageert op de muis
function CameraRig() {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.pointer.x * 2.5, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, state.pointer.y * 2.5, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function LoginLiquidGlass() {
  const isBrowser = typeof window !== 'undefined';
  const rootElement = isBrowser ? document.getElementById('root') : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-0" style={{ opacity: 0.95 }}>
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 35 }} 
        eventSource={rootElement as HTMLElement} 
        eventPrefix="client"
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
        
        {/* Studio Preset: Geeft prachtige professionele witte/grijze reflecties en softbox lights in het glas */}
        <Environment preset="studio" />

        <LiquidGlassBlob />

        {/* Grond schaduw voor ultra realistisch gewicht in de interface */}
        <ContactShadows position={[0, -4.5, 0]} opacity={0.4} scale={20} blur={2.5} far={4} color="#94a3b8" />

        <CameraRig />
      </Canvas>
    </div>
  );
}
