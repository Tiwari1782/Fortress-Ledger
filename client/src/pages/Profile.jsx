import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Navbar from '../components/ui/Navbar';
import { User, Vault, ArrowUpRight, ArrowDownLeft, Activity, Calendar, Shield, Hash, TrendingUp, Copy, CheckCircle2 } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }) };

export default function Profile() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user) navigate('/login');
        else fetchProfile();
    }, [user, navigate]);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/banking/profile');
            setProfile(res.data);
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) logout();
            else toast.error('Failed to load profile');
        }
    };

    const copyAccountNo = () => {
        navigator.clipboard.writeText(profile.account_no);
        setCopied(true);
        toast.success('Account number copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    if (!profile) return (
        <div className="min-h-screen pt-24 bg-transparent">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="space-y-6">
                    {[1,2,3].map(i => (
                        <div key={i} className="rounded-3xl p-8 border bg-[var(--bg-card)] border-[var(--border-default)] animate-pulse">
                            <div className="h-6 w-48 rounded bg-[var(--bg-hover)] mb-4"></div>
                            <div className="h-4 w-64 rounded bg-[var(--bg-hover)] mb-3"></div>
                            <div className="h-4 w-40 rounded bg-[var(--bg-hover)]"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const statCards = [
        { label: 'Total Transactions', value: profile.stats.total_transactions, icon: Activity, color: 'var(--brand-primary)' },
        { label: 'Volume Sent', value: `$${parseFloat(profile.stats.total_sent).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: ArrowUpRight, color: '#e11d48' },
        { label: 'Volume Received', value: `$${parseFloat(profile.stats.total_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: ArrowDownLeft, color: '#059669' },
        { label: 'Net Flow', value: `$${(parseFloat(profile.stats.total_received) - parseFloat(profile.stats.total_sent)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#3b82f6' },
    ];

    return (
        <div className="w-full bg-transparent pt-24 pb-20 min-h-screen">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                        <User style={{ color: 'var(--brand-primary)' }} /> Entity Profile
                    </h1>
                    <p className="text-sm mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Full account intelligence and transaction summary.
                    </p>
                </motion.div>

                {/* Identity Card */}
                <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp}
                    className="rounded-3xl p-6 sm:p-8 border mb-8 relative overflow-hidden"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.04] blur-[60px]" style={{ background: 'var(--brand-primary)' }} />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg text-2xl font-bold" style={{ background: 'var(--brand-primary)' }}>
                                {profile.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{profile.email}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold border ${profile.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border-rose-500/30'}`}>
                                        {profile.status}
                                    </span>
                                    <span className="px-3 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 text-blue-500 border-blue-500/30">
                                        {profile.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Available Liquidity</p>
                            <p className="text-3xl font-extrabold font-mono" style={{ color: 'var(--brand-primary)' }}>
                                ${parseFloat(profile.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Account Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-base)' }}>
                            <Hash size={16} style={{ color: 'var(--text-secondary)' }} />
                            <div>
                                <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Account ID</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{profile.account_no}</p>
                                    <button onClick={copyAccountNo} className="hover:opacity-70 transition-opacity">
                                        {copied ? <CheckCircle2 size={14} style={{ color: '#059669' }} /> : <Copy size={14} style={{ color: 'var(--text-secondary)' }} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-base)' }}>
                            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                            <div>
                                <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Member Since</p>
                                <p className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{new Date(profile.member_since).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-base)' }}>
                            <Shield size={16} style={{ color: 'var(--text-secondary)' }} />
                            <div>
                                <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Last Active</p>
                                <p className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {profile.last_active ? new Date(profile.last_active).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {statCards.map((stat, i) => (
                        <motion.div key={i} initial="hidden" animate="visible" custom={i + 2} variants={fadeUp}
                            className="rounded-2xl p-5 border"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <stat.icon size={16} style={{ color: stat.color }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{stat.label}</span>
                            </div>
                            <p className="text-xl font-extrabold font-mono" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Transaction Breakdown */}
                <motion.div initial="hidden" animate="visible" custom={6} variants={fadeUp}
                    className="rounded-3xl p-6 sm:p-8 border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                >
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Activity size={18} style={{ color: 'var(--brand-primary)' }} /> Transaction Breakdown
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl border flex items-center justify-between" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <ArrowUpRight size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Sent</p>
                                    <p className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{profile.stats.sent_count} transfers</p>
                                </div>
                            </div>
                            <p className="font-bold font-mono text-rose-500">${parseFloat(profile.stats.total_sent).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-5 rounded-2xl border flex items-center justify-between" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <ArrowDownLeft size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Received</p>
                                    <p className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{profile.stats.received_count} transfers</p>
                                </div>
                            </div>
                            <p className="font-bold font-mono text-emerald-500">${parseFloat(profile.stats.total_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
