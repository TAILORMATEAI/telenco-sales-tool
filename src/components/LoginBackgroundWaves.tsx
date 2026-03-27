import React, { useEffect, useRef } from 'react';

export interface WaveConfig {
  color: string;
  glow: string;
  amplitude1: number;
  frequency1: number;
  speed1: number;
  amplitude2: number;
  frequency2: number;
  speed2: number;
  verticalOffset: number;
  lineWidth: number;
  glowWidth: number;
  phase: number;
  highlightOffset: number;
  visible?: boolean;
}

export const GREY_WAVES: WaveConfig[] = [
  {
    "color": "#cbd5e1",
    "glow": "rgba(203, 213, 225, 0.5)",
    "amplitude1": 31,
    "frequency1": 0.011,
    "speed1": 0.00036,
    "amplitude2": 41,
    "frequency2": 0.0056,
    "speed2": 0.00049,
    "verticalOffset": -2,
    "lineWidth": 5.5,
    "glowWidth": 6,
    "phase": 180,
    "highlightOffset": -3,
    "visible": true
  },
  {
    "color": "#e2e8f0",
    "glow": "rgba(226, 232, 240, 0.5)",
    "amplitude1": 20,
    "frequency1": 0.011,
    "speed1": 0.00036,
    "amplitude2": 20,
    "frequency2": 0.0056,
    "speed2": 0.00049,
    "verticalOffset": -6,
    "lineWidth": 6,
    "glowWidth": 6,
    "phase": 0,
    "highlightOffset": -3,
    "visible": true
  },
  {
    "color": "#f1f5f9",
    "glow": "rgba(241, 245, 249, 0.5)",
    "amplitude1": 35,
    "frequency1": 0.0117,
    "speed1": 0.00036,
    "amplitude2": 45,
    "frequency2": 0.0056,
    "speed2": 0.00049,
    "verticalOffset": -4,
    "lineWidth": 7,
    "glowWidth": 8,
    "phase": 90,
    "highlightOffset": -4,
    "visible": true
  },
  {
    "color": "#f8fafc",
    "glow": "rgba(248, 250, 252, 0.5)",
    "amplitude1": 25,
    "frequency1": 0.010,
    "speed1": 0.00028,
    "amplitude2": 35,
    "frequency2": 0.0045,
    "speed2": 0.00045,
    "verticalOffset": -8,
    "lineWidth": 6.5,
    "glowWidth": 7,
    "phase": 270,
    "highlightOffset": -3,
    "visible": true
  }
];

export const DESKTOP_WAVES: WaveConfig[] = [
  {
    "color": "#0ea5e9",
    "glow": "rgba(14, 165, 233, 0.4)",
    "amplitude1": 24,
    "frequency1": 0.011,
    "speed1": 0.00036,
    "amplitude2": 32,
    "frequency2": 0.0056,
    "speed2": 0.00049,
    "verticalOffset": -2,
    "lineWidth": 4.5,
    "glowWidth": 4.5,
    "phase": 180,
    "highlightOffset": -2,
    "visible": true
  },
  {
    "color": "#E5394C",
    "glow": "rgba(231, 75, 77, 0.4)",
    "amplitude1": 15,
    "frequency1": 0.011,
    "speed1": 0.00036,
    "amplitude2": 15,
    "frequency2": 0.0056,
    "speed2": 0.00049,
    "verticalOffset": -6,
    "lineWidth": 4.5,
    "glowWidth": 4.5,
    "phase": 0,
    "highlightOffset": -2,
    "visible": true
  },
  {
    "color": "#FFC421",
    "glow": "rgba(255, 196, 33, 0.4)",
    "amplitude1": 27,
    "frequency1": 0.0117,
    "speed1": 0.00036,
    "amplitude2": 35,
    "frequency2": 0.0056,
    "speed2": 0.00049,
    "verticalOffset": -2,
    "lineWidth": 5,
    "glowWidth": 5,
    "phase": 250,
    "highlightOffset": -2,
    "visible": true
  },
  {
    "color": "#91C848",
    "glow": "rgba(145, 200, 72, 0.4)",
    "amplitude1": 30,
    "frequency1": 0.0094,
    "speed1": 0.0004,
    "amplitude2": 18,
    "frequency2": 0.0094,
    "speed2": 0.00046,
    "verticalOffset": 0,
    "lineWidth": 5,
    "glowWidth": 5,
    "phase": 100,
    "highlightOffset": -2,
    "visible": true
  }
];

export const MOBILE_WAVES: WaveConfig[] = [
  {
    "color": "#0ea5e9",
    "glow": "rgba(14, 165, 233, 0.4)",
    "amplitude1": 2.5,
    "frequency1": 0.004,
    "speed1": 0.00033,
    "amplitude2": 8,
    "frequency2": 0.0085,
    "speed2": 0.00017,
    "verticalOffset": 21,
    "lineWidth": 4.5,
    "glowWidth": 4.5,
    "phase": 180,
    "highlightOffset": -2,
    "visible": true
  },
  {
    "color": "#E5394C",
    "glow": "rgba(231, 75, 77, 0.4)",
    "amplitude1": 4,
    "frequency1": 0.0159,
    "speed1": 0.00027,
    "amplitude2": 10,
    "frequency2": 0.0075,
    "speed2": 0.00036,
    "verticalOffset": 18,
    "lineWidth": 4.5,
    "glowWidth": 4.5,
    "phase": 0,
    "highlightOffset": -2,
    "visible": true
  },
  {
    "color": "#FFC421",
    "glow": "rgba(255, 196, 33, 0.4)",
    "amplitude1": 16,
    "frequency1": 0.0014,
    "speed1": 0.00059,
    "amplitude2": 32,
    "frequency2": 0.004,
    "speed2": 0.00043,
    "verticalOffset": 27,
    "lineWidth": 5,
    "glowWidth": 5,
    "phase": 250,
    "highlightOffset": -2,
    "visible": true
  },
  {
    "color": "#91C848",
    "glow": "rgba(145, 200, 72, 0.4)",
    "amplitude1": 30,
    "frequency1": 0.0036,
    "speed1": 0.0002,
    "amplitude2": 6,
    "frequency2": 0.0123,
    "speed2": 0.00072,
    "verticalOffset": 21,
    "lineWidth": 5,
    "glowWidth": 5,
    "phase": 100,
    "highlightOffset": -2,
    "visible": true
  }
];

export const DEFAULT_WAVES = window.innerWidth < 768 ? MOBILE_WAVES : DESKTOP_WAVES;

interface Props {
  config?: WaveConfig[];
  useGradient?: boolean;
}

export default function LoginBackgroundWaves({ config, useGradient = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(config || DEFAULT_WAVES);

  useEffect(() => {
    if (config) {
      configRef.current = config;
    }
  }, [config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = 300 * ratio;
      ctx.scale(ratio, ratio);

      // Auto-switch to mobile/desktop preset on resize if strictly relying on defaults
      if (!config) {
        configRef.current = window.innerWidth < 768 ? MOBILE_WAVES : DESKTOP_WAVES;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      const time = Date.now();
      const logicalWidth = window.innerWidth;
      const logicalHeight = 300;
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      const centerY = logicalHeight / 2;

      const gradient = ctx.createLinearGradient(0, 0, logicalWidth, 0);
      gradient.addColorStop(0, "#91C848");    // Telenco Groen
      gradient.addColorStop(0.33, "#FFC421"); // Telenet Geel
      gradient.addColorStop(0.66, "#E5394C"); // Energie Rood
      gradient.addColorStop(1, "#0ea5e9");    // Webdesign Blauw

      const midX = logicalWidth / 2;

      const drawSegment = (waveIndices: number[], startX: number, endX: number) => {
        waveIndices.forEach(index => {
          const wave = configRef.current[index];
          if (!wave || wave.visible === false) return;

          const points = [];
          for (let x = startX; x <= endX; x += 3) {
            const envelope = Math.sin((x / logicalWidth) * Math.PI);
            const y = centerY + wave.verticalOffset +
              (Math.sin(x * wave.frequency1 + time * wave.speed1 + wave.phase) * wave.amplitude1 +
                Math.sin(x * wave.frequency2 + time * wave.speed2) * wave.amplitude2) * envelope;
            points.push({ x, y });
          }

          if (points.length === 0 || points[points.length - 1].x < endX) {
            const envelope = Math.sin((endX / logicalWidth) * Math.PI);
            const y = centerY + wave.verticalOffset +
              (Math.sin(endX * wave.frequency1 + time * wave.speed1 + wave.phase) * wave.amplitude1 +
                Math.sin(endX * wave.frequency2 + time * wave.speed2) * wave.amplitude2) * envelope;
            points.push({ x: endX, y });
          }

          ctx.beginPath();
          points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          ctx.shadowBlur = 0;
          ctx.strokeStyle = useGradient ? gradient : (wave.color || '#94a3b8');
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = wave.lineWidth;

          // Optionally add multiply blend mode if it improves colors on light bg:
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.9;

          ctx.stroke();

          ctx.beginPath();
          points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y + wave.highlightOffset) : ctx.lineTo(p.x, p.y + wave.highlightOffset));
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      };

      // Left Hemishpere: Yellow (2) is below Green (3)
      drawSegment([0, 1, 2, 3], 0, midX);

      // Right Hemisphere: Green (3) is below Yellow (2)
      drawSegment([0, 1, 3, 2], midX, logicalWidth);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 w-full top-[75%] sm:top-1/2 -translate-y-1/2 pointer-events-none z-0"
      style={{ height: '300px' }}
    />
  );
}
