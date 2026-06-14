"use client";

import React, { useEffect, useState, useRef } from "react";

interface TelemetryData {
  status: "NOMINAL" | "CRITICAL";
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

export default function Dashboard() {
  const [data, setData] = useState<TelemetryData>({
    status: "NOMINAL",
    event_spikes: 0,
    membrane_potential: 0.0,
    threshold: 3.0,
    compute_power: "NOMINAL",
  });

  const [history, setHistory] = useState<number[]>(Array(40).fill(0));
  
  const [liveScore, setLiveScore] = useState("100%");
  const [liveRec, setLiveRec] = useState("MONITORING ACTIVE");

  const [inputName, setInputName] = useState("");
  const [inputFleet, setInputFleet] = useState("");
  const [isJourneyStarted, setIsJourneyStarted] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const fetchContractorScore = () => {
    fetch('http://localhost:8000/contractor/score')
      .then(res => res.json())
      .then((resData: ContractorData) => {
        setLiveScore(resData.current_safety_score);
        setLiveRec(resData.recommendation);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/telemetry");

    socket.onmessage = (event) => {
      const incoming = JSON.parse(event.data);
      setData((prev) => ({ ...prev, ...incoming }));
      setHistory((prev) => [...prev.slice(1), incoming.event_spikes || 0]);
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    if (isJourneyStarted) {
      fetchContractorScore();
    }
  }, [data.status, isJourneyStarted]);

  useEffect(() => {
    if (data.status === "CRITICAL") {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (!oscillatorRef.current) {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscillatorRef.current = osc;
        gainNodeRef.current = gain;
      }
    } else {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (e) {
          console.log("Audio clean up error:", e);
        }
        oscillatorRef.current = null;
        gainNodeRef.current = null;
      }
    }

    return () => {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch (e) { }
      }
    };
  }, [data.status]);

  const handleStartJourney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName || !inputFleet) return;
    setIsJourneyStarted(true);
  };

  const safeMembrane = data.membrane_potential || 0;
  const safeThreshold = data.threshold || 1;

  const thresholdPercentage = Math.min(
    (safeMembrane / safeThreshold) * 100,
    100
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white font-mono flex flex-col items-center justify-center p-6 relative overflow-hidden">

      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="w-full max-w-4xl bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-8 shadow-2xl relative z-10">

        <div className="mb-8 relative">
          <div className="text-center text-xs tracking-[0.3em] text-[#555] mb-2 uppercase">
            Neural Guard Status
          </div>

          {data.status === "NOMINAL" ? (
            <div className="w-full py-4 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center justify-center text-green-400 font-bold tracking-widest text-sm transition-all duration-300">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse" />
              SYSTEM NOMINAL
            </div>
          ) : (
            <div className="w-full py-4 rounded-lg bg-red-600/20 border border-red-500 flex items-center justify-center text-red-500 font-bold tracking-[0.15em] text-sm animate-[pulse_0.6s_infinite] transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              🚨 WARNING: EYES CLOSED
            </div>
          )}
        </div>

        {!isJourneyStarted ? (
          <div className="w-full bg-[#0e0e0e] border border-[#161616] p-6 rounded-xl mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 block mb-4">
              📋 Initialize Contractor Dispatch Log
            </span>
            <form onSubmit={handleStartJourney} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="text-[10px] text-[#555] uppercase block mb-1">Driver Name</label>
                <input 
                  type="text" 
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="e.g. Satish Kumar"
                  className="w-full bg-[#141414] border border-[#222] rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-all"
                  required
                />
              </div>
              <div className="flex-1 w-full">
                <label className="text-[10px] text-[#555] uppercase block mb-1">Fleet Node ID</label>
                <input 
                  type="text" 
                  value={inputFleet}
                  onChange={(e) => setInputFleet(e.target.value)}
                  placeholder="e.g. FLEET-MAC-01"
                  className="w-full bg-[#141414] border border-[#222] rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-all"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-black font-bold text-xs uppercase px-6 py-2.5 rounded h-[38px] tracking-wider transition-all"
              >
                Start Journey
              </button>
            </form>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          <div className="bg-[#0e0e0e] border border-[#161616] rounded-xl p-6 flex flex-col h-[200px]">
            <div className="text-xs text-[#666] tracking-wider uppercase mb-4">
              Event Spikes / Real-Time Activity
            </div>

            <div className="flex-1 flex items-end gap-[3px] w-full pt-4">
              {history.map((val, idx) => {
                const heightPercent = Math.min((val / 500) * 100, 100);
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-t-sm transition-all duration-150 ${data.status === "CRITICAL" ? "bg-red-500/40" : "bg-green-500/40"
                      }`}
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  />
                );
              })}
            </div>
          </div>

          <div className="bg-[#0e0e0e] border border-[#161616] rounded-xl p-6 flex flex-col justify-between h-[200px]">
            <div>
              <div className="text-xs text-[#666] tracking-wider uppercase mb-2">
                LIF Neuron Membrane
              </div>
              <div className="text-3xl font-bold tracking-tight mt-1 text-zinc-100">
                {safeMembrane.toFixed(4)}{" "}
                <span className="text-xs text-[#444] font-normal">mV</span>
              </div>
            </div>

            <div className="w-full my-3">
              <div className="flex justify-between text-[10px] text-[#444] mb-1 tracking-wider uppercase">
                <span>Charge State</span>
                <span>Threshold ({safeThreshold.toFixed(1)} mV)</span>
              </div>
              <div className="w-full h-2 bg-[#141414] rounded-full overflow-hidden border border-[#1c1c1c] relative">
                <div
                  className={`h-full rounded-full transition-all duration-150 shadow-[0_0_10px_currentColor] ${data.status === "CRITICAL" ? "text-red-500 bg-red-500" : "text-green-400 bg-green-400"
                    }`}
                  style={{ width: `${thresholdPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] border-t border-[#161616] pt-3">
              <span className="text-[#444] uppercase tracking-wider">Compute Power</span>
              <span className={`font-semibold tracking-widest ${data.status === "CRITICAL" ? "text-amber-500" : "text-green-500"
                }`}>
                {data.compute_power}
              </span>
            </div>
          </div>

        </div>

        <div className="w-full bg-[#0e0e0e] border border-[#161616] p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="text-left w-full sm:w-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 block mb-1">
              🛡️ B2B Contractor Management Layer
            </span>
            <h2 className="text-sm font-light text-zinc-300">
              Driver: <span className="text-white font-medium">{isJourneyStarted ? inputName : "AWAITING INPUT"}</span> | ID: {isJourneyStarted ? inputFleet : "NOT SET"}
            </h2>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-[#1c1c1c] pt-3 sm:pt-0">
            <div className="text-right">
              <span className="text-[10px] text-[#555] block uppercase tracking-wider">Safety Index</span>
              <span className="text-2xl font-bold font-mono text-green-400">
                {isJourneyStarted ? liveScore : "100%"}
              </span>
            </div>

            <div className="bg-[#141414] border border-[#222] px-4 py-2 rounded-lg text-center min-w-[150px]">
              <span className="text-[9px] text-[#555] uppercase tracking-widest block mb-0.5">Fleet Action Memo</span>
              <span className={`text-[10px] font-bold uppercase font-mono ${
                liveRec.includes("WARNING") ? "text-red-400 animate-pulse" : "text-green-400"
              }`}>
                {isJourneyStarted ? liveRec : "READY"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="flex items-center space-x-2 bg-[#0e0e0e] border border-[#161616] px-3 py-1.5 rounded-full text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[#555] tracking-wide">Telemetry Channel Connected</span>
          </div>
        </div>

      </div>
    </main>
  );
}