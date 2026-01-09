import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';

const ControlPanel = ({ config, setConfig, onReset, theme }) => {
  const isMobile = useMobile();
  const [isExpanded, setIsExpanded] = useState(true);

  if (isMobile) return null; // Mobile Logic handled in App.jsx

  // CONSTANTS - HARUS SAMA DENGAN APP.JSX
  const GRAVITY_LOOSE = -3000;
  const GRAVITY_TIGHT = -50;

  // Convert Config (Negative) -> Slider (0-100)
  const gravityPercent = Math.max(0, Math.min(100, ((config.gravity - GRAVITY_LOOSE) / (GRAVITY_TIGHT - GRAVITY_LOOSE)) * 100));

  const handleGravityChange = (val) => {
    // Convert Slider (0-100) -> Config (Negative)
    const repulsion = GRAVITY_LOOSE + (val / 100) * (GRAVITY_TIGHT - GRAVITY_LOOSE);
    setConfig({ ...config, gravity: repulsion });
  };

  return (
    <div className="bg-black/60 backdrop-blur-md border rounded-xl p-4 shadow-xl w-64 transition-all" style={{ borderColor: `${theme.colors.base}20` }}>
      <div 
        className="flex items-center gap-2 mb-3 opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Settings size={12} style={{ color: theme.colors.base }} /> 
        <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: theme.colors.base }}>PHYSICS ENGINE</span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[8px] font-mono opacity-60" style={{ color: theme.colors.base }}>
                <span>MIN CORRELATION</span>
                <span style={{ color: theme.colors.up }}>{config.minCorrelation.toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="0.8" step="0.05" value={config.minCorrelation} onChange={(e) => setConfig({ ...config, minCorrelation: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"/>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[8px] font-mono opacity-60" style={{ color: theme.colors.base }}>
                <span>GRAVITY</span>
                <span style={{ color: theme.colors.down }}>{gravityPercent.toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="100" step="1" value={gravityPercent} onChange={(e) => handleGravityChange(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"/>
            </div>

            <button onClick={onReset} className="w-full py-1.5 mt-1 rounded bg-white/5 text-[8px] font-bold tracking-widest hover:bg-white/10 transition-colors border border-transparent hover:border-white/10" style={{ color: theme.colors.base }}>
              RESET
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ControlPanel;