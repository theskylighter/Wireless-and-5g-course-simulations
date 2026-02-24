import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { 
  Settings2, 
  Activity, 
  TowerControl as Tower, 
  Car, 
  Building2, 
  Play, 
  Pause, 
  RotateCcw,
  Info,
  Zap,
  X
} from 'lucide-react';
import { InlineMath, BlockMath } from 'react-katex';

interface Point {
  x: number;
  y: number;
}

interface Building extends Point {
  id: number;
}

export function MultipathSimulator() {
  // Constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const TX_POS: Point = { x: 100, y: 100 };
  const ROAD_Y = 350;
  const C = 300; // Scaled speed of light (units/tick)
  const GAMMA = 2.0;
  const REFLECTION_COEFF = 0.5;

  // State
  const [rxX, setRxX] = useState(100);
  const [isMoving, setIsMoving] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([
    { id: 1, x: 300, y: 200 },
    { id: 2, x: 500, y: 150 },
    { id: 3, x: 650, y: 250 },
  ]);
  const [draggedBuildingId, setDraggedBuildingId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Rx Position (Car)
  const rxPos: Point = useMemo(() => ({ x: rxX, y: ROAD_Y }), [rxX]);

  // Simulation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMoving) {
      interval = setInterval(() => {
        setRxX(prev => {
          const next = prev + 2;
          return next > CANVAS_WIDTH - 100 ? 100 : next;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isMoving]);

  // Physics Calculations
  const multipathData = useMemo(() => {
    // LOS Path
    const d0 = Math.sqrt(Math.pow(rxPos.x - TX_POS.x, 2) + Math.pow(rxPos.y - TX_POS.y, 2));
    const tau0 = d0 / C;
    const a0 = 1000 / Math.pow(d0, GAMMA);

    const paths = [
      { id: 'LOS', delay: tau0, amplitude: a0, color: '#10b981' }
    ];

    // NLOS Paths
    buildings.forEach((b, idx) => {
      const d_tx_b = Math.sqrt(Math.pow(b.x - TX_POS.x, 2) + Math.pow(b.y - TX_POS.y, 2));
      const d_b_rx = Math.sqrt(Math.pow(rxPos.x - b.x, 2) + Math.pow(rxPos.y - b.y, 2));
      const di = d_tx_b + d_b_rx;
      const taui = di / C;
      const ai = (1000 * REFLECTION_COEFF) / Math.pow(di, GAMMA);
      
      paths.push({
        id: `NLOS ${idx + 1}`,
        delay: taui,
        amplitude: ai,
        color: '#f43f5e'
      });
    });

    return paths.sort((a, b) => a.delay - b.delay);
  }, [rxPos, buildings]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Road
    ctx.strokeStyle = '#e2e8f0';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, ROAD_Y);
    ctx.lineTo(CANVAS_WIDTH, ROAD_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw LOS Path
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(TX_POS.x, TX_POS.y);
    ctx.lineTo(rxPos.x, rxPos.y);
    ctx.stroke();

    // Draw NLOS Paths
    buildings.forEach(b => {
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(TX_POS.x, TX_POS.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(rxPos.x, rxPos.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw Tx (Base Station)
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(TX_POS.x, TX_POS.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('TX', TX_POS.x, TX_POS.y + 4);

    // Draw Buildings
    buildings.forEach(b => {
      ctx.fillStyle = draggedBuildingId === b.id ? '#cbd5e1' : '#94a3b8';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.fillRect(b.x - 20, b.y - 20, 40, 40);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x - 20, b.y - 20, 40, 40);
      
      // Windows
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.x - 12, b.y - 12, 8, 8);
      ctx.fillRect(b.x + 4, b.y - 12, 8, 8);
      ctx.fillRect(b.x - 12, b.y + 4, 8, 8);
      ctx.fillRect(b.x + 4, b.y + 4, 8, 8);
    });

    // Draw Rx (Car)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(rxPos.x - 15, rxPos.y - 10, 30, 15);
    ctx.beginPath();
    ctx.arc(rxPos.x - 10, rxPos.y + 5, 4, 0, Math.PI * 2);
    ctx.arc(rxPos.x + 10, rxPos.y + 5, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [rxPos, buildings, draggedBuildingId]);

  // Mouse Handlers for Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedBuilding = buildings.find(b => 
      x >= b.x - 25 && x <= b.x + 25 && y >= b.y - 25 && y <= b.y + 25
    );

    if (clickedBuilding) {
      setDraggedBuildingId(clickedBuilding.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedBuildingId === null) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setBuildings(prev => prev.map(b => 
      b.id === draggedBuildingId ? { ...b, x, y } : b
    ));
  };

  const handleMouseUp = () => {
    setDraggedBuildingId(null);
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Multipath & Impulse Response</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMoving(!isMoving)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors ${isMoving ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}
            >
              {isMoving ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isMoving ? 'Pause Car' : 'Resume Car'}
            </button>
            <button 
              onClick={() => { setRxX(100); setIsMoving(false); }}
              className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-slate-500 max-w-2xl">
          Drag the buildings to see how reflections create multiple signal paths with different time delays and amplitudes.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* 2D Map Canvas */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              2D Propagation Map
            </h3>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <div className="w-3 h-0.5 bg-emerald-500" /> LOS Path
              </div>
              <div className="flex items-center gap-1.5 text-rose-500">
                <div className="w-3 h-0.5 bg-rose-500 border-dashed" /> NLOS Reflections
              </div>
            </div>
          </div>
          <div className="relative bg-slate-50 rounded-2xl border border-slate-100 cursor-crosshair">
            <canvas 
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-auto block"
            />
            {draggedBuildingId !== null && (
              <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
                DRAGGING BUILDING {draggedBuildingId}
              </div>
            )}
          </div>
        </div>

        {/* Impulse Response Chart */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-800">Channel Impulse Response h(τ)</h3>
              <p className="text-xs text-slate-400 mt-1">Power Delay Profile (PDP) visualization</p>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-[10px] font-mono">
              <span className="text-slate-400">Max Delay Spread:</span>
              <span className="ml-2 font-bold text-slate-700">
                {(Math.max(...multipathData.map(p => p.delay)) - Math.min(...multipathData.map(p => p.delay))).toFixed(2)} units
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={multipathData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="delay" 
                  type="number" 
                  domain={[0, 5]} 
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Time Delay (τ)', position: 'insideBottom', offset: -10, fontSize: 10 }}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Amplitude (a)', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [value.toFixed(2), 'Amplitude']}
                  labelFormatter={(label: number) => `Delay: ${label.toFixed(2)}`}
                />
                <Bar dataKey="amplitude" radius={[4, 4, 0, 0]} barSize={4}>
                  {multipathData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Understanding the Simulation - Educational Panel */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Info className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Understanding the Simulation</h3>
            <p className="text-slate-500 text-sm">Physics and Visualization Guide</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Section 1: Propagation Map */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">1. The Propagation Map</h4>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong className="text-emerald-600">Green Line (Line of Sight - LOS):</strong> The direct, unobstructed path from the Base Station to the Car. This is the shortest and strongest signal.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong className="text-rose-600">Red Dashed Lines (Non-Line of Sight - NLOS):</strong> These are "radio echoes." The signal radiates in all directions, bounces off buildings (reflectors), and reaches the car later than the direct path.
                </p>
              </li>
            </ul>
          </div>

          {/* Section 2: Impulse Response Chart */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">2. The Impulse Response Chart <InlineMath math="h(\tau)" /></h4>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong>X-Axis (Time Delay):</strong> Shows when the signals arrive. <strong>Y-Axis (Amplitude):</strong> Shows how strong the signal is upon arrival.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong className="text-emerald-600">The Green Spike:</strong> Represents the direct LOS path. It appears first (furthest left) because it traveled the shortest distance, and it is the tallest because it lost the least power.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong className="text-rose-600">The Red Spikes:</strong> Represent the bounced NLOS paths. They appear later (shifted right) due to the extra distance traveled, and they are shorter because the signal loses power over distance and from scattering off buildings.
                </p>
              </li>
            </ul>
          </div>

          {/* Section 3: Why This Matters */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">3. Why This Matters (The 5G Problem)</h4>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
              <div>
                <h5 className="text-xs font-bold text-slate-900 uppercase mb-1">Max Delay Spread</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The time difference between the arrival of the first signal (green) and the very last echo (last red spike).
                </p>
              </div>
              <div>
                <h5 className="text-xs font-bold text-rose-600 uppercase mb-1">Inter-Symbol Interference (ISI)</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  In digital networks, we send billions of 1s and 0s per second. If the delay spread is too large, the delayed "echo" of a previous bit will overlap and corrupt the direct signal of the next bit, destroying the data transmission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
