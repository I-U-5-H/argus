"use client";
import React, { useEffect, useState } from 'react';
import { ShinyText } from './react-bits/ShinyText';
import { DotField } from './react-bits/DotField';

interface TelemetryData {
  status: string;
  event_spikes: number;
  membrane_potential: number;
  threshold: number;
  compute_power: string;
}

interface ContractorData {
  fleet_id: string;
  driver_name: string;
  current_safety_score: string;
  recommendation: string;
}

export const TelemetryDisplay: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    status: "NOMINAL",
    event_spikes: 0,
    membrane_potential: 0,
    threshold: 1.0,
    compute_power: "NOMINAL"
  });
  
  const [spikeHistory, setSpikeHistory] = useState<number[]>(Array(50).fill(0));
  const [isConnected, setIsConnected] = useState(false);
  
  const [contractorScore, setContractorScore] = useState<ContractorData>({
    fleet_id: "FLEET-MAC-01",
    driver_name: "Satish Kumar",
    current_safety_score: "100%",
    recommendation: "FLEET ONLINE"
  });

  const fetchContractorScore = () => {
    fetch('http://localhost:8000/contractor/score')
      .then(res => res.json())
      .then((data: ContractorData) => setContractorScore(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchContractorScore();

    const ws = new WebSocket('ws://localhost:8000/telemetry');
    
    ws.onopen = () => {
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data: TelemetryData = JSON.parse(event.data);
      setTelemetry(data);
      
      setSpikeHistory(prev => {
        const newHistory = [...prev.slice(1), data.event_spikes];
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

  useEffect(() => {
    fetchContractorScore();
  }, [telemetry.status]);

  const isActive = telemetry.status === "NOMINAL";

  return (
    <>
      <DotField isActive={isActive} spikeCount={telemetry.event_spikes} />
      
      <div className="relative z-10 w-full max-w-4xl p-8 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center gap-6">
          
          <div className="text-center">
            <h1 className="text-sm tracking-[0.3em] text-white/50 mb-2 uppercase">Neural Guard Status</h1>
            {!isConnected ? (
              <ShinyText text="CONNECTING TO ENGINE..." isCritical={true} />
            ) : (
              <ShinyText 
                text={telemetry.status === "CRITICAL" ? "CRITICAL: MICRO-SLEEP DETECTED" : "SYSTEM ACTIVE"} 
                isCritical={telemetry.status === "CRITICAL"} 
              />
            )}
          </div>

          <div className="w-full bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 block mb-0.5">
                🛡️ Contractor Audit Panel
              </span>
              <h2 className="text-sm font-light text-white">
                Driver: <span className="text-white/80 font-medium">{contractorScore.driver_name}</span> | ID: {contractorScore.fleet_id}
              </h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] text-white/40 block uppercase tracking-wider">Safety Index</span>
                <span className="text-2xl font-bold font-mono text-green-400">
                  {contractorScore.current_safety_score}
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-center min-w-[140px]">
                <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-0.5">Action Memo</span>
                <span className={`text-[10px] font-bold uppercase font-mono ${
                  contractorScore.recommendation.includes("WARNING") ? "text-red-400" : "text-green-400"
                }`}>
                  {contractorScore.recommendation}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            
            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 flex flex-col items-start">
              <span className="text-xs text-white/40 uppercase tracking-widest mb-4">Event Spikes / Real-Time Activity</span>
              <div className="text-6xl font-light text-white font-mono">
                {telemetry.event_spikes.toString().padStart(5, '0')}
              </div>
              
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

            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-xs text-white/40 uppercase tracking-widest mb-4 block">LIF Neuron Membrane</span>
                <div className="flex items-end gap-2 text-white">
                  <span className="text-4xl font-mono">{telemetry.membrane_potential.toFixed(4)}</span>
                  <span className="text-white/40 pb-1">mV</span>
                </div>
              </div>
              
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white/40">CHARGE STATE</span>
                    <span className="text-white/40">THRESHOLD (1.0 MV)</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${isActive ? 'bg-green-500' : 'bg-red-500'}`} 
                      style={{ width: `${Math.min(100, telemetry.membrane_potential * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs pt-2">
                  <span className="text-white/40">COMPUTE POWER</span>
                  <span className={isActive ? 'text-green-400' : 'text-red-400'}>
                    {telemetry.compute_power}
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2 self-end text-xs text-white/30 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
            Telemetry Channel Connected
          </div>

        </div>
      </div>
    </>
  );
};