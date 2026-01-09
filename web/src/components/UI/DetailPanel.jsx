import React from 'react';
import { X, TrendingUp, Activity, Share2, Target } from 'lucide-react';

const DetailPanel = ({ selectedNode, links, onClose, timeframe, theme }) => {
  if (!selectedNode) return null;

  // Filter 10 strong links
  const myLinks = links.filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return s === selectedNode.id || t === selectedNode.id;
  }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 10);

  const getLinkName = (l) => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      const sName = typeof l.source === 'object' ? l.source.name : l.source;
      const tName = typeof l.target === 'object' ? l.target.name : l.target;
      return sId === selectedNode.id ? tName : sName;
  };

  const change = selectedNode.periodChange || 0;
  const isPos = change >= 0;
  // Gunakan warna tema untuk teks
  const valColor = isPos ? theme.colors.up : theme.colors.down;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/10 p-6 z-50 backdrop-blur-xl shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
            <h2 className="text-2xl font-black text-white tracking-wider">{selectedNode.ticker || selectedNode.id}</h2>
            <p className="text-[10px] text-white/40 font-mono tracking-widest mt-1 uppercase">{selectedNode.name}</p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white/60 border border-white/5">
                {selectedNode.group}
            </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white">
            <X size={18} />
        </button>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1 text-white/40 text-[9px] font-mono">
                <TrendingUp size={10} /> <span>{timeframe} RETURN</span>
            </div>
            <div className="text-lg font-bold" style={{ color: valColor }}>
                {change > 0 ? '+' : ''}{change}%
            </div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1 text-white/40 text-[9px] font-mono">
                <Activity size={10} /> <span>Z-SCORE</span>
            </div>
            <div className="text-lg font-bold" style={{ color: selectedNode.zScore > 0 ? theme.colors.up : theme.colors.down }}>
                {selectedNode.zScore}σ
            </div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1 text-white/40 text-[9px] font-mono">
                <Share2 size={10} /> <span>PARTICIPATION</span>
            </div>
            <div className="text-lg font-bold text-white">
                {((selectedNode.power || 0) * 100).toFixed(1)}%
            </div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1 text-white/40 text-[9px] font-mono">
                <Target size={10} /> <span>INFLUENCE</span>
            </div>
            <div className="text-lg font-bold text-white">
                {selectedNode.influence || 0}
            </div>
        </div>
      </div>

      {/* CORRELATIONS */}
      <div>
        <h3 className="text-[10px] font-bold text-white/30 tracking-widest uppercase mb-3 border-b border-white/10 pb-2">KEY CORRELATIONS</h3>
        <div className="space-y-1">
            {myLinks.map((link, i) => (
                <div key={i} className="flex justify-between items-center py-2 px-3 hover:bg-white/5 rounded border border-transparent hover:border-white/5 transition-all group">
                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors truncate w-40">
                        {getLinkName(link)}
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="h-1 rounded-full" 
                             style={{ 
                                 width: `${Math.abs(link.value) * 30}px`,
                                 backgroundColor: link.value > 0 ? theme.colors.up : theme.colors.down
                             }} />
                        <span className="text-[9px] font-mono" style={{ color: link.value > 0 ? theme.colors.up : theme.colors.down }}>
                            {(link.value * 100).toFixed(0)}%
                        </span>
                    </div>
                </div>
            ))}
            {myLinks.length === 0 && <div className="text-[10px] text-white/20 italic">No significant correlations.</div>}
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-8 p-3 rounded text-[9px] leading-relaxed border"
           style={{ backgroundColor: `${theme.colors.base}10`, borderColor: `${theme.colors.base}20`, color: theme.colors.base }}>
        <strong>NOTE:</strong> Metrics are calculated over a {timeframe} rolling window relative to market conditions.
      </div>

    </div>
  );
};

export default DetailPanel;