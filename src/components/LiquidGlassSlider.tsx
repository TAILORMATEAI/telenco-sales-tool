import React, { useRef, useEffect, useState, useCallback } from 'react';

interface LiquidGlassSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  color?: string; // e.g., '#FFC421' or '#E5394C'
  className?: string;
}

export default function LiquidGlassSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  color = '#49a3fc', 
  className = ''
}: LiquidGlassSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Derive percent from value
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const updateFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    let newPercent = (offsetX / rect.width) * 100;
    newPercent = Math.max(0, Math.min(100, newPercent));

    let newValue = min + (newPercent / 100) * (max - min);
    
    // Apply step snapping
    if (step > 0) {
      newValue = Math.round((newValue - min) / step) * step + min;
    }
    
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(newValue);
  }, [min, max, step, onChange]);

  return (
    <div className={`relative py-6 z-10 ${className}`}>
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full h-2.5 bg-[#D6D6DA] rounded-full cursor-pointer select-none touch-none"
      >
        <div 
          className="absolute h-full rounded-full z-[1]"
          style={{ width: `${percent}%`, backgroundColor: color }}
        ></div>
        
        <div 
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-10 sm:w-16 sm:h-10 rounded-full cursor-pointer z-[2] bg-white shadow-[0_1px_8px_0_rgba(0,30,63,0.1),0_0_2px_0_rgba(0,9,20,0.1)] ${isDragging ? 'scale-y-[0.96] scale-x-[1.1] shadow-[0_6px_16px_rgba(0,0,0,0.15)]' : ''}`}
          style={{ 
            left: `${percent}%`, 
            transition: 'transform 0.15s ease, box-shadow 0.15s ease' 
          }}
        >
        </div>
      </div>
    </div>
  );
}
