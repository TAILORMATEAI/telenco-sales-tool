import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export default function DottedSurface({ className = '', ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    particles: THREE.Points[];
    animationId: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Adjust these for density & scale in the terminal window
    const SEPARATION = 40; 
    const AMOUNTX = 60;
    const AMOUNTY = 60;

    const scene = new THREE.Scene();
    
    // Add fog to fade out particles at the edges
    scene.fog = new THREE.Fog(0xf8fafc, 500, 2500); // Slate-50 fog color

    // Camera perspective tweaked slightly to look better in a short wide window
    const camera = new THREE.PerspectiveCamera(60, containerRef.current.clientWidth / containerRef.current.clientHeight, 1, 10000);
    camera.position.set(0, 200, 500);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0);

    containerRef.current.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];
    const geometry = new THREE.BufferGeometry();

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        const y = 0;
        const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

        positions.push(x, y, z);
        
        // Minimalist Black & White monochromatic distribution
        const r = Math.random();
        if (r > 0.95) {
          colors.push(0.0, 0.0, 0.0); // Pure Black
        } else if (r > 0.85) {
          colors.push(0.2, 0.2, 0.2); // Slate-800
        } else if (r > 0.60) {
          colors.push(0.4, 0.45, 0.5); // Slate-500
        } else if (r > 0.30) {
          colors.push(0.6, 0.65, 0.7); // Slate-400
        } else {
          colors.push(0.8, 0.85, 0.9); // Slate-200 base
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 8, 
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const positionAttribute = geometry.attributes.position;
      const positionsArray = positionAttribute.array as Float32Array;

      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const index = i * 3;
          // Hyper-fluid scan waves
          positionsArray[index + 1] = Math.sin((ix + count) * 0.3) * 45 + Math.sin((iy + count) * 0.5) * 45;
          i++;
        }
      }

      positionAttribute.needsUpdate = true;
      
      // Rotate the entire particle cloud slowly to prove 3D depth + dynamic movement
      points.rotation.y += 0.002;
      points.rotation.z -= 0.001;
      
      renderer.render(scene, camera);
      count += 0.15; // Fast, unmistakable data-scan speed
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    animate();

    sceneRef.current = { scene, camera, renderer, particles: [points], animationId, count };

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.scene.traverse((object) => {
          if (object instanceof THREE.Points) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose());
            else object.material.dispose();
          }
        });
        sceneRef.current.renderer.dispose();
        if (containerRef.current && sceneRef.current.renderer.domElement) {
          containerRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`absolute inset-0 z-0 pointer-events-none ${className}`} {...props} />
  );
}
