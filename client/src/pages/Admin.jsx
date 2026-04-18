import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import toast from 'react-hot-toast';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Navbar from "../components/ui/Navbar";
import LockMatrix from "../components/LockMatrix";
import {
  Search,
  AlertTriangle,
  Activity,
  Lock,
  Users,
  Vault,
  ArrowRight,
  BadgeDollarSign,
  Server,
  Cpu,
  Wifi,
  ShieldCheck,
  Fingerprint,
  Unlock,
  PieChart as PieIcon,
  BarChart2,
  ArrowRightLeft,
  PowerOff,
  Hash,
  Eye,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Network,
  History,
  TerminalSquare,
  Trash2,
  Trophy,
  Medal,
  TrendingUp,
  Download,
  HardDrive,
  Database,
  Crown,
  ChevronDown,
  ShieldAlert,
  Shield
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function Admin() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_liquidity: 0,
    active_accounts: 0,
  });
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState({ flow: [], distribution: [] });
  const [tickerData, setTickerData] = useState([]);

  const [supplyForm, setSupplyForm] = useState({ account_no: "", amount: "" });
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectedAccount, setInspectedAccount] = useState(null);
  const [inspectError, setInspectError] = useState("");

  const [freezeTarget, setFreezeTarget] = useState(null);

  // NEW: DEFCON 1 States
  const [isSystemLocked, setIsSystemLocked] = useState(false);
  const [showDefconModal, setShowDefconModal] = useState(false);

  // Advanced DBMS Feature States
  const [auditChainResult, setAuditChainResult] = useState(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [explainData, setExplainData] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [fraudSummary, setFraudSummary] = useState([]);

  // Phase 2 States
  const [launderingRings, setLaunderingRings] = useState([]);
  const [threads, setThreads] = useState([]);
  const [timeMachineForm, setTimeMachineForm] = useState({ account_no: "", target_time: "" });
  const [timeMachineResult, setTimeMachineResult] = useState(null);
  const [tmLoading, setTmLoading] = useState(false);

  // User Management States
  const [allUsers, setAllUsers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Window Functions Analytics States
  const [windowData, setWindowData] = useState(null);
  const [windowLoading, setWindowLoading] = useState(false);

  // Database Backup States
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);

  // Phase 4: Loan Clearance States
  const [pendingLoans, setPendingLoans] = useState([]);
  const [loanLoading, setLoanLoading] = useState(false);

  // Engine Sandbox: MVCC
  const [mvccIsolationLevel, setMvccIsolationLevel] = useState("READ UNCOMMITTED");
  const [mvccLogs, setMvccLogs] = useState(null);
  const [mvccLoading, setMvccLoading] = useState(false);
  const [mvccDropdownOpen, setMvccDropdownOpen] = useState(false);

  // Phase 4: Spatial Forensic States
  const [spatialLogs, setSpatialLogs] = useState([]);
  const [spatialLoading, setSpatialLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") navigate("/dashboard");
    else fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      // Fetch individually so a single route failure doesn't blank out the whole page!
      api
        .get("/admin/dashboard")
        .then((res) => setStats(res.data))
        .catch((e) => console.error("Stats Error:", e));
      api
        .get("/admin/fraud-alerts")
        .then((res) => setAlerts(res.data))
        .catch((e) => console.error("Alerts Error:", e));
      api
        .get("/admin/audit-trail")
        .then((res) => setLogs(res.data))
        .catch((e) => console.error("Logs Error:", e));
      api
        .get("/admin/chart")
        .then((res) => setChartData(res.data))
        .catch((e) => console.error("Chart Error:", e));
      api
        .get("/admin/ticker")
        .then((res) => setTickerData(res.data))
        .catch((e) => console.error("Ticker Error:", e));

      // System Status Check
      api
        .get("/admin/system-status")
        .then((res) => setIsSystemLocked(res.data.lockdown))
        .catch((e) => console.error("System Status Error:", e));

      // Fraud Summary (Materialized View)
      api
        .get("/admin/fraud-summary")
        .then((res) => setFraudSummary(res.data))
        .catch((e) => console.error("System Status Error:", e));
      
      // Phase 2 States
      api
        .get("/admin/laundering-rings")
        .then((res) => setLaunderingRings(res.data))
        .catch((e) => console.error("Rings Error:", e));
      api
        .get("/admin/system-monitor")
        .then((res) => setThreads(res.data.threads))
        .catch((e) => console.error("Monitor Error:", e));

      // User Management
      api
        .get("/admin/users")
        .then((res) => setAllUsers(res.data))
        .catch((e) => console.error("Users Error:", e));

      // Backup Info
      api
        .get("/admin/backup/info")
        .then((res) => setBackupInfo(res.data))
        .catch((e) => console.error("Backup Info Error:", e));

      fetchPendingLoans();
      fetchSpatialLogs();
    } catch (err) {
      if (
        err.response &&
        (err.response.status === 401 || err.response.status === 403)
      )
        logout();
    }
  };

  const fetchPendingLoans = async () => {
    try {
      const res = await api.get("/admin/pending-loans");
      setPendingLoans(res.data);
    } catch (e) {
      console.error("Error fetching pending loans:", e);
    }
  };

  const processLoan = async (loanId, action) => {
    setLoanLoading(true);
    const load = toast.loading(`${action === 'approve' ? 'Approving' : 'Rejecting'} loan...`);
    try {
      const res = await api.post(`/admin/loan/${loanId}/${action}`);
      toast.success(res.data.message);
      fetchPendingLoans();
      // Refresh global stats since a loan approval changes total liquidity
      api.get("/admin/dashboard").then((res) => setStats(res.data));
    } catch (e) {
      toast.error(e.response?.data?.error || "Error processing loan");
    } finally {
      toast.dismiss(load);
      setLoanLoading(false);
    }
  };

  const fetchSpatialLogs = async () => {
    setSpatialLoading(true);
    try {
      const res = await api.get("/admin/spatial-logs");
      setSpatialLogs(res.data);
    } catch (e) {
      console.error("Spatial Logs Error:", e);
    } finally {
      setSpatialLoading(false);
    }
  };

  // NEW: Execute Global Lockdown
  const executeDefconProtocol = async () => {
    try {
      const res = await api.post("/admin/system-lockdown");
      setIsSystemLocked(res.data.lockdown);
      setShowDefconModal(false);
      toast.success(res.data.lockdown ? 'System locked down' : 'System restored');
      fetchData();
    } catch (error) {
      toast.error("Failed to communicate with central core.");
    }
  };

  // Verify Audit Chain Integrity
  const verifyAuditChain = async () => {
    setChainLoading(true);
    try {
      const res = await api.get("/admin/audit-chain-verify");
      setAuditChainResult(res.data);
    } catch (err) {
      setAuditChainResult({ summary: { chain_status: 'ERROR', total_checked: 0 }, entries: [] });
    } finally {
      setChainLoading(false);
    }
  };

  // Fetch EXPLAIN plan
  const fetchExplainPlan = async () => {
    setExplainLoading(true);
    try {
      const res = await api.get("/admin/explain-fraud");
      setExplainData(res.data);
    } catch (err) {
      console.error("EXPLAIN Error:", err);
    } finally {
      setExplainLoading(false);
    }
  };

  // Run Temporal Rebuild
  const handleTimeMachine = async (e) => {
    e.preventDefault();
    setTmLoading(true);
    try {
      const res = await api.post("/admin/point-in-time", timeMachineForm);
      setTimeMachineResult(res.data);
    } catch(err) {
      alert("Temporal rebuild failed: " + (err.response?.data?.error || ""));
    } finally {
      setTmLoading(false);
    }
  };

  // Run MVCC Demonstration
  const handleRunMvcc = async () => {
    setMvccLoading(true);
    setMvccLogs(null);
    try {
      const res = await api.post("/admin/isolation-test", { isolationLevel: mvccIsolationLevel });
      setMvccLogs(res.data.logs);
      toast.success("MVCC Engine test completed.", { position: "bottom-center" });
    } catch (err) {
      toast.error(err.response?.data?.error || "MVCC Simulation failed", { position: "bottom-center" });
    } finally {
      setMvccLoading(false);
    }
  };

  const confirmFreeze = (id, account_no, status) =>
    setFreezeTarget({ id, account_no, status });

  const executeFreezeAccount = async () => {
    if (!freezeTarget) return;
    try {
      await api.patch(`/admin/freeze/${freezeTarget.id}`);
      fetchData();
      if (inspectedAccount && inspectedAccount.id === freezeTarget.id) {
        setInspectedAccount({
          ...inspectedAccount,
          status: inspectedAccount.status === "ACTIVE" ? "FROZEN" : "ACTIVE",
        });
      }
      setFreezeTarget(null);
    } catch (err) {
      toast.error("Failed to update status.");
      setFreezeTarget(null);
    }
  };

  const handleSupplyCapital = async (e) => {
    e.preventDefault();
    setMsg({ text: "Minting capital...", type: "info" });
    try {
      await api.post("/admin/supply", {
        account_no: supplyForm.account_no,
        amount: parseFloat(supplyForm.amount),
      });
      toast.success(`Successfully injected capital into ${supplyForm.account_no}`);
      setMsg({
        text: `Successfully injected capital into ${supplyForm.account_no}`,
        type: "success",
      });
      setSupplyForm({ account_no: "", amount: "" });
      fetchData();
      if (
        inspectedAccount &&
        inspectedAccount.account_no === supplyForm.account_no
      )
        handleInspect(null, supplyForm.account_no);
    } catch (err) {
      toast.error(err.response?.data?.error || "Injection failed");
      setMsg({
        text: err.response?.data?.error || "Injection failed",
        type: "error",
      });
    }
  };

  const handleInspect = async (e, forceId = null) => {
    if (e) e.preventDefault();
    setInspectError("");
    setInspectedAccount(null);
    const target = forceId || searchQuery;
    if (!target) return;
    try {
      const res = await api.get(`/admin/account/${target}`);
      setInspectedAccount(res.data);
    } catch (err) {
      setInspectError(err.response?.data?.error || "Entity not found");
    }
  };

  const VolumeTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="glass p-3 rounded-xl border shadow-xl"
          style={{ borderColor: "var(--border-default)" }}
        >
          <p
            className="text-[10px] font-bold uppercase mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Tx Volume
          </p>
          <p
            className="text-lg font-mono font-bold"
            style={{ color: "var(--brand-primary)" }}
          >
            ${Number(payload[0].value).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const VelocityTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="glass p-3 rounded-xl border shadow-xl"
          style={{ borderColor: "var(--border-default)" }}
        >
          <p
            className="text-[10px] font-bold uppercase mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Throughput
          </p>
          <p
            className="text-lg font-mono font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {payload[0].value} <span className="text-xs">TXs</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const displayFlow =
    chartData.flow?.length > 0
      ? chartData.flow
      : [{ time: "Now", volume: 0, tx_count: 0 }];
  const displayDist =
    chartData.distribution?.length > 0
      ? chartData.distribution.map((d) => ({ ...d, value: Number(d.value) }))
      : [{ name: "ACTIVE", value: 1 }];
  const PIE_COLORS = {
    ACTIVE: "#10b981",
    FROZEN: "#e11d48",
    SYSTEM: "#3b82f6",
  };

  return (
    <div className="w-full bg-transparent min-h-screen flex flex-col relative">
      <Navbar />

      {/* CONFIRMATION MODALS (Freeze & Defcon) */}
      <AnimatePresence>
        {/* 1. Account Freeze Modal */}
        {freezeTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md p-8 rounded-3xl border shadow-2xl glass"
              style={{
                borderColor: "var(--border-default)",
                background: "var(--bg-card)",
              }}
            >
              <div
                className="flex items-center gap-3 mb-4"
                style={{
                  color:
                    freezeTarget.status === "ACTIVE" ? "#e11d48" : "#10b981",
                }}
              >
                {freezeTarget.status === "ACTIVE" ? (
                  <Lock size={24} />
                ) : (
                  <Unlock size={24} />
                )}
                <h3 className="text-xl font-extrabold">
                  Confirm Protocol Execution
                </h3>
              </div>
              <p
                className="text-sm font-medium mb-6 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                You are about to{" "}
                <strong
                  className="font-bold tracking-wide uppercase"
                  style={{
                    color:
                      freezeTarget.status === "ACTIVE" ? "#e11d48" : "#10b981",
                  }}
                >
                  {freezeTarget.status === "ACTIVE" ? "FREEZE" : "UNFREEZE"}
                </strong>{" "}
                the target entity. <br />
                <br />
                <span className="text-xs uppercase tracking-wider opacity-60">
                  Target ID:
                </span>
                <br />
                <span
                  className="font-mono text-lg"
                  style={{ color: "var(--text-primary)" }}
                >
                  {freezeTarget.account_no}
                </span>
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setFreezeTarget(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border transition-all hover:bg-slate-800/50"
                  style={{
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={executeFreezeAccount}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 shadow-lg"
                  style={{
                    background:
                      freezeTarget.status === "ACTIVE" ? "#e11d48" : "#10b981",
                  }}
                >
                  {freezeTarget.status === "ACTIVE" ? (
                    <>
                      <Lock size={16} /> Execute Freeze
                    </>
                  ) : (
                    <>
                      <Unlock size={16} /> Execute Unfreeze
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. DEFCON 1 GLOBAL LOCKDOWN MODAL */}
        {showDefconModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-full max-w-lg p-10 rounded-[2rem] border-2 shadow-[0_0_100px_rgba(225,29,72,0.4)] bg-slate-950"
              style={{ borderColor: "#e11d48" }}
            >
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 animate-pulse">
                  <PowerOff size={40} />
                </div>
              </div>
              <h3 className="text-3xl font-black text-center text-rose-500 mb-2 uppercase tracking-widest">
                {isSystemLocked ? "Disengage Lockdown" : "Execute Defcon 1"}
              </h3>
              <p className="text-center text-rose-200/70 text-sm font-medium mb-8 px-4 leading-relaxed">
                {isSystemLocked
                  ? "Re-initializing central network nodes. This will allow liquidity flow and user authentication to resume normally."
                  : "WARNING: This will instantly freeze ALL global liquidity. No entities will be able to process transactions until protocol is reversed."}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={executeDefconProtocol}
                  className="w-full py-4 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-2xl"
                  style={{ background: isSystemLocked ? "#10b981" : "#e11d48" }}
                >
                  {isSystemLocked
                    ? "RESTORE NETWORK ACCESS"
                    : "CONFIRM GLOBAL SHUTDOWN"}
                </button>
                <button
                  onClick={() => setShowDefconModal(false)}
                  className="w-full py-3 rounded-xl text-sm font-bold border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 transition-all"
                >
                  ABORT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
                @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .ticker-track { display: flex; width: max-content; animation: scroll 45s linear infinite; padding-left: 180px; }
                .ticker-track:hover { animation-play-state: paused; }
                .ticker-track:hover .ticker-item { opacity: 0.3; filter: grayscale(80%); }
                .ticker-track .ticker-item:hover { opacity: 1; filter: grayscale(0%); transform: scale(1.05); border-color: var(--brand-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10; }
                .ticker-item { transition: all 0.3s ease; }
            `}</style>

      <div
        className="mt-[72px] h-12 border-b flex items-center relative overflow-hidden shadow-inner"
        style={{
          background: "var(--bg-base)",
          borderColor: "var(--border-default)",
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 z-20 flex items-center px-6 lg:px-12 border-r glass shadow-[4px_0_12px_rgba(0,0,0,0.1)]"
          style={{
            borderColor: "var(--border-default)",
            background: "var(--bg-base)",
          }}
        >
          <span
            className={`w-2 h-2 rounded-full mr-2.5 ${isSystemLocked ? "bg-rose-500 shadow-[0_0_8px_#e11d48]" : "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"}`}
          ></span>
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{
              color: isSystemLocked ? "#e11d48" : "var(--text-primary)",
            }}
          >
            {isSystemLocked ? "NETWORK LOCKED" : "Live Ledger"}
          </span>
        </div>
        <div
          className="absolute left-[140px] w-24 h-full z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, var(--bg-base), transparent)",
          }}
        ></div>
        <div
          className="absolute right-0 w-24 h-full z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to left, var(--bg-base), transparent)",
          }}
        ></div>

        {tickerData.length > 0 ? (
          <div className="ticker-track">
            {[...tickerData, ...tickerData].map((tx, idx) => (
              <div
                key={idx}
                className={`ticker-item flex items-center gap-3 px-4 py-1.5 mx-2 rounded-md border ${isSystemLocked ? "opacity-30 grayscale" : ""}`}
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-card)",
                }}
              >
                <span
                  className="text-[10px] font-mono tracking-wider"
                  style={{
                    color:
                      tx.sender === "CENTRAL MINT"
                        ? "#3b82f6"
                        : "var(--text-secondary)",
                  }}
                >
                  {tx.sender.length > 12 && tx.sender !== "CENTRAL MINT"
                    ? tx.sender.substring(0, 8) + "..."
                    : tx.sender}
                </span>
                <ArrowRight
                  size={10}
                  style={{ color: "var(--text-secondary)" }}
                  className="opacity-50"
                />
                <span
                  className="text-[10px] font-mono tracking-wider font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {tx.receiver.length > 12
                    ? tx.receiver.substring(0, 8) + "..."
                    : tx.receiver}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-bold ml-1"
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                  }}
                >
                  +$
                  {parseFloat(tx.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="w-full text-center text-[10px] font-mono uppercase tracking-widest pl-[160px]"
            style={{ color: "var(--text-secondary)" }}
          >
            Awaiting network traffic...
          </div>
        )}
      </div>

      <div className="flex-1 w-full max-w-none px-6 lg:px-12 py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h1
              className="text-3xl font-extrabold flex items-center gap-3"
              style={{ color: "var(--text-primary)" }}
            >
              <Search style={{ color: "var(--brand-primary)" }} /> Central
              Command
            </h1>
            <p
              className="text-sm mt-2 font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Live network surveillance and core ledger management.
            </p>
          </div>

          {/* NEW: THE KILL SWITCH AND STATUS BADGE */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDefconModal(true)}
              className={`px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-white shadow-lg flex items-center gap-2 transition-all ${isSystemLocked ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500 hover:scale-105"}`}
            >
              <PowerOff size={14} />
              {isSystemLocked ? "RESTORE SYSTEM" : "ENGAGE LOCKDOWN"}
            </button>

            <div
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border glass transition-colors ${isSystemLocked ? "border-rose-500/50 bg-rose-500/10" : "border-emerald-500/20"}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${isSystemLocked ? "bg-rose-500 animate-ping" : "bg-emerald-500 animate-pulse"}`}
              ></span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider transition-colors"
                style={{
                  color: isSystemLocked ? "#e11d48" : "var(--text-primary)",
                }}
              >
                {isSystemLocked ? "SYSTEM LOCKDOWN" : "System Online"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ROW 1: Stats */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 transition-opacity duration-700 ${isSystemLocked ? "opacity-50" : "opacity-100"}`}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="p-6 rounded-3xl border glass lg:col-span-2 flex items-center gap-6"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: "var(--brand-primary)" }}
            >
              <Vault size={28} />
            </div>
            <div>
              <p
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Total System Liquidity
              </p>
              <p className="text-3xl font-extrabold font-mono shimmer-text mt-1">
                $
                {parseFloat(stats.total_liquidity || 0).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                )}
              </p>
            </div>
          </motion.div>
          <motion.div
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="p-6 rounded-3xl border glass flex items-center gap-4"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: "var(--text-primary)" }}
            >
              <Users size={24} />
            </div>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Active Nodes
              </p>
              <p
                className="text-2xl font-extrabold font-mono"
                style={{ color: "var(--text-primary)" }}
              >
                {stats.active_accounts}
              </p>
            </div>
          </motion.div>
          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="p-6 rounded-3xl border glass flex flex-col justify-center gap-2"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div
              className="flex justify-between items-center text-xs font-bold"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="flex items-center gap-1">
                <Cpu size={14} /> DB Load
              </span>{" "}
              <span
                style={{
                  color: isSystemLocked ? "#e11d48" : "var(--brand-primary)",
                }}
              >
                {isSystemLocked ? "0%" : "12%"}
              </span>
            </div>
            <div
              className="flex justify-between items-center text-xs font-bold"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="flex items-center gap-1">
                <Server size={14} /> Latency
              </span>{" "}
              <span
                style={{
                  color: isSystemLocked ? "#e11d48" : "var(--brand-primary)",
                }}
              >
                {isSystemLocked ? "ERR" : "8ms"}
              </span>
            </div>
            <div
              className="flex justify-between items-center text-xs font-bold"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="flex items-center gap-1">
                <Wifi size={14} /> Network
              </span>{" "}
              <span
                style={{
                  color: isSystemLocked ? "#e11d48" : "var(--brand-primary)",
                }}
              >
                {isSystemLocked ? "OFFLINE" : "Stable"}
              </span>
            </div>
          </motion.div>
        </div>

        {/* ROW 2: Primary Area Chart & Mint Terminal */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 transition-opacity duration-700 ${isSystemLocked ? "opacity-50 pointer-events-none" : "opacity-100"}`}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            custom={4}
            variants={fadeUp}
            className="lg:col-span-2 rounded-3xl border p-6 glass flex flex-col"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3
                className="font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Activity size={18} style={{ color: "var(--brand-primary)" }} />{" "}
                Network Volume (24h)
              </h3>
              <span
                className="text-[10px] uppercase font-bold border px-2 py-1 rounded-md"
                style={{
                  borderColor: "var(--border-default)",
                  color: "var(--brand-primary)",
                  background: "rgba(5, 150, 105, 0.1)",
                }}
              >
                Live Sync
              </span>
            </div>
            <div className="flex-1 w-full h-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={displayFlow}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorVolume"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--brand-primary)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--brand-primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border-default)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `$${(val / 1000000).toFixed(1)}M`
                        : `$${val / 1000}k`
                    }
                  />
                  <RechartsTooltip content={<VolumeTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="var(--brand-primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorVolume)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={5}
            variants={fadeUp}
            className="rounded-3xl border p-6 glass flex flex-col justify-center"
            style={{ borderColor: "var(--border-default)" }}
          >
            <h3
              className="font-bold mb-6 flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              <BadgeDollarSign
                size={18}
                style={{ color: "var(--brand-primary)" }}
              />{" "}
              System Capital Injection
            </h3>
            {msg.text && (
              <div
                className="p-3 rounded-xl text-xs font-bold mb-4 border"
                style={{
                  background:
                    msg.type === "error"
                      ? "rgba(225,29,72,0.1)"
                      : "rgba(5,150,105,0.1)",
                  color:
                    msg.type === "error" ? "#e11d48" : "var(--brand-primary)",
                  borderColor:
                    msg.type === "error"
                      ? "rgba(225,29,72,0.3)"
                      : "rgba(5,150,105,0.3)",
                }}
              >
                {msg.text}
              </div>
            )}
            <form onSubmit={handleSupplyCapital} className="space-y-4">
              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Target Account ID
                </label>
                <input
                  required
                  value={supplyForm.account_no}
                  onChange={(e) =>
                    setSupplyForm({ ...supplyForm, account_no: e.target.value })
                  }
                  type="text"
                  placeholder="FLXXXXXXXXXX"
                  className="w-full p-3 rounded-xl border focus:ring-2 font-mono text-sm transition-all"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    outlineColor: "var(--brand-primary)",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Amount (USD)
                </label>
                <input
                  required
                  value={supplyForm.amount}
                  onChange={(e) =>
                    setSupplyForm({ ...supplyForm, amount: e.target.value })
                  }
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  className="w-full p-3 rounded-xl border focus:ring-2 font-mono text-sm transition-all"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    outlineColor: "var(--brand-primary)",
                  }}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: "var(--brand-primary)" }}
              >
                Execute Mint <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        </div>

        {/* ROW 3: Secondary Analytics */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 transition-opacity duration-700 ${isSystemLocked ? "opacity-50" : "opacity-100"}`}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            custom={6}
            variants={fadeUp}
            className="rounded-3xl border p-6 glass flex flex-col"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className="font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <PieIcon size={18} style={{ color: "var(--brand-primary)" }} />{" "}
                Liquidity Distribution
              </h3>
            </div>
            <div className="flex-1 w-full h-[180px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={displayDist}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {displayDist.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[entry.name] || "#8884d8"}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => `$${Number(value).toLocaleString()}`}
                    contentStyle={{
                      background: "var(--bg-card)",
                      borderColor: "var(--border-default)",
                      borderRadius: "12px",
                    }}
                    itemStyle={{
                      color: "var(--text-primary)",
                      fontWeight: "bold",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={7}
            variants={fadeUp}
            className="lg:col-span-2 rounded-3xl border p-6 glass flex flex-col"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3
                className="font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <BarChart2
                  size={18}
                  style={{ color: "var(--brand-primary)" }}
                />{" "}
                Transaction Velocity
              </h3>
            </div>
            <div className="flex-1 w-full h-[180px]">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={displayFlow}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border-default)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    content={<VelocityTooltip />}
                    cursor={{ fill: "var(--border-default)", opacity: 0.4 }}
                  />
                  <Bar
                    dataKey="tx_count"
                    fill="var(--text-primary)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* ROW 4 & 5 remain same but we don't fade the Inspector or Logs so the admin can still use them! */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={8}
          variants={fadeUp}
          className="mb-8 p-6 lg:p-8 rounded-3xl border glass"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            <div className="w-full lg:w-1/3">
              <h3
                className="font-bold mb-4 flex items-center gap-2 text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                <Fingerprint
                  size={20}
                  style={{ color: "var(--brand-primary)" }}
                />{" "}
                Deep Entity Inspector
              </h3>
              <p
                className="text-xs mb-5"
                style={{ color: "var(--text-secondary)" }}
              >
                Search ledger by precise FL-Account string to view forensics and
                manage network access.
              </p>
              <form onSubmit={handleInspect} className="relative">
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter FL-XXXXXXXX"
                  className="w-full p-4 pl-4 pr-14 rounded-xl border focus:ring-2 font-mono text-sm transition-all"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    outlineColor: "var(--brand-primary)",
                  }}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center rounded-lg text-white transition-all shadow-md hover:scale-105"
                  style={{ background: "var(--brand-primary)" }}
                >
                  <Search size={16} />
                </button>
              </form>
              {inspectError && (
                <p className="text-xs mt-3 font-bold text-rose-500">
                  {inspectError}
                </p>
              )}
            </div>

            <div
              className="flex-1 w-full border-t lg:border-t-0 lg:border-l pt-6 lg:pt-0 lg:pl-8"
              style={{ borderColor: "var(--border-default)" }}
            >
              {!inspectedAccount ? (
                <div
                  className="h-full min-h-[120px] flex items-center justify-center text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Awaiting target designation...
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                >
                  <div className="space-y-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Verified Entity ID
                    </p>
                    <p
                      className="text-lg font-mono font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {inspectedAccount.account_no}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${inspectedAccount.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                      >
                        Status: {inspectedAccount.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Current Liquidity
                    </p>
                    <p
                      className="text-3xl font-extrabold font-mono mb-4"
                      style={{ color: "var(--brand-primary)" }}
                    >
                      $
                      {parseFloat(inspectedAccount.balance).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </p>
                    <button
                      onClick={() =>
                        confirmFreeze(
                          inspectedAccount.id,
                          inspectedAccount.account_no,
                          inspectedAccount.status,
                        )
                      }
                      className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5 ${inspectedAccount.status === "ACTIVE" ? "bg-rose-600" : "bg-emerald-600"}`}
                    >
                      {inspectedAccount.status === "ACTIVE" ? (
                        <>
                          <Lock size={14} /> Freeze Target
                        </>
                      ) : (
                        <>
                          <Unlock size={14} /> Unfreeze Target
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={9}
            variants={fadeUp}
            className="rounded-3xl border p-6 glass"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div
              className="flex items-center gap-2 mb-6 font-bold"
              style={{ color: "#e11d48" }}
            >
              <AlertTriangle size={18} /> Velocity Anomalies
            </div>
            {alerts.length === 0 ? (
              <div
                className="h-32 flex flex-col items-center justify-center text-center opacity-50"
                style={{ color: "var(--text-secondary)" }}
              >
                <ShieldCheck size={32} className="mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  No Anomalies Detected
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                {alerts.map((a, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border"
                    style={{
                      background: "rgba(225, 29, 72, 0.05)",
                      borderColor: "rgba(225, 29, 72, 0.2)",
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p
                        className="font-mono text-[11px] font-bold"
                        style={{ color: "#e11d48" }}
                      >
                        {(a.sender_id || "UNKNOWN").substring(0, 12)}...
                      </p>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-500">
                        Flagged
                      </span>
                    </div>
                    <p
                      className="text-xs font-medium mb-3"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {a.tx_count} Transactions / $
                      {parseFloat(a.total_volume).toFixed(0)}
                    </p>
                    <button
                      onClick={() =>
                        confirmFreeze(a.sender_id, a.sender_id, "ACTIVE")
                      }
                      className="w-full py-2 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                      style={{ background: "#e11d48" }}
                    >
                      <Lock size={14} /> Execute Protocol Freeze
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* SPATIAL FORENSICS: Impossible Travel Logs */}
          <motion.div
            initial="hidden" animate="visible" custom={9.5} variants={fadeUp}
            className="rounded-3xl border p-6 glass flex flex-col"
            style={{ borderColor: "rgba(59, 130, 246, 0.3)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Network size={18} style={{ color: "#3b82f6" }} /> Spatial Interceptions
              </h3>
              <button onClick={fetchSpatialLogs} className={spatialLoading ? "animate-spin" : ""}>
                 <Activity size={14} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
              {spatialLogs.length === 0 ? (
                 <div className="h-32 flex flex-col items-center justify-center text-center opacity-40" style={{ color: "var(--text-secondary)" }}>
                    <Server size={32} className="mb-2" />
                    <p className="text-[10px] font-bold uppercase">No Spatial Blocks Logged</p>
                 </div>
              ) : (
                spatialLogs.map((log, i) => (
                  <div key={i} className="p-3 rounded-xl border bg-blue-500/5 border-blue-500/20">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono font-bold text-blue-400">{log.email}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500 text-white">INTERCEPTED</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={12} className="text-rose-500" />
                      <span className="text-sm font-extrabold text-[var(--text-primary)]">{parseFloat(log.calculated_speed_kmh).toLocaleString()} KM/H</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-secondary)] font-mono">
                       <span className="opacity-50">FROM:</span> {log.prev_loc.replace('POINT(', '').replace(')', '')}
                       <span className="mx-1">→</span>
                       <span className="opacity-50">TO:</span> {log.current_loc.replace('POINT(', '').replace(')', '')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={10}
            variants={fadeUp}
            className="rounded-3xl border p-6 flex flex-col glass"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3
                className="font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Server size={18} style={{ color: "var(--brand-primary)" }} />{" "}
                Database Trigger Log
              </h3>
              <div
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--brand-primary)" }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isSystemLocked ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`}
                ></span>{" "}
                {isSystemLocked ? "HALTED" : "Streaming"}
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto pr-2 space-y-2.5 font-mono text-[11px] bg-[#020617] p-4 rounded-2xl border"
              style={{
                maxHeight: "280px",
                borderColor: "var(--border-default)",
              }}
            >
              {logs.length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>
                  Awaiting trigger execution...
                </p>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className="flex gap-4 items-start pb-2.5 border-b border-slate-800 last:border-0"
                  >
                    <span className="text-slate-500 min-w-[120px]">
                      {log.timestamp
                        ? new Date(log.timestamp)
                            .toISOString()
                            .replace("T", " ")
                            .substring(5, 19)
                        : "Unknown Time"}
                    </span>
                    <span
                      className="font-bold min-w-[110px]"
                      style={{
                        color:
                          log.action === "BALANCE_UPDATE"
                            ? "var(--brand-primary)"
                            : "#e11d48",
                      }}
                    >
                      [{log.action}]
                    </span>
                    <span className="text-slate-300 flex-1 leading-relaxed">
                      Entity{" "}
                      <span className="text-blue-400">
                        {(log.entity_id || "SYS").substring(0, 8)}
                      </span>
                      : <span className="text-rose-400">{log.old_value}</span>{" "}
                      <ArrowRight size={10} className="inline mx-1" />{" "}
                      <span className="text-emerald-400">{log.new_value}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* ROW 6: Advanced DBMS Feature Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Audit Chain Verification */}
          <motion.div
            initial="hidden" animate="visible" custom={11} variants={fadeUp}
            className="rounded-3xl border p-6 glass"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center gap-2 mb-4 font-bold" style={{ color: "var(--text-primary)" }}>
              <Hash size={18} style={{ color: "var(--brand-primary)" }} /> SHA2 Chain Integrity
            </div>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Verify the tamper-evident hash chain. Each audit log row hashes its content + the previous hash.
            </p>
            <button
              onClick={verifyAuditChain}
              disabled={chainLoading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 mb-4"
              style={{ background: "var(--brand-primary)" }}
            >
              {chainLoading ? <Activity size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {chainLoading ? 'Verifying...' : 'Run Verification'}
            </button>
            {auditChainResult && (
              <div className="space-y-3">
                <div className={`p-4 rounded-xl border text-center ${
                  auditChainResult.summary.chain_status === 'INTACT' ? 'bg-emerald-500/10 border-emerald-500/30' :
                  auditChainResult.summary.chain_status === 'COMPROMISED' ? 'bg-rose-500/10 border-rose-500/30' :
                  'bg-slate-500/10 border-slate-500/30'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {auditChainResult.summary.chain_status === 'INTACT' ? 
                      <CheckCircle2 size={24} className="text-emerald-500" /> :
                      auditChainResult.summary.chain_status === 'COMPROMISED' ?
                      <XCircle size={24} className="text-rose-500" /> :
                      <AlertCircle size={24} className="text-slate-400" />
                    }
                  </div>
                  <p className={`text-lg font-extrabold uppercase tracking-wider ${
                    auditChainResult.summary.chain_status === 'INTACT' ? 'text-emerald-500' :
                    auditChainResult.summary.chain_status === 'COMPROMISED' ? 'text-rose-500' :
                    'text-slate-400'
                  }`}>{auditChainResult.summary.chain_status}</p>
                  <p className="text-[10px] mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {auditChainResult.summary.valid} valid / {auditChainResult.summary.total_checked} checked
                  </p>
                </div>
                <div className="max-h-[120px] overflow-y-auto space-y-1 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {auditChainResult.entries.slice(0, 8).map((e, i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-1 rounded" style={{ background: 'var(--bg-base)' }}>
                      <span>#{e.id} {e.action}</span>
                      <span className={e.integrity === 'VALID' ? 'text-emerald-500' : e.integrity === 'TAMPERED' ? 'text-rose-500' : 'text-slate-400'}>
                        {e.integrity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* PHASE 4: LOAN CLEARANCE QUEUE */}
          <motion.div
            initial="hidden" animate="visible" custom={11} variants={fadeUp}
            className="lg:col-span-2 rounded-3xl border p-6 glass overflow-hidden relative"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <BadgeDollarSign size={18} style={{ color: "var(--brand-primary)" }} /> Pending Loan Clearances
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {pendingLoans.length} Awaiting Review
                </span>
                <button 
                  onClick={fetchPendingLoans}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-base)] transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Activity size={14} className={loanLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    <th className="pb-3 px-2 font-bold">Applicant</th>
                    <th className="pb-3 px-2 font-bold">Capital</th>
                    <th className="pb-3 px-2 font-bold">Heuristic Decision</th>
                    <th className="pb-3 px-2 font-bold text-right">Clearance</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {pendingLoans.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-xs italic" style={{ color: "var(--text-secondary)" }}>
                         No pending capital requests in the queue.
                      </td>
                    </tr>
                  ) : (
                    pendingLoans.map((loan) => (
                      <tr key={loan.id} className="border-t transition-colors hover:bg-[var(--bg-base)]" style={{ borderColor: 'var(--border-default)' }}>
                        <td className="py-4 px-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-[var(--text-primary)]">{loan.email}</span>
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]">{loan.id.substring(0,8)}...</span>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span className="text-emerald-500 font-extrabold font-mono">${parseFloat(loan.amount).toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="max-w-[200px] text-[10px] leading-tight opacity-80" style={{ color: 'var(--text-secondary)' }}>
                            {loan.reason}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => processLoan(loan.id, 'reject')}
                              disabled={loanLoading}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-1"
                            >
                              <XCircle size={12} /> Veto
                            </button>
                            <button 
                              onClick={() => processLoan(loan.id, 'approve')}
                              disabled={loanLoading}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-md hover:opacity-90 transition-all flex items-center gap-1"
                              style={{ background: 'var(--brand-primary)' }}
                            >
                              <CheckCircle2 size={12} /> Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* EXPLAIN ANALYZE Panel */}
          <motion.div
            initial="hidden" animate="visible" custom={12} variants={fadeUp}
            className="lg:col-span-3 rounded-3xl border p-6 glass"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Eye size={18} style={{ color: "var(--brand-primary)" }} /> Query Execution Plan
              </h3>
              <button
                onClick={fetchExplainPlan}
                disabled={explainLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--brand-primary)" }}
              >
                {explainLoading ? <Activity size={12} className="animate-spin" /> : <Layers size={12} />}
                {explainLoading ? 'Analyzing...' : 'Run EXPLAIN'}
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              Shows the MySQL execution plan for the fraud velocity query — verifying index usage.
            </p>
            {explainData ? (
              <div className="space-y-4">
                {/* EXPLAIN output */}
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
                  <div className="bg-[#0a0f1a] p-4 font-mono text-[11px] min-w-[600px]">
                    <div className="flex gap-4 pb-2 mb-2 border-b border-slate-700 text-slate-400 font-bold">
                      <span className="w-8">ID</span>
                      <span className="w-16">Type</span>
                      <span className="w-24">Table</span>
                      <span className="w-32">Key</span>
                      <span className="w-12">Rows</span>
                      <span className="flex-1">Extra</span>
                    </div>
                    {explainData.explain_plan.map((row, i) => (
                      <div key={i} className="flex gap-4 py-1 text-slate-300">
                        <span className="w-8 text-blue-400">{row.id}</span>
                        <span className="w-16 text-purple-400">{row.select_type}</span>
                        <span className="w-24 text-emerald-400">{row.table}</span>
                        <span className="w-32 text-amber-400">{row.key || 'NULL'}</span>
                        <span className="w-12 text-rose-400">{row.rows}</span>
                        <span className="flex-1 text-slate-400">{row.Extra || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Indexes */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Active Indexes on Transactions Table</p>
                  <div className="flex flex-wrap gap-2">
                    {explainData.indexes.map((idx, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: 'var(--brand-primary)' }}>
                        {idx.key_name}.{idx.column_name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                Click "Run EXPLAIN" to analyze the fraud velocity query execution plan.
              </div>
            )}
          </motion.div>
        </div>

        {/* Materialized Fraud Summary */}
        {fraudSummary.length > 0 && (
          <motion.div
            initial="hidden" animate="visible" custom={13} variants={fadeUp}
            className="mt-8 rounded-3xl border p-6 glass"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Layers size={18} style={{ color: "var(--brand-primary)" }} /> Materialized Fraud Summary
              </h3>
              <span className="text-[10px] uppercase font-bold border px-2 py-1 rounded-md" style={{ borderColor: 'var(--border-default)', color: 'var(--brand-primary)', background: 'rgba(5,150,105,0.1)' }}>
                Auto-refreshed every 60s
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <th className="text-left py-2 px-3 text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Account</th>
                    <th className="text-right py-2 px-3 text-[10px] font-bold uppercase" style={{ color: '#e11d48' }}>Tx Count</th>
                    <th className="text-right py-2 px-3 text-[10px] font-bold uppercase" style={{ color: '#e11d48' }}>Volume</th>
                    <th className="text-right py-2 px-3 text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Refreshed</th>
                  </tr>
                </thead>
                <tbody>
                  {fraudSummary.map((row, i) => (
                    <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--border-default)' }}>
                      <td className="py-2 px-3 font-mono text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{row.account_no || row.sender_id?.substring(0,12)}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs font-bold text-rose-500">{row.tx_count}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs font-bold text-rose-500">${parseFloat(row.total_volume).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-[10px]" style={{ color: 'var(--text-secondary)' }}>{row.refreshed_at ? new Date(row.refreshed_at).toLocaleTimeString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ROW 7: Phase 2 Advanced DBMS Additions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            
            {/* CTE Laundering Rings */}
            <motion.div initial="hidden" animate="visible" custom={14} variants={fadeUp} className="rounded-3xl border p-6 glass" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2 mb-4 font-bold" style={{ color: "var(--text-primary)" }}>
                <Network size={18} style={{ color: "var(--brand-primary)" }} /> Recursive CTE (Laundering)
              </div>
              <p className="text-xs mb-4 text-[var(--text-secondary)] leading-relaxed">
                  Traces infinite depths using <span className="font-mono text-[var(--brand-primary)]">WITH RECURSIVE</span> to find closed transfer loops (Money Laundering rings).
              </p>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                 {launderingRings.length === 0 ? <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">No Suspicious Chains Detected</p> : launderingRings.map((ring, i) => {
                    const pathStr = ring.path || 'SYSTEM_NODE';
                    const nodes = pathStr.split('->');
                    return (
                      <div key={i} className="p-4 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-2xl hover:border-[var(--brand-primary)] hover:shadow-[0_0_15px_rgba(5,150,105,0.1)] transition-all duration-300">
                        <div className="flex justify-between items-center mb-4">
                          <span className="inline-flex items-center gap-1.5 text-rose-500 font-bold uppercase tracking-wider text-[10px] bg-rose-500/10 px-2 py-0.5 rounded">
                            <Network size={12} /> Suspicious Chain (Depth: {ring.depth})
                          </span>
                          <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>Tx: #{ring.tx_id} • ${parseFloat(ring.amount).toLocaleString()}</span>
                        </div>
                        
                        {/* Visual Graph Flow */}
                        <div className="flex flex-wrap items-center gap-y-3">
                          {nodes.map((nodeId, nIdx) => (
                            <div key={nIdx} className="flex items-center">
                              {/* Node */}
                              <div className={`relative w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border-2 transition-transform duration-300 hover:scale-110 ${nIdx === 0 ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 z-10' : nIdx === nodes.length - 1 ? 'bg-amber-500/10 border-amber-500 text-amber-400 z-10' : 'bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] z-10'}`}>
                                {nodeId.substring(0, 3)}
                                {/* Tooltip-like label */}
                                <div className="absolute -bottom-4 text-[8px] uppercase tracking-wider font-sans opacity-70 whitespace-nowrap">
                                  {nIdx === 0 ? 'Origin' : nIdx === nodes.length - 1 ? 'Terminal' : 'Interim'}
                                </div>
                              </div>
                              
                              {/* Connecting Arrow */}
                              {nIdx < nodes.length - 1 && (
                                <div className="flex items-center px-1">
                                  <div className="w-4 h-[2px] bg-[var(--border-default)]"></div>
                                  <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-[var(--border-default)]"></div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                 })}
              </div>
            </motion.div>

            {/* Temporal Time Machine */}
            <motion.div initial="hidden" animate="visible" custom={15} variants={fadeUp} className="rounded-3xl border p-6 glass" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2 mb-4 font-bold" style={{ color: "var(--text-primary)" }}>
                <History size={18} style={{ color: "var(--brand-primary)" }} /> Temporal Point-In-Time 
              </div>
              <p className="text-xs mb-4 text-[var(--text-secondary)] leading-relaxed">
                  Queries JSON diffs backwards in <span className="font-mono text-[var(--brand-primary)]">audit_logs</span> to reverse-engineer exact historical balance state.
              </p>
              <form onSubmit={handleTimeMachine} className="space-y-3 mb-4">
                  <input required value={timeMachineForm.account_no} onChange={e => setTimeMachineForm({...timeMachineForm, account_no: e.target.value})} type="text" placeholder="Account No" className="w-full p-3 text-xs font-mono rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] outline-[var(--brand-primary)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]" />
                  
                  {/* Custom Date Picker to replace native browser popups */}
                  <DatePicker
                    required
                    selected={timeMachineForm.target_time ? new Date(timeMachineForm.target_time) : null}
                    onChange={(date) => setTimeMachineForm({...timeMachineForm, target_time: date ? date.toISOString() : ""})}
                    showTimeSelect
                    timeFormat="h:mm aa"
                    timeIntervals={15}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    placeholderText="Select exact historical time..."
                    className="w-full p-3 text-xs font-mono rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] outline-none text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] transition-all hover:border-[var(--brand-primary)]"
                    wrapperClassName="w-full custom-datepicker-wrapper"
                  />

                  <button type="submit" disabled={tmLoading} className="w-full py-3 mt-2 bg-[var(--brand-primary)] hover:opacity-90 transition-opacity text-white text-xs font-bold rounded-xl shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] flex justify-center items-center gap-2">
                    {tmLoading ? <Activity size={14} className="animate-spin" /> : <History size={14} />} {tmLoading ? "Reversing Time Diffs..." : "Reconstruct Balance"}
                  </button>
              </form>
              {timeMachineResult && (
                  <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="p-4 border border-[var(--brand-primary)] bg-emerald-500/10 rounded-xl">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--brand-primary)] font-bold mb-1">State @ {new Date(timeMachineResult.at_time).toLocaleString()}</p>
                      <p className="text-3xl font-mono font-black mt-2 text-[var(--text-primary)] shimmer-text">${parseFloat(timeMachineResult.reconstructed_balance).toFixed(2)}</p>
                  </motion.div>
              )}
            </motion.div>

            {/* System Monitor */}
            <motion.div initial="hidden" animate="visible" custom={16} variants={fadeUp} className="rounded-3xl border p-6 glass" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center justify-between mb-4 font-bold" style={{ color: "var(--text-primary)" }}>
                <div className="flex gap-2 items-center"><TerminalSquare size={18} style={{ color: "var(--brand-primary)" }} /> Connection Monitor</div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-[var(--brand-primary)] uppercase tracking-wider border border-[var(--brand-primary)]">SYS.PROCESSLIST</div>
              </div>
              <p className="text-xs mb-4 text-[var(--text-secondary)] leading-relaxed">
                  Live diagnostic of active queries and processes running directly on MySQL Server threadpool.
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                 {threads.map((t, i) => (
                    <div key={i} className="p-3 bg-[#020617] border border-slate-800 rounded-xl text-[10px] font-mono text-slate-300">
                       <div className="flex justify-between w-full border-b border-slate-800 pb-2 mb-2">
                           <span className="text-blue-400 font-bold">PID: {t.ID} | {t.USER}</span> 
                           <span className={t.TIME > 5 ? "text-rose-500 font-bold" : "text-emerald-500"}>{t.TIME} sec</span>
                       </div>
                       <span className="text-amber-400 opacity-90">{t.COMMAND}: {t.INFO ? t.INFO.substring(0, 100) + (t.INFO.length>100?"...":"") : "NULL"}</span>
                       <br/>
                       {t.STATE && <span className="text-slate-500 mt-2 block ">[{t.STATE}]</span>}
                    </div>
                 ))}
              </div>
            </motion.div>

            {/* USER MANAGEMENT PANEL */}
            <motion.div initial="hidden" animate="visible" custom={17} variants={fadeUp} className="lg:col-span-3 rounded-3xl border p-6 glass" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Users size={18} style={{ color: "var(--brand-primary)" }} /> User Management Panel
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md border" style={{ borderColor: 'var(--border-default)', color: 'var(--brand-primary)', background: 'rgba(5,150,105,0.1)' }}>
                  {allUsers.length} Entities
                </span>
              </div>

              {/* Delete Confirmation */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 p-4 rounded-xl border-2 border-rose-500/50 bg-rose-500/10">
                    <p className="text-sm font-bold text-rose-400 mb-3">
                      Delete user <span className="font-mono">{showDeleteConfirm.email}</span> and all their data? This action is irreversible.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Cancel</button>
                      <button onClick={async () => {
                        try {
                          await api.delete(`/admin/user/${showDeleteConfirm.id}`);
                          toast.success(`User ${showDeleteConfirm.email} deleted`);
                          setShowDeleteConfirm(null);
                          fetchData();
                        } catch (err) {
                          toast.error(err.response?.data?.error || 'Delete failed');
                        }
                      }} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 flex items-center gap-1"><Trash2 size={12} /> Confirm Delete</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                      <th className="text-left py-3 px-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</th>
                      <th className="text-left py-3 px-2 font-bold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Account</th>
                      <th className="text-right py-3 px-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Balance</th>
                      <th className="text-center py-3 px-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</th>
                      <th className="text-center py-3 px-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u, i) => (
                      <tr key={i} className="border-b hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" style={{ borderColor: 'var(--border-default)' }} onClick={() => navigate(`/admin/user/${u.id}`)}>
                        <td className="py-3 px-2">
                          <p className="font-bold truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>{u.email}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{u.role} • ID:{u.id}</p>
                        </td>
                        <td className="py-3 px-2 font-mono hidden sm:table-cell" style={{ color: 'var(--text-primary)' }}>{u.account_no || 'N/A'}</td>
                        <td className="py-3 px-2 text-right font-mono font-bold" style={{ color: 'var(--brand-primary)' }}>${u.balance ? parseFloat(u.balance).toFixed(2) : '0.00'}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : u.status === 'FROZEN' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                            {u.status || 'NONE'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => navigate(`/admin/user/${u.id}`)} className="p-1.5 rounded-lg border hover:opacity-70 transition-all" style={{ borderColor: 'var(--border-default)', color: 'var(--brand-primary)' }} title="View Details">
                              <Eye size={12} />
                            </button>
                            {u.account_id && (
                              <button onClick={() => confirmFreeze(u.account_id, u.account_no, u.status)} className="p-1.5 rounded-lg border hover:opacity-70 transition-all" style={{ borderColor: 'var(--border-default)', color: u.status === 'ACTIVE' ? '#e11d48' : '#10b981' }} title={u.status === 'ACTIVE' ? 'Freeze' : 'Unfreeze'}>
                                {u.status === 'ACTIVE' ? <Lock size={12} /> : <Unlock size={12} />}
                              </button>
                            )}
                            {u.role !== 'ADMIN' && (
                              <button onClick={() => setShowDeleteConfirm(u)} className="p-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 transition-all text-rose-500" title="Delete User">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

        </div>

        {/* ROW 8: Window Functions Analytics + Database Backup */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

          {/* Window Functions Leaderboard */}
          <motion.div initial="hidden" animate="visible" custom={18} variants={fadeUp} className="lg:col-span-2 rounded-3xl border p-6 glass" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Trophy size={18} style={{ color: '#f59e0b' }} /> Window Functions Leaderboard
              </h3>
              <button
                onClick={async () => {
                  setWindowLoading(true);
                  try {
                    const res = await api.get('/admin/window-analytics');
                    setWindowData(res.data);
                  } catch (e) {
                    toast.error('Failed to load window analytics');
                  } finally {
                    setWindowLoading(false);
                  }
                }}
                disabled={windowLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: '#f59e0b' }}
              >
                {windowLoading ? <Activity size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                {windowLoading ? 'Computing...' : 'Run Analytics'}
              </button>
            </div>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Uses <span className="font-mono text-[var(--brand-primary)]">RANK()</span>, <span className="font-mono text-[var(--brand-primary)]">DENSE_RANK()</span>, <span className="font-mono text-[var(--brand-primary)]">NTILE(4)</span>, <span className="font-mono text-[var(--brand-primary)]">LAG()</span>, <span className="font-mono text-[var(--brand-primary)]">LEAD()</span>, <span className="font-mono text-[var(--brand-primary)]">ROW_NUMBER()</span>, and <span className="font-mono text-[var(--brand-primary)]">SUM() OVER</span> window functions.
            </p>

            {windowData ? (
              <div className="space-y-6">
                {/* Leaderboard Table */}
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)' }}>
                        <th className="py-2.5 px-3 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>RANK()</th>
                        <th className="py-2.5 px-3 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Entity</th>
                        <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Balance</th>
                        <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>NTILE(4)</th>
                        <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {windowData.leaderboard.map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-[var(--bg-hover)] transition-colors" style={{ borderColor: 'var(--border-default)' }}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {row.wealth_rank <= 3 ? (
                                <Crown size={14} style={{ color: row.wealth_rank === 1 ? '#f59e0b' : row.wealth_rank === 2 ? '#94a3b8' : '#cd7c32' }} />
                              ) : (
                                <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>#{row.wealth_rank}</span>
                              )}
                              <span className="font-mono font-bold" style={{ color: row.wealth_rank <= 3 ? '#f59e0b' : 'var(--text-primary)' }}>#{row.wealth_rank}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>{row.email}</p>
                            <p className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{row.account_no}</p>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold shimmer-text">${parseFloat(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              row.quartile === 1 ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                              row.quartile === 2 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                              row.quartile === 3 ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                              'bg-slate-500/10 text-slate-400 border-slate-500/30'
                            }`}>Q{row.quartile}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs" style={{ color: 'var(--brand-primary)' }}>{row.pct_of_total}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quartile Summary */}
                {windowData.quartile_summary?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>NTILE(4) Quartile Distribution</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {windowData.quartile_summary.map((q, i) => (
                        <div key={i} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              q.quartile === 1 ? 'bg-amber-500/10 text-amber-500' :
                              q.quartile === 2 ? 'bg-emerald-500/10 text-emerald-500' :
                              q.quartile === 3 ? 'bg-blue-500/10 text-blue-400' :
                              'bg-slate-500/10 text-slate-400'
                            }`}>Q{q.quartile} {q.quartile === 1 ? '(Top)' : q.quartile === 4 ? '(Bottom)' : ''}</span>
                          </div>
                          <p className="text-lg font-extrabold font-mono" style={{ color: 'var(--text-primary)' }}>{q.account_count}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Avg: ${parseFloat(q.avg_balance).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Window Functions Used Badge */}
                <div className="flex flex-wrap gap-2">
                  {windowData.window_functions_used.map((fn, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: '#f59e0b' }}>
                      {fn}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text-secondary)' }}>
                <Trophy size={40} className="opacity-20" />
                <p className="text-xs font-bold uppercase tracking-wider">Click "Run Analytics" to execute window functions</p>
              </div>
            )}
          </motion.div>

          {/* Database Backup Panel */}
          <motion.div initial="hidden" animate="visible" custom={19} variants={fadeUp} className="rounded-3xl border p-6 glass" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-2 mb-4 font-bold" style={{ color: 'var(--text-primary)' }}>
              <HardDrive size={18} style={{ color: 'var(--brand-primary)' }} /> Database Backup
            </div>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Export a complete SQL dump including all tables, views, triggers, stored procedures, and events.
            </p>

            {/* Backup Info Stats */}
            {backupInfo && (
              <div className="space-y-3 mb-5">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Tables', value: backupInfo.summary.table_count, icon: <Database size={12} /> },
                    { label: 'Views', value: backupInfo.summary.view_count, icon: <Eye size={12} /> },
                    { label: 'Triggers', value: backupInfo.summary.trigger_count, icon: <Activity size={12} /> },
                    { label: 'Procedures', value: backupInfo.summary.procedure_count, icon: <Server size={12} /> },
                    { label: 'Events', value: backupInfo.summary.event_count, icon: <History size={12} /> },
                    { label: 'Functions', value: backupInfo.summary.function_count, icon: <Layers size={12} /> },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)' }}>
                      <span style={{ color: 'var(--brand-primary)' }}>{item.icon}</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                        <p className="text-sm font-extrabold font-mono" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)' }}>
                  <div className="flex justify-between text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                    <span>Total Rows</span>
                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{backupInfo.summary.total_rows?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>
                    <span>Database Size</span>
                    <span className="font-mono" style={{ color: 'var(--brand-primary)' }}>{backupInfo.summary.total_size_mb} MB</span>
                  </div>
                </div>

                {/* Table List */}
                <div className="max-h-[120px] overflow-y-auto space-y-1">
                  {backupInfo.tables.map((t, i) => (
                    <div key={i} className="flex justify-between items-center px-2 py-1 rounded text-[10px] font-mono" style={{ background: 'var(--bg-base)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{t.rows} rows</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={async () => {
                setBackupLoading(true);
                try {
                  const res = await api.get('/admin/backup', { responseType: 'blob' });
                  const blob = new Blob([res.data], { type: 'application/sql' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `fortress_ledger_backup_${new Date().toISOString().slice(0,10)}.sql`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  toast.success('Database backup downloaded successfully');
                } catch (e) {
                  toast.error('Backup generation failed');
                } finally {
                  setBackupLoading(false);
                }
              }}
              disabled={backupLoading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}
            >
              {backupLoading ? <Activity size={14} className="animate-spin" /> : <Download size={14} />}
              {backupLoading ? 'Generating Backup...' : 'Export SQL Dump'}
            </button>
          </motion.div>

        </div>

        {/* ROW 8.5: NEURAL LOCK MATRIX VISUALIZER */}
        <div className="grid grid-cols-1 mt-8">
           <LockMatrix />
        </div>

        {/* ROW 9: ENGINE SANDBOX - MVCC ACADEMIC DEMONSTRATION */}
        <div className="grid grid-cols-1 mt-8">
          <motion.div initial="hidden" animate="visible" custom={18} variants={fadeUp} className="rounded-3xl border p-6 sm:p-8 glass shadow-2xl relative overflow-hidden" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}>
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-[0.03] pointer-events-none transform translate-x-1/3 -translate-y-1/3">
                 <HardDrive size={500} style={{ color: 'var(--brand-primary)' }} />
             </div>

             <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 pb-6 border-b z-10 relative" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex-1 pr-4">
                  <h3 className="text-2xl font-extrabold flex items-center gap-3 mb-2" style={{ color: "var(--text-primary)" }}>
                    <Database size={24} style={{ color: "var(--brand-primary)" }} /> Engine Sandbox: MVCC
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] xl:w-5/6 leading-relaxed">
                    Test the **InnoDB Multi-Version Concurrency Control**. This tool explicitly opens two parallel database connections to race against each other. Connection A acts as a hacker temporarily altering data, while Connection B acts relative to the active Isolation Level.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-3 shrink-0">
                  
                  {/* CUSTOM STYLED DROPDOWN */}
                  <div className="relative">
                    <button 
                      onClick={() => setMvccDropdownOpen(!mvccDropdownOpen)}
                      className="flex items-center justify-between w-[280px] py-2.5 px-4 rounded-xl border bg-[var(--bg-base)] transition-all hover:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] outline-none shadow-sm"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        {mvccIsolationLevel === 'READ UNCOMMITTED' && <ShieldAlert size={14} className="text-rose-500" />}
                        {mvccIsolationLevel === 'READ COMMITTED' && <Shield size={14} className="text-amber-500" />}
                        {mvccIsolationLevel === 'REPEATABLE READ' && <ShieldCheck size={14} className="text-emerald-500" />}
                        {mvccIsolationLevel === 'SERIALIZABLE' && <Lock size={14} className="text-indigo-500" />}
                        <span className="font-bold text-[11px] uppercase tracking-wider">{
                          mvccIsolationLevel === 'READ UNCOMMITTED' ? 'READ UNCOMMITTED (Dirty Reads)' :
                          mvccIsolationLevel === 'REPEATABLE READ' ? 'REPEATABLE READ (Default)' :
                          mvccIsolationLevel
                        }</span>
                      </div>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${mvccDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
                    </button>

                    {mvccDropdownOpen && (
                      <>
                        {/* Invisible backdrop to close dropdown when clicking outside */}
                        <div className="fixed inset-0 z-40" onClick={() => setMvccDropdownOpen(false)}></div>
                        
                        <div className="absolute top-full right-0 w-[280px] mt-2 p-1.5 rounded-2xl border shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                          {[
                            { val: 'READ UNCOMMITTED', text: 'READ UNCOMMITTED (Dirty Reads)', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                            { val: 'READ COMMITTED', text: 'READ COMMITTED', icon: Shield, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                            { val: 'REPEATABLE READ', text: 'REPEATABLE READ (Default)', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                            { val: 'SERIALIZABLE', text: 'SERIALIZABLE', icon: Lock, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                          ].map(opt => (
                            <button
                              key={opt.val}
                              onClick={() => { setMvccIsolationLevel(opt.val); setMvccDropdownOpen(false); }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--bg-hover)] text-left"
                            >
                              <div className={`p-1.5 rounded-full ${opt.bg}`}>
                                <opt.icon size={14} className={opt.color} />
                              </div>
                              <span className="font-bold text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>{opt.text}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button 
                    onClick={handleRunMvcc} 
                    disabled={mvccLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-[0_0_15px_rgba(5,150,105,0.3)] transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2 tracking-wide"
                    style={{ background: 'var(--brand-primary)' }}
                  >
                    {mvccLoading ? <Activity size={14} className="animate-spin" /> : <TerminalSquare size={14} />} 
                    EXECUTE TEST
                  </button>
                </div>
             </div>

             {/* Output Console Base */}
             <div className="rounded-2xl border bg-[#0A0A0A] p-4 min-h-[300px] overflow-hidden relative font-mono text-[11px]" style={{ borderColor: 'var(--border-default)' }}>
                {!mvccLogs && !mvccLoading && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-500">
                    <TerminalSquare size={32} className="mb-3 opacity-20" />
                    <p>Awaiting Execution Command...</p>
                  </div>
                )}
                
                {mvccLoading && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col text-[var(--brand-primary)]">
                    <Activity size={32} className="mb-3 animate-spin" />
                    <p className="animate-pulse">Opening connections and forging race condition...</p>
                  </div>
                )}

                {/* Display Logs */}
                {mvccLogs && !mvccLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-800">
                    {/* Writer Split */}
                    <div className="bg-[#0A0A0A] p-4 flex flex-col space-y-3">
                      <div className="text-slate-500 font-bold tracking-wider uppercase mb-2 border-b border-slate-800 pb-2">Conn A (Writer)</div>
                      {mvccLogs.filter(L => L.owner === 'WRITER' || L.owner === 'SYSTEM').map((log, i) => (
                        <div key={i} className={`flex gap-3 leading-loose ${log.owner === 'SYSTEM' ? 'text-slate-500/50' : 'text-slate-300'}`}>
                          <span className="text-slate-600 shrink-0">[{log.time}]</span>
                          <span className={log.isError ? 'text-rose-400' : ''}>{log.message}</span>
                        </div>
                      ))}
                    </div>
                    {/* Reader Split */}
                    <div className="bg-[#0A0A0A] p-4 flex flex-col space-y-3">
                      <div className="text-slate-500 font-bold tracking-wider uppercase mb-2 border-b border-slate-800 pb-2">Conn B (Reader)</div>
                      {mvccLogs.filter(L => L.owner === 'READER' || L.owner === 'SYSTEM').map((log, i) => (
                        <div key={i} className={`flex gap-3 leading-loose ${log.owner === 'SYSTEM' ? 'text-slate-500/50' : log.highlight === 'rose' ? 'text-rose-400 font-bold' : log.highlight === 'emerald' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                          <span className="text-slate-600 shrink-0">[{log.time}]</span>
                          <span className={log.isError ? 'text-rose-400' : ''}>
                            {log.message}
                            {log.highlight === 'rose' && <span className="block mt-1 text-[10px] text-rose-500 opacity-80">This highlights exactly why banks DO NOT use READ UNCOMMITTED! Conn B read uncommitted data instantly exposing a false balance.</span>}
                            {log.highlight === 'emerald' && <span className="block mt-1 text-[10px] text-emerald-500 opacity-80">MVCC snapshot correctly withheld the uncommitted data. Clean read!</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
