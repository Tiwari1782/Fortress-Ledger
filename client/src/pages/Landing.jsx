import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Navbar from '../components/ui/Navbar';

import { 
  ShieldCheck, Clock, CheckCircle2, Lock, Database, Search, 
  Vault, Activity, ArrowRight, ChevronRight, Fingerprint,
  Layers, GitBranch, Shield, Cpu, Server, Eye, Hash,
  BarChart2, Table, Zap, Network, FileCode, AlertTriangle,
  Binary, KeyRound, ScrollText, XCircle, Sparkles, TrendingUp
} from 'lucide-react';

/* ─── Animation Variants ─────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
  })
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};
const slideRight = {
  hidden: { opacity: 0, x: 80 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }
};

/* ─── TiltCard ───────────────────────────────────────────────────────── */
const TiltCard = ({ children, className = "", intensity = 8 }) => {
  const ref = useRef(null);
  const handleMove = (e) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    el.style.transform = `perspective(1200px) rotateX(${-y * intensity}deg) rotateY(${x * intensity}deg) scale3d(1.02,1.02,1.02)`;
  };
  const handleLeave = () => {
    if (ref.current) ref.current.style.transform = "perspective(1200px) rotateX(0) rotateY(0) scale3d(1,1,1)";
  };
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}
      className={`will-change-transform ${className}`}
      style={{ transformStyle: "preserve-3d", transition: "transform 0.18s ease-out, box-shadow 0.3s ease" }}>
      {children}
    </div>
  );
};

/* ─── Animated SQL Terminal ──────────────────────────────────────────── */
const SqlTerminal = () => {
  const lines = [
    { text: "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;", color: "var(--brand-primary)" },
    { text: "BEGIN;", color: "#60a5fa" },
    { text: "-- Canonical lock ordering (lower ID first)", color: "#4b5563" },
    { text: "SELECT * FROM accounts WHERE id = ? FOR UPDATE;", color: "#f59e0b" },
    { text: "UPDATE accounts SET balance = balance - 500;", color: "#f472b6" },
    { text: "UPDATE accounts SET balance = balance + 500;", color: "#f472b6" },
    { text: "INSERT INTO transactions (...) VALUES (...);", color: "#a78bfa" },
    { text: "COMMIT; -- ACID Guaranteed ✓", color: "var(--brand-primary)" },
  ];
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: '#060d18', borderColor: 'rgba(5,150,105,0.2)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: '#0f1f2e', background: '#080f1a' }}>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }}></span>
          <span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }}></span>
          <span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }}></span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest ml-2" style={{ color: '#334155' }}>mysql — fortress_ledger</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand-primary)' }}></span>
          <span className="text-[9px] font-mono" style={{ color: 'var(--brand-primary)' }}>LIVE</span>
        </div>
      </div>
      <div className="p-5 space-y-1.5 font-mono text-[11px] sm:text-[12px] leading-relaxed">
        {lines.map((line, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.28, duration: 0.45, ease: [0.22,1,0.36,1] }}
            className="flex items-start gap-2">
            <span className="select-none mt-px text-[10px]" style={{ color: '#1e3a52' }}>❯</span>
            <span style={{ color: line.color }}>{line.text}</span>
          </motion.div>
        ))}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
          transition={{ delay: 3.4, duration: 0.9, repeat: Infinity }} className="mt-2 flex items-center gap-2">
          <span style={{ color: '#1e3a52' }}>❯</span>
          <span className="inline-block w-2 h-[14px] rounded-sm" style={{ background: 'var(--brand-primary)' }}></span>
        </motion.div>
      </div>
    </div>
  );
};

/* ─── DBMS Concept Cards ─────────────────────────────────────────────── */
const dbmsConcepts = [
  { icon: <Lock size={16}/>, title: "SERIALIZABLE Isolation", desc: "Prevents phantom reads and double-spend attacks using range locks.", tag: "Concurrency", interview: "Why not REPEATABLE READ for banking?" },
  { icon: <GitBranch size={16}/>, title: "Canonical Lock Ordering", desc: "Lock lower account ID first to prevent circular-wait deadlocks.", tag: "Deadlock Prevention", interview: "How do you prevent deadlocks?" },
  { icon: <Database size={16}/>, title: "Stored Procedures", desc: "sp_atomic_transfer with DECLARE HANDLER, OUT params, ROLLBACK.", tag: "Server-Side SQL", interview: "Procedure vs app-layer transactions?" },
  { icon: <ScrollText size={16}/>, title: "Cursor-Based Statements", desc: "sp_generate_monthly_statement builds running balance via CURSOR.", tag: "Row Processing", interview: "When to use cursors vs set ops?" },
  { icon: <Hash size={16}/>, title: "SHA2 Hash Chain", desc: "Each audit row hashes its content + previous hash — blockchain-style.", tag: "Tamper Detection", interview: "Build a tamper-evident audit trail?" },
  { icon: <Fingerprint size={16}/>, title: "JSON Trigger Auditing", desc: "AFTER INSERT/UPDATE/DELETE triggers capture JSON_OBJECT row diffs.", tag: "Forensic Logging", interview: "DB triggers vs app-level logging?" },
  { icon: <Layers size={16}/>, title: "Composite Indexes", desc: "idx(sender_id, created_at) — leftmost prefix rule for range scans.", tag: "Index Strategy", interview: "Why is ENUM-only index useless?" },
  { icon: <BarChart2 size={16}/>, title: "EXPLAIN ANALYZE", desc: "Verify index usage: 'Using index condition' vs full table scan.", tag: "Query Tuning", interview: "How to read EXPLAIN output?" },
  { icon: <Table size={16}/>, title: "Materialized Views", desc: "fraud_summary table + EVENT refreshes every 60s (MySQL pattern).", tag: "Query Optimization", interview: "Materialized vs regular views?" },
  { icon: <Zap size={16}/>, title: "RANGE Partitioning", desc: "transactions partitioned by YEAR*100+MONTH for pruning at scale.", tag: "Scalability", interview: "Partition pruning bypass pitfalls?" },
  { icon: <Eye size={16}/>, title: "Row-Level Security", desc: "Session @current_user_id + DEFINER views simulate PostgreSQL RLS.", tag: "Access Control", interview: "RLS in MySQL without native support?" },
  { icon: <KeyRound size={16}/>, title: "SQL Injection Prevention", desc: "Parameterized queries — SQL structure parsed before values bound.", tag: "Security", interview: "Why are prepared statements safe?" },
];

const archFlow = [
  { icon: <Cpu size={16}/>, label: "React + Vite", sub: "SPA Client" },
  { icon: <Server size={16}/>, label: "Express API", sub: "JWT + RBAC" },
  { icon: <Database size={16}/>, label: "MySQL 8+", sub: "InnoDB Engine" },
];

const archFeatures = ["Triggers (6)", "Stored Procedures (2)", "Views (4)", "Indexes (5+)", "Events (1)", "Partitioning"];

/* ─── BCNF Normal Forms Data ─────────────────────────────────────────── */
const normalForms = [
  {
    step: "UNF", title: "Unnormalized Form", shortTitle: "Raw",
    color: "#ef4444", glow: "rgba(239,68,68,0.18)",
    desc: "All data crammed into one flat table with repeating groups, massive redundancy, and no real structure.",
    schema: {
      tableName: "bank_data_raw",
      columns: [
        { name: "user_email", type: "VARCHAR", flag: "🔴 REPEATING" },
        { name: "password_hash", type: "VARCHAR", flag: null },
        { name: "role", type: "ENUM", flag: null },
        { name: "account_no", type: "VARCHAR", flag: "🔴 REPEATING" },
        { name: "balance", type: "DECIMAL", flag: null },
        { name: "tx_amount", type: "DECIMAL", flag: "🔴 MULTI-VALUE" },
        { name: "tx_type", type: "ENUM", flag: "🔴 MULTI-VALUE" },
        { name: "audit_action", type: "VARCHAR", flag: "🔴 MULTI-VALUE" },
      ]
    },
    analysis: [
      { type: "bad", text: "Repeating groups per user row" },
      { type: "bad", text: "Email repeated for every transaction" },
      { type: "bad", text: "Insert / Update / Delete anomalies" },
    ]
  },
  {
    step: "1NF", title: "First Normal Form", shortTitle: "Atomic",
    color: "#f59e0b", glow: "rgba(245,158,11,0.18)",
    desc: "Atomic values only. No repeating groups. Each row is uniquely identified by a primary key.",
    schema: {
      tableName: "Split into 3 tables",
      columns: [
        { name: "users", type: "id PK, email, password_hash, role", flag: null },
        { name: "accounts", type: "id PK, user_id FK, account_no, balance", flag: null },
        { name: "transactions", type: "id PK, sender_id FK, receiver_id FK, amount", flag: "⚠ PARTIAL DEP?" },
      ]
    },
    analysis: [
      { type: "good", text: "Eliminated all repeating groups" },
      { type: "warn", text: "Partial dependencies may still exist" },
      { type: "warn", text: "Transitive dependencies unchecked" },
    ]
  },
  {
    step: "2NF", title: "Second Normal Form", shortTitle: "Full Dep.",
    color: "#3b82f6", glow: "rgba(59,130,246,0.18)",
    desc: "Every non-key attribute fully depends on the entire primary key. No partial dependencies allowed.",
    schema: {
      tableName: "Single-column PKs — already 2NF",
      columns: [
        { name: "users.id", type: "→ {email, password_hash, role}", flag: " FULL DEP" },
        { name: "accounts.id", type: "→ {user_id, account_no, balance, status}", flag: " FULL DEP" },
        { name: "transactions.id", type: "→ {sender_id, receiver_id, amount, type}", flag: " FULL DEP" },
        { name: "audit_logs.id", type: "→ {entity_id, action, old_value, chain_hash}", flag: " FULL DEP" },
      ]
    },
    analysis: [
      { type: "good", text: "No partial dependencies exist" },
      { type: "good", text: "Single-column PKs eliminate the class" },
      { type: "warn", text: "Transitive deps still need checking" },
    ]
  },
  {
    step: "3NF", title: "Third Normal Form", shortTitle: "No Transit.",
    color: "#8b5cf6", glow: "rgba(139,92,246,0.18)",
    desc: "No transitive dependencies. Every non-key column depends ONLY on the primary key.",
    schema: {
      tableName: "No transitive A → B → C chains",
      columns: [
        { name: "users.email", type: "determined only by users.id", flag: " CLEAN" },
        { name: "accounts.balance", type: "determined only by accounts.id", flag: " CLEAN" },
        { name: "accounts.status", type: "determined only by accounts.id", flag: " CLEAN" },
        { name: "audit.chain_hash", type: "computed from full row — no transit", flag: " CLEAN" },
      ]
    },
    analysis: [
      { type: "good", text: "No column depends on another non-key" },
      { type: "good", text: "Every FD is: PK → attribute" },
      { type: "good", text: "account_no uses UUID PK — clean" },
    ]
  },
  {
    step: "BCNF", title: "Boyce-Codd Normal Form", shortTitle: "Canonical",
    color: "#059669", glow: "rgba(5,150,105,0.25)",
    desc: "Every determinant is a candidate key. The gold standard for OLTP schema design.",
    schema: {
      tableName: "All determinants are candidate keys",
      columns: [
        { name: "users.id", type: "→ {email, password_hash, role, created_at}", flag: " CANDIDATE KEY" },
        { name: "users.email (UNIQUE)", type: "→ {id} — is a candidate key", flag: " CANDIDATE KEY" },
        { name: "accounts.id", type: "→ {user_id, account_no, balance, status}", flag: " CANDIDATE KEY" },
        { name: "accounts.account_no (UNIQUE)", type: "→ {id} — is a candidate key", flag: " CANDIDATE KEY" },
        { name: "transactions.id", type: "→ {sender_id, receiver_id, amount, type}", flag: " CANDIDATE KEY" },
        { name: "audit_logs.id", type: "→ {entity_id, action, old_value, chain_hash}", flag: " CANDIDATE KEY" },
      ]
    },
    analysis: [
      { type: "good", text: "Every determinant is a candidate key" },
      { type: "good", text: "No non-trivial FD with non-superkey LHS" },
      { type: "good", text: "Highest practical NF for OLTP — achieved" },
    ]
  },
];

/* ─── BCNF Step Card ─────────────────────────────────────────────────── */
const NormalFormCard = ({ nf, idx, isActive, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: idx * 0.1, duration: 0.65, ease: [0.22,1,0.36,1] }}
      onClick={onClick}
      className="relative cursor-pointer group"
    >
      {/* Connector line */}
      {idx < normalForms.length - 1 && (
        <div className="absolute left-[30px] top-full z-0 w-px" style={{ height: '32px', background: `linear-gradient(to bottom, ${nf.color}60, transparent)` }} />
      )}

      <div
        className="relative rounded-2xl border transition-all duration-500 overflow-hidden"
        style={{
          background: isActive ? `linear-gradient(135deg, ${nf.glow}, rgba(0,0,0,0))` : 'var(--bg-card)',
          borderColor: isActive ? nf.color : 'var(--border-default)',
          boxShadow: isActive ? `0 0 40px ${nf.glow}, 0 4px 24px rgba(0,0,0,0.15)` : 'var(--shadow-sm)',
        }}
      >
        {/* Top accent line */}
        <motion.div
          className="absolute top-0 left-0 h-0.5 rounded-full"
          style={{ background: `linear-gradient(90deg, ${nf.color}, transparent)` }}
          animate={{ width: isActive ? '100%' : '0%' }}
          transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
        />

        <div className="p-5 lg:p-6">
          <div className="flex items-start gap-4">
            {/* Step badge */}
            <div className="flex-shrink-0">
              <motion.div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-lg relative overflow-hidden"
                style={{ background: nf.color }}
                animate={{ scale: isActive ? 1.08 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="absolute inset-0 opacity-0"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                  animate={{ opacity: isActive ? 1 : 0 }}
                />
                {nf.step}
              </motion.div>
            </div>

            {/* Header */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{nf.title}</h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest"
                  style={{ background: `${nf.color}20`, color: nf.color }}>{nf.shortTitle}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{nf.desc}</p>

              {/* Quick analysis pills */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {nf.analysis.map((a, ai) => (
                  <span key={ai}
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: a.type === 'good' ? 'rgba(5,150,105,0.1)' : a.type === 'warn' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                      color: a.type === 'good' ? '#10b981' : a.type === 'warn' ? '#f59e0b' : '#ef4444'
                    }}>
                    {a.type === 'good' ? <CheckCircle2 size={9}/> : a.type === 'warn' ? <AlertTriangle size={9}/> : <XCircle size={9}/>}
                    {a.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Expand chevron */}
            <motion.div
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border"
              style={{ borderColor: isActive ? nf.color : 'var(--border-default)', color: isActive ? nf.color : 'var(--text-secondary)' }}
              animate={{ rotate: isActive ? 90 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronRight size={13}/>
            </motion.div>
          </div>

          {/* Expanded Schema Panel */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22,1,0.36,1] }}
                className="overflow-hidden"
              >
                <div className="mt-5 pt-5 border-t" style={{ borderColor: `${nf.color}30` }}>
                  {/* Schema label */}
                  <div className="flex items-center gap-2 mb-3">
                    <Database size={11} style={{ color: nf.color }}/>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: nf.color }}>
                      {nf.schema.tableName}
                    </span>
                  </div>

                  {/* Schema rows */}
                  <div className="space-y-1.5">
                    {nf.schema.columns.map((col, ci) => (
                      <motion.div
                        key={ci}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: ci * 0.06, duration: 0.35 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-[10px] sm:text-[11px]"
                        style={{
                          background: col.flag?.startsWith('') ? `${nf.color}10` : col.flag?.startsWith('⚠') ? 'rgba(245,158,11,0.07)' : col.flag?.startsWith('🔴') ? 'rgba(239,68,68,0.07)' : 'var(--bg-base)',
                          borderLeft: `3px solid ${col.flag?.startsWith('') ? nf.color : col.flag?.startsWith('⚠') ? '#f59e0b' : col.flag?.startsWith('🔴') ? '#ef4444' : 'transparent'}`,
                        }}
                      >
                        <span className="font-bold flex-shrink-0" style={{ color: col.flag?.startsWith('') ? nf.color : col.flag?.startsWith('🔴') ? '#ef4444' : 'var(--text-primary)' }}>
                          {col.name}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{col.type}</span>
                        {col.flag && (
                          <span className="ml-auto text-[9px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
                            style={{
                              background: col.flag?.startsWith('') ? `${nf.color}20` : col.flag?.startsWith('⚠') ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                              color: col.flag?.startsWith('') ? nf.color : col.flag?.startsWith('⚠') ? '#f59e0b' : '#ef4444'
                            }}>
                            {col.flag}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Progress Stepper ───────────────────────────────────────────────── */
const NormalizationStepper = ({ activeStep, onStepClick }) => (
  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-10">
    {normalForms.map((nf, i) => (
      <div key={nf.step} className="flex items-center gap-1 sm:gap-2">
        <motion.button
          onClick={() => onStepClick(i)}
          className="relative flex flex-col items-center gap-1.5 group"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
        >
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[10px] sm:text-[11px] font-black transition-all duration-300"
            style={{
              background: i <= activeStep ? nf.color : 'var(--bg-card)',
              color: i <= activeStep ? '#fff' : 'var(--text-secondary)',
              border: `2px solid ${i <= activeStep ? nf.color : 'var(--border-default)'}`,
              boxShadow: i === activeStep ? `0 0 16px ${nf.glow}` : 'none',
            }}
          >
            {i < activeStep ? <CheckCircle2 size={14}/> : nf.step}
          </div>
          <span className="hidden sm:block text-[9px] font-bold uppercase tracking-wider"
            style={{ color: i <= activeStep ? nf.color : 'var(--text-secondary)' }}>
            {nf.shortTitle}
          </span>
        </motion.button>
        {i < normalForms.length - 1 && (
          <motion.div
            className="h-0.5 w-6 sm:w-8 rounded-full mb-3 sm:mb-4 transition-all duration-500"
            style={{ background: i < activeStep ? normalForms[i+1].color : 'var(--border-default)' }}
          />
        )}
      </div>
    ))}
  </div>
);

/* ─── Floating Dot Grid ──────────────────────────────────────────────── */
const DotGrid = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(5,150,105,0.08)"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)"/>
    </svg>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.3]);
  const [activeNF, setActiveNF] = useState(0);

  return (
    <div className="w-full bg-transparent pt-20">
      <Navbar />

      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .shimmer-text { background: linear-gradient(90deg, var(--brand-primary) 0%, #34d399 45%, #60a5fa 75%, var(--brand-primary) 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 4s linear infinite; }
        .glow-emerald { box-shadow: 0 0 40px rgba(5,150,105,0.12), 0 0 80px rgba(5,150,105,0.05); }
        .concept-card { transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s; }
        .concept-card:hover { border-color: var(--brand-primary) !important; box-shadow: 0 0 24px rgba(5,150,105,0.12) !important; transform: translateY(-2px); }
        .concept-card:hover .concept-icon { transform: scale(1.12) rotate(-6deg); }
        .concept-icon { transition: transform 0.25s cubic-bezier(0.22,1,0.36,1); }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .float-anim { animation: float 5s ease-in-out infinite; }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(400%); } }
        .scanline { animation: scanline 3s linear infinite; pointer-events: none; }
        @keyframes borderPulse { 0%,100% { border-color: rgba(5,150,105,0.2); } 50% { border-color: rgba(5,150,105,0.5); } }
        .nf-section-glow { position: relative; }
        .nf-section-glow::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 40% at 50% 50%, rgba(5,150,105,0.05) 0%, transparent 70%); pointer-events: none; }
      `}</style>

      {/* ════ HERO ════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center bg-transparent overflow-hidden">
        <DotGrid />

        {/* Ambient glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 70%)' }}/>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%)' }}/>

        <motion.div style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 w-full z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" animate="visible">
              <motion.div custom={0} variants={fadeUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border"
                style={{ background: 'var(--bg-card)', borderColor: 'rgba(5,150,105,0.3)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--brand-primary)' }}></span>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--brand-primary)' }}>DBMS Engineering Showcase</span>
              </motion.div>

              <motion.h1 custom={1} variants={fadeUp}
                className="text-[2.75rem] sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.08] tracking-tight"
                style={{ color: 'var(--text-primary)' }}>
                Enterprise Banking,<br/>
                <span className="shimmer-text">ACID-Compliant</span><br/>
                & Forensic-Ready
              </motion.h1>

              <motion.p custom={2} variants={fadeUp}
                className="mt-6 text-lg leading-relaxed max-w-lg" style={{ color: 'var(--text-secondary)' }}>
                A production-grade banking engine demonstrating 20+ advanced DBMS concepts — from SERIALIZABLE isolation and deadlock prevention to SHA2 hash chains and RANGE partitioning.
              </motion.p>

              <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
                <Link to="/register"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 text-white rounded-xl text-[15px] font-bold transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden"
                  style={{ background: 'var(--brand-primary)' }}>
                  <motion.span className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, white, transparent)' }}/>
                  Open an Account <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link to="/login"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[15px] font-bold border transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--brand-primary)' }} /> Access Portal
                </Link>
              </motion.div>

              <motion.div custom={4} variants={fadeUp} className="mt-12 flex items-center gap-8">
                {[
                  { icon: <ShieldCheck size={14}/>, value: "ACID", label: "Compliant" },
                  { icon: <Hash size={14}/>, value: "SHA2", label: "Hash Chain" },
                  { icon: <Sparkles size={14}/>, value: "20+", label: "Concepts" },
                ].map((s, i) => (
                  <motion.div key={s.label} className="flex items-center gap-3"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.12 }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--brand-primary)' }}>
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                      <p className="text-[11px] uppercase font-bold tracking-wide" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={slideRight} className="hidden lg:block float-anim">
              <TiltCard intensity={4} className="glow-emerald rounded-2xl">
                <SqlTerminal />
              </TiltCard>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ════ WHAT IS FORTRESS LEDGER ══════════════════════════════════════ */}
      <section className="py-24 relative bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4"
              style={{ background: 'var(--bg-hover)', color: 'var(--brand-primary)' }}>
              What This App Does
            </span>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Three Systems, <span style={{ color: 'var(--brand-primary)' }}>One Engine</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
              FortressLedger combines enterprise banking, real-time fraud analytics, and forensic auditing into a single MySQL-powered platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Vault size={22}/>, title: "Banking Engine", desc: "Atomic fund transfers with SERIALIZABLE isolation, canonical lock ordering, and CHECK constraints ensuring balances never go negative.", tag: "Core Ledger", details: ["Double-entry bookkeeping", "FOR UPDATE row locking", "Stored procedure transfers"] },
              { icon: <AlertTriangle size={22}/>, title: "Fraud Analytics", desc: "Real-time velocity detection via optimized views and materialized summary tables, refreshed every 60 seconds by scheduled EVENTs.", tag: "Detection", details: ["Transactions-per-minute tracking", "Materialized view pattern", "Composite index optimization"] },
              { icon: <Fingerprint size={22}/>, title: "Forensic Audit System", desc: "Every data mutation is captured by database triggers using JSON_OBJECT diffs. A SHA2 hash chain makes retroactive tampering detectable.", tag: "Compliance", details: ["6 comprehensive triggers", "JSON old/new row state", "Blockchain-style hash chain"] },
            ].map((f, idx) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} custom={idx * 0.2} variants={fadeUp}>
                <TiltCard intensity={4} className="h-full rounded-2xl p-7 border group transition-all duration-300 relative overflow-hidden"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="absolute top-0 left-0 w-1 h-full rounded-r-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'var(--brand-primary)' }} />
                  <div className="relative z-10">
                    <span className="inline-block text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider mb-4 border"
                      style={{ background: 'var(--bg-hover)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>{f.tag}</span>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg text-white"
                      style={{ background: 'var(--brand-primary)' }}>
                      {f.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                    <ul className="space-y-1.5">
                      {f.details.map(d => (
                        <li key={d} className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          <CheckCircle2 size={12} style={{ color: 'var(--brand-primary)' }} />{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ DBMS CONCEPTS ═══════════════════════════════════════════════ */}
      <section className="py-24 relative bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4"
              style={{ background: 'var(--bg-hover)', color: 'var(--brand-primary)' }}>
              <Binary size={14} /> Engineering Depth
            </span>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
              20+ DBMS Concepts, <span style={{ color: 'var(--brand-primary)' }}>Battle-Tested</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
              Every card below represents a real concept implemented in this codebase — with the interview question it answers.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dbmsConcepts.map((concept, idx) => (
              <motion.div key={concept.title} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-20px' }} custom={idx * 0.06} variants={fadeUp}>
                <div className="concept-card h-full rounded-2xl p-5 border cursor-default group"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="concept-icon w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(5,150,105,0.1)', color: 'var(--brand-primary)' }}>
                      {concept.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1.5"
                        style={{ background: 'var(--bg-hover)', color: 'var(--brand-primary)' }}>{concept.tag}</span>
                      <h3 className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{concept.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{concept.desc}</p>
                  <div className="pt-2.5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Interview Q:</p>
                    <p className="text-[11px] font-medium italic leading-snug" style={{ color: 'var(--brand-primary)' }}>"{concept.interview}"</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ ARCHITECTURE ════════════════════════════════════════════════ */}
      <section className="py-24 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4"
              style={{ background: 'var(--bg-hover)', color: 'var(--brand-primary)' }}>
              <Network size={14} /> System Architecture
            </span>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Full-Stack <span style={{ color: 'var(--brand-primary)' }}>Data Flow</span>
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}>
            <TiltCard intensity={3} className="rounded-3xl p-8 lg:p-12 border glow-emerald"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 mb-10">
                {archFlow.map((node, i) => (
                  <div key={node.label} className="flex items-center gap-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.2, duration: 0.5 }}
                      className="flex items-center gap-4 px-6 py-4 rounded-2xl border"
                      style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ background: 'var(--brand-primary)' }}>{node.icon}</div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{node.label}</p>
                        <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{node.sub}</p>
                      </div>
                    </motion.div>
                    {i < archFlow.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.2 }}
                        className="hidden lg:flex w-10 h-10 rounded-full items-center justify-center border"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--brand-primary)' }}>
                        <ArrowRight size={16} />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
              <div className="pt-8 border-t" style={{ borderColor: 'var(--border-default)' }}>
                <p className="text-center text-xs font-bold uppercase tracking-widest mb-6" style={{ color: 'var(--text-secondary)' }}>MySQL Internal Objects</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {archFeatures.map((feat, i) => (
                    <motion.span key={feat}
                      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.08 }}
                      className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:border-emerald-500/50 hover:shadow-md cursor-default"
                      style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                      {feat}
                    </motion.span>
                  ))}
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* ════ NORMALIZATION — REDESIGNED ══════════════════════════════════ */}
      <section className="py-28 bg-transparent nf-section-glow relative overflow-hidden">
        <DotGrid />

        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.05) 0%, transparent 70%)' }}/>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* Section header */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-16">
            <motion.div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-5"
              style={{ background: 'var(--bg-hover)', color: 'var(--brand-primary)' }}
              whileHover={{ scale: 1.04 }}>
              <Layers size={14} /> Schema Normalization
            </motion.div>
            <h2 className="text-3xl lg:text-[2.75rem] font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
              From Raw Data to{' '}
              <span className="relative inline-block">
                <span style={{ color: 'var(--brand-primary)' }}>BCNF</span>
                <motion.span
                  className="absolute -bottom-1 left-0 h-0.5 rounded-full"
                  style={{ background: 'var(--brand-primary)' }}
                  initial={{ width: 0 }} whileInView={{ width: '100%' }}
                  viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.8, ease: [0.22,1,0.36,1] }}
                />
              </span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
              FortressLedger's schema decomposed step-by-step through all normal forms — proving zero redundancy and full data integrity.
            </p>
          </motion.div>

          {/* Horizontal progress journey */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <NormalizationStepper activeStep={activeNF} onStepClick={setActiveNF} />
          </motion.div>

          {/* Two-column layout: steps list + active detail */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

            {/* Left — step accordion list */}
            <div className="lg:col-span-2 space-y-3">
              {normalForms.map((nf, idx) => (
                <NormalFormCard
                  key={nf.step} nf={nf} idx={idx}
                  isActive={activeNF === idx}
                  onClick={() => setActiveNF(idx)}
                />
              ))}
            </div>

            {/* Right — live detail panel */}
            <div className="lg:col-span-3 lg:sticky lg:top-24 self-start">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeNF}
                  initial={{ opacity: 0, x: 30, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.97 }}
                  transition={{ duration: 0.42, ease: [0.22,1,0.36,1] }}
                >
                  {(() => {
                    const nf = normalForms[activeNF];
                    return (
                      <div className="rounded-2xl border overflow-hidden"
                        style={{
                          background: 'var(--bg-card)',
                          borderColor: nf.color,
                          boxShadow: `0 0 60px ${nf.glow}, 0 8px 40px rgba(0,0,0,0.15)`,
                        }}>
                        {/* Panel header */}
                        <div className="px-6 py-5 border-b flex items-center gap-4"
                          style={{ borderColor: `${nf.color}30`, background: `${nf.glow}` }}>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-lg"
                            style={{ background: nf.color }}>{nf.step}</div>
                          <div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{nf.title}</h3>
                            <p className="text-xs" style={{ color: nf.color }}>Normal Form {activeNF + 1} of {normalForms.length}</p>
                          </div>
                          <div className="ml-auto">
                            <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest"
                              style={{ background: `${nf.color}20`, color: nf.color }}>
                              {activeNF === normalForms.length - 1 ? '🏆 FINAL FORM' : `STEP ${activeNF + 1}`}
                            </span>
                          </div>
                        </div>

                        <div className="p-6 space-y-6">
                          {/* Description */}
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{nf.desc}</p>

                          {/* Schema visualization */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Database size={12} style={{ color: nf.color }}/>
                              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: nf.color }}>
                                {nf.schema.tableName}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {nf.schema.columns.map((col, ci) => (
                                <motion.div key={ci}
                                  initial={{ opacity: 0, x: -16 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: ci * 0.08, duration: 0.38 }}
                                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-mono text-[11px]"
                                  style={{
                                    background: col.flag?.startsWith('') ? `${nf.color}0f` : col.flag?.startsWith('⚠') ? 'rgba(245,158,11,0.07)' : col.flag?.startsWith('🔴') ? 'rgba(239,68,68,0.07)' : 'var(--bg-base)',
                                    borderLeft: `3px solid ${col.flag?.startsWith('') ? nf.color : col.flag?.startsWith('⚠') ? '#f59e0b' : col.flag?.startsWith('🔴') ? '#ef4444' : 'rgba(255,255,255,0.06)'}`,
                                  }}>
                                  <span className="font-bold" style={{ color: col.flag?.startsWith('') ? nf.color : col.flag?.startsWith('🔴') ? '#ef4444' : 'var(--text-primary)' }}>
                                    {col.name}
                                  </span>
                                  <span className="flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{col.type}</span>
                                  {col.flag && (
                                    <span className="ml-auto flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
                                      style={{
                                        background: col.flag?.startsWith('') ? `${nf.color}20` : col.flag?.startsWith('⚠') ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: col.flag?.startsWith('') ? nf.color : col.flag?.startsWith('⚠') ? '#f59e0b' : '#ef4444'
                                      }}>
                                      {col.flag}
                                    </span>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Analysis */}
                          <div className="pt-4 border-t" style={{ borderColor: `${nf.color}20` }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>Analysis</p>
                            <div className="space-y-2">
                              {nf.analysis.map((a, ai) => (
                                <motion.div key={ai}
                                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: ai * 0.1 }}
                                  className="flex items-center gap-2.5 text-xs font-medium px-3 py-2.5 rounded-lg"
                                  style={{
                                    background: a.type === 'good' ? 'rgba(5,150,105,0.07)' : a.type === 'warn' ? 'rgba(245,158,11,0.07)' : 'rgba(239,68,68,0.07)',
                                  }}>
                                  <span style={{ color: a.type === 'good' ? '#10b981' : a.type === 'warn' ? '#f59e0b' : '#ef4444' }}>
                                    {a.type === 'good' ? <CheckCircle2 size={13}/> : a.type === 'warn' ? <AlertTriangle size={13}/> : <XCircle size={13}/>}
                                  </span>
                                  <span style={{ color: a.type === 'good' ? '#10b981' : a.type === 'warn' ? '#f59e0b' : '#ef4444' }}>
                                    {a.text}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Navigate buttons */}
                          <div className="flex items-center justify-between pt-2">
                            <motion.button
                              onClick={() => setActiveNF(Math.max(0, activeNF - 1))}
                              disabled={activeNF === 0}
                              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all disabled:opacity-30"
                              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                              whileHover={{ scale: activeNF === 0 ? 1 : 1.04 }}
                              whileTap={{ scale: 0.96 }}>
                              ← Prev
                            </motion.button>

                            <span className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                              {activeNF + 1} / {normalForms.length}
                            </span>

                            <motion.button
                              onClick={() => setActiveNF(Math.min(normalForms.length - 1, activeNF + 1))}
                              disabled={activeNF === normalForms.length - 1}
                              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-30"
                              style={{ background: activeNF < normalForms.length - 1 ? nf.color : 'var(--bg-card)', color: '#fff', borderColor: nf.color, border: '1px solid' }}
                              whileHover={{ scale: activeNF === normalForms.length - 1 ? 1 : 1.04 }}
                              whileTap={{ scale: 0.96 }}>
                              Next →
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* BCNF certification badge */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}
            className="mt-14 flex justify-center">
            <motion.div
              className="inline-flex items-center gap-4 px-8 py-5 rounded-2xl border shadow-2xl relative overflow-hidden"
              style={{ background: 'var(--bg-card)', borderColor: 'rgba(5,150,105,0.4)' }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(5,150,105,0.2)' }}
              transition={{ duration: 0.3 }}>
              <motion.div
                className="absolute inset-0 opacity-0"
                animate={{ opacity: [0, 0.04, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), transparent)' }}
              />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                style={{ background: 'var(--brand-primary)' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>Schema Verified: BCNF Compliant</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  4 tables · 0 redundancy · 0 anomalies · Every determinant is a candidate key
                </p>
              </div>
              <div className="ml-2 flex-shrink-0">
                <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest"
                  style={{ background: 'rgba(5,150,105,0.15)', color: 'var(--brand-primary)' }}>
                  🏆 Certified
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ════ TECH STACK ══════════════════════════════════════════════════ */}
      <section className="py-24 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4"
              style={{ background: 'var(--bg-hover)', color: 'var(--brand-primary)' }}>
              <FileCode size={14} /> Tech Stack
            </span>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Built With <span style={{ color: 'var(--brand-primary)' }}>Production Tools</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: "React 19", desc: "Vite-powered SPA with Context API, Framer Motion animations, and Recharts analytics", icon: <Cpu size={20}/> },
              { name: "Express.js", desc: "RESTful API with JWT auth in HttpOnly cookies, RBAC middleware, and connection pooling", icon: <Server size={20}/> },
              { name: "MySQL 8+", desc: "InnoDB with triggers, stored procedures, views, events, indexes, and partitioning", icon: <Database size={20}/> },
              { name: "Security", desc: "Bcrypt hashing, parameterized queries, CORS, SERIALIZABLE isolation, audit chains", icon: <Shield size={20}/> },
            ].map((tech, idx) => (
              <motion.div key={tech.name} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={idx * 0.15} variants={fadeUp}>
                <TiltCard intensity={5} className="h-full rounded-2xl p-6 border transition-all duration-300 group"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white shadow-lg"
                    style={{ background: 'var(--brand-primary)' }}>{tech.icon}</div>
                  <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{tech.name}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tech.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ CTA ════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}>
            <TiltCard intensity={3} className="relative rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-8 py-16 sm:px-16 sm:py-20 text-center relative" style={{ background: 'var(--text-primary)' }}>
                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight" style={{ color: 'var(--bg-card)' }}>
                    Ready to Explore the<br/>Full DBMS Showcase?
                  </h2>
                  <p className="mt-5 max-w-lg mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
                    Create an account to experience atomic transfers, view real-time fraud analytics, and explore the forensic audit system.
                  </p>
                  <div className="mt-10 flex flex-wrap justify-center gap-4">
                    <Link to="/register"
                      className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                      style={{ background: 'var(--brand-primary)', color: 'white' }}>
                      Open Account <ChevronRight size={16} />
                    </Link>
                    <Link to="/login"
                      className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-300 hover:-translate-y-0.5"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      Admin Login <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </section>
    </div>
  );
}