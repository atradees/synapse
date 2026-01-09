import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Scene from './components/Brain/Scene';
import DetailPanel from './components/UI/DetailPanel';
import SkeletonToggle from './components/UI/SkeletonToggle';
import MarketStatus from './components/UI/MarketStatus';
import { useCorrelation } from './hooks/useCorrelation';
import { Search, Palette, Loader2, Sliders, Filter, Gamepad2, MousePointer2, Ban, Clock } from 'lucide-react';

const THEMES = {
  standard: { name: 'MARKET STD', colors: { up: '#26a69a', down: '#ef5350', base: '#d1d4dc', bg: '#131722', header: 'text-gray-200' } },
  classic: { name: 'NEON CYBER', colors: { up: '#00f3ff', down: '#ff0055', base: '#00f3ff', bg: '#030305', header: 'text-cyan-400' } },
  terminal: { name: 'AMBER OS', colors: { up: '#ffb86c', down: '#bd4900', base: '#ffb86c', bg: '#0f0a05', header: 'text-orange-400' } },
  monochrome: { name: 'PURE MONO', colors: { up: '#ffffff', down: '#444444', base: '#ffffff', bg: '#000000', header: 'text-white' } }
};

const getSafeId = (nodeOrId) => {
  if (!nodeOrId) return null;
  return typeof nodeOrId === 'object' ? nodeOrId.id : nodeOrId;
};

function App() {
  const [controlMode, setControlMode] = useState(null); 
  const [timeframe, setTimeframe] = useState('1Y'); 
  const [selectedNode, setSelectedNode] = useState(null);
  const [isSkeletonMode, setIsSkeletonMode] = useState(false);
  const [currentThemeKey, setCurrentThemeKey] = useState('standard');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [minCorrelation, setMinCorrelation] = useState(0.25);
  const [nodeRepulsion, setNodeRepulsion] = useState(-150);
  const [selectedIndustries, setSelectedIndustries] = useState([]); 

  const searchInputRef = useRef(null);
  const { data, loading } = useCorrelation(); 
  const theme = THEMES[currentThemeKey];

  const filteredData = useMemo(() => {
    if (!data || !data.timeframes || !data.timeframes[timeframe]) return null;
    const rawData = data.timeframes[timeframe];
    
    const validNodes = rawData.nodes.filter(node => {
      if (selectedIndustries.length === 0) return true;
      return selectedIndustries.includes(node.group);
    });
    const validNodeIds = new Set(validNodes.map(n => n.id));

    const validLinks = rawData.links.filter(l => {
      if (Math.abs(l.value) < minCorrelation) return false;
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      return validNodeIds.has(srcId) && validNodeIds.has(tgtId);
    });

    return { nodes: validNodes, links: validLinks, global: rawData.global };
  }, [data, timeframe, minCorrelation, selectedIndustries]);

  // Deep Sync Data
  useEffect(() => {
    if (selectedNode && filteredData) {
      const freshNode = filteredData.nodes.find(n => n.id === selectedNode.id);
      if (freshNode) setSelectedNode(freshNode);
      else setSelectedNode(null);
    }
  }, [filteredData, timeframe]);

  const availableIndustries = useMemo(() => {
    if (!data || !data.timeframes || !data.timeframes[timeframe]) return [];
    const allGroups = data.timeframes[timeframe].nodes.map(n => n.group);
    return [...new Set(allGroups)].sort();
  }, [data, timeframe]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault(); searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') { setSearchQuery(''); searchInputRef.current?.blur(); setSelectedNode(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cycleTheme = () => {
    const keys = Object.keys(THEMES);
    setCurrentThemeKey(keys[(keys.indexOf(currentThemeKey) + 1) % keys.length]);
  };

  const handleNodeClick = (node) => {
    if (selectedNode && node && selectedNode.id === node.id) setSelectedNode(null);
    else setSelectedNode(node);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery || !filteredData) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return filteredData.nodes.filter(n => n.name.toLowerCase().includes(lowerQuery) || n.id.toLowerCase().includes(lowerQuery)).slice(0, 10);
  }, [searchQuery, filteredData]);

  if (loading) return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center gap-4 font-mono">
      <Loader2 className="text-white/20 animate-spin" size={32} />
      <p className="text-white/20 text-[10px] tracking-[0.5em]">SYSTEM BOOT...</p>
    </div>
  );

  if (!controlMode) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-mono" style={{ backgroundColor: theme.colors.bg }}>
        <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at center, ${theme.colors.up}10 0%, ${theme.colors.bg} 70%)` }} />
        <h1 className="text-6xl font-light tracking-[0.5em] mb-2 z-10" style={{ color: theme.colors.base }}>SYNAPSE</h1>
        <p className="text-xs tracking-[0.3em] mb-12 z-10 opacity-50" style={{ color: theme.colors.base }}>SELECT INTERFACE PROTOCOL</p>
        <div className="flex gap-8 z-10">
          <button onClick={() => setControlMode('orbit')} className="group flex flex-col items-center gap-4 p-8 border rounded-2xl hover:bg-white/5 transition-all w-64" style={{ borderColor: `${theme.colors.base}30` }}>
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform"><MousePointer2 style={{ color: theme.colors.up }} size={32} /></div>
            <div className="text-center"><h3 className="font-bold tracking-widest text-sm mb-1" style={{ color: theme.colors.base }}>ANALYST</h3><p className="opacity-30 text-[10px]" style={{ color: theme.colors.base }}>Orbit View</p></div>
          </button>
          <button onClick={() => setControlMode('fly')} className="group flex flex-col items-center gap-4 p-8 border rounded-2xl hover:bg-white/5 transition-all w-64" style={{ borderColor: `${theme.colors.down}30` }}>
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform"><Gamepad2 style={{ color: theme.colors.down }} size={32} /></div>
            <div className="text-center"><h3 className="font-bold tracking-widest text-sm mb-1" style={{ color: theme.colors.base }}>PILOT</h3><p className="opacity-30 text-[10px]" style={{ color: theme.colors.base }}>Flight Mode</p></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative transition-colors duration-1000" style={{ backgroundColor: theme.colors.bg }}>
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          {filteredData && filteredData.nodes.length > 0 ? (
            <Scene 
              key={timeframe} 
              data={filteredData} 
              onNodeClick={handleNodeClick}
              focusTarget={selectedNode}
              isSkeletonMode={isSkeletonMode}
              theme={theme}
              nodeRepulsion={nodeRepulsion}
              controlMode={controlMode}
              timeframe={timeframe}
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-white/20 font-mono">
                <Ban size={48} className="mb-4 opacity-20" />
                <p className="text-xs tracking-[0.2em]">NO DATA FOUND</p>
            </div>
          )}
        </Suspense>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10 pointer-events-none">
        
        <div className="absolute left-8 top-8 pointer-events-none">
          <h1 className="text-4xl font-light tracking-[0.4em] transition-colors duration-1000" style={{ color: theme.colors.base }}>SYNAPSE</h1>
          <div className="flex items-center gap-4 mt-2">
             <p className="text-[9px] font-mono tracking-[0.3em] uppercase opacity-50" style={{ color: theme.colors.base }}>
                {theme.name} // {timeframe} // {controlMode.toUpperCase()} // {filteredData?.nodes?.length || 0} NODES
             </p>
             {filteredData?.global?.last_updated && (
                 <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest border px-2 py-0.5 rounded bg-white/5" style={{ borderColor: `${theme.colors.up}40`, color: theme.colors.up }}>
                    <Clock size={8} /><span>UPDATED: {filteredData.global.last_updated}</span>
                 </div>
             )}
          </div>
        </div>

        <button onClick={() => setControlMode(null)} className="absolute top-8 left-1/2 transform -translate-x-1/2 pointer-events-auto bg-white/5 hover:bg-white/10 px-4 py-1 rounded-full text-[9px] font-bold tracking-widest border transition-all" style={{ color: theme.colors.base, borderColor: `${theme.colors.base}20` }}>SWITCH MODE</button>

        <div className="absolute left-8 top-32 w-64 pointer-events-auto space-y-4">
          <div className="bg-black/60 backdrop-blur-md border rounded-xl p-4 shadow-2xl" style={{ borderColor: `${theme.colors.base}20` }}>
            <div className="flex items-center gap-2 mb-3 opacity-50" style={{ color: theme.colors.base }}><Sliders size={12} /> <span className="text-[9px] font-bold tracking-widest uppercase">Physics Engine</span></div>
            <div className="mb-3"><div className="flex justify-between text-[8px] font-mono mb-1 opacity-60" style={{ color: theme.colors.base }}><span>MIN CORRELATION</span><span style={{ color: theme.colors.up }}>{minCorrelation.toFixed(2)}</span></div><input type="range" min="0" max="0.8" step="0.05" value={minCorrelation} onChange={(e) => setMinCorrelation(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"/></div>
            <div><div className="flex justify-between text-[8px] font-mono mb-1 opacity-60" style={{ color: theme.colors.base }}><span>GRAVITY</span><span style={{ color: theme.colors.down }}>{Math.abs(nodeRepulsion)}</span></div><input type="range" min="-500" max="-50" step="50" value={nodeRepulsion} onChange={(e) => setNodeRepulsion(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"/></div>
          </div>
          <div className="bg-black/60 backdrop-blur-md border rounded-xl p-4 shadow-2xl max-h-60 overflow-y-auto scrollbar-hide" style={{ borderColor: `${theme.colors.base}20` }}>
            <div className="flex items-center gap-2 mb-3 opacity-50" style={{ color: theme.colors.base }}><Filter size={12} /> <span className="text-[9px] font-bold tracking-widest uppercase">Sector Filter</span></div>
            <div className="flex flex-wrap gap-1.5">
              {availableIndustries.map(ind => (
                <button key={ind} onClick={() => setSelectedIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind])} className={`px-2 py-1 rounded text-[8px] font-bold border transition-all`} style={{ backgroundColor: selectedIndustries.includes(ind) ? theme.colors.base : 'transparent', color: selectedIndustries.includes(ind) ? theme.colors.bg : theme.colors.base, borderColor: `${theme.colors.base}30` }}>{ind}</button>
              ))}
              {selectedIndustries.length > 0 && <button onClick={() => setSelectedIndustries([])} className="px-2 py-1 rounded text-[8px] font-bold border border-transparent" style={{ color: theme.colors.down }}>CLEAR ALL</button>}
            </div>
          </div>
        </div>

        <div className="absolute top-8 right-8 flex gap-4 pointer-events-auto items-start">
          <button onClick={cycleTheme} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border transition-all" style={{ borderColor: `${theme.colors.base}20`, color: theme.colors.base }}><Palette size={16} /></button>
          <div className="relative group w-72">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-3.5 w-3.5" style={{ color: theme.colors.base }} /></div>
            <input ref={searchInputRef} type="text" className="block w-full pl-10 pr-12 py-2.5 border rounded-xl bg-black/60 focus:outline-none focus:bg-black/80 sm:text-xs backdrop-blur-md transition-all font-mono" style={{ borderColor: `${theme.colors.base}20`, color: theme.colors.base }} placeholder="SEARCH ASSET..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
            <AnimatePresence>{searchResults.length > 0 && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute mt-2 w-full bg-black/90 border rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl" style={{ borderColor: `${theme.colors.base}20` }}>{searchResults.map(node => (<button key={node.id} onClick={() => { setSelectedNode(node); setSearchQuery(''); }} className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center justify-between border-b last:border-0 group" style={{ borderColor: `${theme.colors.base}10` }}><div><div className="text-xs font-medium transition-colors" style={{ color: theme.colors.base }}>{node.name}</div></div></button>))}</motion.div>)}</AnimatePresence>
          </div>
        </div>

        <div className="pointer-events-auto">
          <DetailPanel 
            selectedNode={selectedNode} 
            links={filteredData?.links} 
            onClose={() => setSelectedNode(null)} 
            timeframe={timeframe}
            theme={theme} // PASS THEME HERE
          />
          {/* PASS THEME HERE TO MARKET STATUS */}
          <MarketStatus 
            stats={filteredData?.global || {system_stress: 0, regime: "STABLE"}} 
            theme={theme}
          />
          <SkeletonToggle isSkeletonMode={isSkeletonMode} onToggle={setIsSkeletonMode} />
        </div>
        
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-xl border rounded-full p-1.5 flex gap-1 shadow-2xl" style={{ borderColor: `${theme.colors.base}20` }}>
            {['1W', '1M', '3M', '1Y'].map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)} className={`px-6 py-2 rounded-full text-[10px] font-bold tracking-widest transition-all`} style={{ backgroundColor: timeframe === tf ? theme.colors.base : 'transparent', color: timeframe === tf ? theme.colors.bg : theme.colors.base }}>{tf}</button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 right-8 text-[9px] font-mono tracking-widest opacity-30" style={{ color: theme.colors.base }}>
            POWERED BY ATRADEES NETWORK
        </div>

      </motion.div>
    </div>
  );
}

export default App;