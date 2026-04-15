import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import Navbar from '../components/ui/Navbar';

import { 
  ShieldCheck, Clock, CheckCircle2, Lock, Database, Search, 
  Vault, Activity, ArrowRight, ChevronRight, Fingerprint,
  Layers, GitBranch, Shield, Cpu, Server, Eye, Hash,
  BarChart2, Table, Zap, Network, FileCode, AlertTriangle,
  Binary, KeyRound, ScrollText, XCircle
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] } }) };
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } };
const slideRight = { hidden: { opacity: 0, x: 80 }, visible: { opacity: 1, x: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } } };

const TiltCard = ({ children, className = "", intensity = 8 }) => {
  const ref = useRef(null);
  const handleMove = (e) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    el.style.transform = `perspective(1000px) rotateX(${-y * intensity}deg) rotateY(${x * intensity}deg) scale3d(1.02,1.02,1.02)`;
  };
  const handleLeave = () => { if (ref.current) ref.current.style.transform = "perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)"; };
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} className={`will-change-transform ${className}`} style={{ transformStyle: "preserve-3d", transition: "transform 0.15s ease-out, box-shadow 0.3s ease" }}>
      {children}
    </div>
  );
};

// Animated SQL Terminal component
const SqlTerminal = () => {
  const lines = [
    { text: "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;", color: "var(--brand-primary)" },
    { text: "BEGIN;", color: "#60a5fa" },
    { text: "-- Canonical lock ordering (lower ID first)", color: "#6b7280" },
    { text: "SELECT * FROM accounts WHERE id = ? FOR UPDATE;", color: "#f59e0b" },
    { text: "UPDATE accounts SET balance = balance - 500;", color: "#f472b6" },
    { text: "UPDATE accounts SET balance = balance + 500;", color: "#f472b6" },
    { text: "INSERT INTO transactions (...) VALUES (...);", color: "#a78bfa" },
    { text: "COMMIT; -- ACID Guaranteed ✓", color: "var(--brand-primary)" },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: '#0a0f1a', borderColor: 'var(--border-default)' }}>
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: '#1e293b' }}>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest ml-2" style={{ color: '#475569' }}>mysql — fortress_ledger</span>
      </div>
      {/* Terminal body */}
      <div className="p-4 space-y-1 font-mono text-[11px] sm:text-[12px] leading-relaxed">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.3, duration: 0.4 }}
            className="flex"
          >
            <span className="mr-2 select-none" style={{ color: '#334155' }}>{'>'}</span>
            <span style={{ color: line.color }}>{line.text}</span>
          </motion.div>
        ))}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: [0, 1, 0] }} 
          transition={{ delay: 3.5, duration: 1, repeat: Infinity }}
          className="mt-2"
        >
          <span className="mr-2" style={{ color: '#334155' }}>{'>'}</span>
          <span className="inline-block w-2 h-4 bg-emerald-400"></span>
        </motion.div>
      </div>
    </div>
  );
};

// DBMS concept cards data
const dbmsConcepts = [
  {
    icon: <Lock size={18}/>,
    title: "SERIALIZABLE Isolation",
    desc: "Prevents phantom reads and double-spend attacks using range locks.",
    tag: "Concurrency",
    interview: "Why not REPEATABLE READ for banking?"
  },
  {
    icon: <GitBranch size={18}/>,
    title: "Canonical Lock Ordering",
    desc: "Lock lower account ID first to prevent circular-wait deadlocks.",
    tag: "Deadlock Prevention",
    interview: "How do you prevent deadlocks?"
  },
  {
    icon: <Database size={18}/>,
    title: "Stored Procedures",
    desc: "sp_atomic_transfer with DECLARE HANDLER, OUT params, ROLLBACK.",
    tag: "Server-Side SQL",
    interview: "Procedure vs app-layer transactions?"
  },
  {
    icon: <ScrollText size={18}/>,
    title: "Cursor-Based Statements",
    desc: "sp_generate_monthly_statement builds running balance via CURSOR.",
    tag: "Row Processing",
    interview: "When to use cursors vs set ops?"
  },
  {
    icon: <Hash size={18}/>,
    title: "SHA2 Hash Chain",
    desc: "Each audit row hashes its content + previous hash — blockchain-style.",
    tag: "Tamper Detection",
    interview: "Build a tamper-evident audit trail?"
  },
  {
    icon: <Fingerprint size={18}/>,
    title: "JSON Trigger Auditing",
    desc: "AFTER INSERT/UPDATE/DELETE triggers capture JSON_OBJECT row diffs.",
    tag: "Forensic Logging",
    interview: "DB triggers vs app-level logging?"
  },
  {
    icon: <Layers size={18}/>,
    title: "Composite Indexes",
    desc: "idx(sender_id, created_at) — leftmost prefix rule for range scans.",
    tag: "Index Strategy",
    interview: "Why is ENUM-only index useless?"
  },
  {
    icon: <BarChart2 size={18}/>,
    title: "EXPLAIN ANALYZE",
    desc: "Verify index usage: 'Using index condition' vs full table scan.",
    tag: "Query Tuning",
    interview: "How to read EXPLAIN output?"
  },
  {
    icon: <Table size={18}/>,
    title: "Materialized Views",
    desc: "fraud_summary table + EVENT refreshes every 60s (MySQL pattern).",
    tag: "Query Optimization",
    interview: "Materialized vs regular views?"
  },
  {
    icon: <Zap size={18}/>,
    title: "RANGE Partitioning",
    desc: "transactions partitioned by YEAR*100+MONTH for pruning at scale.",
    tag: "Scalability",
    interview: "Partition pruning bypass pitfalls?"
  },
  {
    icon: <Eye size={18}/>,
    title: "Row-Level Security",
    desc: "Session @current_user_id + DEFINER views simulate PostgreSQL RLS.",
    tag: "Access Control",
    interview: "RLS in MySQL without native support?"
  },
  {
    icon: <KeyRound size={18}/>,
    title: "SQL Injection Prevention",
    desc: "Parameterized queries — SQL structure parsed before values bound.",
    tag: "Security",
    interview: "Why are prepared statements safe?"
  }
];

// Architecture nodes
const archFlow = [
  { icon: <Cpu size={16}/>, label: "React + Vite", sub: "SPA Client" },
  { icon: <Server size={16}/>, label: "Express API", sub: "JWT + RBAC" },
  { icon: <Database size={16}/>, label: "MySQL 8+", sub: "InnoDB Engine" },
];

const archFeatures = [
  "Triggers (6)", "Stored Procedures (2)", "Views (4)", 
  "Indexes (5+)", "Events (1)", "Partitioning"
];

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.3]);

  return (
    <div className="w-full bg-transparent pt-20">
      <Navbar />

      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .shimmer-text { background: linear-gradient(90deg, var(--brand-primary) 0%, #34d399 50%, var(--brand-primary) 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 3s linear infinite; }
        .glow-emerald { box-shadow: 0 0 30px rgba(5, 150, 105, 0.15), 0 0 60px rgba(5, 150, 105, 0.05); }
        @keyframes pulse-border { 0%, 100% { border-color: rgba(5, 150, 105, 0.2); } 50% { border-color: rgba(5, 150, 105, 0.5); } }
        .concept-card:hover { border-color: var(--brand-primary) !important; box-shadow: 0 0 20px rgba(5, 150, 105, 0.1); }
        .concept-card:hover .concept-icon { transform: scale(1.1) rotate(-5deg); }
        .arch-node { position: relative; }
        .arch-node::after { content: '→'; position: absolute; right: -24px; top: 50%; transform: translateY(-50%); color: var(--brand-primary); font-weight: bold; font-size: 18px; }
        .arch-node:last-child::after { display: none; }
      `}</style>

      {/* ============ HERO ============ */}
      <section className="relative min-h-[90vh] flex items-center bg-transparent">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 w-full z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" animate="visible">
              <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--brand-primary)" }}></span>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--brand-primary)" }}>DBMS Engineering Showcase</span>
              </motion.div>

              <motion.h1 custom={1} variants={fadeUp} className="text-[2.75rem] sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.08] tracking-tight" style={{ color: "var(--text-primary)" }}>
                Enterprise Banking,
                <br/><span className="shimmer-text">ACID-Compliant</span>
                <br/>& Forensic-Ready
              </motion.h1>

              <motion.p custom={2} variants={fadeUp} className="mt-6 text-lg leading-relaxed max-w-lg" style={{ color: "var(--text-secondary)" }}>
                A production-grade banking engine demonstrating 20+ advanced DBMS concepts — from SERIALIZABLE isolation and deadlock prevention to SHA2 hash chains and RANGE partitioning.
              </motion.p>

              <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
                <Link to="/register" className="group inline-flex items-center gap-2.5 px-7 py-3.5 text-white rounded-xl text-[15px] font-bold transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" style={{ background: "var(--brand-primary)" }}>
                  Open an Account <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link to="/login" className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[15px] font-bold border transition-all duration-300 hover:-translate-y-0.5" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}>
                  <ShieldCheck size={16} style={{ color: "var(--brand-primary)" }} /> Access Portal
                </Link>
              </motion.div>

              {/* Trust Stats */}
              <motion.div custom={4} variants={fadeUp} className="mt-12 flex items-center gap-8">
                {[
                  { icon: <ShieldCheck size={14}/>, value: "ACID", label: "Compliant" },
                  { icon: <Clock size={14}/>, value: "SHA2", label: "Hash Chain" },
                  { icon: <CheckCircle2 size={14}/>, value: "20+", label: "Concepts" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", color: "var(--brand-primary)" }}>
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                      <p className="text-[11px] uppercase font-bold tracking-wide" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — Animated SQL Terminal */}
            <motion.div initial="hidden" animate="visible" variants={slideRight} className="hidden lg:block">
              <TiltCard intensity={4} className="glow-emerald rounded-2xl">
                <SqlTerminal />
              </TiltCard>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ============ WHAT IS FORTRESS LEDGER? ============ */}
      <section className="py-24 relative bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4" style={{ background: "var(--bg-hover)", color: "var(--brand-primary)" }}>
              What This App Does
            </span>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
              Three Systems, <span style={{ color: "var(--brand-primary)" }}>One Engine</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-base" style={{ color: "var(--text-secondary)" }}>
              FortressLedger combines enterprise banking, real-time fraud analytics, and forensic auditing into a single MySQL-powered platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                icon: <Vault size={22}/>, 
                title: "Banking Engine", 
                desc: "Atomic fund transfers with SERIALIZABLE isolation, canonical lock ordering, and CHECK constraints ensuring balances never go negative.", 
                tag: "Core Ledger",
                details: ["Double-entry bookkeeping", "FOR UPDATE row locking", "Stored procedure transfers"]
              },
              { 
                icon: <AlertTriangle size={22}/>, 
                title: "Fraud Analytics", 
                desc: "Real-time velocity detection via optimized views and materialized summary tables, refreshed every 60 seconds by scheduled EVENTs.", 
                tag: "Detection",
                details: ["Transactions-per-minute tracking", "Materialized view pattern", "Composite index optimization"]
              },
              { 
                icon: <Fingerprint size={22}/>, 
                title: "Forensic Audit System", 
                desc: "Every data mutation is captured by database triggers using JSON_OBJECT diffs. A SHA2 hash chain makes retroactive tampering detectable.", 
                tag: "Compliance",
                details: ["6 comprehensive triggers", "JSON old/new row state", "Blockchain-style hash chain"]
              }
            ].map((f, idx) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} custom={idx * 0.2} variants={fadeUp}>
                <TiltCard intensity={4} className="h-full rounded-2xl p-7 border group transition-all duration-300 relative overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-sm)" }}>
                  <div className={`absolute top-0 left-0 w-1 h-full rounded-r-full opacity-60 group-hover:opacity-100 transition-opacity duration-300`} style={{ background: "var(--brand-primary)" }} />
                  <div className="relative z-10">
                    <span className="inline-block text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider mb-4 border" style={{ background: "var(--bg-hover)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>{f.tag}</span>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg text-white" style={{ background: "var(--brand-primary)" }}>
                      {f.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
                    <ul className="space-y-1.5">
                      {f.details.map(d => (
                        <li key={d} className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                          <CheckCircle2 size={12} style={{ color: "var(--brand-primary)" }} />
                          {d}
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

      {/* ============ DBMS CONCEPTS AT WORK ============ */}
      <section className="py-24 relative bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4" style={{ background: "var(--bg-hover)", color: "var(--brand-primary)" }}>
              <Binary size={14} /> Engineering Depth
            </span>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
              20+ DBMS Concepts, <span style={{ color: "var(--brand-primary)" }}>Battle-Tested</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-base" style={{ color: "var(--text-secondary)" }}>
              Every card below represents a real concept implemented in this codebase — with the interview question it answers.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dbmsConcepts.map((concept, idx) => (
              <motion.div 
                key={concept.title} 
                initial="hidden" 
                whileInView="visible" 
                viewport={{ once: true, margin: "-20px" }} 
                custom={idx * 0.06} 
                variants={fadeUp}
              >
                <div className="concept-card h-full rounded-2xl p-5 border transition-all duration-300 cursor-default group" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="concept-icon w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300" style={{ background: "rgba(5, 150, 105, 0.1)", color: "var(--brand-primary)" }}>
                      {concept.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1.5" style={{ background: "var(--bg-hover)", color: "var(--brand-primary)" }}>{concept.tag}</span>
                      <h3 className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{concept.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>{concept.desc}</p>
                  <div className="pt-2.5 border-t" style={{ borderColor: "var(--border-default)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>Interview Q:</p>
                    <p className="text-[11px] font-medium italic leading-snug" style={{ color: "var(--brand-primary)" }}>"{concept.interview}"</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ARCHITECTURE ============ */}
      <section className="py-24 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4" style={{ background: "var(--bg-hover)", color: "var(--brand-primary)" }}>
              <Network size={14} /> System Architecture
            </span>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
              Full-Stack <span style={{ color: "var(--brand-primary)" }}>Data Flow</span>
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}>
            <TiltCard intensity={3} className="rounded-3xl p-8 lg:p-12 border glow-emerald" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
              {/* Architecture Flow */}
              <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 mb-10">
                {archFlow.map((node, i) => (
                  <div key={node.label} className="flex items-center gap-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }} 
                      whileInView={{ opacity: 1, scale: 1 }} 
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.2, duration: 0.5 }}
                      className="flex items-center gap-4 px-6 py-4 rounded-2xl border" 
                      style={{ background: "var(--bg-base)", borderColor: "var(--border-default)" }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: "var(--brand-primary)" }}>
                        {node.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{node.label}</p>
                        <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{node.sub}</p>
                      </div>
                    </motion.div>
                    {i < archFlow.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.2 }}
                        className="hidden lg:flex w-10 h-10 rounded-full items-center justify-center border"
                        style={{ borderColor: "var(--border-default)", color: "var(--brand-primary)" }}
                      >
                        <ArrowRight size={16} />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              {/* MySQL Internal Features */}
              <div className="pt-8 border-t" style={{ borderColor: "var(--border-default)" }}>
                <p className="text-center text-xs font-bold uppercase tracking-widest mb-6" style={{ color: "var(--text-secondary)" }}>MySQL Internal Objects</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {archFeatures.map((feat, i) => (
                    <motion.span 
                      key={feat}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:border-emerald-500/50 hover:shadow-md cursor-default"
                      style={{ background: "var(--bg-base)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                    >
                      {feat}
                    </motion.span>
                  ))}
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* ============ NORMALIZATION PROOF ============ */}
      <section className="py-24 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4" style={{ background: "var(--bg-hover)", color: "var(--brand-primary)" }}>
              <Layers size={14} /> Schema Normalization
            </span>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
              From Raw Data to <span style={{ color: "var(--brand-primary)" }}>BCNF</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-base" style={{ color: "var(--text-secondary)" }}>
              FortressLedger's actual schema — decomposed step-by-step through normal forms, proving zero redundancy and full data integrity.
            </p>
          </motion.div>

          {/* Normalization Steps */}
          <div className="space-y-8">
            {[
              {
                step: "UNF",
                title: "Unnormalized Form",
                color: "#e11d48",
                desc: "All data in one flat table — repeating groups, redundancy everywhere.",
                table: {
                  name: "bank_data_raw",
                  cols: ["user_email", "password_hash", "role", "account_no", "balance", "status", "tx_amount", "tx_type", "tx_receiver", "tx_date", "audit_action", "audit_old", "audit_new"],
                  highlight: [0, 3, 6, 10],
                },
                problems: ["Repeating groups (multiple transactions per user row)", "Massive redundancy (user email repeated for every transaction)", "Insert/Update/Delete anomalies"],
              },
              {
                step: "1NF",
                title: "First Normal Form",
                color: "#f59e0b",
                desc: "Atomic values only — no repeating groups. Each row is unique via a primary key.",
                table: {
                  name: "Split into: users | accounts | transactions",
                  cols: ["users(id ← PK, email, password_hash, role)", "accounts(id ← PK, user_id → FK, account_no, balance, status)", "transactions(id ← PK, sender_id → FK, receiver_id → FK, amount, type)"],
                  highlight: [],
                },
                problems: ["✅ Eliminated repeating groups", "⚠ Partial dependency: account_no → balance (non-key → non-key in wider sense)", "⚠ Transitive dependencies may still exist"],
              },
              {
                step: "2NF",
                title: "Second Normal Form",
                color: "#3b82f6",
                desc: "All non-key attributes fully depend on the ENTIRE primary key — no partial dependencies.",
                table: {
                  name: "Already 2NF — all tables use single-column PKs",
                  cols: ["users: id → {email, password_hash, role}", "accounts: id → {user_id, account_no, balance, status}", "transactions: id → {sender_id, receiver_id, amount, type}", "audit_logs: id → {entity_id, action, old_value, new_value}"],
                  highlight: [],
                },
                problems: ["✅ No partial dependencies (single-column PKs eliminate this class entirely)", "⚠ Check for transitive dependencies: Does A → B → C exist?"],
              },
              {
                step: "3NF",
                title: "Third Normal Form",
                color: "#8b5cf6",
                desc: "No transitive dependencies — every non-key column depends ONLY on the primary key, not on other non-key columns.",
                table: {
                  name: "Verified: No transitive dependencies exist",
                  cols: ["users.email → determined only by users.id ✓", "accounts.balance → determined only by accounts.id ✓", "accounts.status → determined only by accounts.id ✓", "audit_logs.chain_hash → computed from ALL row content (no transit dependency) ✓"],
                  highlight: [],
                },
                problems: ["✅ No column depends on another non-key column", "✅ Every functional dependency is: PK → attribute", "Example proof: account_no is UNIQUE but not PK — if it were, balance determined by account_no would be a transitive dep. We use UUID PK, so this is clean."],
              },
              {
                step: "BCNF",
                title: "Boyce-Codd Normal Form",
                color: "var(--brand-primary)",
                desc: "Every determinant is a candidate key. The strictest practical normal form.",
                table: {
                  name: "Fortress Ledger Schema — fully BCNF compliant",
                  cols: ["Determinant: users.id → {email, password_hash, role, created_at}", "Determinant: users.email (UNIQUE) → {id} — email is a candidate key ✓", "Determinant: accounts.id → {user_id, account_no, balance, status}", "Determinant: accounts.account_no (UNIQUE) → {id} — candidate key ✓", "Determinant: transactions.id → {sender_id, receiver_id, amount, type}", "Determinant: audit_logs.id → {entity_id, action, old_value, new_value, chain_hash}"],
                  highlight: [],
                },
                problems: ["✅ Every determinant (email, account_no) is a candidate key", "✅ No non-trivial FD has a non-superkey determinant", "✅ Schema is in BCNF — the highest practical normal form for OLTP"],
              },
            ].map((nf, idx) => (
              <motion.div
                key={nf.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                custom={idx * 0.12}
                variants={fadeUp}
              >
                <div className="rounded-2xl border p-6 lg:p-8 transition-all duration-300 group hover:shadow-lg relative overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
                  {/* Left accent bar */}
                  <div className="absolute top-0 left-0 w-1.5 h-full rounded-r-full" style={{ background: nf.color }} />
                  
                  <div className="flex flex-col lg:flex-row gap-6 relative z-10">
                    {/* Step badge + Title */}
                    <div className="lg:w-1/4 flex-shrink-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-white font-extrabold text-sm shadow-lg" style={{ background: nf.color }}>
                          {nf.step}
                        </span>
                        {idx < 4 && (
                          <div className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center border" style={{ borderColor: "var(--border-default)", color: nf.color }}>
                            <ArrowRight size={14} />
                          </div>
                        )}
                        {idx === 4 && (
                          <div className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-white shadow-lg" style={{ background: "var(--brand-primary)" }}>
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>{nf.title}</h3>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{nf.desc}</p>
                    </div>

                    {/* Schema breakdown */}
                    <div className="lg:w-1/2 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: nf.color }}>{nf.table.name}</p>
                      <div className="space-y-1.5">
                        {nf.table.cols.map((col, ci) => (
                          <div
                            key={ci}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono"
                            style={{
                              background: nf.table.highlight.includes(ci) ? `${nf.color}15` : "var(--bg-base)",
                              borderLeft: nf.table.highlight.includes(ci) ? `3px solid ${nf.color}` : "3px solid transparent",
                              color: nf.table.highlight.includes(ci) ? nf.color : "var(--text-primary)",
                            }}
                          >
                            {col}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Analysis */}
                    <div className="lg:w-1/4 flex-shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>Analysis</p>
                      <ul className="space-y-1.5">
                        {nf.problems.map((p, pi) => (
                          <li key={pi} className="text-[11px] leading-snug flex items-start gap-1.5" style={{ color: p.startsWith("✅") ? "var(--brand-primary)" : p.startsWith("⚠") ? "#f59e0b" : "#e11d48" }}>
                            <span className="mt-0.5 flex-shrink-0">
                              {p.startsWith("✅") ? <CheckCircle2 size={10} /> : p.startsWith("⚠") ? <AlertTriangle size={10} /> : <XCircle size={10} />}
                            </span>
                            <span>{p.replace(/^[✅⚠❌]\s*/, "")}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Arrow connector between steps */}
                {idx < 4 && (
                  <div className="flex justify-center py-2">
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0 }}
                      whileInView={{ opacity: 1, scaleY: 1 }}
                      viewport={{ once: true }}
                      className="w-0.5 h-6 rounded-full"
                      style={{ background: "var(--border-default)" }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Final BCNF Certification Badge */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn} className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl border shadow-lg" style={{ background: "var(--bg-card)", borderColor: "var(--brand-primary)" }}>
              <CheckCircle2 size={24} style={{ color: "var(--brand-primary)" }} />
              <div className="text-left">
                <p className="text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>Schema Verified: BCNF Compliant</p>
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>4 tables • 0 redundancy • 0 anomalies • Every determinant is a candidate key</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ TECH STACK ============ */}
      <section className="py-24 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4" style={{ background: "var(--bg-hover)", color: "var(--brand-primary)" }}>
              <FileCode size={14} /> Tech Stack
            </span>
            <h2 className="text-3xl lg:text-[2.5rem] font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
              Built With <span style={{ color: "var(--brand-primary)" }}>Production Tools</span>
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
                <TiltCard intensity={5} className="h-full rounded-2xl p-6 border transition-all duration-300 group" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white shadow-lg" style={{ background: "var(--brand-primary)" }}>
                    {tech.icon}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>{tech.name}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{tech.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-24 bg-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}>
            <TiltCard intensity={3} className="relative rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-8 py-16 sm:px-16 sm:py-20 text-center relative" style={{ background: "var(--text-primary)" }}>
                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight" style={{ color: "var(--bg-card)" }}>
                    Ready to Explore the <br/>Full DBMS Showcase?
                  </h2>
                  <p className="mt-5 max-w-lg mx-auto text-base" style={{ color: "var(--text-secondary)" }}>
                    Create an account to experience atomic transfers, view real-time fraud analytics, and explore the forensic audit system.
                  </p>
                  <div className="mt-10 flex flex-wrap justify-center gap-4">
                    <Link to="/register" className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" style={{ background: "var(--brand-primary)", color: "white" }}>
                      Open Account <ChevronRight size={16} />
                    </Link>
                    <Link to="/login" className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-300 hover:-translate-y-0.5" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>
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