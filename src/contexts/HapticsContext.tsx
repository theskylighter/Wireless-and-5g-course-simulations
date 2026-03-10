import React, { createContext, useContext, useState } from 'react';
import { useWebHaptics } from 'web-haptics/react';

type HapticPreset = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

interface HapticsContextType {
  isHapticsEnabled: boolean;
  toggleHaptics: () => void;
  triggerHaptic: (type: HapticPreset | number | number[]) => void;
  startRepeatingHaptic: (type: HapticPreset, intervalMs: number) => () => void;
}

const HapticsContext = createContext<HapticsContextType | undefined>(undefined);

export const HapticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(true);
  const { trigger } = useWebHaptics();

  const toggleHaptics = () => setIsHapticsEnabled(prev => !prev);

  const triggerHaptic = (type: HapticPreset | number | number[]) => {
    if (isHapticsEnabled) {
      try {
        trigger(type as any);
      } catch (e) {
        // Ignore errors if vibration API is not supported
      }
    }
  };

  const startRepeatingHaptic = (type: HapticPreset, intervalMs: number) => {
    if (!isHapticsEnabled) return () => {};
    const intervalId = setInterval(() => {
      try {
        trigger(type as any);
      } catch (e) {
        // Ignore errors
      }
    }, intervalMs);
    return () => clearInterval(intervalId);
  };

  return (
    <HapticsContext.Provider value={{ isHapticsEnabled, toggleHaptics, triggerHaptic, startRepeatingHaptic }}>
      {children}
    </HapticsContext.Provider>
  );
};

export const useHaptics = () => {
  const context = useContext(HapticsContext);
  if (!context) {
    throw new Error('useHaptics must be used within a HapticsProvider');
  }
  return context;
};
