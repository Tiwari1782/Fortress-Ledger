import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import toast from "react-hot-toast";
import Navbar from "../components/ui/Navbar";
import {
  ArrowLeft,
  Users,
  Shield,
  Mail,
  Hash,
  Calendar,
  Wallet,
  Lock,
  Unlock,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Fingerprint,
  Server,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export default function AdminUserDetail() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");

  // Password Reset
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Freeze / Delete modals
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") navigate("/dashboard");
    else fetchUserDetail();
  }, [user, navigate, id]);

  const fetchUserDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/user/${id}`);
      setUserData(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) logout();
      setError(err.response?.data?.error || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetLoading(true);
    try {
      const res = await api.patch(`/admin/user/${id}/reset-password`, {
        new_password: newPassword,
      });
      toast.success(res.data.message);
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Password reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  const handleFreeze = async () => {
    try {
      await api.patch(`/admin/freeze/${userData.account?.id}`);
      toast.success(
        `Account ${userData.account.status === "ACTIVE" ? "frozen" : "unfrozen"} successfully`
      );
      setShowFreezeModal(false);
      fetchUserDetail();
    } catch (err) {
      toast.error("Failed to update account status");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/user/${id}`);
      toast.success(`User ${userData.user.email} deleted`);
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center mt-[72px]">
          <div className="flex flex-col items-center gap-4">
            <Activity
              size={32}
              className="animate-spin"
              style={{ color: "var(--brand-primary)" }}
            />
            <p
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Loading Entity Data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="w-full min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center mt-[72px]">
          <div className="text-center">
            <AlertTriangle
              size={48}
              className="mx-auto mb-4"
              style={{ color: "#e11d48" }}
            />
            <p className="text-lg font-bold" style={{ color: "#e11d48" }}>
              {error || "Entity not found"}
            </p>
            <button
              onClick={() => navigate("/admin")}
              className="mt-6 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "var(--brand-primary)" }}
            >
              Return to Command
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { user: u, account, stats, recent_transactions, last_active, audit_entries } = userData;

  return (
    <div className="w-full bg-transparent min-h-screen flex flex-col relative">
      <Navbar />

      {/* FREEZE MODAL */}
      <AnimatePresence>
        {showFreezeModal && account && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md p-8 rounded-3xl border shadow-2xl glass"
              style={{ borderColor: "var(--border-default)", background: "var(--bg-card)" }}
            >
              <div
                className="flex items-center gap-3 mb-4"
                style={{ color: account.status === "ACTIVE" ? "#e11d48" : "#10b981" }}
              >
                {account.status === "ACTIVE" ? <Lock size={24} /> : <Unlock size={24} />}
                <h3 className="text-xl font-extrabold">
                  {account.status === "ACTIVE" ? "Freeze Account" : "Unfreeze Account"}
                </h3>
              </div>
              <p className="text-sm font-medium mb-6 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                You are about to{" "}
                <strong
                  className="font-bold tracking-wide uppercase"
                  style={{ color: account.status === "ACTIVE" ? "#e11d48" : "#10b981" }}
                >
                  {account.status === "ACTIVE" ? "FREEZE" : "UNFREEZE"}
                </strong>{" "}
                account{" "}
                <span className="font-mono" style={{ color: "var(--text-primary)" }}>
                  {account.account_no}
                </span>{" "}
                belonging to <span className="font-bold">{u.email}</span>.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFreezeModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border transition-all hover:bg-slate-800/50"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreeze}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 shadow-lg"
                  style={{ background: account.status === "ACTIVE" ? "#e11d48" : "#10b981" }}
                >
                  {account.status === "ACTIVE" ? (
                    <><Lock size={16} /> Freeze</>
                  ) : (
                    <><Unlock size={16} /> Unfreeze</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* DELETE MODAL */}
        {showDeleteModal && (
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
                  <Trash2 size={40} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-center text-rose-500 mb-2 uppercase tracking-widest">
                Permanent Deletion
              </h3>
              <p className="text-center text-rose-200/70 text-sm font-medium mb-8 px-4 leading-relaxed">
                You are about to permanently delete{" "}
                <span className="font-mono text-rose-300 font-bold">{u.email}</span> and all
                associated accounts, transactions, and audit records. This action{" "}
                <span className="text-rose-400 font-bold">cannot be reversed</span>.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDelete}
                  className="w-full py-4 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-2xl bg-rose-600"
                >
                  <Trash2 size={16} /> CONFIRM PERMANENT DELETION
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-3 rounded-xl text-sm font-bold border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 transition-all"
                >
                  ABORT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 mt-[72px]">
        {/* Back Button + Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-sm font-bold mb-6 px-4 py-2 rounded-xl border transition-all hover:bg-[var(--bg-hover)]"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            <ArrowLeft size={16} /> Back to Central Command
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-extrabold flex items-center gap-3"
                style={{ color: "var(--text-primary)" }}
              >
                <Fingerprint style={{ color: "var(--brand-primary)" }} /> Entity Dossier
              </h1>
              <p className="text-sm mt-2 font-medium" style={{ color: "var(--text-secondary)" }}>
                Complete intelligence profile for{" "}
                <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                  {u.email}
                </span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {account && (
                <button
                  onClick={() => setShowFreezeModal(true)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-white shadow-lg flex items-center gap-2 transition-all hover:scale-105 ${
                    account.status === "ACTIVE"
                      ? "bg-rose-600 hover:bg-rose-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {account.status === "ACTIVE" ? (
                    <><Lock size={14} /> Freeze</>
                  ) : (
                    <><Unlock size={14} /> Unfreeze</>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-white shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                style={{ background: "var(--brand-primary)" }}
              >
                <KeyRound size={14} /> Reset Password
              </button>
              {u.role !== "ADMIN" && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-white shadow-lg flex items-center gap-2 transition-all hover:scale-105 bg-rose-600 hover:bg-rose-500"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Password Reset Form (Collapsible) */}
        <AnimatePresence>
          {showPasswordForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div
                className="p-6 rounded-3xl border glass"
                style={{ borderColor: "var(--brand-primary)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <KeyRound size={20} style={{ color: "var(--brand-primary)" }} />
                  <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                    Reset Password for {u.email}
                  </h3>
                </div>
                <form onSubmit={handlePasswordReset} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label
                      className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        minLength={6}
                        className="w-full p-3 pr-10 rounded-xl border focus:ring-2 text-sm transition-all"
                        style={{
                          background: "var(--bg-base)",
                          borderColor: "var(--border-default)",
                          color: "var(--text-primary)",
                          outlineColor: "var(--brand-primary)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Confirm Password
                    </label>
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      minLength={6}
                      className="w-full p-3 rounded-xl border focus:ring-2 text-sm transition-all"
                      style={{
                        background: "var(--bg-base)",
                        borderColor:
                          confirmPassword && confirmPassword !== newPassword
                            ? "#e11d48"
                            : "var(--border-default)",
                        color: "var(--text-primary)",
                        outlineColor: "var(--brand-primary)",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="py-3 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: "var(--brand-primary)" }}
                  >
                    {resetLoading ? (
                      <><Activity size={14} className="animate-spin" /> Resetting...</>
                    ) : (
                      <><KeyRound size={14} /> Execute Reset</>
                    )}
                  </button>
                </form>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs font-bold text-rose-500 mt-2">Passwords do not match</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ROW 1: Identity Card + Account Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Identity Card */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="rounded-3xl border p-6 glass"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{
                  background:
                    u.role === "ADMIN"
                      ? "linear-gradient(135deg, #e11d48, #be123c)"
                      : "var(--brand-primary)",
                }}
              >
                {u.role === "ADMIN" ? <Shield size={28} /> : <Users size={28} />}
              </div>
              <div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    u.role === "ADMIN"
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  }`}
                >
                  {u.role}
                </span>
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Entity Classification
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Mail size={12} style={{ color: "var(--text-secondary)" }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Email
                  </span>
                </div>
                <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  {u.email}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Hash size={12} style={{ color: "var(--text-secondary)" }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    User ID
                  </span>
                </div>
                <p
                  className="text-xs font-mono font-bold break-all"
                  style={{ color: "var(--text-primary)" }}
                >
                  {u.id}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar size={12} style={{ color: "var(--text-secondary)" }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Member Since
                  </span>
                </div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {new Date(u.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {last_active && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={12} style={{ color: "var(--text-secondary)" }} />
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Last Active
                    </span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--brand-primary)" }}>
                    {new Date(last_active).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Account Overview */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="lg:col-span-2 rounded-3xl border p-6 glass"
            style={{ borderColor: "var(--border-default)" }}
          >
            {account ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="font-bold flex items-center gap-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Wallet size={18} style={{ color: "var(--brand-primary)" }} /> Account Overview
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      account.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                    }`}
                  >
                    {account.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div
                    className="p-4 rounded-2xl border"
                    style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Account No
                    </p>
                    <p
                      className="text-sm font-mono font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {account.account_no}
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-2xl border"
                    style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Balance
                    </p>
                    <p className="text-xl font-mono font-extrabold shimmer-text">
                      ${parseFloat(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-2xl border"
                    style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total Sent
                    </p>
                    <p className="text-sm font-mono font-bold" style={{ color: "#e11d48" }}>
                      {stats.sent_count} txs / ${parseFloat(stats.total_sent).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-2xl border"
                    style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total Received
                    </p>
                    <p className="text-sm font-mono font-bold" style={{ color: "#10b981" }}>
                      {stats.received_count} txs / ${parseFloat(stats.total_received).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Activity size={14} style={{ color: "var(--brand-primary)" }} />
                    <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--text-primary)" }}>
                        {stats.total_transactions}
                      </span>{" "}
                      Total Transactions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} style={{ color: "var(--brand-primary)" }} />
                    <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                      Opened{" "}
                      <span style={{ color: "var(--text-primary)" }}>
                        {new Date(account.created_at).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div
                className="h-full min-h-[200px] flex flex-col items-center justify-center gap-3"
                style={{ color: "var(--text-secondary)" }}
              >
                <Wallet size={40} className="opacity-30" />
                <p className="text-sm font-bold">No Bank Account</p>
                <p className="text-xs">This entity has no associated ledger account.</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ROW 2: Recent Transactions + Audit Log */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transaction History */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="lg:col-span-2 rounded-3xl border p-6 glass"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3
                className="font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Activity size={18} style={{ color: "var(--brand-primary)" }} /> Transaction
                Ledger
              </h3>
              <button
                onClick={fetchUserDetail}
                className="p-2 rounded-lg border transition-all hover:bg-[var(--bg-hover)]"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {recent_transactions.length === 0 ? (
              <div
                className="h-[200px] flex flex-col items-center justify-center gap-2"
                style={{ color: "var(--text-secondary)" }}
              >
                <Activity size={32} className="opacity-20" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  No Transaction History
                </p>
              </div>
            ) : (
              <div
                className="space-y-2 max-h-[400px] overflow-y-auto pr-2"
              >
                {recent_transactions.map((tx, i) => {
                  const isSender = tx.sender_account === account?.account_no;
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ borderColor: "var(--border-default)" }}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSender
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        {isSender ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-mono font-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {isSender
                              ? tx.receiver_account || "SYSTEM"
                              : tx.sender_account || "CENTRAL MINT"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              tx.type === "TRANSFER"
                                ? "bg-blue-500/10 text-blue-400"
                                : tx.type === "DEPOSIT"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </div>
                        <p
                          className="text-[10px] mt-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-mono font-bold ${
                          isSender ? "text-rose-500" : "text-emerald-500"
                        }`}
                      >
                        {isSender ? "-" : "+"}$
                        {parseFloat(tx.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Audit Trail */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={4}
            variants={fadeUp}
            className="rounded-3xl border p-6 glass"
            style={{ borderColor: "var(--border-default)" }}
          >
            <h3
              className="font-bold flex items-center gap-2 mb-6"
              style={{ color: "var(--text-primary)" }}
            >
              <Server size={18} style={{ color: "var(--brand-primary)" }} /> Audit Trail
            </h3>

            {audit_entries.length === 0 ? (
              <div
                className="h-[200px] flex flex-col items-center justify-center gap-2"
                style={{ color: "var(--text-secondary)" }}
              >
                <CheckCircle2 size={32} className="opacity-20" />
                <p className="text-xs font-bold uppercase tracking-wider">No Audit Records</p>
              </div>
            ) : (
              <div
                className="space-y-2 max-h-[400px] overflow-y-auto pr-2 font-mono text-[11px]"
                style={{
                  background: "#020617",
                  borderRadius: "16px",
                  border: "1px solid var(--border-default)",
                  padding: "12px",
                }}
              >
                {audit_entries.map((log, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1 pb-2.5 border-b border-slate-800 last:border-0"
                  >
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {log.timestamp
                          ? new Date(log.timestamp)
                              .toISOString()
                              .replace("T", " ")
                              .substring(5, 19)
                          : "N/A"}
                      </span>
                      <span
                        className="font-bold"
                        style={{
                          color:
                            log.action === "BALANCE_UPDATE"
                              ? "var(--brand-primary)"
                              : log.action === "PASSWORD_RESET"
                              ? "#f59e0b"
                              : "#e11d48",
                        }}
                      >
                        {log.action}
                      </span>
                    </div>
                    <div className="text-slate-300 leading-relaxed">
                      <span className="text-rose-400">{log.old_value}</span>{" "}
                      <ArrowRight size={8} className="inline mx-1 text-slate-500" />{" "}
                      <span className="text-emerald-400">{log.new_value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
