import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { useCurrentSheet } from '@theatre/r3f';
import { val } from '@theatre/core';

const noise3D = createNoise3D();
const POINTS_COUNT = 150;

interface WaveLineProps {
  color: string;
  yOffset: number;
  zOffset: number;
  theatreKey: string;
}

function SingleWaveLine({ color, yOffset, zOffset, theatreKey }: WaveLineProps) {
  const lineRef = useRef<any>(null);
  const sheet = useCurrentSheet();
  
  const waveObj = useMemo(() => {
    if (!sheet) return null;
    return sheet.object(`Wave Line ${theatreKey}`, {
      amplitudeY: 1.5,
      amplitudeZ: 2.0,
      frequency: 0.15,
      speed: 0.3,
      glowPulseSpeed: 1.5,
      glowPulseWidth: 0.15
    });
  }, [sheet, theatreKey]);

  // Herbruikbare memory buffers om Garbage Collection haperingen te voorkomen
  const { positions, lineColors } = useMemo(() => {
    const pos = new Float32Array(POINTS_COUNT * 3);
    const cls = new Float32Array(POINTS_COUNT * 3);
    return { positions: pos, lineColors: cls };
  }, []);

  // Initial dummy points and colors to satisfy <Line> mount
  const initialPoints = useMemo(() => Array.from({length: POINTS_COUNT}, () => new THREE.Vector3()), []);
  const initialColors = useMemo(() => Array.from({length: POINTS_COUNT}, () => [1, 1, 1] as [number, number, number]), []);

  useFrame((state) => {
    if (!lineRef.current || !waveObj) return;
    const time = state.clock.elapsedTime;
    
    const ampY = val(waveObj.props.amplitudeY) as number ?? 1.5;
    const ampZ = val(waveObj.props.amplitudeZ) as number ?? 2.0;
    const freq = val(waveObj.props.frequency) as number ?? 0.15;
    const speed = val(waveObj.props.speed) as number ?? 0.3;
    const pulseSpeed = val(waveObj.props.glowPulseSpeed) as number ?? 1.5;
    const pulseWidth = val(waveObj.props.glowPulseWidth) as number ?? 0.15;

    const baseCol = new THREE.Color(color);
    const brightCol = new THREE.Color('#ffffff');

    for (let i = 0; i < POINTS_COUNT; i++) {
      const x = (i / POINTS_COUNT) * 40 - 20; // Lijn van -20 tot +20 (buiten scherm)
      
      const ny = noise3D(x * freq, time * speed, yOffset) * ampY;
      const nz = noise3D(x * freq + 50, time * speed, zOffset) * ampZ;
      
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = yOffset + ny;
      positions[i * 3 + 2] = zOffset + nz;

      // Glow effect reizend over de X as
      const pulse = Math.sin(x * pulseWidth - time * pulseSpeed) * 0.5 + 0.5;
      const intensity = Math.pow(pulse, 4); // Scherper, kort pulsje
      
      const fCol = baseCol.clone().lerp(brightCol, intensity * 0.7);
      
      lineColors[i * 3 + 0] = fCol.r;
      lineColors[i * 3 + 1] = fCol.g;
      lineColors[i * 3 + 2] = fCol.b;
    }

    // Update de instanced geometry (drei's Line2 abstraction)
    lineRef.current.geometry.setPositions(positions);
    lineRef.current.geometry.setColors(lineColors);
  });

  return (
    <Line
      ref={lineRef}
      points={initialPoints}
      vertexColors={initialColors}
      lineWidth={4} // Pixel width via line resolution
      transparent
      opacity={0.8}
    />
  );
}

export function WaveLines() {
  const { camera, pointer } = useThree();

  // Zachte Muis Parallax (Camera volgt subtiel de muis voor diepte-effect)
  useFrame(() => {
    const targetX = pointer.x * 2.5;
    const targetY = pointer.y * 1.5;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  return (
    <group>
      <SingleWaveLine color="#E74B4D" yOffset={1.5} zOffset={-2} theatreKey="Red" />
      <SingleWaveLine color="#91C848" yOffset={0} zOffset={1} theatreKey="Green" />
      <SingleWaveLine color="#FFC421" yOffset={-1.5} zOffset={4} theatreKey="Yellow" />
    </group>
  );
}
