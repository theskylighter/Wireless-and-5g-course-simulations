import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Info, 
  ArrowRight, 
  ArrowLeft,
  Activity,
  Zap,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calculator
} from 'lucide-react';
import { calculateErlangB, calculateStateProbabilities } from '../../utils/math';

interface Event {
  id: number;
  type: 'success' | 'drop' | 'end';
  time: string;
}

export function TrunkingSimulator() {
  // Parameters
  const [channels, setChannels] = useState(10);
  const [arrivalRate, setArrivalRate] = useState(5); // lambda
  const [serviceRate, setServiceRate] = useState(1); // mu

  // Simulation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBusy, setCurrentBusy] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({ totalCalls: 0, droppedCalls: 0 });
  const [showFormulas, setShowFormulas] = useState(false);

  const trafficLoad = arrivalRate / serviceRate; // A = lambda / mu
  const blockingProb = useMemo(() => calculateErlangB(channels, trafficLoad), [channels, trafficLoad]);
  const stateProbs = useMemo(() => calculateStateProbabilities(channels, trafficLoad), [channels, trafficLoad]);

  // Simulation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        const dt = 0.1; // time step
        const arrivalProb = arrivalRate * dt;
        const departureProb = currentBusy * serviceRate * dt;

        const randArrival = Math.random();
        const randDeparture = Math.random();

        let newBusy = currentBusy;
        let newEvent: Event | null = null;

        // Handle Arrival
        if (randArrival < arrivalProb) {
          setStats(s => ({ ...s, totalCalls: s.totalCalls + 1 }));
          if (currentBusy < channels) {
            newBusy++;
            newEvent = { id: Date.now(), type: 'success', time: new Date().toLocaleTimeString() };
          } else {
            setStats(s => ({ ...s, droppedCalls: s.droppedCalls + 1 }));
            newEvent = { id: Date.now(), type: 'drop', time: new Date().toLocaleTimeString() };
          }
        }

        // Handle Departure (only if no arrival or independent?)
        // In a small dt, we assume only one event can happen, but let's allow both for realism
        if (randDeparture < departureProb && newBusy > 0) {
          newBusy--;
          if (!newEvent) {
            newEvent = { id: Date.now() + 1, type: 'end', time: new Date().toLocaleTimeString() };
          }
        }

        if (newBusy !== currentBusy) setCurrentBusy(newBusy);
        if (newEvent) {
          setEvents(prev => [newEvent!, ...prev].slice(0, 5));
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentBusy, arrivalRate, serviceRate, channels]);

  const resetSim = () => {
    setCurrentBusy(0);
    setEvents([]);
    setStats({ totalCalls: 0, droppedCalls: 0 });
    setIsPlaying(false);
  };

  // Data for the Erlang B curve
  const curveData = useMemo(() => {
    const data = [];
    for (let a = 0.1; a <= Math.max(trafficLoad * 2, 20); a += 0.5) {
      data.push({
        load: a.toFixed(1),
        prob: calculateErlangB(channels, a)
      });
    }
    return data;
  }, [channels, trafficLoad]);

  // Data for state distribution
  const distributionData = stateProbs.map((prob, i) => ({
    state: i,
    prob: prob
  }));

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Trunking & Queuing Theory</h2>
          <button 
            onClick={() => setShowFormulas(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
          >
            <Calculator className="w-4 h-4" />
            View Formulas
          </button>
        </div>
        <p className="text-slate-500 max-w-2xl">
          Understand how cellular networks manage a limited pool of channels to serve an infinite population of users using Markov Chains and Erlang B models.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">System Parameters</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 rounded-lg transition-colors ${isPlaying ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button 
                  onClick={resetSim}
                  className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-600">Total Channels (C)</label>
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700">{channels}</span>
                </div>
                <input 
                  type="range" min="1" max="50" step="1" 
                  value={channels} 
                  onChange={(e) => {
                    setChannels(parseInt(e.target.value));
                    if (currentBusy > parseInt(e.target.value)) setCurrentBusy(parseInt(e.target.value));
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-600">Arrival Rate (λ)</label>
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700">{arrivalRate} calls/hr</span>
                </div>
                <input 
                  type="range" min="0.1" max="20" step="0.1" 
                  value={arrivalRate} 
                  onChange={(e) => setArrivalRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-600">Service Rate (μ)</label>
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700">{serviceRate} calls/hr</span>
                </div>
                <input 
                  type="range" min="0.1" max="5" step="0.1" 
                  value={serviceRate} 
                  onChange={(e) => setServiceRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Traffic Load (A)</span>
                <span className="font-mono font-bold text-indigo-600">{trafficLoad.toFixed(2)} Erlangs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 font-bold">Theoretical Blocking</span>
                <span className="font-mono font-bold text-rose-600">{(blockingProb * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 font-bold">Observed Blocking</span>
                <span className="font-mono font-bold text-rose-500">
                  {stats.totalCalls > 0 ? ((stats.droppedCalls / stats.totalCalls) * 100).toFixed(2) : '0.00'}%
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Live Event Log
            </h4>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {events.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No events yet. Press Play to start simulation.</p>
                )}
                {events.map((event) => (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`flex items-center gap-3 p-2 rounded-lg text-xs font-medium ${
                      event.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 
                      event.type === 'drop' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {event.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : 
                     event.type === 'drop' ? <XCircle className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                    <span className="flex-1">
                      {event.type === 'success' ? 'Call Connected' : 
                       event.type === 'drop' ? 'Call Dropped (Blocked)' : 'Call Finished'}
                    </span>
                    <span className="opacity-50 font-mono">{event.time}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* Visualizations */}
        <div className="lg:col-span-2 space-y-8">
          {/* Real-time Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Busy Channels</span>
              <div className="text-4xl font-black text-indigo-600">{currentBusy} / {channels}</div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                <motion.div 
                  animate={{ width: `${(currentBusy / channels) * 100}%` }}
                  className={`h-full transition-colors ${currentBusy === channels ? 'bg-rose-500' : 'bg-indigo-500'}`}
                />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Calls</span>
              <div className="text-4xl font-black text-slate-800">{stats.totalCalls}</div>
              <span className="text-[10px] text-slate-400 mt-2">Requests since start</span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Dropped Calls</span>
              <div className="text-4xl font-black text-rose-600">{stats.droppedCalls}</div>
              <span className="text-[10px] text-slate-400 mt-2">Capacity exceeded</span>
            </div>
          </div>

          {/* Markov Chain Diagram */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Markov Chain State Diagram</h3>
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">M/M/C/C Model</span>
            </div>
            
            <div className="overflow-x-auto pb-4">
              <div className="flex items-center gap-4 min-w-[600px] justify-center py-8">
                {[0, 1, 2, '...', channels].map((state, idx) => {
                  const isActive = typeof state === 'number' && currentBusy === state;
                  return (
                    <React.Fragment key={idx}>
                      <div className="flex flex-col items-center gap-2">
                        <motion.div 
                          initial={false}
                          animate={{ 
                            scale: isActive ? 1.2 : (typeof state === 'number' ? 1 + stateProbs[state] * 0.5 : 1),
                            backgroundColor: isActive ? '#4f46e5' : (typeof state === 'number' ? (state === channels ? '#f43f5e' : '#e2e8f0') : '#f1f5f9'),
                            color: isActive || (state === channels) ? '#fff' : '#64748b',
                            boxShadow: isActive ? '0 0 20px rgba(79, 70, 229, 0.4)' : 'none'
                          }}
                          className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 border-transparent transition-all"
                        >
                          {state}
                        </motion.div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {typeof state === 'number' ? `${(stateProbs[state] * 100).toFixed(1)}%` : ''}
                        </span>
                      </div>
                      {idx < 4 && (
                        <div className="flex flex-col items-center -space-y-1">
                          <div className="flex items-center text-indigo-400">
                            <span className="text-[10px] font-bold mr-1">λ</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                          <div className="flex items-center text-rose-400">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-[10px] font-bold ml-1">
                              {state === '...' ? 'Cμ' : `${(idx + 1)}μ`}
                            </span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 mb-6">Erlang B Curve (Pc vs Load)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={curveData}>
                    <defs>
                      <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="load" 
                      label={{ value: 'Traffic Load (A)', position: 'insideBottom', offset: -5, fontSize: 10 }}
                      fontSize={10}
                    />
                    <YAxis 
                      fontSize={10}
                      label={{ value: 'Blocking Prob', angle: -90, position: 'insideLeft', fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="prob" stroke="#4f46e5" fillOpacity={1} fill="url(#colorProb)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 mb-6">State Probability Distribution</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="state" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="prob" radius={[4, 4, 0, 0]}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === channels ? '#f43f5e' : (index === currentBusy ? '#4f46e5' : '#e2e8f0')} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
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
                  <h3 className="text-2xl font-bold text-slate-900">Mathematical Foundation</h3>
                  <p className="text-slate-500 text-sm">The logic behind Trunking Theory</p>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">1. Traffic Intensity (A)</h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="text-2xl font-mono text-indigo-600">A = λ / μ</div>
                    <div className="text-xs text-slate-500 text-right max-w-[200px]">
                      λ: Arrival Rate (calls/sec)<br/>
                      μ: Service Rate (1/Holding Time)
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">2. Global Balance Equation</h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-xl font-mono text-indigo-600 mb-2">P(n-1) * λ = P(n) * nμ</div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      In steady state, the rate of entering state <i>n</i> must equal the rate of leaving it. This allows us to solve for any state probability in terms of P0.
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">3. Erlang B Formula (Blocking)</h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-xl font-mono text-rose-600 mb-4 text-center">
                      B(C, A) = (A^C / C!) / Σ (A^i / i!)
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This formula calculates the probability that all <i>C</i> channels are busy. It assumes "Lost Calls Cleared" (no queuing).
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">4. State Probability (Pn)</h4>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-xl font-mono text-indigo-600 mb-2">Pn = P0 * (A^n / n!)</div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The probability of having exactly <i>n</i> connections active at any given time.
                    </p>
                  </div>
                </section>
              </div>

              <button 
                onClick={() => setShowFormulas(false)}
                className="w-full mt-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                Got it, thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
