import React, { useRef, useEffect, useMemo, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// --- GEOMETRY ---
const SPHERE_GEO = new THREE.SphereGeometry(1, 16, 16); 

const getSafeId = (n) => typeof n === 'object' ? n.id : n;

const Scene = ({ 
  data, onNodeClick, focusTarget, isSkeletonMode, theme, nodeRepulsion, controlMode, timeframe
}) => {
  const fgRef = useRef();
  const controlsRef = useRef(null);
  
  // STATE UI
  const [hoverNode, setHoverNode] = useState(null); 
  const [aimedNode, setAimedNode] = useState(null); 
  const aimedNodeRef = useRef(null); 
  const [aimDistance, setAimDistance] = useState(0); 
  const [topCorrelations, setTopCorrelations] = useState({ pos: [], neg: [] });
  
  const [pulse, setPulse] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // PHYSICS STATE
  const moveState = useRef({ fwd: false, bwd: false, left: false, right: false, sprint: false });
  const velocity = useRef(new THREE.Vector3()); 

  // --- 1. DYNAMIC MATERIALS ---
  const materials = useMemo(() => {
    const { up, down, base } = theme.colors;
    return {
      up: new THREE.MeshStandardMaterial({ color: up, emissive: up, emissiveIntensity: 1.5, roughness: 0.1 }),
      down: new THREE.MeshStandardMaterial({ color: down, emissive: down, emissiveIntensity: 1.5, roughness: 0.1 }),
      neutral: new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0.3 }),
      locked: new THREE.MeshBasicMaterial({ color: "#ffffff" }), 
      dimmed: new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.05, depthWrite: false }),
    };
  }, [theme]);

  // --- 2. CONTROLS SETUP ---
  useEffect(() => {
    if (!fgRef.current) return;
    const graph = fgRef.current;
    
    if (controlMode === 'fly') {
        // KILL ORBIT CONTROLS INSTANTLY
        if (graph.controls()) graph.controls().enabled = false;
        
        const controls = new PointerLockControls(graph.camera(), graph.renderer().domElement);
        controlsRef.current = controls;
        
        const onLock = () => {
            setIsLocked(true);
            // RESET PHYSICS SAAT LOCK AGAR TIDAK LONCAT
            velocity.current.set(0, 0, 0); 
        };
        
        const onUnlock = () => {
            setIsLocked(false);
            moveState.current = { fwd: false, bwd: false, left: false, right: false, sprint: false };
            velocity.current.set(0, 0, 0);
        };
        
        controls.addEventListener('lock', onLock);
        controls.addEventListener('unlock', onUnlock);
        return () => controls.dispose();
    } else {
        if (graph.controls()) graph.controls().enabled = true;
    }
  }, [controlMode]);

  // --- 3. INTERACTION ---
  useEffect(() => {
    if (controlMode !== 'fly') return;
    const onMouseDown = (e) => {
        if (e.button === 0 && isLocked && aimedNodeRef.current) {
            onNodeClick(aimedNodeRef.current);
        }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [controlMode, isLocked, onNodeClick]);

  // --- 4. INPUT ---
  useEffect(() => {
    if (controlMode !== 'fly') return;
    const onKey = (e, isDown) => {
      switch (e.code) {
        case 'KeyW': moveState.current.fwd = isDown; break;
        case 'KeyS': moveState.current.bwd = isDown; break;
        case 'KeyA': moveState.current.left = isDown; break;
        case 'KeyD': moveState.current.right = isDown; break;
        case 'ShiftLeft': moveState.current.sprint = isDown; break;
      }
    };
    const down = (e) => onKey(e, true);
    const up = (e) => onKey(e, false);
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
        document.removeEventListener('keydown', down);
        document.removeEventListener('keyup', up);
    };
  }, [controlMode]);

  // --- 5. ENGINE LOOP (FIXED SNAP) ---
  useEffect(() => {
    if (controlMode !== 'fly') return;
    
    const camDir = new THREE.Vector3();
    const vecToNode = new THREE.Vector3();
    const tempPos = new THREE.Vector3();

    let prevTime = performance.now();
    let frameId;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const time = performance.now();
      
      // Safety Delta Cap
      const delta = Math.min((time - prevTime) / 1000, 0.1); 
      prevTime = time;

      if (controlsRef.current && controlsRef.current.isLocked) {
        const camera = fgRef.current.camera();
        
        // --- CRITICAL FIX: FORCE DISABLE ORBIT SETIAP FRAME ---
        // Ini mencegah kamera "snapping back" karena OrbitControls mencoba mengambil alih
        if (fgRef.current.controls()) {
            fgRef.current.controls().enabled = false;
        }

        // --- MOVEMENT ---
        const damping = 5.0; 
        velocity.current.x -= velocity.current.x * damping * delta;
        velocity.current.z -= velocity.current.z * damping * delta;
        const speed = moveState.current.sprint ? 4000.0 : 1000.0;
        
        if (moveState.current.fwd) velocity.current.z -= speed * delta;
        if (moveState.current.bwd) velocity.current.z += speed * delta;
        if (moveState.current.left) velocity.current.x -= speed * delta;
        if (moveState.current.right) velocity.current.x += speed * delta;

        camera.translateZ(velocity.current.z * delta);
        camera.translateX(velocity.current.x * delta);
        
        // --- MAGNET AIMING ---
        camera.getWorldDirection(camDir);
        let bestTarget = null;
        let bestDot = -1;
        let minDotThreshold = 0.99;
        
        if (data && data.nodes) {
            for (let node of data.nodes) {
                if (!Number.isFinite(node.x)) continue;
                tempPos.set(node.x, node.y, node.z);
                vecToNode.subVectors(tempPos, camera.position);
                const dist = vecToNode.length();
                if (dist > 4000) continue;

                vecToNode.normalize();
                const dot = camDir.dot(vecToNode);

                if (dot > minDotThreshold) {
                    if (dot > bestDot) {
                        bestDot = dot;
                        bestTarget = node;
                    }
                }
            }
        }

        if (aimedNodeRef.current !== bestTarget) {
            aimedNodeRef.current = bestTarget;
            setAimedNode(bestTarget); 
        }
        
        if (bestTarget) {
            const dist = Math.sqrt(
                Math.pow(bestTarget.x - camera.position.x, 2) +
                Math.pow(bestTarget.y - camera.position.y, 2) +
                Math.pow(bestTarget.z - camera.position.z, 2)
            );
            setAimDistance(Math.round(dist));
        }
      }
    };
    
    animate();
    return () => cancelAnimationFrame(frameId);
  }, [controlMode, data]);

  // --- 6. HUD DATA ---
  useEffect(() => {
    if (aimedNode && data.links) {
        const connections = data.links.filter(l => {
            const s = getSafeId(l.source);
            const t = getSafeId(l.target);
            return s === aimedNode.id || t === aimedNode.id;
        });
        const sorted = connections.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        const pos = sorted.filter(l => l.value > 0).slice(0, 3);
        const neg = sorted.filter(l => l.value < 0).slice(0, 3);
        const mapLink = (l) => {
            const otherId = getSafeId(l.source) === aimedNode.id ? getSafeId(l.target) : getSafeId(l.source);
            const otherNode = data.nodes.find(n => n.id === otherId);
            return { name: otherNode ? otherNode.name : otherId, val: l.value };
        };
        setTopCorrelations({ pos: pos.map(mapLink), neg: neg.map(mapLink) });
    }
  }, [aimedNode, data]);

  // PULSE
  useEffect(() => {
    let frameId;
    const animate = () => {
      setPulse(Math.sin(Date.now() / 1000 * 2));
      frameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frameId);
  }, []);

  const neighbors = useMemo(() => {
    const map = new Map();
    if (!data || !data.links) return map;
    data.links.forEach(link => {
      const a = getSafeId(link.source);
      const b = getSafeId(link.target);
      if (a && b) {
        if (!map.has(a)) map.set(a, []);
        if (!map.has(b)) map.set(b, []);
        map.get(a).push(b);
        map.get(b).push(a);
      }
    });
    return map;
  }, [data]);

  // PHYSICS REHEAT
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fgRef.current) {
        const graph = fgRef.current;
        graph.d3Force('charge').strength(node => nodeRepulsion * (node.power > 0.05 ? 3 : 1));
        graph.d3Force('link').distance(link => 100 / (Math.abs(link.value) * 5 + 0.1));
        graph.d3ReheatSimulation();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [nodeRepulsion, data]);

  // BLOOM
  useEffect(() => {
    if (!fgRef.current) return;
    const graph = fgRef.current;
    const updateResolution = () => {
        const renderer = graph.renderer();
        const composer = graph.postProcessingComposer();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); 
        renderer.setPixelRatio(pixelRatio);
        const width = window.innerWidth * pixelRatio;
        const height = window.innerHeight * pixelRatio;
        renderer.setSize(window.innerWidth, window.innerHeight);
        const passes = composer.passes.filter(p => p instanceof UnrealBloomPass);
        passes.forEach(p => composer.removePass(p));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.4, 0.1); 
        composer.addPass(bloomPass);
    };
    setTimeout(updateResolution, 100);
    window.addEventListener('resize', updateResolution);
    return () => window.removeEventListener('resize', updateResolution);
  }, [theme]);

  // FOCUS
  useEffect(() => {
    if (controlMode === 'orbit' && focusTarget && fgRef.current) {
      const dist = 120;
      const ratio = 1 + dist / Math.hypot(focusTarget.x, focusTarget.y, focusTarget.z);
      fgRef.current.cameraPosition({ x: focusTarget.x * ratio, y: focusTarget.y * ratio, z: focusTarget.z * ratio }, focusTarget, 1000);
    }
  }, [focusTarget, controlMode]);

  const activeNode = controlMode === 'fly' ? aimedNode : hoverNode;

  if (!data || !data.nodes || data.nodes.length === 0) return null;

  return (
    <div className="w-full h-full relative group">
      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        backgroundColor={theme.colors.bg}
        showNavInfo={false}
        controlType={controlMode === 'fly' ? undefined : 'orbit'}
        
        nodeLabel={node => controlMode === 'orbit' ? node.name : ''}
        
        enableNodeDrag={controlMode !== 'fly'}
        onNodeHover={controlMode === 'fly' ? undefined : setHoverNode}
        
        onNodeClick={(node) => {
            if (controlMode !== 'fly') onNodeClick(node);
        }}
        
        d3AlphaDecay={0.05}
        d3VelocityDecay={0.3}
        warmupTicks={50}
        nodeResolution={16}
        
        nodeThreeObject={node => {
          const targetId = (focusTarget || activeNode)?.id;
          let isDimmed = false;
          if (focusTarget) {
            const isNeighbor = neighbors.get(focusTarget.id)?.includes(node.id);
            if (node.id !== focusTarget.id && !isNeighbor) isDimmed = true;
          }
          if (isDimmed) {
            const mesh = new THREE.Mesh(SPHERE_GEO, materials.dimmed);
            mesh.scale.set(2, 2, 2); return mesh;
          }
          
          const change = node.periodChange || 0;
          let mat = materials.neutral;
          if (change > 3.0) mat = materials.up;
          else if (change < -3.0) mat = materials.down;

          let size = (Math.sqrt(node.power || 0) * 50) + 4;
          
          if (activeNode && activeNode.id === node.id) {
              size *= 1.3;
              mat = materials.locked;
          }
          
          if (Math.abs(node.zScore) > 1.5) size *= (1 + (pulse * 0.15));
          const mesh = new THREE.Mesh(SPHERE_GEO, mat);
          mesh.scale.set(size, size, size);
          return mesh;
        }}

        linkVisibility={link => {
            if (isSkeletonMode) { return !!link.isSkeleton; }
            const src = link.source;
            const tgt = link.target;
            if (src && tgt && (!Number.isFinite(src.x) || !Number.isFinite(tgt.x))) return false;

            if (focusTarget) {
               const centerId = getSafeId(focusTarget);
               const srcId = getSafeId(link.source);
               const tgtId = getSafeId(link.target);
               if (srcId !== centerId && tgtId !== centerId) return false;
            }
            return true; 
        }}
        
        linkWidth={link => Math.abs(link.value) * 1.5}
        linkColor={link => {
            const val = link.value;
            return val < 0 ? theme.colors.down : theme.colors.up;
        }}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
      />
      
      <ambientLight intensity={1.5} />
      <pointLight position={[100, 100, 100]} intensity={1.0} />

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_120%)]" />
      
      {/* PILOT OVERLAY */}
      {controlMode === 'fly' && !isLocked && (
        <div 
            className="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer z-50 backdrop-blur-sm"
            onClick={() => controlsRef.current?.lock()}
        >
            <div className="text-center border p-8 rounded-2xl bg-black/80 shadow-2xl animate-pulse"
                 style={{ borderColor: `${theme.colors.up}40` }}>
                <h2 className="text-3xl text-white font-bold tracking-[0.5em] mb-2" style={{ color: theme.colors.base }}>PILOT MODE</h2>
                <p className="text-[10px] tracking-[0.3em] mb-6" style={{ color: theme.colors.up }}>CLICK TO ENGAGE</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] text-left text-white/50 font-mono">
                    <span className="text-white">WASD</span><span>FLIGHT</span>
                    <span className="text-white">MOUSE</span><span>AIM</span>
                    <span className="text-white">SHIFT</span><span>BOOST</span>
                    <span className="text-white">CLICK</span><span>DATA</span>
                </div>
            </div>
        </div>
      )}

      {/* --- HUD --- */}
      {controlMode === 'fly' && isLocked && (
        <>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 ${aimedNode ? 'scale-125' : 'scale-100'}`}>
                <div className="w-8 h-8 border border-white/40 rounded-sm flex items-center justify-center" 
                     style={{ borderColor: aimedNode ? theme.colors.up : 'rgba(255,255,255,0.4)' }}>
                    <div className="w-1 h-1 bg-white shadow-lg" 
                         style={{ backgroundColor: aimedNode ? theme.colors.up : 'white', boxShadow: aimedNode ? `0 0 10px ${theme.colors.up}` : 'none' }} />
                </div>
            </div>

            {aimedNode && (
                <div className="absolute top-[53%] left-[53%] pointer-events-none flex flex-col gap-2">
                    <div className="bg-black/90 p-3 backdrop-blur-xl shadow-2xl min-w-[240px] animate-in fade-in zoom-in-95 duration-100"
                         style={{ borderTop: `2px solid ${theme.colors.up}` }}>
                        
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="text-[9px] font-mono tracking-widest mb-0.5" style={{ color: theme.colors.up }}>TARGET_LOCKED</div>
                                <div className="text-lg font-black text-white leading-none">{aimedNode.ticker || aimedNode.id}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] text-white/40 font-mono">DIST</div>
                                <div className="text-xs text-white font-mono">{aimDistance}m</div>
                            </div>
                        </div>

                        <div className="mb-3">
                            <div className="text-[10px] text-white/80 font-bold truncate">{aimedNode.name}</div>
                            <div className="text-[9px] text-white/40 font-mono">{aimedNode.group}</div>
                        </div>

                        <div className="border-t border-white/10 pt-2 grid grid-cols-2 gap-2 text-[9px] font-mono mb-2">
                             <div>
                                <div className="text-white/40">{timeframe} CHG</div>
                                <div style={{ color: aimedNode.periodChange >= 0 ? theme.colors.up : theme.colors.down }}>
                                    {aimedNode.periodChange}%
                                </div>
                             </div>
                             <div>
                                <div className="text-white/40">Z-SCORE</div>
                                <div style={{ color: aimedNode.zScore > 0 ? theme.colors.up : theme.colors.down }}>
                                    {aimedNode.zScore}
                                </div>
                             </div>
                             <div>
                                <div className="text-white/40">INFLUENCE</div>
                                <div className="text-white">{aimedNode.influence || 0}</div>
                             </div>
                             <div>
                                <div className="text-white/40">PARTICIPATION</div>
                                <div className="text-white">{((aimedNode.power || 0) * 100).toFixed(1)}%</div>
                             </div>
                        </div>

                        <div className="mt-2 text-[8px] text-center font-bold tracking-[0.2em] border py-1 animate-pulse" 
                             style={{ color: theme.colors.up, borderColor: `${theme.colors.up}40`, backgroundColor: `${theme.colors.up}10` }}>
                            [ CLICK TO ACCESS ]
                        </div>
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default Scene;