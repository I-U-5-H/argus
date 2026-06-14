"use client";
import React from 'react';

interface ShinyTextProps {
  text: string;
  isCritical?: boolean;
}

export const ShinyText: React.FC<ShinyTextProps> = ({ text, isCritical = false }) => {
  return (
    <div className={`
      relative inline-block text-2xl font-bold tracking-widest uppercase
      ${isCritical ? 'text-red-500 animate-pulse' : 'text-green-400'}
    `}>
      <span className="relative z-10" style={{
        background: isCritical 
          ? 'linear-gradient(90deg, #ef4444 0%, #b91c1c 50%, #ef4444 100%)' 
          : 'linear-gradient(90deg, #4ade80 0%, #16a34a 50%, #4ade80 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shine 2s linear infinite'
      }}>
        {text}
      </span>
      {/* Glow effect */}
      <div className={`absolute inset-0 blur-xl opacity-50 z-0 ${isCritical ? 'bg-red-600' : 'bg-green-500'}`}></div>
    </div>
  );
};
