import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Settings2, 
  Activity, 
  Radio, 
  ArrowRight, 
  Info,
  Waves,
  Zap,
  X
} from 'lucide-react';

export function DopplerSimulator() {
  // --- State ---
  const [velocityKmH, setVelocityKmH] = useState(100); // km/h
  const [frequencyGHz, setFrequencyGHz] = useState(2.5); // GHz
  const [isPlaying, setIsPlaying] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  
  // Display Metrics (updated via ref to avoid re-renders, or throttled state)
  const [metrics, setMetrics] = useState({
    v_ms: 0,
    lambda: 0,
    thetaDeg: 0,
    deltaF: 0,
    distance: 0,
    dopplerShift: 0 // For color coding
  });

  // --- Refs ---
  const requestRef = useRef<number>();
  const carXRef = useRef(0); // Start at 0
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const oscRef = useRef<HTMLCanvasElement>(null);
  const wavePhaseRef = useRef(0); // For oscilloscope animation
  const towerWavesRef = useRef<{r: number, opacity: number}[]>([]);

  // --- Constants ---
  const C = 3e8; // m/s
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const ROAD_Y = 320;
  const TOWER_X = CANVAS_WIDTH / 2;
  const TOWER_Y = 60;
  const PIXELS_PER_METER = 1; // 1px = 1m for calculation scale? 
  // Actually, let's decouple visual scale from physics scale to make numbers look realistic.
  // If screen is 800px wide, let's say it's 800 meters.
  
  // --- Physics Calculation Helper ---
  const calculatePhysics = (carX: number, vKmH: number, fGHz: number) => {
    const v_ms = vKmH * (5 / 18);
    const f_Hz = fGHz * 1e9;
    const lambda = C / f_Hz;

    // Geometry
    // Car moves along y = ROAD_Y. Tower at (TOWER_X, TOWER_Y).
    // In our coordinate system:
    // dx is horizontal distance component. 
    // If car is to the left of tower, vector to tower points right (positive).
    // If car is to the right of tower, vector to tower points left (negative).
    const dx = TOWER_X - carX; 
    const dy = TOWER_Y - ROAD_Y; // Negative, but squared anyway
    const d = Math.sqrt(dx * dx + dy * dy);

    // Cosine Theta
    // Velocity vector is (1, 0) (moving right).
    // Vector to tower is (dx, dy).
    // cosTheta = (v . r) / (|v| |r|) = (1*dx + 0*dy) / (1 * d) = dx / d
    const cosTheta = dx / d;
    
    // Angle in degrees
    // Math.acos returns 0 to PI.
    const thetaRad = Math.acos(cosTheta);
    const thetaDeg = thetaRad * (180 / Math.PI);

    // Doppler Shift
    const deltaF = (v_ms / lambda) * cosTheta;

    return {
      v_ms,
      lambda,
      thetaDeg,
      deltaF,
      distance: d,
      cosTheta
    };
  };

  // --- Animation Loop ---
  useEffect(() => {
    const animate = () => {
      if (isPlaying) {
        // Move Car
        // Scale velocity for visual movement
        // Real v_ms is ~27 m/s for 100km/h.
        // If 1px = 1m, then 27px/sec. At 60fps, that's ~0.45 px/frame.
        // Let's speed it up visually by factor of 5 for better UX.
        const speedScale = 5; 
        const v_ms = velocityKmH * (5 / 18);
        const moveStep = (v_ms / 60) * speedScale;
        
        carXRef.current += moveStep;
        if (carXRef.current > CANVAS_WIDTH + 50) {
          carXRef.current = -50; // Loop back
        }
      }

      // Physics
      const phys = calculatePhysics(carXRef.current, velocityKmH, frequencyGHz);
      setMetrics(prev => ({
        ...phys,
        dopplerShift: phys.deltaF // Keep track for coloring
      }));

      // Draw Main Canvas
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Road
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, ROAD_Y + 20, CANVAS_WIDTH, 4);

        // Draw Tower
        drawTower(ctx, TOWER_X, TOWER_Y);

        // Draw Car
        drawCar(ctx, carXRef.current, ROAD_Y, phys.deltaF);

        // Draw LOS Tether
        drawLOS(ctx, carXRef.current, ROAD_Y, TOWER_X, TOWER_Y, phys.deltaF);

        // Draw Angle Arc
        drawAngle(ctx, carXRef.current, ROAD_Y, phys.thetaDeg, phys.cosTheta);

        // Draw Tower Waves
        updateAndDrawWaves(ctx, TOWER_X, TOWER_Y, isPlaying);
      }

      // Draw Oscilloscope
      const oscCtx = oscRef.current?.getContext('2d');
      if (oscCtx) {
        drawOscilloscope(oscCtx, phys.deltaF, isPlaying);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, velocityKmH, frequencyGHz]);

  // --- Drawing Helpers ---

  const drawTower = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#1e293b';
    // Base
    ctx.beginPath();
    ctx.moveTo(x - 15, y + 40);
    ctx.lineTo(x + 15, y + 40);
    ctx.lineTo(x, y);
    ctx.fill();
    // Antenna
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
  };

  const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, deltaF: number) => {
    // Color based on Doppler
    // Blue (>0), Grey (~0), Red (<0)
    let color = '#64748b'; // Slate 500
    if (deltaF > 50) color = '#3b82f6'; // Blue
    else if (deltaF < -50) color = '#ef4444'; // Red
    
    ctx.fillStyle = color;
    // Simple Car Shape
    ctx.beginPath();
    ctx.roundRect(x - 20, y - 10, 40, 20, 5);
    ctx.fill();
    // Wheels
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x - 12, y + 10, 6, 0, Math.PI * 2);
    ctx.arc(x + 12, y + 10, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Receiver Icon
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y - 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 10, 8, Math.PI, 0);
    ctx.stroke();
  };

  const drawLOS = (ctx: CanvasRenderingContext2D, carX: number, carY: number, towerX: number, towerY: number, deltaF: number) => {
    let color = '#cbd5e1'; // Slate 300
    if (deltaF > 50) color = '#60a5fa'; // Blue 400
    else if (deltaF < -50) color = '#f87171'; // Red 400

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(carX, carY - 10); // From receiver
    ctx.lineTo(towerX, towerY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawAngle = (ctx: CanvasRenderingContext2D, carX: number, carY: number, thetaDeg: number, cosTheta: number) => {
    const radius = 40;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    // Draw horizontal ref line
    ctx.beginPath();
    ctx.moveTo(carX, carY - 10);
    ctx.lineTo(carX + radius + 10, carY - 10);
    ctx.stroke();

    // Draw Arc
    // Vector to tower angle
    const dx = TOWER_X - carX;
    const dy = TOWER_Y - (carY - 10);
    const angleToTower = Math.atan2(dy, dx);
    
    ctx.beginPath();
    // Start at 0 (horizontal right)
    // End at angleToTower
    // Note: canvas y is down, so dy is negative. atan2 works correctly.
    // If car is left, dx>0, angle is negative (e.g. -45 deg).
    // If car is right, dx<0, angle is large negative (e.g. -135 deg).
    ctx.arc(carX, carY - 10, radius, 0, angleToTower, true);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#475569';
    ctx.font = '10px Inter';
    ctx.fillText(`${thetaDeg.toFixed(0)}°`, carX + 10, carY - 25);
  };

  const updateAndDrawWaves = (ctx: CanvasRenderingContext2D, x: number, y: number, playing: boolean) => {
    // Add new wave periodically
    if (playing && Math.random() < 0.05) {
      towerWavesRef.current.push({ r: 0, opacity: 1 });
    }

    // Update and Draw
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    
    for (let i = towerWavesRef.current.length - 1; i >= 0; i--) {
      const wave = towerWavesRef.current[i];
      if (playing) {
        wave.r += 2;
        wave.opacity -= 0.005;
      }
      
      if (wave.opacity <= 0) {
        towerWavesRef.current.splice(i, 1);
      } else {
        ctx.beginPath();
        ctx.globalAlpha = wave.opacity;
        ctx.arc(x, y, wave.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  };

  const drawOscilloscope = (ctx: CanvasRenderingContext2D, deltaF: number, playing: boolean) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform
    // Base frequency (visual)
    const baseFreq = 0.05;
    // Map deltaF to frequency shift
    // deltaF range is roughly -500 to +500 Hz depending on v and fc.
    // Let's scale it so max shift doubles or halves the frequency.
    const scaleFactor = 0.0002; 
    const freq = baseFreq + (deltaF * scaleFactor);
    
    if (playing) {
      wavePhaseRef.current += freq * 5; // Animation speed
    }

    ctx.beginPath();
    ctx.strokeStyle = deltaF > 50 ? '#3b82f6' : deltaF < -50 ? '#ef4444' : '#22c55e';
    ctx.lineWidth = 2;

    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(x * freq + wavePhaseRef.current) * (height * 0.4);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  // --- Render ---
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-6 h-6 text-indigo-600" />
            Doppler Effect Simulation
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Observe frequency shifts in a wireless channel caused by relative motion.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <button
            onClick={() => setShowInfo(true)}
            className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            title="View Formulas"
          >
            <Info className="w-4 h-4" />
          </button>
           <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
              isPlaying 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Resume'}
          </button>
        </div>
      </header>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInfo(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                Doppler Formulas
              </h3>
              <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Wavelength</div>
                <div className="flex items-center gap-2">
                  <code className="text-slate-900 font-mono font-bold text-sm">λ = c / f_c</code>
                </div>
                <p className="text-[10px] mt-1.5 text-slate-500">c = 3×10⁸ m/s (Speed of Light)</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Angle of Arrival</div>
                <div className="flex items-center gap-2">
                  <code className="text-slate-900 font-mono font-bold text-sm">cos(θ) = Δx / d</code>
                </div>
                <p className="text-[10px] mt-1.5 text-slate-500">Angle between velocity vector and tower direction</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Doppler Shift</div>
                <div className="flex items-center gap-2">
                  <code className="text-slate-900 font-mono font-bold text-sm">Δf = (v / λ) · cos(θ)</code>
                </div>
                <p className="text-[10px] mt-1.5 text-slate-500">v = Velocity (m/s)</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Received Frequency</div>
                <div className="flex items-center gap-2">
                  <code className="text-slate-900 font-mono font-bold text-sm">f_rx = f_c + Δf</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Main Simulation Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Top Canvas: Physical Map */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative flex-1 min-h-[300px]">
            <canvas 
              ref={canvasRef}
              width={800}
              height={400}
              className="w-full h-full object-cover block bg-slate-50"
            />
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 shadow-sm">
              Physical View
            </div>
          </div>

          {/* Bottom Canvas: Oscilloscope */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden relative h-48 shrink-0">
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
            <canvas 
              ref={oscRef}
              width={800}
              height={200}
              className="w-full h-full block relative z-10"
            />
            <div className="absolute top-3 left-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rx Signal (Baseband)</span>
            </div>
            <div className="absolute bottom-3 right-4 text-xs font-mono text-slate-500">
              Time Domain
            </div>
          </div>
        </div>

        {/* Controls & Metrics Panel */}
        <div className="space-y-6">
          
          {/* Controls */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-4">
              <Settings2 className="w-5 h-5 text-indigo-600" />
              Simulation Parameters
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-600">Velocity (v)</label>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">{velocityKmH} km/h</span>
                </div>
                <input 
                  type="range" min="0" max="200" step="1"
                  value={velocityKmH}
                  onChange={(e) => setVelocityKmH(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-600">Carrier Freq (fc)</label>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">{frequencyGHz.toFixed(1)} GHz</span>
                </div>
                <input 
                  type="range" min="1.0" max="5.0" step="0.1"
                  value={frequencyGHz}
                  onChange={(e) => setFrequencyGHz(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </section>

          {/* Live Metrics Dashboard */}
          <section className="bg-slate-900 rounded-2xl p-6 shadow-xl text-slate-300 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold border-b border-slate-800 pb-4">
              <Activity className="w-5 h-5 text-emerald-400" />
              Live Telemetry
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Velocity</div>
                <div className="text-xl font-mono text-white">{metrics.v_ms.toFixed(1)} <span className="text-xs text-slate-500">m/s</span></div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Wavelength</div>
                <div className="text-xl font-mono text-white">{metrics.lambda.toFixed(3)} <span className="text-xs text-slate-500">m</span></div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Angle (θ)</div>
                <div className="text-xl font-mono text-white">{metrics.thetaDeg.toFixed(1)}°</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Distance</div>
                <div className="text-xl font-mono text-white">{metrics.distance.toFixed(0)} <span className="text-xs text-slate-500">m</span></div>
              </div>
            </div>

            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Doppler Shift (Δf)</div>
              <div className={`text-3xl font-mono font-bold transition-colors ${
                metrics.deltaF > 10 ? 'text-blue-400' : metrics.deltaF < -10 ? 'text-red-400' : 'text-slate-200'
              }`}>
                {metrics.deltaF > 0 ? '+' : ''}{metrics.deltaF.toFixed(2)} <span className="text-sm font-normal text-slate-500">Hz</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Received: {(frequencyGHz * 1e9 + metrics.deltaF).toExponential(4)} Hz
              </div>
            </div>
          </section>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-slate-500 justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Approaching (Blueshift)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Receding (Redshift)</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
