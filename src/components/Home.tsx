import React from 'react';
import { 
  Network, 
  Waves, 
  Radio, 
  Cpu, 
  Zap,
  Grid,
  BookOpen,
  Activity,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface HomeProps {
  onStart: (tab: 'cellular' | 'trunking' | 'handoff' | 'doppler' | 'multipath' | 'signal-recovery' | 'modulation' | 'mimo') => void;
}

export function Home({ onStart }: HomeProps) {
  const modules = [
    { 
      id: 'cellular', 
      title: 'Cellular Design', 
      desc: 'Frequency reuse, cluster sizes (N), and co-channel interference.',
      icon: Grid,
      color: 'bg-blue-500',
      disabled: false
    },
    { 
      id: 'trunking', 
      title: 'Trunking Theory', 
      desc: 'Markov Chains, Erlang B, and capacity planning for cellular networks.',
      icon: Network,
      color: 'bg-indigo-500',
      disabled: false
    },
    { 
      id: 'handoff', 
      title: 'Handoffs & Propagation', 
      desc: 'Signal decay, handoff margins, umbrella cells, and multipath fading.',
      icon: Waves,
      color: 'bg-emerald-500',
      disabled: false
    },
    { 
      id: 'doppler', 
      title: 'Doppler Effect', 
      desc: 'Visualize frequency shifts caused by relative motion in wireless channels.',
      icon: Activity,
      color: 'bg-cyan-500',
      disabled: false
    },
    { 
      id: 'multipath', 
      title: 'Multipath & Impulse Response', 
      desc: 'Visualize LOS and NLOS reflections and their impact on channel delay spread.',
      icon: Zap,
      color: 'bg-amber-500',
      disabled: false
    },
    { 
      id: 'signal-recovery', 
      title: 'Signal Recovery', 
      desc: 'Recover signals distorted by multipath using Zero-Forcing Equalization.',
      icon: RotateCcw,
      color: 'bg-teal-500',
      disabled: false
    },
    { 
      id: 'modulation', 
      title: 'Modulation Techniques', 
      desc: 'QAM, PSK, and OFDM - the heart of high-speed data transmission.',
      icon: Radio,
      color: 'bg-amber-500',
      disabled: true
    },
    { 
      id: 'mimo', 
      title: '5G MIMO & Beamforming', 
      desc: 'Spatial multiplexing and antenna arrays for massive connectivity.',
      icon: Cpu,
      color: 'bg-rose-500',
      disabled: true
    },
  ] as const;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <header className="text-center space-y-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-widest"
        >
          <BookOpen className="w-3 h-3" />
          Interactive Learning Lab
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl font-black text-slate-900 tracking-tight"
        >
          Wireless & 5G <span className="text-indigo-600">Communication</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed"
        >
          Explore the fundamental principles of modern telecommunications through interactive simulations and visual explanations.
        </motion.p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((module, idx) => (
          <motion.button
            key={module.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
            onClick={() => !module.disabled && onStart(module.id)}
            disabled={module.disabled}
            className={`group relative flex items-start gap-6 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm transition-all text-left overflow-hidden ${
              module.disabled 
                ? 'opacity-50 grayscale cursor-not-allowed' 
                : 'hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200'
            }`}
          >
            <div className={`w-14 h-14 ${module.color} rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${!module.disabled && 'group-hover:scale-110'} transition-transform`}>
              <module.icon className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className={`text-xl font-bold text-slate-900 ${!module.disabled && 'group-hover:text-indigo-600'} transition-colors`}>
                {module.title}
                {module.disabled && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">Coming Soon</span>}
              </h3>
              <p className="text-slate-500 leading-relaxed">{module.desc}</p>
              {!module.disabled && (
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm pt-2">
                  Launch Simulation
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </div>
            {!module.disabled && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-50 transition-colors -z-10" />
            )}
          </motion.button>
        ))}
      </div>

      <footer className="text-center pt-12 border-t border-slate-100">
        <p className="text-sm text-slate-400">
          Designed for educational purposes based on Wireless Communication notes.
        </p>
      </footer>
    </div>
  );
}
