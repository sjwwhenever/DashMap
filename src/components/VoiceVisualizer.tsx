'use client';

import React, { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function VoiceVisualizer({ 
  audioLevel, 
  isActive, 
  size = 'medium',
  color = '#3B82F6'
}: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const sizeConfig = {
    small: { width: 100, height: 60, bars: 12 },
    medium: { width: 150, height: 80, bars: 20 },
    large: { width: 200, height: 100, bars: 30 }
  };

  const config = sizeConfig[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isActive) {
        // Draw inactive state
        ctx.fillStyle = '#E5E7EB';
        const barWidth = canvas.width / config.bars;
        
        for (let i = 0; i < config.bars; i++) {
          const x = i * barWidth + barWidth * 0.2;
          const barHeight = 4;
          const y = (canvas.height - barHeight) / 2;
          
          ctx.fillRect(x, y, barWidth * 0.6, barHeight);
        }
        return;
      }

      // Draw active visualization
      const barWidth = canvas.width / config.bars;
      const baseHeight = 4;
      const maxHeight = canvas.height * 0.8;

      for (let i = 0; i < config.bars; i++) {
        const x = i * barWidth + barWidth * 0.2;
        
        // Create wave effect with audio level
        const normalizedPosition = i / config.bars;
        const waveOffset = Math.sin(normalizedPosition * Math.PI * 4 + Date.now() * 0.01) * 0.3;
        const barHeight = baseHeight + (audioLevel + waveOffset) * maxHeight;
        
        const y = (canvas.height - barHeight) / 2;
        
        // Gradient based on height
        const alpha = Math.min(1, (barHeight / maxHeight) * 2);
        ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        
        ctx.fillRect(x, y, barWidth * 0.6, barHeight);
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive, color, config]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={config.width}
        height={config.height}
        className="rounded-md"
        style={{ 
          width: config.width, 
          height: config.height,
          filter: isActive ? 'none' : 'grayscale(100%)'
        }}
      />
    </div>
  );
}