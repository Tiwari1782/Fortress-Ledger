import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, ShieldAlert, Activity, Zap, Play, Radio, SlidersHorizontal, Skull } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const initialAccounts = Array.from({ length: 7 }).map((_, i) => ({
  id: `ACC-0${i + 1}`,
  group: 'account',
  val: 5
}));

export default function LockMatrix() {
  const fgRef = useRef();
  
  const [graphData, setGraphData] = useState({ nodes: [...initialAccounts], links: [] });
  const [deadlocksDefeated, setDeadlocksDefeated] = useState(0);
  const [isDeadlockActive, setIsDeadlockActive] = useState(false);
  const [logs, setLogs] = useState([]);
  const [themeTextColor, setThemeTextColor] = useState('#000000');

  // Interactive Sandbox State
  const [isLiveMode, setIsLiveMode] = useState(true); // Default to Live Traffic
  const [velocity, setVelocity] = useState(1500);

  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
    if (color) setThemeTextColor(color);
  }, []);

  const addLog = useCallback((msg, type) => {
    setLogs(prev => [{ id: Date.now() + Math.random(), msg, type }, ...prev].slice(0, 5));
  }, []);

  // -------------------------------------------------------------
  // SIMULATED ENGINE LOGIC
  // -------------------------------------------------------------
  useEffect(() => {
    if (isLiveMode) return; // Halt simulation if listening to live backend
    
    let txCounter = 0;
    const interval = setInterval(() => {
      setGraphData((currentData) => {
        const newNodes = [...currentData.nodes];
        const newLinks = [...currentData.links];
        
        const activeTxNodes = newNodes.filter(n => n.group === 'transaction' && !n.isDeadlocked);
        
        // Spawn Traffic based on velocity
        if (Math.random() > 0.2 && activeTxNodes.length < 8 && !isDeadlockActive) {
          txCounter++;
          const txId = `TX-${Date.now().toString().slice(-4)}${txCounter}`;
          
          newNodes.push({ id: txId, group: 'transaction', val: 3 });
          const randomAcc = initialAccounts[Math.floor(Math.random() * initialAccounts.length)].id;
          newLinks.push({ source: txId, target: randomAcc, reqType: 'shared', color: '#3b82f6' }); // Blue
          
          addLog(`[OK] ${txId} secured shared lock on ${randomAcc}`, 'info');
        }
        
        // Cleanup old non-deadlocked transactions
        if (newNodes.filter(n => n.group === 'transaction').length > (velocity < 1000 ? 8 : 5) && Math.random() > 0.5) {
          const victimIndex = newNodes.findIndex(n => n.group === 'transaction' && !n.isDeadlocked);
          if (victimIndex !== -1) {
            const victimId = newNodes[victimIndex].id;
            newNodes.splice(victimIndex, 1);
            const linksToKeep = newLinks.filter(l => l.source.id !== victimId && l.source !== victimId);
            return { nodes: newNodes, links: linksToKeep };
          }
        }
        
        return { nodes: newNodes, links: newLinks };
      });
    }, velocity);

    // Random Deadlocks only in fast simulation
    const deadlockInterval = setInterval(() => {
      if (velocity <= 1000 && Math.random() > 0.5) triggerDeadlock();
    }, 12000); 

    return () => { clearInterval(interval); clearInterval(deadlockInterval); };
  }, [isLiveMode, isDeadlockActive, velocity, addLog]);

  // -------------------------------------------------------------
  // LIVE WEBSOCKET LOGIC
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isLiveMode) return;

    // Connect to Express backend
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    addLog(`[SYSTEM] Live WebSocket Telemetry ACTIVE. Awaiting backend traffic...`, 'success');

    socket.on('matrix_lock_request', (data) => {
        const { txId, senderId, receiverId } = data;
        const senderStr = `ACC-${senderId}`;
        const receiverStr = `ACC-${receiverId}`;
        
        setGraphData(prev => {
            let newNodes = [...prev.nodes];
            let newLinks = [...prev.links];

            // Auto-spawn accounts if they aren't pre-rendered
            if (!newNodes.find(n => n.id === senderStr)) newNodes.push({ id: senderStr, group: 'account', val: 5 });
            if (!newNodes.find(n => n.id === receiverStr)) newNodes.push({ id: receiverStr, group: 'account', val: 5 });

            newNodes.push({ id: txId, group: 'transaction', val: 4 });

            // DRAW EXCLUSIVE LOCKS (YELLOW) For actual transfers!
            newLinks.push({ source: txId, target: senderStr, reqType: 'exclusive', color: '#eab308' }); 
            newLinks.push({ source: txId, target: receiverStr, reqType: 'exclusive', color: '#eab308' });

            return { nodes: newNodes, links: newLinks };
        });

        addLog(`[LIVE] ${txId} securing EXCLUSIVE locks on ${senderStr} & ${receiverStr}`, 'info');

        // Purge visually after 3.5 seconds
        setTimeout(() => {
            setGraphData(prev => {
                const filteredNodes = prev.nodes.filter(n => n.id !== txId);
                const filteredLinks = prev.links.filter(l => l.source.id !== txId && l.source !== txId);
                return { nodes: filteredNodes, links: filteredLinks };
            });
            addLog(`[LIVE] ${txId} COMMIT OK. Locks released.`, 'success');
        }, 3500);
    });

    socket.on('matrix_deadlock', () => {
         triggerDeadlock(true); // Pass true to indicate it's a real backend deadlock
    });

    return () => {
        socket.disconnect();
        addLog(`[SYSTEM] WebSocket Disconnected.`, 'info');
    };
  }, [isLiveMode, addLog]);


  // -------------------------------------------------------------
  // CORE ENGINE EVENT: DEADLOCK DETECTOR
  // -------------------------------------------------------------
  const triggerDeadlock = (isReal = false) => {
    if (isDeadlockActive) return;
    setIsDeadlockActive(true);
    
    // If it's real, we just trigger the visual red alarm, otherwise we inject fake collision nodes.
    const txA = `TX-DLA`;
    const txB = `TX-DLB`;
    const acc1 = initialAccounts[0].id;
    const acc2 = initialAccounts[1].id;
    
    setGraphData(prev => {
      const nodes = [...prev.nodes, 
        { id: txA, group: 'transaction', isDeadlocked: true, val: 5 },
        { id: txB, group: 'transaction', isDeadlocked: true, val: 5 }
      ];
      const links = [...prev.links,
        { source: txA, target: acc1, reqType: 'exclusive', color: '#e11d48' },
        { source: acc1, target: txB, reqType: 'contention', color: '#e11d48', isCycle: true },
        { source: txB, target: acc2, reqType: 'exclusive', color: '#e11d48' },
        { source: acc2, target: txA, reqType: 'contention', color: '#e11d48', isCycle: true }
      ];
      return { nodes, links };
    });

    addLog(isReal ? '🚨 BACKEND SENT ERROR 1213: Deadlock cycle materialized!' : '🚨 RACE CONDITION DETECTED! Thread collision initiated.', 'alert');

    setTimeout(() => resolveDeadlock(), 4500);
  };

  const resolveDeadlock = () => {
    setGraphData(prev => {
      const newNodes = prev.nodes.filter(n => !n.isDeadlocked);
      const newLinks = prev.links.filter(l => l.color !== '#e11d48');
      return { nodes: newNodes, links: newLinks };
    });
    
    setDeadlocksDefeated(d => d + 1);
    setIsDeadlockActive(false);
    addLog('🛡️ SYSTEM OK: Force-killed thread TX-DLB. Transaction recovered.', 'success');
  };

  const drawNode = useCallback((node, ctx, globalScale) => {
    const isAcc = node.group === 'account';
    const isDL = node.isDeadlocked;
    const size = isAcc ? 8 : (isDL ? 6 : 4);
    
    ctx.beginPath();
    if (isAcc) {
      for (let i = 0; i < 6; i++) {
        const angle = 2 * Math.PI / 6 * i;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](node.x + size * Math.cos(angle), node.y + size * Math.sin(angle));
      }
      ctx.closePath();
    } else {
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    }
    
    ctx.fillStyle = isAcc ? '#10b981' : (isDL ? '#e11d48' : '#3b82f6');
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = isDL ? 20 : 10;
    ctx.fill();
    
    if (isAcc) {
      const fontSize = 11/globalScale;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = themeTextColor; 
      ctx.fillText(node.id, node.x, node.y + size + 8);
    }
    ctx.shadowBlur = 0;
  }, [themeTextColor]);

  return (
    <div className="w-full flex flex-col mb-8 mt-4">
      {/* PROFESSIONAL CONTROL PANEL */}
      <div className="w-full rounded-2xl border glass p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-6">
          {/* Mode Toggle */}
          <div className="flex bg-slate-900/10 p-1 rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
             <button 
                onClick={() => setIsLiveMode(false)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${!isLiveMode ? 'bg-[var(--brand-primary)] text-white shadow-lg' : 'opacity-60 hover:opacity-100'} `}
                style={{ color: !isLiveMode ? '#fff' : 'var(--text-primary)' }}
             >
                <Play size={14} /> Simulated Sandbox
             </button>
             <button 
                onClick={() => { setIsLiveMode(true); setLogs([]); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${isLiveMode ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'opacity-60 hover:opacity-100'} `}
                style={{ color: isLiveMode ? '#fff' : 'var(--text-primary)' }}
             >
                <Radio size={14} className={isLiveMode ? "animate-pulse" : ""} /> Live Backend Connect
             </button>
          </div>

          {/* Sandbox Controls (Only show if not live) */}
          <AnimatePresence>
              {!isLiveMode && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex items-center gap-4 overflow-hidden">
                      <div className="flex items-center gap-2 border-l pl-4" style={{ borderColor: 'var(--border-default)' }}>
                        <SlidersHorizontal size={16} style={{ color: 'var(--text-secondary)' }} />
                        <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Velocity:</label>
                        <input 
                            type="range" min="100" max="3000" step="100" 
                            value={3100 - velocity} // Inverse relationship for UX
                            onChange={(e) => setVelocity(3100 - parseInt(e.target.value))}
                            className="w-24 accent-[var(--brand-primary)]"
                        />
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
        </div>

        {/* Global Action */}
        <button 
           onClick={() => triggerDeadlock(false)}
           disabled={isDeadlockActive}
           className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
        >
           <Skull size={14} /> Inject Deadlock
        </button>
      </div>

      {/* MATRIX CANVASES */}
      <div className="w-full flex flex-col xl:flex-row gap-6 h-[500px]">
          {/* 1. The Canvas Pane */}
          <div 
            className="flex-1 rounded-3xl overflow-hidden glass border flex flex-col relative shadow-sm transition-colors duration-500"
            style={{ borderColor: isDeadlockActive ? 'var(--border-default)' : 'var(--border-default)' }}
          >
            {/* Live Mode Background Grid Effect */}
            {isLiveMode && (
                <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                    backgroundImage: `linear-gradient(rgba(245, 158, 11, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.05) 1px, transparent 1px)`,
                    backgroundSize: '30px 30px'
                }}></div>
            )}

            <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
                <div className={`p-2.5 rounded-2xl glass border ${isDeadlockActive ? 'border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.3)]' : isLiveMode ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-[var(--border-default)]'}`}>
                    {isDeadlockActive ? (
                        <Zap size={22} className="text-rose-500 animate-pulse" />
                    ) : isLiveMode ? (
                        <Radio size={22} className="text-amber-500 animate-pulse" />
                    ) : (
                        <Network size={22} style={{ color: 'var(--brand-primary)' }} />
                    )}
                </div>
                <div>
                    <h3 className="text-lg font-extrabold tracking-wide flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        Contention Graph <span className="opacity-30">|</span> 
                        <span 
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isDeadlockActive ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : isLiveMode ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"}`}
                        >
                            {isDeadlockActive ? 'Cycle Detected' : isLiveMode ? 'LIVE TELEMETRY' : 'Simulating Pool'}
                        </span>
                    </h3>
                    <p className="text-xs font-medium mt-1 opacity-70 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                        {isLiveMode ? "Awaiting WebSocket physical transfer events..." : `Internal Physics Engine running at ${velocity}ms tick rate`}
                    </p>
                </div>
            </div>

            <div className="flex-1 w-full flex items-center justify-center">
                <ForceGraph2D
                    ref={fgRef}
                    width={800} 
                    height={500}
                    graphData={graphData}
                    nodeCanvasObject={drawNode}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleSpeed={0.015}
                    linkDirectionalParticleWidth={isLiveMode ? 2.5 : 1.5}
                    linkDirectionalParticleColor={() => themeTextColor}
                    linkOpacity={0.4}
                    linkColor={link => link.color}
                    linkWidth={link => link.reqType === 'exclusive' ? 2 : 1}
                    backgroundColor="transparent"
                />
            </div>

            {/* Inner Overlay Banner */}
            <AnimatePresence>
                {isDeadlockActive && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <div className="px-6 py-3 rounded-2xl border bg-[var(--bg-card)] shadow-xl flex items-center gap-3" style={{ borderColor: 'rgba(225,29,72,0.3)' }}>
                            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                               <ShieldAlert size={16} className="text-rose-500 animate-pulse" />
                            </div>
                            <div>
                               <p className="text-rose-500 font-extrabold uppercase tracking-wide text-xs">{isLiveMode ? 'MYSQL BACKEND ER_LOCK_DEADLOCK' : 'Simulated Cycle Detected'}</p>
                               <p className="text-[10px] opacity-70" style={{ color: 'var(--text-secondary)' }}>Resolving mutual exclusion conflict via victim isolation...</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>

          {/* 2. Side Log */}
          <div className="w-full xl:w-[350px] rounded-3xl border glass p-6 flex flex-col bg-opacity-90 relative overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
             {/* Live Mode Branding overlay */}
             {isLiveMode && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[80px] pointer-events-none rounded-full" />}
             
             <div className="flex items-center justify-between mb-6 pb-4 border-b relative z-10" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Activity size={18} style={{ color: isLiveMode ? '#f59e0b' : 'var(--brand-primary)' }} /> Diagnostics
                </h4>
                <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                    {deadlocksDefeated} Evictions
                </div>
             </div>

             <div className="flex-1 flex flex-col gap-3 font-mono text-[10px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                <AnimatePresence>
                    {logs.map((log) => (
                        <motion.div 
                            key={log.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-3 rounded-xl border glass"
                            style={{ 
                              borderColor: 'var(--border-default)',
                              borderLeftWidth: '3px', 
                              borderLeftColor: log.type === 'alert' ? '#e11d48' : log.type === 'success' ? '#10b981' : (isLiveMode ? '#f59e0b' : 'var(--brand-primary)'),
                            }}
                        >
                            <div className="flex items-center gap-2 mb-1.5 opacity-80" style={{ color: 'var(--text-secondary)' }}>
                                <span className="font-sans text-[9px] uppercase tracking-wider font-extrabold" style={{ color: log.type === 'alert' ? '#e11d48' : '' }}>
                                    {log.type === 'alert' ? 'Contention' : log.type === 'success' ? 'Resolution' : isLiveMode ? 'WebSocket' : 'Granted'}
                                </span>
                            </div>
                            <p className="leading-relaxed" style={{ color: 'var(--text-primary)' }}>{log.msg}</p>
                        </motion.div>
                    ))}
                </AnimatePresence>
             </div>
          </div>
      </div>
    </div>
  );
}
