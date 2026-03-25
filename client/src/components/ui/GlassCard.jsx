import { motion } from 'framer-motion';

export const GlassCard = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay, ease: "easeOut" }}
      className={`bg-slate-800/40 backdrop-blur-xl border border-slate-600/50 shadow-2xl rounded-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
};