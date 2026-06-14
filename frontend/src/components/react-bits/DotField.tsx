"use client";
import React, { useEffect, useRef } from 'react';

interface DotFieldProps {
  isActive: boolean;
  spikeCount: number;
}

export const DotField: React.FC<DotFieldProps> = ({ isActive, spikeCount }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use refs so animation loop always reads latest value without restarting
  const isActiveRef = useRef(isActive);
  const spikeCountRef = useRef(spikeCount);

  // Keep refs in sync with props
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    spikeCountRef.current = spikeCount;
  }, [spikeCount]);

  // Set up the canvas & animation loop only once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const setupCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setupCanvas();

    const width = canvas.width;
    const height = canvas.height;

    const dots: { x: number; y: number; baseAlpha: number; currentAlpha: number }[] = [];
    const spacing = 40;

    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        dots.push({
          x: x + (Math.random() * 10 - 5),
          y: y + (Math.random() * 10 - 5),
          baseAlpha: Math.random() * 0.3 + 0.1,
          currentAlpha: 0.1,
        });
      }
    }

    const render = () => {
      const active = isActiveRef.current;
      const spikes = spikeCountRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dots.forEach((dot) => {
        let targetAlpha = dot.baseAlpha;
        if (active && Math.random() < spikes / 10000) {
          targetAlpha = 0.8;
        } else if (!active) {
          targetAlpha = 0.05;
        }

        dot.currentAlpha += (targetAlpha - dot.currentAlpha) * 0.1;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${active ? '74, 222, 128' : '239, 68, 68'}, ${dot.currentAlpha})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // Empty dependency array: set up once, refs handle live updates

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};
