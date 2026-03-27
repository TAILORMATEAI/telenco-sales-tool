import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Smooth parallax camera
function CameraRig() {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.pointer.x * 2, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, state.pointer.y * 2, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

// A morphing energy blob
function EnergyBlob({ position, color, speed, distort, scale }: { position: [number, number, number], color: string, speed: number, distort: number, scale: number }) {
  return (
    <Float speed={speed} rotationIntensity={2} floatIntensity={2} position={position}>
      <mesh scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial 
          color={color} 
          envMapIntensity={1} 
          clearcoat={0.8} 
          clearcoatRoughness={0.2} 
          metalness={0.2} 
          roughness={0.5} 
          distort={distort} 
          speed={speed * 2} 
          transparent={true}
          opacity={0.4} // Subtiel genoeg om niet af te leiden van de 2D golven
        />
      </mesh>
    </Float>
  );
}

export default function Login3DEffects() {
  // Check if we are running safely in the browser to grab root for eventSource
  const isBrowser = typeof window !== 'undefined';
  const rootElement = isBrowser ? document.getElementById('root') : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-0" style={{ mixBlendMode: 'multiply' }}>
      <Canvas 
        camera={{ position: [0, 0, 10], fov: 45 }} 
        // Hook the canvas events to the root so parallax works while the canvas div is pointer-events-none
        eventSource={rootElement as HTMLElement} 
        eventPrefix="client"
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
        
        {/* Soft glowing cinematic dust particles matching Telenco brand colors */}
        <Sparkles count={80} scale={15} size={2} speed={0.4} opacity={0.3} color="#E5394C" />
        <Sparkles count={80} scale={15} size={2} speed={0.3} opacity={0.3} color="#91C848" />
        <Sparkles count={80} scale={15} size={2} speed={0.5} opacity={0.3} color="#FFC421" />

        {/* Floating abstract liquid orbs in the background */}
        <EnergyBlob position={[-5, 2, -5]} color="#E5394C" speed={1.5} distort={0.4} scale={1.2} />
        <EnergyBlob position={[6, -1, -8]} color="#91C848" speed={1} distort={0.3} scale={2} />
        <EnergyBlob position={[3, 3, -10]} color="#FFC421" speed={2} distort={0.5} scale={1.5} />

        <CameraRig />
      </Canvas>
    </div>
  );
}
