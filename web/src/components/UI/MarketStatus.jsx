import React, { useMemo } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';

const MarketStatus = ({ stats, theme }) => {
  const { system_stress } = stats || { system_stress: 0 };

  // Logic: 
  // High Stress = theme.colors.down (Crisis)
  // Low Stress = theme.colors.up (Stable)
  // Warning = theme.colors.base (Transition)
  const currentStatus = useMemo(() => {
      if (system_stress > 60) return { label: "CRITICAL STRESS", color: theme.colors.down, icon: AlertTriangle };
      if (system_stress > 30) return { label: "HIGH VOLATILITY", color: theme.colors.base, icon: Activity };
      return { label: "STABLE FLOW", color: theme.colors.up, icon: Activity };
  }, [system_stress, theme]);

  return (
    <div className="absolute left-8 bottom-8 pointer-events-auto">
      <div className="bg-black/80 backdrop-blur-xl border rounded-xl p-4 shadow-2xl min-w-[200px]"
           style={{ borderColor: `${theme.colors.base}20` }}>
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 border-b pb-2" style={{ borderColor: `${theme.colors.base}10` }}>
            <currentStatus.icon size={14} style={{ color: currentStatus.color }} />
            <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color: currentStatus.color }}>
                {currentStatus.label}
            </span>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
            <div>
                <div className="flex justify-between text-[9px] font-mono opacity-40 mb-1" style={{ color: theme.colors.base }}>
                    <span>SYSTEM STRESS</span>
                    <span>{system_stress}%</span>
                </div>
                {/* Visual Bar */}
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className="h-full transition-all duration-1000"
                        style={{ 
                            width: `${Math.min(system_stress, 100)}%`,
                            backgroundColor: currentStatus.color,
                            boxShadow: `0 0 10px ${currentStatus.color}`
                        }} 
                    />
                </div>
            </div>

            <div>
                <div className="flex justify-between text-[9px] font-mono opacity-40 mb-1" style={{ color: theme.colors.base }}>
                    <span>DATA INTEGRITY</span>
                    <span style={{ color: theme.colors.up }}>OPTIMAL</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-full animate-pulse" style={{ backgroundColor: theme.colors.up }} />
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default MarketStatus;