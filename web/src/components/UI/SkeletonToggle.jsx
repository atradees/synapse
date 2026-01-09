import React from 'react';
import { Layers, ZapOff } from 'lucide-react';

const SkeletonToggle = ({ isSkeletonMode, onToggle }) => {
  return (
    <div className="absolute bottom-8 right-8 pointer-events-auto">
      <button 
        onClick={() => onToggle(!isSkeletonMode)}
        className={`group flex items-center gap-3 px-5 py-3 rounded-full border transition-all duration-300 backdrop-blur-md shadow-2xl ${
          isSkeletonMode 
            ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]' 
            : 'bg-black/60 text-white/60 border-white/10 hover:text-white hover:border-white/30'
        }`}
      >
        {/* Icon berubah sesuai state */}
        {isSkeletonMode ? <ZapOff size={16} className="text-black" /> : <Layers size={16} />}
        
        <div className="flex flex-col items-start">
            <span className="text-[10px] font-black tracking-[0.2em] uppercase leading-none">
                {isSkeletonMode ? 'NOISE REDUCED' : 'FULL NETWORK'}
            </span>
            <span className="text-[8px] font-mono opacity-50 tracking-wider leading-none mt-1">
                {isSkeletonMode ? 'CRITICAL PATH ONLY' : 'SHOW ALL CONNECTIONS'}
            </span>
        </div>
      </button>
    </div>
  );
};

export default SkeletonToggle;