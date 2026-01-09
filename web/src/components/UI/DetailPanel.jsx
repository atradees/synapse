import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Activity, Share2, Target } from 'lucide-react';

const DetailPanel = ({ selectedNode, links, onClose, timeframe, theme, isMobile }) => {
  if (!selectedNode) return null;

  // --- 1. DATA LOGIC (Diambil Persis dari Kode Lama Anda) ---
  
  // Filter & Sort Links
  const myLinks = links.filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return s === selectedNode.id || t === selectedNode.id;
  }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 10);

  // Helper untuk Nama Node Lawan
  const getLinkName = (l) => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      // Jika source/target adalah object, ambil .name, jika tidak ambil string langsung
      const sName = typeof l.source === 'object' ? (l.source.name || l.source.id) : l.source;
      const tName = typeof l.target === 'object' ? (l.target.name || l.target.id) : l.target;
      return sId === selectedNode.id ? tName : sName;
  };

  // Metrics Mapping (Sesuai Request Data Anda)
  const change = selectedNode.periodChange !== undefined ? selectedNode.periodChange : 0;
  const zScore = selectedNode.zScore !== undefined ? selectedNode.zScore : 0;
  const participation = selectedNode.power !== undefined ? selectedNode.power : 0; // Asumsi 'power' adalah participation
  const influence = selectedNode.influence !== undefined ? selectedNode.influence : 0;

  // Formatting Strings
  const returnStr = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
  const zScoreStr = `${zScore.toFixed(2)}σ`;
  const participationStr = `${(participation * 100).toFixed(1)}%`;
  const influenceStr = influence.toFixed(3);

  // Color Logic
  const isPos = change >= 0;
  const returnColor = isPos ? theme.colors.up : theme.colors.down;

  // --- COMPONENT: METRIC CARD (Reusable) ---
  const MetricCard = ({ label, value, color, icon: Icon }) => (
    <div className={`
      relative overflow-hidden rounded-2xl border flex flex-col justify-between
      ${isMobile ? 'p-3.5 h-20 bg-white/5 border-white/5 backdrop-blur-md' : 'p-3 rounded-lg bg-white/5 border-white/5'}
    `}>
      <div className="flex justify-between items-start">
        <span className={`text-[9px] font-bold tracking-widest opacity-50 uppercase`} style={{ color: theme.colors.base }}>{label}</span>
        {Icon && <Icon size={12} className="opacity-30" style={{ color: theme.colors.base }} />}
      </div>
      <div className={`${isMobile ? 'text-lg' : 'text-sm'} font-mono font-bold tracking-tight`} style={{ color: color || theme.colors.base }}>
        {value}
      </div>
    </div>
  );

  // --- MOBILE LAYOUT (BOTTOM SHEET - APPLE GLASS) ---
  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[3px] z-[60]"
            onClick={onClose}
        />
        
        <motion.div 
            initial={{ y: "110%" }} animate={{ y: 0 }} exit={{ y: "110%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            // ULTRA GLASS: Lebih gelap sedikit agar text terbaca, blur maksimal
            className="fixed bottom-0 left-0 right-0 h-[80vh] bg-[#1a1a1a]/80 backdrop-blur-3xl border-t border-white/10 rounded-t-[2.5rem] z-[70] shadow-[0_-20px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col safe-area-bottom ring-1 ring-white/5"
        >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-5 pb-3 flex-shrink-0 cursor-pointer" onClick={onClose}>
                <div className="w-10 h-1.5 rounded-full bg-white/20"></div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 pt-2 pb-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-3xl font-light tracking-tight text-white mb-1">{selectedNode.ticker || selectedNode.id}</h2>
                        <div className="text-sm font-medium opacity-60 text-white mb-3">{selectedNode.name}</div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-white/10 bg-white/5 text-white/80">{selectedNode.group}</span>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full backdrop-blur-md"><X size={20} className="text-white"/></button>
                </div>

                {/* 4-GRID METRICS */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <MetricCard label={`${timeframe} RETURN`} value={returnStr} color={returnColor} icon={TrendingUp} />
                    <MetricCard label="Z-SCORE" value={zScoreStr} color={zScore > 0 ? theme.colors.up : theme.colors.down} icon={Activity} />
                    <MetricCard label="PARTICIPATION" value={participationStr} color={theme.colors.base} icon={Share2} />
                    <MetricCard label="INFLUENCE" value={influenceStr} color={theme.colors.base} icon={Target} />
                </div>

                {/* Correlations */}
                <h3 className="text-[10px] font-bold tracking-widest opacity-40 mb-4 uppercase text-white">KEY CORRELATIONS</h3>
                <div className="space-y-3 pb-20">
                    {myLinks.map((link, i) => {
                        const rawLinkVal = link.value; 
                        const isLinkPos = rawLinkVal > 0;
                        const displayPercent = (rawLinkVal * 100).toFixed(0) + "%";
                        const barColor = isLinkPos ? theme.colors.up : theme.colors.down;
                        // Limit width visual max 100%
                        const widthPercent = Math.min(Math.abs(rawLinkVal * 100), 100) + "%";
                        
                        return (
                            <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                                <span className="text-xs font-bold text-white/90 truncate w-32">{getLinkName(link)}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden flex justify-start relative">
                                        <div className="h-full rounded-full opacity-90" style={{ width: widthPercent, backgroundColor: barColor }}></div>
                                    </div>
                                    <span className="text-xs font-mono font-bold w-10 text-right" style={{ color: barColor }}>{displayPercent}</span>
                                </div>
                            </div>
                        );
                    })}
                    {myLinks.length === 0 && <div className="text-[10px] opacity-30 text-center">No significant correlations</div>}
                </div>
            </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- DESKTOP LAYOUT (COMPACT FLOATING) ---
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} 
        className="absolute top-28 right-6 w-64 bg-black/80 backdrop-blur-xl border rounded-xl p-4 shadow-2xl z-50 max-h-[75vh] overflow-y-auto scrollbar-hide"
        style={{ borderColor: `${theme.colors.base}20` }}
      >
        <div className="flex justify-between items-start mb-4 border-b pb-3" style={{ borderColor: `${theme.colors.base}10` }}>
          <div>
            <h2 className="text-2xl font-light tracking-wide mb-0.5" style={{ color: theme.colors.base }}>{selectedNode.ticker || selectedNode.id}</h2>
            <div className="text-[9px] font-bold opacity-60 mb-2" style={{ color: theme.colors.base }}>{selectedNode.name}</div>
            <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-white/10 border border-white/5" style={{ color: theme.colors.base }}>{selectedNode.group}</span>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform opacity-70 hover:opacity-100" style={{ color: theme.colors.base }}><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
            <MetricCard label="RETURN" value={returnStr} color={returnColor} />
            <MetricCard label="Z-SCORE" value={zScoreStr} color={zScore > 0 ? theme.colors.up : theme.colors.down} />
            <MetricCard label="POWER" value={participationStr} />
            <MetricCard label="INFLUENCE" value={influenceStr} />
        </div>

        <h3 className="text-[9px] font-bold tracking-widest opacity-40 mb-2" style={{ color: theme.colors.base }}>CORRELATIONS</h3>
        <div className="space-y-1">
          {myLinks.map((link, i) => {
             const rawLinkVal = link.value;
             const isLinkPos = rawLinkVal > 0;
             const displayPercent = (rawLinkVal * 100).toFixed(0) + "%";
             const linkColor = isLinkPos ? theme.colors.up : theme.colors.down;

             return (
                <div key={i} className="flex justify-between items-center text-[10px] p-1.5 rounded hover:bg-white/5 transition-colors">
                  <span className="font-medium opacity-80 truncate w-24" style={{ color: theme.colors.base }}>{getLinkName(link)}</span>
                  <span className="font-mono font-bold" style={{ color: linkColor }}>{displayPercent}</span>
                </div>
             );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DetailPanel;