import React from 'react';
import { 
  Home, 
  Network, 
  Waves, 
  Radio, 
  Cpu, 
  Zap,
  Grid,
  Info,
  ChevronRight,
  X,
  Activity,
  RotateCcw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TabId = 'home' | 'cellular' | 'trunking' | 'handoff' | 'doppler' | 'multipath' | 'signal-recovery' | 'modulation' | 'mimo';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home, disabled: false },
  { id: 'cellular', label: 'Cellular Design', icon: Grid, disabled: false },
  { id: 'trunking', label: 'Trunking Theory', icon: Network, disabled: false },
  { id: 'handoff', label: 'Handoff', icon: Waves, disabled: false },
  { id: 'doppler', label: 'Doppler Effect', icon: Activity, disabled: false },
  { id: 'multipath', label: 'Multipath Fading', icon: Zap, disabled: false },
  { id: 'signal-recovery', label: 'Signal Recovery', icon: RotateCcw, disabled: false },
  { id: 'modulation', label: 'Modulation', icon: Radio, disabled: true },
  { id: 'mimo', label: '5G MIMO', icon: Cpu, disabled: true },
] as const;

export function Sidebar({ activeTab, onTabChange, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Mobile Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800",
        "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out md:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Radio className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight">Wireless Lab</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">5G & Beyond</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && onTabChange(item.id)}
              disabled={item.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                  : item.disabled 
                    ? "opacity-40 cursor-not-allowed grayscale"
                    : "hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                activeTab === item.id ? "text-white" : "text-slate-500 group-hover:text-slate-300"
              )} />
              <span className="font-medium text-sm flex-1 text-left">
                {item.label}
                {item.disabled && <span className="ml-2 text-[10px] uppercase tracking-tighter opacity-60">(Coming Soon)</span>}
              </span>
              {activeTab === item.id && <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Select a module to begin the interactive simulation.
            </p>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar (Always Visible) */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col h-screen border-r border-slate-800 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight">Wireless Lab</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">5G & Beyond</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && onTabChange(item.id)}
              disabled={item.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                  : item.disabled 
                    ? "opacity-40 cursor-not-allowed grayscale"
                    : "hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                activeTab === item.id ? "text-white" : "text-slate-500 group-hover:text-slate-300"
              )} />
              <span className="font-medium text-sm flex-1 text-left">
                {item.label}
                {item.disabled && <span className="ml-2 text-[10px] uppercase tracking-tighter opacity-60">(Coming Soon)</span>}
              </span>
              {activeTab === item.id && <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Select a module to begin the interactive simulation.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
