import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Info, 
  Zap, 
  Car, 
  User, 
  TowerControl as Tower, 
  Activity, 
  Waves,
  ArrowRight,
  Calculator,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

export function PropagationSimulator() {
  // Handoff Parameters
  const [ueSpeed, setUeSpeed] = useState(50); // km/h
  const [handoffMode, setHandoffMode] = useState<'threshold' | 'hysteresis'>('hysteresis');
  const [thresholdMargin, setThresholdMargin] = useState(10); // dB (Delta)
  const [hysteresisMargin, setHysteresisMargin] = useState(6); // dB (H)
  const [environment, setEnvironment] = useState<'urban' | 'highway'>('highway');
  const [uePosition, setUePosition] = useState(0); // 0 to 1000
  const [isMoving, setIsMoving] = useState(false);
  const [activeBS, setActiveBS] = useState<1 | 2>(1);
  const [handoffEvents, setHandoffEvents] = useState<{pos: number, type: string}[]>([]);
  const [showFormulas, setShowFormulas] = useState(false);
  const [isPingPonging, setIsPingPonging] = useState(false);
  const [handoffInLastTick, setHandoffInLastTick] = useState(false);

  // Constants
  const P_TX = 30; // dBm
  const P_MIN = -90; // dBm (Usable threshold)
  const BS1_POS = 0;

  // Environment-dependent values
  const TOTAL_DIST = environment === 'urban' ? 1000 : 10000;
  const BS2_POS = TOTAL_DIST;
  const gamma = environment === 'urban' ? 4.0 : 3.0;

  // Signal Strength Calculation (User Formula: Prx = Ptx - 10γ log10(d))
  const calculateSignal = (d: number, env: 'urban' | 'highway', noiseScale = 0) => {
    const currentGamma = env === 'urban' ? 4.0 : 3.0;
    const dist = Math.max(d, 1);
    const baseSignal = P_TX - 10 * currentGamma * Math.log10(dist);
    if (noiseScale > 0) {
      // Small noise to simulate real-world fluctuations
      return baseSignal + (Math.random() * noiseScale - noiseScale / 2);
    }
    return baseSignal;
  };

  // Theoretical Handoff Point Calculation
  const theoreticalHOPoint = useMemo(() => {
    if (handoffMode === 'hysteresis') {
      const factor = Math.pow(10, hysteresisMargin / (10 * gamma));
      return (TOTAL_DIST * factor) / (1 + factor);
    } else {
      // Threshold Mode: RSSI1 < Pmin + Delta
      // Ptx - 10g log(x) = Pmin + Delta
      // 10g log(x) = Ptx - Pmin - Delta
      // log(x) = (Ptx - Pmin - Delta) / (10g)
      return Math.pow(10, (P_TX - P_MIN - thresholdMargin) / (10 * gamma));
    }
  }, [environment, handoffMode, thresholdMargin, hysteresisMargin, gamma, TOTAL_DIST]);

  // Simulation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMoving) {
      interval = setInterval(() => {
        setUePosition(prev => {
          const dt = 1; // 1 second time step
          const velocity = ueSpeed / 3.6; // km/h to m/s
          const step = velocity * dt; 
          const next = prev + step;

          if (next >= TOTAL_DIST) {
            setIsMoving(false);
            return TOTAL_DIST;
          }
          
          const s1 = calculateSignal(next, environment, 1.5);
          const s2 = calculateSignal(TOTAL_DIST - next, environment, 1.5);
          
          let handoffOccurredThisTick = false;

          // Call Dropped Condition
          const currentRSSI = activeBS === 1 ? s1 : s2;
          if (currentRSSI < P_MIN) {
            setIsMoving(false);
            setHandoffEvents(prevEvents => [...prevEvents, { pos: next, type: 'drop' }]);
            setIsPingPonging(false);
            return prev;
          }

          // Handoff Logic
          if (handoffMode === 'threshold') {
            // Ping-Pong Mode: Strictly threshold based, no relative check
            if (activeBS === 1) {
              if (s1 < (P_MIN + thresholdMargin)) {
                setActiveBS(2);
                setHandoffEvents(prevEvents => [...prevEvents, { pos: next, type: 'handoff' }]);
                handoffOccurredThisTick = true;
              }
            } else {
              if (s2 < (P_MIN + thresholdMargin)) {
                setActiveBS(1);
                setHandoffEvents(prevEvents => [...prevEvents, { pos: next, type: 'handoff' }]);
                handoffOccurredThisTick = true;
              }
            }
          } else {
            if (activeBS === 1) {
              if (s2 > (s1 + hysteresisMargin)) {
                setActiveBS(2);
                setHandoffEvents(prevEvents => [...prevEvents, { pos: next, type: 'handoff' }]);
                handoffOccurredThisTick = true;
              }
            } else {
              if (s1 > (s2 + hysteresisMargin)) {
                setActiveBS(1);
                setHandoffEvents(prevEvents => [...prevEvents, { pos: next, type: 'handoff' }]);
                handoffOccurredThisTick = true;
              }
            }
          }

          if (handoffOccurredThisTick && handoffInLastTick) {
            setIsPingPonging(true);
          } else if (!handoffOccurredThisTick) {
            setIsPingPonging(false);
          }
          setHandoffInLastTick(handoffOccurredThisTick);
          
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isMoving, ueSpeed, environment, handoffMode, thresholdMargin, hysteresisMargin, activeBS]);

  // Chart Data
  const signalData = useMemo(() => {
    const data = [];
    const step = TOTAL_DIST / 100;
    for (let i = 0; i <= TOTAL_DIST; i += step) {
      data.push({
        pos: i,
        bs1: calculateSignal(i, environment),
        bs2: calculateSignal(TOTAL_DIST - i, environment),
      });
    }
    return data;
  }, [environment, TOTAL_DIST]);

  const currentS1 = useMemo(() => calculateSignal(uePosition, environment), [uePosition, environment]);
  const currentS2 = useMemo(() => calculateSignal(TOTAL_DIST - uePosition, environment), [uePosition, environment]);

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Handoffs & Propagation</h2>
          <button 
            onClick={() => setShowFormulas(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
          >
            <Calculator className="w-4 h-4" />
            View Formulas
          </button>
        </div>
        <p className="text-slate-500 max-w-2xl">
          Explore how signals decay in cities, how networks manage moving users through handoffs, and the impact of multipath fading.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Handoff Parameters</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMoving(!isMoving)}
                  className={`p-2 rounded-lg transition-colors ${isMoving ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}
                >
                  {isMoving ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => { setUePosition(0); setHandoffEvents([]); setActiveBS(1); setIsMoving(false); }}
                  className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Algorithm Toggle */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-600">Handoff Algorithm</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setHandoffMode('threshold')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${handoffMode === 'threshold' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Threshold Margin
                  </button>
                  <button 
                    onClick={() => setHandoffMode('hysteresis')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${handoffMode === 'hysteresis' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Hysteresis
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-600">UE Speed</label>
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700">{ueSpeed} km/h</span>
                </div>
                <input 
                  type="range" min="5" max="150" step="5" 
                  value={ueSpeed} 
                  onChange={(e) => setUeSpeed(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {handoffMode === 'threshold' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-600">Threshold Margin (Δ)</label>
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700">{thresholdMargin} dB</span>
                  </div>
                  <input 
                    type="range" min="0" max="20" step="1" 
                    value={thresholdMargin} 
                    onChange={(e) => setThresholdMargin(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400">Triggers HO strictly when RSSI &lt; (Pmin + Δ). (Ping-Pong Mode)</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-600">Hysteresis Margin (H)</label>
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700">{hysteresisMargin} dB</span>
                  </div>
                  <input 
                    type="range" min="0" max="20" step="1" 
                    value={hysteresisMargin} 
                    onChange={(e) => setHysteresisMargin(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400">Triggers HO when RSSI2 &gt; (RSSI1 + H).</p>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-sm font-semibold text-slate-600">Environment (Tower Spacing & γ)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { setEnvironment('urban'); setUePosition(0); setHandoffEvents([]); }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${environment === 'urban' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Urban (1km, γ=4.0)
                  </button>
                  <button 
                    onClick={() => { setEnvironment('highway'); setUePosition(0); setHandoffEvents([]); }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${environment === 'highway' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Highway (10km, γ=3.0)
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Simulation Log
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {isPingPonging && (
                <div className="p-3 bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-2 mb-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">⚠️ Ping-Pong Effect Detected</span>
                </div>
              )}
              {handoffEvents.length === 0 && (
                <p className="text-[10px] text-slate-400 italic">No handoff events recorded yet.</p>
              )}
              {handoffEvents.map((event, idx) => (
                <div key={idx} className={`p-2 rounded-lg text-[10px] font-bold flex items-center justify-between ${event.type === 'drop' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  <span>{event.type === 'drop' ? 'CALL DROPPED' : 'HANDOFF TRIGGERED'}</span>
                  <span>at {event.pos.toFixed(1)}m</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Visualizations */}
        <div className="lg:col-span-2 space-y-8">
          {/* Handoff Animation */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 overflow-hidden">
            <h3 className="font-bold text-slate-800 mb-8 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Handoff Visualization
            </h3>
            
            <div className="relative h-48 bg-slate-50 rounded-3xl border border-slate-100 flex items-end px-12 pb-8">
              <div className="absolute bottom-8 left-0 right-0 h-px bg-slate-200" />
              
              <div className="absolute left-[10%] bottom-8 flex flex-col items-center -translate-x-1/2">
                <div className={`transition-colors duration-500 ${activeBS === 1 ? 'text-indigo-600' : 'text-slate-300'}`}>
                  <Tower className="w-12 h-12" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-1">BS 1 (0m)</span>
              </div>

              <div className="absolute left-[90%] bottom-8 flex flex-col items-center -translate-x-1/2">
                <div className={`transition-colors duration-500 ${activeBS === 2 ? 'text-indigo-600' : 'text-slate-300'}`}>
                  <Tower className="w-12 h-12" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-1">BS 2 ({TOTAL_DIST}m)</span>
              </div>

              <motion.div 
                animate={{ left: `${10 + (uePosition / TOTAL_DIST * 80)}%` }}
                className="absolute bottom-8 -translate-x-1/2 z-10"
              >
                <div className="relative flex flex-col items-center">
                  <div className="bg-white p-2 rounded-xl shadow-lg border border-slate-100 mb-2">
                    {ueSpeed > 40 ? <Car className="w-6 h-6 text-slate-700" /> : <User className="w-6 h-6 text-slate-700" />}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                </div>
              </motion.div>

              {handoffEvents.map((event, idx) => (
                <div 
                  key={idx}
                  className={`absolute bottom-8 h-12 w-px flex flex-col items-center ${event.type === 'drop' ? 'bg-rose-500' : 'bg-indigo-400'}`}
                  style={{ left: `${10 + (event.pos / TOTAL_DIST * 80)}%` }}
                >
                  <div className={`text-[8px] font-bold px-1 rounded -mt-4 whitespace-nowrap ${event.type === 'drop' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {event.type === 'drop' ? 'DROP' : 'HO'}
                  </div>
                </div>
              ))}
            </div>
          </div>

            <div className="h-96 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
              <h3 className="font-bold text-slate-800 mb-6">Signal Strength vs. Distance</h3>
              
              <div className="absolute top-16 right-10 bg-white/95 backdrop-blur p-3 rounded-xl border border-slate-200 text-[10px] font-mono shadow-md z-20 space-y-1 min-w-[140px]">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">BS1 Power:</span>
                  <span className="font-bold text-indigo-600">{currentS1.toFixed(1)} dBm</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">BS2 Power:</span>
                  <span className="font-bold text-emerald-600">{currentS2.toFixed(1)} dBm</span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-100">
                  <span className="text-slate-400">Active:</span>
                  <span className="font-bold text-slate-800">BS {activeBS}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Target HO:</span>
                  <span className="font-bold text-amber-600">{theoreticalHOPoint.toFixed(0)}m</span>
                </div>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={signalData}
                    margin={{ top: 10, right: 100, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="pos" 
                      type="number"
                      domain={[0, TOTAL_DIST]}
                      tick={{ fontSize: 10 }}
                      label={{ value: 'Distance (m)', position: 'insideBottom', offset: -10, fontSize: 10 }}
                    />
                    <YAxis 
                      domain={[-120, 40]}
                      tick={{ fontSize: 10 }}
                      label={{ value: 'Power (dBm)', angle: -90, position: 'insideLeft', fontSize: 10, offset: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="left"
                      height={36}
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }}
                    />
                    
                    {/* Min Usable Power Line */}
                    <ReferenceLine 
                      y={P_MIN} 
                      stroke="#f43f5e" 
                      strokeDasharray="3 3" 
                      label={{ value: `Pmin (${P_MIN}dBm)`, position: 'right', fontSize: 10, fill: '#f43f5e', fontWeight: 'bold', offset: 10 }} 
                    />
                    
                  {/* Handoff Point Marker (Theoretical based on Margin) */}
                  <ReferenceLine 
                    x={theoreticalHOPoint} 
                    stroke="#fbbf24" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    label={{ value: 'Target HO', position: 'top', fontSize: 10, fill: '#d97706', fontWeight: 'bold' }} 
                  />

                    {/* Historical Handoff Points */}
                    {handoffEvents.map((event, idx) => (
                      <ReferenceLine 
                        key={`ho-${idx}`} 
                        x={event.pos} 
                        stroke={event.type === 'drop' ? '#f43f5e' : '#4f46e5'} 
                        strokeWidth={1} 
                        label={{ value: event.type === 'drop' ? 'DROP' : 'HO', position: 'insideTopLeft', fontSize: 8, fill: event.type === 'drop' ? '#f43f5e' : '#4f46e5' }} 
                      />
                    ))}

                    <Line 
                      type="monotone" 
                      dataKey="bs1" 
                      stroke="#4f46e5" 
                      strokeWidth={2} 
                      dot={false} 
                      name="BS 1 Signal" 
                      isAnimationActive={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bs2" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      dot={false} 
                      name="BS 2 Signal" 
                      isAnimationActive={false}
                    />
                    
                    {/* Real-time position marker */}
                    <ReferenceLine 
                      x={uePosition} 
                      stroke="#64748b" 
                      strokeWidth={2} 
                      label={{ value: 'UE', position: 'top', fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
        </div>
      </div>

      {/* Concept Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">The Ping-Pong Effect</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            If the handoff margin (Δ) is too small, the UE might rapidly switch back and forth between BS1 and BS2 due to small signal fluctuations. This wastes network resources and causes instability.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
            <Tower className="w-5 h-5 text-indigo-600" />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">Umbrella Cells</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Fast-moving vehicles are handled by large <strong>Macro Cells</strong> to minimize handoff frequency, while slow pedestrians use <strong>Micro Cells</strong> to maximize capacity in high-density areas.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
            <Waves className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">Multipath Fading</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Signals bounce off buildings (Reflection), bend around corners (Diffraction), and scatter. This creates "echoes" that arrive at different times, leading to <strong>Time Dispersion</strong>.
          </p>
        </div>
      </div>

      {/* Formula Modal */}
      <AnimatePresence>
        {showFormulas && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative"
            >
              <button 
                onClick={() => setShowFormulas(false)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Propagation Formulas</h3>
                  <p className="text-slate-500 text-sm">Physics of Wireless Signals</p>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">1. Log-Distance Path Loss</h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-xl font-mono text-indigo-600 mb-2">PL(d) = PL(d₀) + 10n log₁₀(d/d₀)</div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Describes how signal power decays over distance. <i>n</i> is the path loss exponent (2 for free space, ~4 for urban).
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">2. Handoff Margin (Δ)</h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-xl font-mono text-indigo-600 mb-2">Δ = P_handoff - P_min_usable</div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The safety margin required to ensure a handoff completes before the signal becomes unusable.
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">3. Doppler Shift (fd)</h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-xl font-mono text-rose-600 mb-4 text-center">
                      fd = (v / λ) cos θ
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The change in frequency caused by relative motion between transmitter and receiver. <i>v</i> is velocity, <i>λ</i> is wavelength.
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">4. Coherence Time (Tc)</h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-xl font-mono text-indigo-600 mb-2">Tc ≈ 1 / fd</div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The time duration over which the wireless channel is considered constant.
                    </p>
                  </div>
                </section>
              </div>

              <button 
                onClick={() => setShowFormulas(false)}
                className="w-full mt-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
