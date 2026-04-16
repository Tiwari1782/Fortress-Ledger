import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export default function Loader({ text = "Decrypting Database Nodes..." }) {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl text-slate-900">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 25px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .cyber-loader {
          animation: pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        .cyber-grid {
          background-size: 40px 40px;
          background-image: radial-gradient(circle, rgba(16, 185, 129, 0.1) 1px, transparent 1px);
        }
      `}</style>
      
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none"></div>

      <div className="relative flex items-center justify-center w-40 h-40 mb-10 mt-[-10vh]">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed opacity-20 border-emerald-500 animate-[spin_4s_linear_infinite]"></div>
        
        {/* Inner Ring */}
        <div className="absolute inset-3 rounded-full border-t-2 border-b-2 opacity-50 border-emerald-400 animate-[spin_2s_linear_infinite_reverse]"></div>
        
        {/* Inner glow ring */}
        <div className="absolute inset-6 rounded-full border border-emerald-500/30"></div>

        {/* Core */}
        <div className="absolute w-16 h-16 rounded-full bg-emerald-500/20 flex flex-col items-center justify-center cyber-loader shadow-[0_0_30px_rgba(16,185,129,0.3)]">
           <ShieldCheck size={28} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,1)]" />
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center z-10"
      >
        <span className="text-xs font-bold uppercase tracking-[0.4em] text-emerald-500 mb-3 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
          FortressLedger
        </span>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
             <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1 h-3 bg-emerald-500"></motion.span>
             <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1 h-3 bg-emerald-500"></motion.span>
             <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1 h-3 bg-emerald-500"></motion.span>
          </div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-900/70 uppercase">
            {text}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
