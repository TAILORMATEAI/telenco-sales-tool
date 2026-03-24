import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial, Float, Sparkles } from '@react-three/drei';
import { getProject } from '@theatre/core';
import { SheetProvider, editable as e } from '@theatre/r3f';
import extension from '@theatre/r3f/dist/extension';
import studio from '@theatre/studio';

// Only initialize Theatre.js Studio in development mode
if (import.meta.env.DEV) {
  studio.extend(extension);
  studio.initialize();
}

// Create a Theatre.js project and sheet for our login scene
const demoProject = getProject('Telenco Login Scene');
const loginSheet = demoProject.sheet('Login Background');

function WaveTubes() {
  const materialProps = {
    thickness: 0.5,
    roughness: 0.1,
    transmission: 1, // Glass-like transparency
    ior: 1.5,        // Index of refraction
    chromaticAberration: 0.05,
    backside: true,
  };

  return (
    <>
      <e.mesh theatreKey="Red Wave" position={[-2, -1, -5]}>
        <torusKnotGeometry args={[3, 0.4, 256, 32]} />
        <MeshTransmissionMaterial {...materialProps} color="#E74B4D" />
      </e.mesh>

      <e.mesh theatreKey="Green Wave" position={[0, 0, -3]}>
        <torusKnotGeometry args={[2.5, 0.3, 256, 32]} />
        <MeshTransmissionMaterial {...materialProps} color="#91C848" />
      </e.mesh>

      <e.mesh theatreKey="Yellow Wave" position={[2, 1, -1]}>
        <torusKnotGeometry args={[4, 0.2, 256, 32]} />
        <MeshTransmissionMaterial {...materialProps} color="#FFC421" />
      </e.mesh>
    </>
  );
}

function SceneContext() {
  return (
    <>
      <color attach="background" args={['#fafafa']} />
      <Environment preset="city" />
      <e.directionalLight theatreKey="Key Light" position={[5, 5, 5]} intensity={2} color="#ffffff" />
      
      {/* Light motes flying around */}
      <Sparkles count={100} scale={12} size={1} speed={0.4} opacity={0.2} color="#ffffff" />
      
      {/* Floating organic movement */}
      <Float speed={1} rotationIntensity={0.5} floatIntensity={1}>
        <WaveTubes />
      </Float>
    </>
  );
}

export default function LoginBackground3D() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <Suspense fallback={null}>
          <SheetProvider sheet={loginSheet}>
            <SceneContext />
          </SheetProvider>
        </Suspense>
      </Canvas>
    </div>
  );
}
