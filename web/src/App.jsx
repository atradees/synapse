import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Scene from './components/Brain/Scene';
import DetailPanel from './components/UI/DetailPanel';
import MarketStatus from './components/UI/MarketStatus';
import ControlPanel from './components/ControlPanel'; // Desktop Only
import { useCorrelation } from './hooks/useCorrelation';
import { useMobile } from './hooks/useMobile'; 
import { Search, Palette, Loader2, Sliders, Filter, Gamepad2, MousePointer2, Ban, Clock, X, Activity, Zap, ChevronDown, RefreshCw } from 'lucide-react';

const THEMES = {
  standard: { name: 'MARKET STD', colors: { up: '#26a69a', down: '#ef5350', base: '#d1d4dc', bg: '#131722', header: 'text-gray-200' } },
  classic: { name: 'NEON CYBER', colors: { up: '#00f3ff', down: '#ff0055', base: '#00f3ff', bg: '#030305', header: 'text-cyan-400' } },
  terminal: { name: 'AMBER OS', colors: { up: '#ffb86c', down: '#bd4900', base: '#ffb86c', bg: '#0f0a05', header: 'text-orange-400' } },
  monochrome: { name: 'PURE MONO', colors: { up: '#ffffff', down: '#444444', base: '#ffffff', bg: '#000000', header: 'text-white' } }
};

// --- PHYSICS CONSTANTS (SINGLE SOURCE OF TRUTH) ---
const GRAVITY_LOOSE = -3000; // Slider 0 (Sangat Menyebar)
const GRAVITY_TIGHT = -50;   // Slider 100 (Sangat Rapat)

function App() {
  const [controlMode, setControlMode] = useState(null); 
  const [timeframe, setTimeframe] = useState('1Y'); 
  const [selectedNode, setSelectedNode] = useState(null);
  const [currentThemeKey, setCurrentThemeKey] = useState('standard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // CONFIG STATE (Default Repulsion Negative)
  const [config, setConfig] = useState({
    minCorrelation: 0.25,
    gravity: -150, 
  });
  
  const [selectedIndustries, setSelectedIndustries] = useState([]); 

  // MOBILE UI STATE
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

  // --- LOGIC HELPER (MOBILE) ---
  // Menghitung persentase slider dari nilai gravity negatif saat ini
  const gravityPercent = Math.max(0, Math.min(100, ((config.gravity - GRAVITY_LOOSE) / (GRAVITY_TIGHT - GRAVITY_LOOSE)) * 100));
  
  const handleMobileGravity = (val) => {
    // Mengubah nilai slider (0-100) menjadi gravity negatif
    const repulsion = GRAVITY_LOOSE + (val / 100) * (GRAVITY_TIGHT - GRAVITY_LOOSE);
    setConfig(prev => ({ ...prev, gravity: repulsion }));
  };

  const searchInputRef = useRef(null);
  const { data, loading } = useCorrelation(); 
  const isMobile = useMobile(); 
  const theme = THEMES[currentThemeKey];

  useEffect(() => {
    if (isMobile && controlMode === 'fly') setControlMode('orbit');
  }, [isMobile, controlMode]);

  const filteredData = useMemo(() => {
    if (!data || !data.timeframes || !data.timeframes[timeframe]) return null;
    const rawData = data.timeframes[timeframe];
    
    const validNodes = rawData.nodes.filter(node => {
      if (selectedIndustries.length === 0) return true;
      return selectedIndustries.includes(node.group);
    });
    const validNodeIds = new Set(validNodes.map(n => n.id));

    const validLinks = rawData.links.filter(l => {
      if (Math.abs(l.value) < config.minCorrelation) return false;
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      return validNodeIds.has(srcId) && validNodeIds.has(tgtId);
    });

    return { nodes: validNodes, links: validLinks, global: rawData.global };
  }, [data, timeframe, config.minCorrelation, selectedIndustries]);

  useEffect(() => {
    if (selectedNode && filteredData) {
      const freshNode = filteredData.nodes.find(n => n.id === selectedNode.id);
      if (freshNode) setSelectedNode(freshNode); else setSelectedNode(null);
    }
  }, [filteredData, timeframe]);

  const availableIndustries = useMemo(() => {
    if (!data || !data.timeframes || !data.timeframes[timeframe]) return [];
    const allGroups = data.timeframes[timeframe].nodes.map(n => n.group);
    return [...new Set(allGroups)].sort();
  }, [data, timeframe]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'Escape') { setSearchQuery(''); setIsMobileSearchActive(false); searchInputRef.current?.blur(); setSelectedNode(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cycleTheme = () => {
    const keys = Object.keys(THEMES);
    setCurrentThemeKey(keys[(keys.indexOf(currentThemeKey) + 1) % keys.length]);
  };

  const handleNodeClick = (node) => {
    if (selectedNode && node && selectedNode.id === node.id) setSelectedNode(null); else setSelectedNode(node);
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
        <h1 className="text-4xl md:text-6xl font-light tracking-[0.5em] mb-2 z-10 text-center" style={{ color: theme.colors.base }}>SYNAPSE</h1>
        <p className="text-[10px] md:text-xs tracking-[0.3em] mb-12 z-10 opacity-50" style={{ color: theme.colors.base }}>SELECT INTERFACE PROTOCOL</p>
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 z-10">
          <button onClick={() => setControlMode('orbit')} className="group flex flex-col items-center gap-4 p-6 md:p-8 border rounded-2xl hover:bg-white/5 transition-all w-64" style={{ borderColor: `${theme.colors.base}30` }}>
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform"><MousePointer2 style={{ color: theme.colors.up }} size={32} /></div>
            <div className="text-center"><h3 className="font-bold tracking-widest text-sm mb-1" style={{ color: theme.colors.base }}>ANALYST</h3><p className="opacity-30 text-[10px]" style={{ color: theme.colors.base }}>Orbit View</p></div>
          </button>
          
          <button onClick={() => !isMobile && setControlMode('fly')} className={`group flex flex-col items-center gap-4 p-6 md:p-8 border rounded-2xl transition-all w-64 ${isMobile ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-white/5'}`} style={{ borderColor: `${theme.colors.down}30` }}>
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
               {isMobile ? <Ban style={{ color: theme.colors.base }} size={32} /> : <Gamepad2 style={{ color: theme.colors.down }} size={32} />}
            </div>
            <div className="text-center">
                <h3 className="font-bold tracking-widest text-sm mb-1" style={{ color: theme.colors.base }}>PILOT</h3>
                <p className="opacity-30 text-[10px]" style={{ color: theme.colors.base }}>{isMobile ? 'DESKTOP ONLY' : 'Flight Mode'}</p>
            </div>
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
              isSkeletonMode={false} 
              theme={theme} 
              // --- CRITICAL FIX: JANGAN PAKAI MINUS DISINI ---
              nodeRepulsion={config.gravity} 
              // ------------------------------------------------
              controlMode={controlMode} 
              timeframe={timeframe} 
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-white/20 font-mono"><Ban size={48} className="mb-4 opacity-20" /><p className="text-xs tracking-[0.2em]">NO DATA FOUND</p></div>
          )}
        </Suspense>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10 pointer-events-none">
        
        {/* DESKTOP UI (UNCHANGED) */}
        {!isMobile && (
            <>
                <div className="absolute left-8 top-8 pointer-events-none z-30">
                    <h1 className="text-4xl font-light tracking-[0.4em] transition-colors duration-1000" style={{ color: theme.colors.base }}>SYNAPSE</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-[9px] font-mono tracking-[0.3em] uppercase opacity-50" style={{ color: theme.colors.base }}>{theme.name} // {timeframe} // {controlMode.toUpperCase()}</p>
                        {filteredData?.global?.last_updated && (
                            <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest border px-2 py-0.5 rounded bg-white/5" style={{ borderColor: `${theme.colors.up}40`, color: theme.colors.up }}>
                                <Clock size={8} /><span>UPDATED: {filteredData.global.last_updated}</span>
                            </div>
                        )}
                    </div>
                </div>

                <button onClick={() => setControlMode(null)} className="absolute top-8 left-1/2 transform -translate-x-1/2 pointer-events-auto bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full text-[9px] font-bold tracking-widest border transition-all z-30 backdrop-blur-md" style={{ color: theme.colors.base, borderColor: `${theme.colors.base}20` }}>SWITCH MODE</button>

                <div className="absolute top-8 right-8 flex gap-3 pointer-events-auto items-start z-30">
                    <button onClick={cycleTheme} className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white/5 border transition-all" style={{ borderColor: `${theme.colors.base}20`, color: theme.colors.base }}><Palette size={16} /></button>
                    <div className="relative group w-72">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-3.5 w-3.5" style={{ color: theme.colors.base }} /></div>
                        <input ref={searchInputRef} type="text" className="block w-full pl-10 pr-4 py-2.5 border rounded-xl bg-black/60 focus:outline-none focus:bg-black/80 text-xs backdrop-blur-md transition-all font-mono" style={{ borderColor: `${theme.colors.base}20`, color: theme.colors.base }} placeholder="SEARCH ASSET..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
                        <AnimatePresence>{searchResults.length > 0 && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute mt-2 w-full bg-black/90 border rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-60 overflow-y-auto" style={{ borderColor: `${theme.colors.base}20` }}>{searchResults.map(node => (<button key={node.id} onClick={() => { setSelectedNode(node); setSearchQuery(''); }} className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center justify-between border-b last:border-0 group" style={{ borderColor: `${theme.colors.base}10` }}><div><div className="text-xs font-medium transition-colors" style={{ color: theme.colors.base }}>{node.name}</div></div></button>))}</motion.div>)}</AnimatePresence>
                    </div>
                </div>

                <div className="absolute left-8 top-32 w-64 pointer-events-auto space-y-4">
                     <ControlPanel config={config} setConfig={setConfig} onReset={() => setConfig({gravity: -150, minCorrelation: 0.25})} theme={theme} />
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

                <div className="absolute bottom-8 left-8 pointer-events-auto">
                    <MarketStatus stats={filteredData?.global || {system_stress: 0, regime: "STABLE"}} theme={theme} />
                </div>
                
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                     <div className="bg-black/60 backdrop-blur-xl border rounded-full p-1 flex gap-1 shadow-2xl" style={{ borderColor: `${theme.colors.base}20` }}>
                        {['1W', '1M', '3M', '1Y'].map(tf => (
                        <button key={tf} onClick={() => setTimeframe(tf)} className={`px-6 py-2 rounded-full text-[10px] font-bold tracking-widest transition-all`} style={{ backgroundColor: timeframe === tf ? theme.colors.base : 'transparent', color: timeframe === tf ? theme.colors.bg : theme.colors.base }}>{tf}</button>
                        ))}
                    </div>
                </div>
            </>
        )}

        {/* MOBILE UI (THE SMART DOCK) */}
        {isMobile && (
            <>
                <div className="absolute left-6 top-6 pointer-events-none z-30 opacity-60">
                     <h1 className="text-xl font-light tracking-[0.3em]" style={{ color: theme.colors.base }}>SYNAPSE</h1>
                </div>

                <button onClick={cycleTheme} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-black/10 backdrop-blur-xl border border-white/5 transition-all pointer-events-auto z-40">
                    <Palette size={14} className="text-white/80" />
                </button>

                {/* SEARCH RESULTS */}
                <AnimatePresence>
                    {isMobileSearchActive && searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-36 left-4 right-4 bg-[#1a1a1a]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-3xl max-h-[40vh] overflow-y-auto pointer-events-auto z-50">
                            {searchResults.map(node => (
                                <button key={node.id} onClick={() => { setSelectedNode(node); setSearchQuery(''); setIsMobileSearchActive(false); }} className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center justify-between border-b border-white/5 last:border-0">
                                    <span className="text-xs font-medium text-white/90">{node.name}</span>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* SECTOR FILTERS (Fades out when Settings Open) */}
                <motion.div 
                    animate={{ 
                        opacity: (isMobileSettingsOpen || isMobileSearchActive) ? 0 : 1,
                        pointerEvents: (isMobileSettingsOpen || isMobileSearchActive) ? 'none' : 'auto',
                        y: (isMobileSettingsOpen || isMobileSearchActive) ? 20 : 0
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute bottom-24 left-0 right-0 px-4 z-40"
                >
                     <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 mask-linear-fade">
                        {availableIndustries.map(ind => (
                            <button key={ind} onClick={() => setSelectedIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind])} className={`px-3 py-1.5 rounded-full text-[9px] font-bold border border-white/10 transition-all whitespace-nowrap bg-[#1a1a1a]/60 backdrop-blur-md shadow-sm`} style={{ backgroundColor: selectedIndustries.includes(ind) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.4)', color: 'white' }}>{ind}</button>
                        ))}
                     </div>
                </motion.div>

                {/* --- THE SMART DOCK (UNIFIED COMPONENT) --- */}
                <motion.div 
                    layout 
                    initial={false}
                    animate={{ 
                        height: isMobileSettingsOpen ? 'auto' : '3.5rem',
                        backgroundColor: isMobileSettingsOpen ? 'rgba(18, 18, 18, 0.95)' : 'rgba(26, 26, 26, 0.6)'
                    }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-8 left-4 right-4 border border-white/10 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-auto z-50 backdrop-blur-2xl overflow-hidden flex flex-col justify-end"
                >
                    
                    {/* SETTINGS CONTENT (RENDERED INSIDE DOCK) */}
                    <AnimatePresence>
                        {isMobileSettingsOpen && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="px-6 pt-6 pb-2 space-y-6 w-full"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white/50">
                                        <Sliders size={12} />
                                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase">PHYSICS ENGINE</span>
                                    </div>
                                    {/* Close Button Inside Panel */}
                                    <button onClick={() => setIsMobileSettingsOpen(false)} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20">
                                        <ChevronDown size={14} className="text-white"/>
                                    </button>
                                </div>

                                {/* Gravity Slider */}
                                <div className="space-y-3" onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between text-[10px] font-mono text-white/90">
                                        <span className="opacity-60 flex items-center gap-2"><Activity size={12}/> GRAVITY</span>
                                        <span className="font-bold text-blue-400">{gravityPercent.toFixed(0)}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="100" step="1" 
                                        value={gravityPercent} 
                                        onChange={(e) => handleMobileGravity(parseFloat(e.target.value))}
                                        className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-blue-500 cursor-pointer"
                                    />
                                </div>

                                {/* Correlation Slider */}
                                <div className="space-y-3" onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between text-[10px] font-mono text-white/90">
                                        <span className="opacity-60 flex items-center gap-2"><Zap size={12}/> MIN CORRELATION</span>
                                        <span className="font-bold text-green-400">{config.minCorrelation.toFixed(2)}</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="0.8" step="0.05" 
                                        value={config.minCorrelation} 
                                        onChange={(e) => setConfig(prev => ({...prev, minCorrelation: parseFloat(e.target.value)}))}
                                        className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-green-500 cursor-pointer"
                                    />
                                </div>

                                {/* Reset */}
                                <button onClick={() => setConfig({gravity: -150, minCorrelation: 0.25})} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest text-white/60 hover:bg-white/10 flex items-center justify-center gap-2 mb-2">
                                    <RefreshCw size={12}/> RESET DEFAULTS
                                </button>
                                
                                <div className="h-px bg-white/10 w-full" /> 
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* DOCK BAR (ALWAYS VISIBLE AT BOTTOM) */}
                    <div className="h-14 w-full flex items-center justify-between px-2 shrink-0">
                        {isMobileSearchActive ? (
                            <div className="flex items-center w-full gap-2 px-2">
                                <Search size={16} className="text-white/60" />
                                <input autoFocus ref={searchInputRef} type="text" className="bg-transparent border-none outline-none text-xs font-mono flex-1 h-full placeholder-white/30 text-white" placeholder="SEARCH NODE..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                <button onClick={() => { setIsMobileSearchActive(false); setSearchQuery(''); }} className="p-2 rounded-full bg-white/10"><X size={14} className="text-white" /></button>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setIsMobileSearchActive(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"><Search size={18} className="text-white/80" /></button>
                                
                                {/* Timeframe Toggles */}
                                <div className="flex items-center gap-0 bg-white/5 rounded-full p-1 border border-white/5">
                                    {['1W', '1M', '3M', '1Y'].map(tf => (
                                        <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1.5 rounded-full text-[9px] font-bold transition-all min-w-[36px]`} style={{ backgroundColor: timeframe === tf ? 'rgba(255,255,255,0.1)' : 'transparent', color: timeframe === tf ? 'white' : 'rgba(255,255,255,0.4)' }}>{tf}</button>
                                    ))}
                                </div>

                                {/* Settings Toggle (Changes icon when open) */}
                                <button onClick={() => setIsMobileSettingsOpen(!isMobileSettingsOpen)} className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors ${isMobileSettingsOpen ? 'bg-white/10 text-white' : 'text-white/80'}`}>
                                    {isMobileSettingsOpen ? <X size={18} /> : <Sliders size={18} />}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </>
        )}

        <div className="pointer-events-auto">
          <AnimatePresence mode="wait">
            {selectedNode && (
                <DetailPanel 
                    key="detail-panel" 
                    selectedNode={selectedNode} 
                    links={filteredData?.links} 
                    onClose={() => setSelectedNode(null)} 
                    timeframe={timeframe} 
                    theme={theme} 
                    isMobile={isMobile} 
                />
            )}
          </AnimatePresence>
        </div>
        
        {!isMobile && <div className="absolute bottom-4 right-8 text-[9px] font-mono tracking-widest opacity-30" style={{ color: theme.colors.base }}>POWERED BY ATRADEES NETWORK</div>}
      </motion.div>
    </div>
  );
}

export default App;