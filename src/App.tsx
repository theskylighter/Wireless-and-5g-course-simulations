import React, { useState } from 'react';
import { Sidebar, type TabId } from './components/Sidebar';
import { Home } from './components/Home';
import { TrunkingSimulator } from './components/simulations/TrunkingSimulator';
import { PropagationSimulator } from './components/simulations/PropagationSimulator';
import { MultipathSimulator } from './components/simulations/MultipathSimulator';
import { CellularSimulator } from './components/simulations/CellularSimulator';
import { DopplerSimulator } from './components/simulations/DopplerSimulator';
import { SignalRecoverySimulator } from './components/simulations/SignalRecoverySimulator';
import { ModulationSimulator } from './components/simulations/ModulationSimulator';
import { motion, AnimatePresence } from 'motion/react';
import { Construction, Menu } from 'lucide-react';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center">
        <Construction className="w-10 h-10 text-slate-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          This simulation is currently under development. It will feature interactive models based on the course notes.
        </p>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
      >
        Go Back
      </button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home onStart={(id) => setActiveTab(id)} />;
      case 'cellular':
        return <CellularSimulator />;
      case 'trunking':
        return <TrunkingSimulator />;
      case 'handoff':
        return <PropagationSimulator />;
      case 'doppler':
        return <DopplerSimulator />;
      case 'multipath':
        return <MultipathSimulator />;
      case 'signal-recovery':
        return <SignalRecoverySimulator />;
      case 'modulation':
        return <ModulationSimulator />;
      case 'mimo':
        return <Placeholder title="5G MIMO & Beamforming" />;
      default:
        return <Home onStart={(id) => setActiveTab(id)} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 overflow-y-auto relative w-full">
        {/* Mobile Header */}
        <div className="md:hidden p-4 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-30">
           <div className="font-bold text-slate-900">Wireless Lab</div>
           <button 
             onClick={() => setIsSidebarOpen(true)} 
             className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
           >
             <Menu className="w-6 h-6" />
           </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
