"use client";

import React, { useEffect, useState, useRef } from "react";

interface TelemetryData {
  status: "NOMINAL" | "CRITICAL";
  event_spikes: number;
  membrane_potential: number;
  threshold: number;
  compute_power: string;
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
  const [alertSeconds, setAlertSeconds] = useState(0);
  const [sosActive, setSosActive] = useState(false);
  const [sosSeconds, setSosSeconds] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. WebSocket
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/telemetry");
    socket.onmessage = (event) => {
      const incoming = JSON.parse(event.data);
      setData((prev) => ({ ...prev, ...incoming }));
      setHistory((prev) => [...prev.slice(1), incoming.event_spikes || 0]);
    };
    return () => socket.close();
  }, []);

  // 2. Alert + SOS Timer
  useEffect(() => {
    if (data.status === "CRITICAL") {
      if (!alertTimerRef.current) {
        alertTimerRef.current = setInterval(() => {
          setAlertSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (alertTimerRef.current) { clearInterval(alertTimerRef.current); alertTimerRef.current = null; }
      if (sosTimerRef.current) { clearInterval(sosTimerRef.current); sosTimerRef.current = null; }
      setAlertSeconds(0);
      setSosActive(false);
      setSosSeconds(0);
    }
  }, [data.status]);

  // 3. Trigger SOS after 180s
  useEffect(() => {
    if (alertSeconds >= 180 && !sosActive) {
      setSosActive(true);
      sosTimerRef.current = setInterval(() => {
        setSosSeconds((prev) => prev + 1);
      }, 1000);
    }
  }, [alertSeconds, sosActive]);

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) clearInterval(alertTimerRef.current);
      if (sosTimerRef.current) clearInterval(sosTimerRef.current);
    };
  }, []);

  // 4. Audio
  useEffect(() => {
    if (data.status === "CRITICAL") {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (!oscillatorRef.current) {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = sosActive ? "square" : "sawtooth";
        osc.frequency.setValueAtTime(sosActive ? 1200 : 880, ctx.currentTime);
        gain.gain.setValueAtTime(sosActive ? 0.3 : 0.15, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscillatorRef.current = osc;
      }
    } else {
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); oscillatorRef.current.disconnect(); } catch (e) {}
        oscillatorRef.current = null;
      }
    }
    return () => {
      if (oscillatorRef.current) { try { oscillatorRef.current.stop(); } catch (e) {} }
    };
  }, [data.status, sosActive]);

  const safeMembrane = data.membrane_potential || 0;
  const safeThreshold = data.threshold || 1;
  const thresholdPercentage = Math.min((safeMembrane / safeThreshold) * 100, 100);
  const alertProgress = Math.min((alertSeconds / 180) * 100, 100);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white font-mono flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Cyber Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="w-full max-w-4xl bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-8 shadow-2xl relative z-10">

        {/* Status Banner */}
        <div className="mb-6">
          <div className="text-center text-xs tracking-[0.3em] text-[#555] mb-2 uppercase">
            Neural Guard Status
          </div>
          {data.status === "NOMINAL" ? (
            <div className="w-full py-4 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center justify-center text-green-400 font-bold tracking-widest text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse" />
              SYSTEM NOMINAL
            </div>
          ) : (
            <div className="w-full py-4 rounded-lg bg-red-600/20 border border-red-500 flex items-center justify-center text-red-500 font-bold tracking-[0.15em] text-sm animate-[pulse_0.6s_infinite] shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              🚨 WARNING: EYES CLOSED
            </div>
          )}
        </div>

        {/* Alert Timer — ALWAYS VISIBLE */}
        <div className={`mb-6 rounded-xl p-4 border transition-all duration-500 ${
          data.status === "CRITICAL" && !sosActive
            ? "bg-[#0e0e0e] border-amber-500/40"
            : "bg-[#0a0a0a] border-[#1a1a1a] opacity-50"
        }`}>
          <div className="flex justify-between text-[11px] uppercase tracking-wider mb-2">
            <span className={data.status === "CRITICAL" && !sosActive ? "text-amber-400" : "text-[#444]"}>
              ⚠ Alert Timer
            </span>
            <span className={`font-bold ${data.status === "CRITICAL" && !sosActive ? "text-amber-400" : "text-[#333]"}`}>
              {formatTime(alertSeconds)} / 03:00
            </span>
          </div>
          <div className="w-full h-3 bg-[#141414] rounded-full overflow-hidden border border-[#1c1c1c]">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${alertProgress}%`,
                background: alertProgress > 66
                  ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                  : alertProgress > 33
                  ? "linear-gradient(90deg, #eab308, #f59e0b)"
                  : alertProgress > 0 ? "#eab308" : "transparent",
              }}
            />
          </div>
          <div className={`text-[10px] mt-2 tracking-wide ${data.status === "CRITICAL" && !sosActive ? "text-[#555]" : "text-[#333]"}`}>
            {data.status === "CRITICAL" && !sosActive
              ? `SOS will dispatch in ${formatTime(180 - alertSeconds)}`
              : "Monitoring driver eye state..."}
          </div>
        </div>

        {/* SOS Panel — ALWAYS VISIBLE */}
        <div className={`mb-6 rounded-xl border-2 p-4 transition-all duration-500 ${
          sosActive
            ? "border-red-600 bg-red-950/30 shadow-[0_0_30px_rgba(220,38,38,0.3)] animate-[pulse_0.8s_infinite]"
            : "border-[#1a1a1a] bg-[#0a0a0a] opacity-40"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{sosActive ? "🆘" : "🛡️"}</span>
              <div>
                <div className={`font-bold tracking-[0.2em] text-sm uppercase ${sosActive ? "text-red-400" : "text-[#333]"}`}>
                  {sosActive ? "SOS Dispatching" : "SOS Standby"}
                </div>
                <div className={`text-[11px] tracking-wider mt-0.5 ${sosActive ? "text-red-600" : "text-[#2a2a2a]"}`}>
                  {sosActive ? "Driver unresponsive — emergency alert active" : "No emergency detected"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-bold text-lg ${sosActive ? "text-red-400" : "text-[#222]"}`}>
                {formatTime(sosSeconds)}
              </div>
              <div className={`text-[10px] tracking-wider uppercase ${sosActive ? "text-red-700" : "text-[#222]"}`}>
                SOS Duration
              </div>
            </div>
          </div>
          <div className="mt-3 w-full h-2 bg-[#0e0e0e] rounded-full overflow-hidden border border-[#1a1a1a]">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${sosActive ? "bg-red-500" : "bg-[#1a1a1a]"}`}
              style={{ width: sosActive ? `${Math.min((sosSeconds / 60) * 100, 100)}%` : "0%" }}
            />
          </div>
          <div className={`text-[10px] mt-1 tracking-wide ${sosActive ? "text-red-700" : "text-[#222]"}`}>
            {sosActive ? "Open eyes to cancel SOS" : "Will activate after 3 min of closed eyes"}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Event Spikes Graph */}
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
                    className={`flex-1 rounded-t-sm transition-all duration-150 ${
                      sosActive ? "bg-red-700/60" : data.status === "CRITICAL" ? "bg-red-500/40" : "bg-green-500/40"
                    }`}
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* LIF Neuron Membrane */}
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
              <div className="w-full h-2 bg-[#141414] rounded-full overflow-hidden border border-[#1c1c1c]">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    sosActive ? "bg-red-700" : data.status === "CRITICAL" ? "bg-red-500" : "bg-green-400"
                  }`}
                  style={{ width: `${thresholdPercentage}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center text-[11px] border-t border-[#161616] pt-3">
              <span className="text-[#444] uppercase tracking-wider">Compute Power</span>
              <span className={`font-semibold tracking-widest ${
                sosActive ? "text-red-600" : data.status === "CRITICAL" ? "text-amber-500" : "text-green-500"
              }`}>
                {sosActive ? "SOS ACTIVE" : data.compute_power}
              </span>
            </div>
          </div>

        </div>

        {/* Telemetry Badge */}
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