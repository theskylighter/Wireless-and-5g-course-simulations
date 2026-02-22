import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Radio, Activity, Zap, AlertTriangle, Smartphone, X } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { clsx } from 'clsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Constants
const C = 3e8; // Speed of light m/s

export function ModulationSimulator() {
  // State
  const [bandwidth, setBandwidth] = useState(5); // kHz (1-10)
  const [carrierFreqLog, setCarrierFreqLog] = useState(5); // Log scale for 30kHz - 3GHz
  const [modulationIndex, setModulationIndex] = useState(0.5); // ka (0.1 - 1.0)
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const animationRef = useRef<number>();

  // Derived Values
  const carrierFreqHz = useMemo(() => {
    // Map slider 0-100 to log range
    const minLog = Math.log10(30000);
    const maxLog = Math.log10(3000000000);
    const logVal = minLog + (carrierFreqLog / 100) * (maxLog - minLog);
    return Math.pow(10, logVal);
  }, [carrierFreqLog]);

  const wavelength = C / carrierFreqHz;
  const antennaHeight = wavelength / 4;

  // Animation Loop
  useEffect(() => {
    const animate = () => {
      if (isPlaying) {
        setTime(t => t + 0.02);
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  // Formatters
  const formatFreq = (hz: number) => {
    if (hz >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`;
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`;
    if (hz >= 1e3) return `${(hz / 1e3).toFixed(2)} kHz`;
    return `${hz.toFixed(0)} Hz`;
  };

  const formatLength = (m: number) => {
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    if (m >= 1) return `${m.toFixed(2)} m`;
    if (m >= 0.01) return `${(m * 100).toFixed(1)} cm`;
    return `${(m * 1000).toFixed(1)} mm`;
  };

  // --- Panel 1: Physical World (Antenna) ---
  const renderAntenna = () => {
    // Fix: Ensure correct threshold for giant antenna (1000m or 10000m as per prompt, let's use 1000m for "Mountain/Space" context if it's huge)
    // Prompt said: If H >= 10,000 m: Mountain/Edge of Space.
    // Let's stick to the prompt's thresholds strictly.
    const isGiant = antennaHeight >= 10000; 
    const isSkyscraper = antennaHeight >= 100 && antennaHeight < 10000; // Adjusted upper bound to cover gap between 1000 and 10000 if any, or just make it catch-all for large
    // Actually, let's look at the previous logic:
    // const isSkyscraper = antennaHeight >= 100 && antennaHeight < 1000;
    // This left a gap between 1000 and 10000 where it might fall through to "Cell Tower" or default.
    
    // Correct Logic:
    // Giant: >= 10,000
    // Skyscraper: 100 <= H < 10,000 (Covering the gap)
    // Cell Tower: 1 <= H < 100
    // Phone: < 1
    
    const isCellTower = antennaHeight >= 1 && antennaHeight < 100;
    const isPhone = antennaHeight < 1; // Changed from 0.1 to 1 to cover small handhelds better

    // Visual height (clamped for CSS)
    let visualHeightPercent = 50;
    if (isGiant) visualHeightPercent = 90;
    else if (isSkyscraper) visualHeightPercent = 70;
    else if (isCellTower) visualHeightPercent = 40;
    else if (isPhone) visualHeightPercent = 15;
    else visualHeightPercent = 30; // Fallback

    return (
      <div className="relative h-64 bg-sky-100 border-b-4 border-green-700 overflow-hidden rounded-xl">
        {/* Sky / Clouds */}
        <motion.div 
          animate={{ x: [0, 100, 0] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-4 left-10 text-white/60"
        >
          <div className="i-lucide-cloud w-12 h-8 bg-white/40 rounded-full blur-sm" />
        </motion.div>

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-4 bg-green-600" />

        {/* Tower / Antenna */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center justify-end transition-all duration-500"
             style={{ height: `${visualHeightPercent}%` }}>
          
          {/* Waves radiating */}
          <motion.div 
            className="absolute -top-8 w-16 h-16 border-4 border-red-500/30 rounded-full"
            animate={{ scale: [0.5, 2], opacity: [1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.div 
            className="absolute -top-8 w-16 h-16 border-4 border-red-500/30 rounded-full"
            animate={{ scale: [0.5, 2], opacity: [1, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
          />

          {/* The Structure */}
          {isPhone ? (
             <Smartphone className="w-8 h-16 text-slate-800" />
          ) : isGiant ? (
             <div className="w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[100px] border-b-slate-600 relative">
                <div className="absolute top-[30px] left-[-10px] w-5 h-5 bg-white/50 rounded-full blur-md" />
             </div>
          ) : (
            <div className={`w-2 bg-slate-700 h-full relative ${isSkyscraper ? 'w-8 bg-slate-800' : ''}`}>
               {/* Crossbars for tower look */}
               {!isSkyscraper && [...Array(5)].map((_, i) => (
                 <div key={i} className="absolute w-8 -left-3 h-0.5 bg-slate-700" style={{ top: `${i * 20}%` }} />
               ))}
               {isSkyscraper && (
                 <div className="w-full h-full flex flex-col justify-around px-1">
                    {[...Array(10)].map((_, i) => <div key={i} className="w-full h-1 bg-blue-200/50" />)}
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Reference Scale (Human) */}
        <div className="absolute bottom-4 left-[60%] w-2 h-6 bg-orange-400 rounded-full" title="Human (1.8m)" />

        {/* Labels */}
        <div className="absolute top-2 right-2 bg-white/80 p-2 rounded text-xs font-mono">
          <div>λ: {formatLength(wavelength)}</div>
          <div className={isGiant ? "text-red-600 font-bold" : "text-green-700 font-bold"}>
            h: {formatLength(antennaHeight)}
          </div>
        </div>
      </div>
    );
  };

  // --- Panel 2: Oscilloscope (Time Domain) ---
  const renderOscilloscope = () => {
    // Generate data points
    const points = 100;
    const labels = Array.from({ length: points }, (_, i) => i);
    
    // Visual parameters
    const visualCarrierSpeed = 2 + (carrierFreqLog / 100) * 20; // 2x to 22x baseband

    // Standard AM: s(t) = [1 + ka * m(t)] * cos(wc * t)
    // Envelope: 1 + ka * m(t)
    
    const dataEnvelopeUpper = labels.map(i => {
      const t = (i / points) * 4 * Math.PI + time;
      return 1 + modulationIndex * Math.cos(t);
    });

    const dataEnvelopeLower = labels.map(i => {
      const t = (i / points) * 4 * Math.PI + time;
      return -(1 + modulationIndex * Math.cos(t));
    });

    const dataS = labels.map((i, idx) => {
      const t = (i / points) * 4 * Math.PI + time;
      const m = Math.cos(t); // Baseband
      const envelope = 1 + modulationIndex * m;
      const c = Math.cos(t * visualCarrierSpeed); // Carrier
      return envelope * c;
    });

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Upper Envelope',
          data: dataEnvelopeUpper,
          borderColor: 'rgba(59, 130, 246, 0.5)', // Blue
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Lower Envelope',
          data: dataEnvelopeLower,
          borderColor: 'rgba(59, 130, 246, 0.5)', // Blue
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Modulated s(t)',
          data: dataS,
          borderColor: 'rgba(147, 51, 234, 1)', // Purple
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      scales: {
        x: { display: false },
        y: { min: -2.5, max: 2.5, grid: { color: '#e2e8f0' } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    };

    return (
      <div className="h-64 w-full bg-slate-50 border border-slate-200 rounded-xl p-2">
        <Line data={chartData} options={options} />
      </div>
    );
  };

  // --- Panel 3: Spectrum Analyzer (Freq Domain) ---
  const renderSpectrum = () => {
    // Visualizing blocks instead of lines
    // Baseband: centered at 0, width W.
    // Modulated: centered at fc, width 2W.
    
    // We'll use a Bar chart to represent blocks? Or Line with steps?
    // Line with fill is easiest for arbitrary shapes.
    
    // X-axis range: 0 to 100 (visual units)
    // Carrier pos: carrierFreqLog (0-100)
    // Bandwidth width: bandwidth * 2 (visual scale)
    
    const carrierPos = carrierFreqLog; 
    
    // Construct dataset
    // 0 Hz is at index 0? No, let's say index 0 is DC.
    // Baseband block: 0 to bwVisual/2 (since we only show positive freq usually, or full?)
    // Prompt says "Draw the baseband block centered at 0 Hz (width W)".
    // Let's assume we show negative freq too? Or just positive?
    // Usually spectrum analyzers show positive.
    // But prompt mentions "centered at 0 Hz".
    // Let's make x-axis -100 to 100?
    // Or just show 0 to 100 and show half the baseband block at 0.
    
    // Let's try to follow the "centered at 0" instruction visually.
    // We can map x-axis 0..200, where 100 is 0 Hz.
    
    const centerIndex = 100;
    const dataPoints = new Array(201).fill(0);
    const labels = Array.from({ length: 201 }, (_, i) => i - 100);

    // Baseband Block: [-W/2, W/2] centered at 0.
    // Width W. So from -W/2 to W/2.
    // Map bandwidth (1-10) to indices. Let's say 1 unit = 1 index.
    const halfBasebandW = bandwidth / 2;
    
    for (let i = 0; i < 201; i++) {
        const freq = i - 100;
        
        // Baseband
        if (Math.abs(freq) <= halfBasebandW) {
            dataPoints[i] = 0.8; // Height
        }
        
        // Modulated (Upper & Lower Sidebands)
        // Centered at +fc and -fc.
        // Width 2W. So [fc - W, fc + W].
        // Carrier pos is 0-100.
        // Let's scale carrierPos to fit in our 0-100 range.
        
        const fc = carrierPos; // 0 to 100
        
        // Positive Carrier Block
        if (Math.abs(freq - fc) <= bandwidth) { // Width 2W means +/- W
             dataPoints[i] = 0.6;
        }
        
        // Negative Carrier Block
        if (Math.abs(freq + fc) <= bandwidth) {
             dataPoints[i] = 0.6;
        }
    }

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Spectrum',
          data: dataPoints,
          borderColor: 'rgba(236, 72, 153, 1)',
          backgroundColor: 'rgba(236, 72, 153, 0.5)',
          borderWidth: 1,
          pointRadius: 0,
          fill: true,
          stepped: true,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      scales: {
        x: { 
          display: true, 
          grid: { display: false },
          ticks: { display: false } 
        },
        y: { display: false, min: 0, max: 1.2 },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    };

    return (
      <div className="h-64 w-full bg-slate-50 border border-slate-200 rounded-xl p-2 relative">
        <Line data={chartData} options={options} />
        {/* Annotations */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-500">
          0 Hz
        </div>
        <div className="absolute bottom-2 right-10 text-xs text-slate-400">
          +f_c
        </div>
        <div className="absolute bottom-2 left-10 text-xs text-slate-400">
          -f_c
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-24">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Radio className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Modulation Lab</h1>
            <p className="text-slate-500">
              Interactive Standard AM Simulation: Antenna Size, Time Domain, and Frequency Spectrum.
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Carrier Frequency Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Carrier Frequency (f_c)
              </label>
              <span className="text-purple-600 font-mono font-bold bg-purple-50 px-2 py-1 rounded">
                {formatFreq(carrierFreqHz)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={carrierFreqLog}
              onChange={(e) => setCarrierFreqLog(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>30 kHz</span>
              <span>3 GHz</span>
            </div>
          </div>

          {/* Bandwidth Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-slate-700 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Baseband Bandwidth (W)
              </label>
              <span className="text-blue-600 font-mono font-bold bg-blue-50 px-2 py-1 rounded">
                {bandwidth} kHz
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={bandwidth}
              onChange={(e) => setBandwidth(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>1 kHz</span>
              <span>10 kHz</span>
            </div>
          </div>

          {/* Modulation Index Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Modulation Index (k_a)
              </label>
              <span className="text-emerald-600 font-mono font-bold bg-emerald-50 px-2 py-1 rounded">
                {modulationIndex.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={modulationIndex}
              onChange={(e) => setModulationIndex(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>0.1 (Weak)</span>
              <span>1.0 (Full)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Physical World */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">1</span>
              The Physical World
            </h3>
            <button 
              onClick={() => setActiveInfo('antenna')}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          {renderAntenna()}
          <div className="text-sm text-slate-600">
            <p>Required Antenna Height: <span className="font-mono font-bold">{formatLength(antennaHeight)}</span></p>
            <p className="text-xs text-slate-400 mt-1">
              (Assuming Quarter-Wave Monopole h = λ/4)
            </p>
          </div>
        </div>

        {/* Panel 2: Oscilloscope */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">2</span>
              Oscilloscope (Time)
            </h3>
            <button 
              onClick={() => setActiveInfo('scope')}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          {renderOscilloscope()}
          <div className="text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-400 rounded-full"></span> Envelope [1 + k_a f(t)]
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-600 rounded-full"></span> Modulated Signal
            </p>
          </div>
        </div>

        {/* Panel 3: Spectrum Analyzer */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs">3</span>
              Spectrum Analyzer (Freq)
            </h3>
            <button 
              onClick={() => setActiveInfo('spectrum')}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          {renderSpectrum()}
          <div className="text-sm text-slate-600">
            <p>Center Frequency: <span className="font-mono font-bold">{formatFreq(carrierFreqHz)}</span></p>
            <p>Transmission Bandwidth: <span className="font-mono font-bold">{(bandwidth * 2).toFixed(1)} kHz</span></p>
          </div>
        </div>

      </div>

      {/* Info Modals */}
      <AnimatePresence>
        {activeInfo && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setActiveInfo(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-indigo-600" />
                  {activeInfo === 'antenna' ? 'The Antenna Size Problem' : 
                   activeInfo === 'scope' ? 'Modulation & Demodulation' : 
                   'Frequency Shifting & Bandwidth'}
                </h3>
                <button onClick={() => setActiveInfo(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4 text-slate-600 leading-relaxed">
                {activeInfo === 'antenna' && (
                  <>
                    <p>You cannot transmit raw baseband signals directly because required antenna height is proportional to wavelength λ.</p>
                    <div className="p-3 bg-slate-50 rounded-lg font-mono text-sm border border-slate-200">
                      <div>Formula: c = λf ⇒ λ = c/f</div>
                      <div className="mt-2 text-slate-500 text-xs">
                        Example: If f = 3000 Hz,<br/>
                        λ = 3×10⁸ / 3000 = 10⁵ meters.<br/>
                        You would need a 100 km tall antenna!
                      </div>
                    </div>
                    <p>Modulation solves this by increasing the frequency, drastically reducing the wavelength and required antenna size.</p>
                  </>
                )}

                {activeInfo === 'scope' && (
                  <>
                    <div className="p-3 bg-slate-50 rounded-lg font-mono text-sm border border-slate-200 space-y-2">
                      <div><strong>Modulated Signal:</strong><br/>s(t) = Ac[1 + ka·f(t)]cos(2πfct)</div>
                      <div><strong>Demodulation Proof:</strong><br/>Received = s(t) × cos(2πfct)<br/>= Ac[1 + ka·f(t)]cos²(2πfct)</div>
                    </div>
                    <p className="text-sm">
                      Using the identity <code className="bg-slate-100 px-1 rounded">cos²(θ) = (1 + cos(2θ))/2</code>, we get:
                    </p>
                    <div className="p-2 bg-indigo-50 text-indigo-900 rounded font-mono text-xs text-center">
                      ½Ac[1 + ka·f(t)] + ½Ac[1 + ka·f(t)]cos(4πfct)
                    </div>
                    <p className="text-sm">
                      Passing this through a <strong>Low Pass Filter</strong> destroys the high-frequency <code className="text-xs">cos(4πfct)</code> garbage, leaving only our original signal!
                    </p>
                  </>
                )}

                {activeInfo === 'spectrum' && (
                  <>
                    <p>To increase the frequency, we multiply our low-frequency signal by a high-frequency carrier wave.</p>
                    <div className="p-3 bg-slate-50 rounded-lg font-mono text-sm border border-slate-200">
                      <div>Euler's Formula:</div>
                      <div className="text-xs mt-1">cos(2πfct) = ½(e^j2πfct + e^-j2πfct)</div>
                    </div>
                    <p className="text-sm">
                      Because the Fourier Transform of <code className="font-mono">e^j2πfct</code> is <code className="font-mono">δ(f - fc)</code>, multiplying in time causes a <strong>shift</strong> in frequency.
                    </p>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <div className="font-bold text-amber-800 text-xs uppercase mb-1">The Bandwidth Cost</div>
                      <p className="text-xs text-amber-900">
                        The original spectrum (0 to W) shifts to center around +fc and -fc. 
                        The new bandwidth spans from fc-W to fc+W.
                        <br/><br/>
                        <strong>New Bandwidth = 2W</strong> (Double the original!)
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
