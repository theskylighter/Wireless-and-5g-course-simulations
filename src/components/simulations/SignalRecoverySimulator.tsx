import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Activity, 
  Radio, 
  Zap, 
  CheckCircle2,
  AlertCircle,
  Info,
  X
} from 'lucide-react';
import { InlineMath, BlockMath } from 'react-katex';
import * as math from 'mathjs';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Types ---
type Complex = math.Complex;

export function SignalRecoverySimulator() {
  // --- State ---
  const [stage, setStage] = useState(1);
  
  // Stage 1: Transmitter
  const [inputBits, setInputBits] = useState("10110");
  const [samplesPerSymbol, setSamplesPerSymbol] = useState(10);
  const [signalX, setSignalX] = useState<number[]>([]);
  
  // Stage 2: Channel
  const [taps, setTaps] = useState([
    { delay: 0, amp: 1.0 },   // LOS
    { delay: 5, amp: 0.5 },   // Echo 1
    { delay: 12, amp: -0.3 }  // Echo 2
  ]);
  const [signalH, setSignalH] = useState<number[]>([]);

  // Stage 3: Convolution
  const [signalY, setSignalY] = useState<number[]>([]);
  const [noiseVariance, setNoiseVariance] = useState(0.0);
  const [signalYNoisy, setSignalYNoisy] = useState<number[]>([]);

  // Stage 4: Frequency Domain
  const [spectrumY, setSpectrumY] = useState<number[]>([]);
  const [spectrumH, setSpectrumH] = useState<number[]>([]);
  const [spectrumE, setSpectrumE] = useState<number[]>([]); // Equalizer magnitude
  const [complexY, setComplexY] = useState<Complex[]>([]);
  const [complexH, setComplexH] = useState<Complex[]>([]);
  const [complexE, setComplexE] = useState<Complex[]>([]); // Equalizer complex

  // Stage 5: Receiver
  const [recoveredSignal, setRecoveredSignal] = useState<number[]>([]);
  const [recoveredBits, setRecoveredBits] = useState("");

  // --- Helpers ---

  // Generate BPSK Signal
  const generateSignal = () => {
    const bits = inputBits.split('').map(b => b === '1' ? 1 : 0);
    const signal: number[] = [];
    
    bits.forEach(bit => {
      const val = bit === 1 ? 1 : -1;
      for (let i = 0; i < samplesPerSymbol; i++) {
        signal.push(val);
      }
    });
    
    // Add some silence at the end to see the tail of convolution
    for(let i=0; i<samplesPerSymbol*2; i++) signal.push(0);

    setSignalX(signal);
    setStage(2);
  };

  // Generate Impulse Response
  const generateChannel = () => {
    // Find max delay
    const maxDelay = Math.max(...taps.map(t => t.delay));
    const h = new Array(maxDelay + 1).fill(0);
    
    taps.forEach(tap => {
      if (tap.delay >= 0 && tap.delay < h.length) {
        h[tap.delay] += tap.amp;
      }
    });

    setSignalH(h);
    setStage(3);
  };

  // Convolve
  const convolveSignals = () => {
    const x = signalX;
    const h = signalH;
    const yLen = x.length + h.length - 1;
    const y = new Array(yLen).fill(0);

    for (let i = 0; i < yLen; i++) {
      for (let j = 0; j < h.length; j++) {
        if (i - j >= 0 && i - j < x.length) {
          y[i] += x[i - j] * h[j];
        }
      }
    }

    // Add AWGN Noise
    const yNoisy = y.map(val => {
      // Box-Muller transform for Gaussian noise
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return val + z * noiseVariance;
    });

    setSignalY(y);
    setSignalYNoisy(yNoisy);
    setStage(4);
  };

  // FFT
  const performFFT = () => {
    // We need to pad h to match y length for division in freq domain
    const N = signalYNoisy.length;
    
    // Pad h
    const hPadded = new Array(N).fill(0);
    for(let i=0; i<signalH.length; i++) hPadded[i] = signalH[i];

    // FFT using mathjs
    const Y_complex = math.fft(signalYNoisy) as unknown as Complex[];
    const H_complex = math.fft(hPadded) as unknown as Complex[];

    // Calculate Equalizer E(f) = 1 / H(f)
    const E_complex: Complex[] = [];
    const epsilon = 1e-6; // Prevent divide by zero

    for(let i=0; i<N; i++) {
        const H = H_complex[i];
        let H_denom = H;
        if (H.toPolar().r < epsilon) {
            H_denom = math.complex(H.re + epsilon, H.im);
        }
        const E = math.divide(math.complex(1, 0), H_denom) as unknown as Complex;
        E_complex.push(E);
    }

    setComplexY(Y_complex);
    setComplexH(H_complex);
    setComplexE(E_complex);
    
    // Magnitude for visualization
    setSpectrumY(Y_complex.map(c => c.toPolar().r));
    setSpectrumH(H_complex.map(c => c.toPolar().r));
    setSpectrumE(E_complex.map(c => c.toPolar().r));

    setStage(5);
  };

  // Zero Forcing Equalizer
  const performEqualization = () => {
    const N = complexY.length;
    const X_est_complex: Complex[] = [];

    for(let i=0; i<N; i++) {
      const Y = complexY[i];
      const E = complexE[i];
      
      // X_est = Y * E
      const val = math.multiply(Y, E) as unknown as Complex;
      X_est_complex.push(val);
    }

    // IFFT
    const x_recovered_complex = math.ifft(X_est_complex) as unknown as Complex[];
    
    // Take real part
    const x_recovered = x_recovered_complex.map(c => c.re);
    setRecoveredSignal(x_recovered);

    // Decode Bits
    // Sample at middle of each symbol period
    // We added padding at the end of X, so we only decode the original length
    const numBits = inputBits.length;
    let decoded = "";
    
    for(let i=0; i<numBits; i++) {
      // Sampling point: (i * samplesPerSymbol) + (samplesPerSymbol / 2)
      const idx = Math.floor(i * samplesPerSymbol + samplesPerSymbol/2);
      if (idx < x_recovered.length) {
        const val = x_recovered[idx];
        decoded += val > 0 ? "1" : "0";
      }
    }
    setRecoveredBits(decoded);
  };

  const reset = () => {
    setStage(1);
    setSignalX([]);
    setSignalH([]);
    setSignalY([]);
    setSignalYNoisy([]);
    setSpectrumY([]);
    setSpectrumH([]);
    setSpectrumE([]);
    setRecoveredSignal([]);
    setRecoveredBits("");
  };

  // --- Chart Options ---
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      x: { grid: { color: '#f1f5f9' }, ticks: { display: false } },
      y: { grid: { color: '#f1f5f9' } }
    },
    plugins: { legend: { display: false } }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Signal Recovery Simulation
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Step-by-step visualization of Multipath Channel Propagation and Zero-Forcing Equalization.
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Simulation
        </button>
      </header>

      {/* --- STAGE 1: TRANSMITTER --- */}
      <section className={`transition-all duration-500 ${stage >= 1 ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              The Transmitter (Source Signal)
            </h3>
            {stage === 1 && (
              <button 
                onClick={generateSignal}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                Generate Signal <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {stage > 1 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </div>
          
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Theory: Inverse Filter</h4>
                    <div className="text-lg text-indigo-600 mb-2">
                      <InlineMath math="E(f) = \frac{1}{H(f)}" />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Zero-Forcing (ZF) equalization attempts to "undo" the channel by applying its mathematical inverse in the frequency domain.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">The Recovery Logic</h4>
                    <div className="text-lg text-emerald-600 mb-2">
                      <InlineMath math="\hat{X}(f) = Y(f) \cdot E(f)" />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      By multiplying the received spectrum <InlineMath math="Y(f)" /> by the equalizer <InlineMath math="E(f)" />, we recover the original signal <InlineMath math="\hat{X}(f)" />.
                    </p>
                  </div>
                </div>
                
                <div className="lg:col-span-2 h-48 bg-slate-50 rounded-xl border border-slate-100 p-2 relative">
                  {signalX.length > 0 ? (
                    <Line 
                      data={{
                        labels: signalX.map((_, i) => i),
                        datasets: [{
                          label: 'x[n]',
                          data: signalX,
                          borderColor: '#4f46e5',
                          backgroundColor: 'rgba(79, 70, 229, 0.1)',
                          borderWidth: 2,
                          pointRadius: 0,
                          stepped: true,
                          fill: true
                        }]
                      }}
                      options={{
                        ...commonOptions,
                        scales: {
                          y: { min: -1.5, max: 1.5, grid: { color: '#e2e8f0' } },
                          x: { display: false }
                        }
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                      Waiting for signal generation...
                    </div>
                  )}
                </div>
              </div>
        </div>
      </section>

      {/* --- STAGE 2: CHANNEL --- */}
      {stage >= 2 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                The Environment (Impulse Response)
              </h3>
              {stage === 2 && (
                <button 
                  onClick={generateChannel}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  Set Channel <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {stage > 2 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                {taps.map((tap, idx) => (
                  <div key={idx} className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                      <span>{idx === 0 ? 'Line of Sight (LOS)' : `Echo ${idx}`}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-600 block mb-1">Delay: {tap.delay}</label>
                        <input 
                          type="range" min="0" max="20" step="1"
                          value={tap.delay}
                          onChange={(e) => {
                            const newTaps = [...taps];
                            newTaps[idx].delay = Number(e.target.value);
                            setTaps(newTaps);
                          }}
                          disabled={stage !== 2}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600 block mb-1">Amp: {tap.amp.toFixed(1)}</label>
                        <input 
                          type="range" min="-1" max="1" step="0.1"
                          value={tap.amp}
                          onChange={(e) => {
                            const newTaps = [...taps];
                            newTaps[idx].amp = Number(e.target.value);
                            setTaps(newTaps);
                          }}
                          disabled={stage !== 2}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-2 h-64 bg-slate-50 rounded-xl border border-slate-100 p-2 relative">
                {signalH.length > 0 ? (
                  <Bar 
                    data={{
                      labels: signalH.map((_, i) => i),
                      datasets: [{
                        label: 'h[n]',
                        data: signalH,
                        backgroundColor: '#ec4899',
                        barThickness: 4,
                      }]
                    }}
                    options={{
                      ...commonOptions,
                      scales: {
                        y: { min: -1.2, max: 1.2 },
                        x: { grid: { display: false } }
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                    Configure taps to see impulse response...
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- STAGE 3: CONVOLUTION --- */}
      {stage >= 3 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                The Destruction (Convolution)
              </h3>
              {stage === 3 && (
                <button 
                  onClick={convolveSignals}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  Transmit (Convolve) <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {stage > 3 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>

            <div className="p-6">
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                     <Zap className="w-4 h-4 text-amber-500" />
                     Channel Noise (AWGN Variance): {noiseVariance.toFixed(2)}
                   </label>
                   <span className="text-xs text-slate-500">Higher noise = harder recovery</span>
                </div>
                <input 
                  type="range" min="0" max="0.5" step="0.05"
                  value={noiseVariance}
                  onChange={(e) => {
                    setNoiseVariance(Number(e.target.value));
                    // If we are already past stage 3, we need to reset or re-run. 
                    // For simplicity in this linear flow, let's just update the state but user must click 'Transmit' again to apply if they went back? 
                    // Actually, the prompt says "If a user changes a parameter... subsequent stages must be hidden/reset".
                    // But this slider is IN stage 3. So we can just let them adjust it before clicking Transmit.
                    if (stage > 3) setStage(3); 
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <p className="text-sm text-slate-600 mb-4">
                The received signal <InlineMath math="y[n] = (x[n] * h[n]) + \text{noise}" /> shows how the multipath channel smears the original bits and adds noise.
              </p>
              <div className="h-48 bg-slate-50 rounded-xl border border-slate-100 p-2 relative">
                {signalYNoisy.length > 0 ? (
                  <Line 
                    data={{
                      labels: signalYNoisy.map((_, i) => i),
                      datasets: [{
                        label: 'y[n] (Noisy)',
                        data: signalYNoisy,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: true
                      }]
                    }}
                    options={commonOptions}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                    Ready to convolve...
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- STAGE 4: FFT --- */}
      {stage >= 4 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                The Math Trick (Frequency Domain)
              </h3>
              {stage === 4 && (
                <button 
                  onClick={performFFT}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  Perform FFT <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {stage > 4 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-500">Channel Response |H(f)|</h4>
                <div className="h-40 bg-slate-50 rounded-xl border border-slate-100 p-2 relative">
                  {spectrumH.length > 0 && (
                    <Line 
                      data={{
                        labels: spectrumH.map((_, i) => i),
                        datasets: [{
                          label: '|H(f)|',
                          data: spectrumH,
                          borderColor: '#ec4899',
                          borderWidth: 2,
                          pointRadius: 0,
                          fill: true,
                          backgroundColor: 'rgba(236, 72, 153, 0.1)'
                        }]
                      }}
                      options={commonOptions}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-500">Equalizer Response |E(f)|</h4>
                <div className="h-40 bg-slate-50 rounded-xl border border-slate-100 p-2 relative">
                  {spectrumE.length > 0 && (
                    <Line 
                      data={{
                        labels: spectrumE.map((_, i) => i),
                        datasets: [{
                          label: '|E(f)|',
                          data: spectrumE,
                          borderColor: '#8b5cf6',
                          borderWidth: 2,
                          pointRadius: 0,
                          fill: true,
                          backgroundColor: 'rgba(139, 92, 246, 0.1)'
                        }]
                      }}
                      options={commonOptions}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-500">Received Spectrum |Y(f)|</h4>
                <div className="h-40 bg-slate-50 rounded-xl border border-slate-100 p-2 relative">
                  {spectrumY.length > 0 && (
                    <Line 
                      data={{
                        labels: spectrumY.map((_, i) => i),
                        datasets: [{
                          label: '|Y(f)|',
                          data: spectrumY,
                          borderColor: '#ef4444',
                          borderWidth: 2,
                          pointRadius: 0,
                          fill: true,
                          backgroundColor: 'rgba(239, 68, 68, 0.1)'
                        }]
                      }}
                      options={commonOptions}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- STAGE 5: EQUALIZATION --- */}
      {stage >= 5 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">5</span>
                The Receiver (Zero-Forcing Equalization)
              </h3>
              {stage === 5 && (
                <button 
                  onClick={performEqualization}
                  className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  Recover Data <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong className="font-bold block mb-1">Why does Zero-Forcing fail with noise?</strong>
                  Zero-Forcing applies an inverse filter <InlineMath math="1/H(f)" /> to restore the signal. 
                  However, if the channel has a "deep fade" (where <InlineMath math="H(f)" /> is tiny), the Equalizer <InlineMath math="E(f)" /> becomes huge. 
                  This drastically amplifies any noise present at those frequencies (Noise Enhancement), corrupting the recovered bits.
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Original Bits</div>
                  <div className="font-mono text-xl tracking-widest text-slate-800">{inputBits}</div>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-300" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Recovered Bits</div>
                  <div className={`font-mono text-xl tracking-widest ${recoveredBits === inputBits ? 'text-emerald-600' : 'text-red-600'}`}>
                    {recoveredBits || "..."}
                  </div>
                </div>
                {recoveredBits && (
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${recoveredBits === inputBits ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {recoveredBits === inputBits ? 'Success' : 'Error'}
                  </div>
                )}
              </div>

              <div className="h-64 bg-slate-50 rounded-xl border border-slate-100 p-2 relative">
                {recoveredSignal.length > 0 && (
                  <Line 
                    data={{
                      labels: recoveredSignal.map((_, i) => i),
                      datasets: [
                        {
                          label: 'Original x[n]',
                          data: signalX, // Note: signalX is shorter than recoveredSignal due to padding
                          borderColor: '#94a3b8',
                          borderWidth: 2,
                          pointRadius: 0,
                          borderDash: [5, 5],
                          order: 2
                        },
                        {
                          label: 'Recovered x^[n]',
                          data: recoveredSignal,
                          borderColor: '#10b981',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          borderWidth: 2,
                          pointRadius: 0,
                          fill: true,
                          order: 1
                        }
                      ]
                    }}
                    options={{
                      ...commonOptions,
                      plugins: {
                        legend: { display: true, position: 'top' }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
