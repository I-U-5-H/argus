"use client";
import React, { useEffect, useState, useRef } from 'react';
import { ShinyText } from './react-bits/ShinyText';
import { DotField } from './react-bits/DotField';

interface TelemetryData {
  spikes: number;
  is_micro_sleep: boolean;
  neuron_membrane_potential: number;
}

export const TelemetryDisplay: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    spikes: 0,
    is_micro_sleep: false,
    neuron_membrane_potential: 0
  });
  
  const [spikeHistory, setSpikeHistory] = useState<number[]>(Array(50).fill(0));
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:8000/telemetry');
    
    ws.onopen = () => {
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data: TelemetryData = JSON.parse(event.data);
      setTelemetry(data);
      
      setSpikeHistory(prev => {
        const newHistory = [...prev.slice(1), data.spikes];
        return newHistory;
      });
    };
    
    ws.onclose = () => {
      setIsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, []);

  const isActive = !telemetry.is_micro_sleep;

  return (
    <>
      <DotField isActive={isActive} spikeCount={telemetry.spikes} />
      
      <div className="relative z-10 w-full max-w-4xl p-8 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center gap-8">
          
          {/* Header Status */}
          <div className="text-center">
            <h1 className="text-sm tracking-[0.3em] text-white/50 mb-2 uppercase">Neural Guard Status</h1>
            {!isConnected ? (
              <ShinyText text="CONNECTING TO ENGINE..." isCritical={true} />
            ) : (
              <ShinyText 
                text={telemetry.is_micro_sleep ? "CRITICAL: MICRO-SLEEP DETECTED" : "SYSTEM ACTIVE"} 
                isCritical={telemetry.is_micro_sleep} 
              />
            )}
          </div>
          
          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            
            {/* Spike Counter Panel */}
            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 flex flex-col items-start">
              <span className="text-xs text-white/40 uppercase tracking-widest mb-4">Event Spikes / sec</span>
              <div className="text-6xl font-light text-white font-mono">
                {telemetry.spikes.toString().padStart(5, '0')}
              </div>
              
              {/* Spike visualizer bar */}
              <div className="mt-6 w-full h-12 flex items-end gap-1">
                {spikeHistory.map((val, i) => {
                  const height = Math.min(100, (val / 1000) * 100);
                  return (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-t-sm transition-all duration-75 ${isActive ? 'bg-green-500/80' : 'bg-red-500/80'}`}
                      style={{ height: `${Math.max(2, height)}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* SNN Processor State */}
            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-xs text-white/40 uppercase tracking-widest mb-4 block">LIF Neuron Membrane</span>
                <div className="flex items-end gap-2 text-white">
                  <span className="text-4xl font-mono">{telemetry.neuron_membrane_potential.toFixed(4)}</span>
                  <span className="text-white/40 pb-1">mV</span>
                </div>
              </div>
              
              <div className="mt-8 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/40">COMPUTE POWER</span>
                    <span className={isActive ? 'text-green-400' : 'text-white/40'}>
                      {isActive ? 'NOMINAL' : 'MINIMAL'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isActive ? 'bg-green-500 w-3/4' : 'bg-red-500 w-1/12'}`} 
                    />
                  </div>
                </div>
                
                <div className="text-xs text-white/30 font-mono text-right">
                  ws://localhost:8000/telemetry
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
};
