import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Settings2, 
  Info, 
  Grid, 
  Zap, 
  Activity, 
  ArrowRight,
  AlertTriangle,
  Maximize2
} from 'lucide-react';

export function CellularSimulator() {
  // Simulation Parameters
  const [i, setI] = useState(2);
  const [j, setJ] = useState(1);
  const R = 30; // Hexagon radius

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Derived Calculations
  const N = useMemo(() => {
    const val = i * i + i * j + j * j;
    return val === 0 ? 1 : val;
  }, [i, j]);

  const D = useMemo(() => {
    return (R * Math.sqrt(3 * N)).toFixed(1);
  }, [R, N]);

  // Colors for clusters
  const clusterColors = useMemo(() => {
    const colors = [
      '#ef4444', // Red (Frequency Band A)
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Amber
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#14b8a6', // Teal
      '#6366f1', // Indigo
      '#84cc16', // Lime
      '#a855f7', // Purple
      '#0ea5e9', // Sky
      '#f43f5e', // Rose
      '#10b981', // Emerald
    ];
    // If N is larger than colors array, we'll cycle
    return Array.from({ length: N }, (_, idx) => colors[idx % colors.length]);
  }, [N]);

  // Hexagon Drawing Helper (Pointy-Topped)
  const drawHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, isHighlighted: boolean) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const angle_deg = 60 * k - 30;
      const angle_rad = (Math.PI / 180) * angle_deg;
      const px = x + radius * Math.cos(angle_rad);
      const py = y + radius * Math.sin(angle_rad);
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    
    ctx.fillStyle = color;
    ctx.globalAlpha = isHighlighted ? 1.0 : 0.15;
    ctx.fill();
    
    ctx.strokeStyle = isHighlighted ? '#1e293b' : '#cbd5e1';
    ctx.lineWidth = isHighlighted ? 2 : 0.5;
    ctx.globalAlpha = isHighlighted ? 1.0 : 0.3;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const hexWidth = Math.sqrt(3) * R;
    const verticalSpacing = 1.5 * R;

    // Calculate ranges to cover the canvas
    const qRange = Math.ceil(width / hexWidth) + 5;
    const rRange = Math.ceil(height / verticalSpacing) + 5;

    const centers: {x: number, y: number, color: string, isRed: boolean, q: number, r: number}[] = [];

    for (let r = -rRange; r <= rRange; r++) {
      for (let q = -qRange; q <= qRange; q++) {
        // Pointy-Topped Axial to Pixel Conversion
        const x = width / 2 + R * Math.sqrt(3) * (q + r / 2.0);
        const y = height / 2 + R * (3.0 / 2.0) * r;

        // Skip if way off screen to save performance
        if (x < -R * 2 || x > width + R * 2 || y < -R * 2 || y > height + R * 2) continue;

        // Cluster Index Logic: (q * i + r * (i + j)) % N
        const clusterIdx = (((q * i + r * (i + j)) % N) + N) % N;
        const color = clusterColors[clusterIdx];
        const isRed = clusterIdx === 0;

        drawHexagon(ctx, x, y, R, color, isRed);
        
        if (isRed) {
          centers.push({ x, y, color, isRed, q, r });
        }
      }
    }

    // Draw Co-Channel Distance Line from (0,0) to (i,j)
    const centerCell = centers.find(c => c.q === 0 && c.r === 0);
    const targetCell = centers.find(c => c.q === i && c.r === j);

    if (centerCell && targetCell) {
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.moveTo(centerCell.x, centerCell.y);
      ctx.lineTo(targetCell.x, targetCell.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label D
      const midX = (centerCell.x + targetCell.x) / 2;
      const midY = (centerCell.y + targetCell.y) / 2;
      
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'white';
      ctx.fillText(`D = ${D}m`, midX, midY - 10);
      ctx.shadowBlur = 0;
    }

  }, [i, j, N, D, clusterColors]);

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Cellular Network Design</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm border border-blue-100">
            <Maximize2 className="w-4 h-4" />
            Frequency Reuse Simulation
          </div>
        </div>
        <p className="text-slate-500 max-w-2xl">
          Optimize spectrum efficiency by managing cluster sizes and co-channel interference through geometric frequency reuse.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <Settings2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">Reuse Parameters</h3>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-600">Shift Parameter (i)</label>
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700">{i}</span>
                </div>
                <input 
                  type="range" min="0" max="4" step="1" 
                  value={i} 
                  onChange={(e) => setI(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-600">Shift Parameter (j)</label>
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700">{j}</span>
                </div>
                <input 
                  type="range" min="0" max="4" step="1" 
                  value={j} 
                  onChange={(e) => setJ(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {i === 0 && j === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium">
                    Warning: i=0 and j=0 results in N=0. Defaulting to N=1 for visualization.
                  </p>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Cluster Size (N)</span>
                  <span className="text-lg font-black text-blue-600">{N}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Reuse Distance (D)</span>
                  <span className="text-lg font-black text-slate-800">{D}m</span>
                </div>
              </div>
            </div>
          </section>

          {/* Educational Side Panel */}
          <section className="bg-slate-900 rounded-2xl p-6 text-slate-300 shadow-xl">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              Understanding the Simulation
            </h4>
            <div className="space-y-4 text-xs leading-relaxed">
              <p>
                <strong className="text-blue-400">The Story:</strong> Spectrum is insanely expensive. To cover a massive city, we must reuse the same frequencies. But if towers using the same frequency are too close, they jam each other (co-channel interference).
              </p>
              <p>
                <strong className="text-blue-400">The Cluster (N):</strong> A group of cells that use completely different frequencies. The pattern repeats across the city. Larger N means less interference, but fewer users per cell.
              </p>
              <p>
                <strong className="text-blue-400">The Math:</strong> N = i² + ij + j². Try setting <code className="bg-slate-800 px-1 rounded text-white">i=1, j=1</code> to see a 3-cell cluster, or <code className="bg-slate-800 px-1 rounded text-white">i=2, j=1</code> for a standard 7-cell cluster.
              </p>
            </div>
          </section>
        </div>

        {/* Visualization Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Grid className="w-5 h-5 text-blue-600" />
                Hexagonal Frequency Reuse Map
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  Frequency Band A
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="w-3 h-3 rounded bg-slate-200" />
                  Other Bands
                </div>
              </div>
            </div>

            <div className="relative bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
              <canvas 
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full h-auto block"
              />
              
              <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-lg max-w-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-800">Co-Channel Highlight</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  The dashed line represents the distance <strong>D</strong> between cells using the same frequency band. Increasing <strong>N</strong> increases <strong>D</strong>, reducing interference.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Interference</p>
                <p className="text-sm font-bold text-slate-800">{N > 7 ? 'Low' : N > 3 ? 'Moderate' : 'High'}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Capacity</p>
                <p className="text-sm font-bold text-slate-800">{N < 4 ? 'Maximum' : N < 9 ? 'High' : 'Standard'}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Reuse Factor</p>
                <p className="text-sm font-bold text-slate-800">1 / {N}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
