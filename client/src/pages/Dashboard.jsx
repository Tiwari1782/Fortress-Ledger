import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Navbar from '../components/ui/Navbar';
import { Vault, ArrowRight, ArrowDownLeft, ArrowUpRight, ShieldCheck, Activity, ScrollText, Calendar, BarChart2, Clock, AlertTriangle, Search, ChevronLeft, ChevronRight, FileDown, X, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }) };

const TiltCard = ({ children, className = "" }) => {
    const ref = useRef(null);
    const handleMove = (e) => {
      const el = ref.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      el.style.transform = `perspective(1000px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg) scale3d(1.01,1.01,1.01)`;
    };
    const handleLeave = () => { if (ref.current) ref.current.style.transform = "perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)"; };
    return (
      <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} className={`will-change-transform ${className}`} style={{ transformStyle: "preserve-3d", transition: "transform 0.15s ease-out" }}>
        {children}
      </div>
    );
};

export default function Dashboard() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // Core State
    const [balanceData, setBalanceData] = useState(null);
    const [history, setHistory] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    
    // UI State
    const [activeTab, setActiveTab] = useState('overview');
    const [msg, setMsg] = useState({ text: '', type: '' });
    
    // Transfer State
    const [transferForm, setTransferForm] = useState({ receiver: '', amount: '', location: '' });
    const [showConfirm, setShowConfirm] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Transaction Detail Modal
    const [selectedTx, setSelectedTx] = useState(null);
    const [txDetailLoading, setTxDetailLoading] = useState(false);
    
    // Phase 2: Monthly Statements
    const [statementYear, setStatementYear] = useState(new Date().getFullYear());
    const [statementMonth, setStatementMonth] = useState(new Date().getMonth() + 1);
    const [statement, setStatement] = useState(null);
    const [stmtLoading, setStmtLoading] = useState(false);
    
    // Phase 2: Window Analytics & Scheduled
    const [analyticsData, setAnalyticsData] = useState([]);
    const [scheduledData, setScheduledData] = useState([]);
    const [scheduleForm, setScheduleForm] = useState({ receiver: '', amount: '', interval: 30 });

    useEffect(() => {
        if (!user) navigate('/login');
        else {
            fetchBalance();
            fetchHistory(1);
        }
    }, [user, navigate]);

    useEffect(() => {
        if (activeTab === 'analytics') fetchAnalytics();
        if (activeTab === 'scheduled') fetchScheduled();
    }, [activeTab]);

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => fetchHistory(1), 400);
        return () => clearTimeout(timeout);
    }, [searchQuery, filterType]);

    const fetchBalance = async () => {
        try {
            const balRes = await api.get('/banking/balance');
            setBalanceData(balRes.data);
        } catch (err) {
            if (err.response && (err.response.status === 401 || err.response.status === 403)) logout(); 
        }
    };

    const fetchHistory = async (page = 1) => {
        try {
            const res = await api.get(`/banking/history?page=${page}&limit=15&search=${searchQuery}&type=${filterType}`);
            setHistory(res.data.transactions);
            setPagination(res.data.pagination);
        } catch (err) {
            if (err.response && (err.response.status === 401 || err.response.status === 403)) logout();
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/banking/analytics');
            setAnalyticsData(res.data);
        } catch (e) {
            console.error("Failed to load analytics");
        }
    };

    const fetchScheduled = async () => {
        try {
            const res = await api.get('/banking/scheduled');
            setScheduledData(res.data);
        } catch (e) {
            console.error("Failed to load scheduled transfers");
        }
    };

    // --- Actions ---

    const handleTransferSubmit = (e) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const executeTransfer = async () => {
        setShowConfirm(false);
        setIsTransferring(true);
        const loadingToast = toast.loading('Acquiring row locks & executing...');
        try {
            const payload = {
                receiver_account_no: transferForm.receiver,
                amount: parseFloat(transferForm.amount)
            };
            if (transferForm.location) {
                const [lat, lng] = transferForm.location.split(',');
                payload.lat = parseFloat(lat);
                payload.lng = parseFloat(lng);
            }
            const res = await api.post('/banking/transfer', payload);
            toast.dismiss(loadingToast);
            toast.success(`Transfer successful! TxID: ${res.data.transaction_id?.substring(0, 8)}...`);
            setTransferForm({ receiver: '', amount: '', location: '' });
            fetchBalance();
            fetchHistory(1);
        } catch (err) {
            toast.dismiss(loadingToast);
            const errorMsg = err.response?.data?.error || 'Transfer failed';
            if (err.response?.data?.details) {
                err.response.data.details.forEach(d => toast.error(d.message));
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setIsTransferring(false);
        }
    };

    const handleScheduleTransfer = async (e) => {
        e.preventDefault();
        try {
            await api.post('/banking/scheduled', {
                receiver_account_no: scheduleForm.receiver,
                amount: parseFloat(scheduleForm.amount),
                interval_days: parseInt(scheduleForm.interval)
            });
            toast.success('Scheduled transfer registered in MySQL Event scheduler');
            setScheduleForm({ receiver: '', amount: '', interval: 30 });
            fetchScheduled();
        } catch (e) {
            toast.error('Scheduling failed: ' + (e.response?.data?.error || 'Unknown error'));
        }
    };

    const handleGenerateStatement = async () => {
        setStmtLoading(true);
        try {
            const res = await api.get(`/banking/statement/${statementYear}/${statementMonth}`);
            setStatement(res.data);
        } catch (err) {} finally { setStmtLoading(false); }
    };

    // Transaction detail modal
    const openTxDetail = async (txId) => {
        setTxDetailLoading(true);
        try {
            const res = await api.get(`/banking/transaction/${txId}`);
            setSelectedTx(res.data);
        } catch (err) {
            toast.error('Failed to load transaction details');
        } finally {
            setTxDetailLoading(false);
        }
    };

    // PDF Export
    const exportStatementPDF = () => {
        if (!statement || statement.length === 0) {
            toast.error('No statement data to export');
            return;
        }
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('FortressLedger', 14, 22);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Monthly Account Statement', 14, 30);
        doc.text(`Account: ${balanceData?.account_no || 'N/A'}`, 14, 36);
        doc.text(`Period: ${String(statementMonth).padStart(2, '0')}/${statementYear}`, 14, 42);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 48);
        
        doc.setDrawColor(5, 150, 105);
        doc.line(14, 52, 196, 52);

        autoTable(doc, {
            startY: 58,
            head: [['Date', 'Description', 'Running Balance']],
            body: statement.map(row => [
                row.tx_date ? new Date(row.tx_date).toLocaleDateString() : '-',
                row.description,
                `$${parseFloat(row.running_balance).toFixed(2)}`
            ]),
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 250, 248] },
            theme: 'grid'
        });

        doc.save(`FortressLedger_Statement_${statementYear}_${String(statementMonth).padStart(2, '0')}.pdf`);
        toast.success('PDF statement exported successfully');
    };

    if (!balanceData) return (
        <div className="min-h-screen pt-24 bg-transparent">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-8">
                        <div className="rounded-3xl p-8 border bg-[var(--bg-card)] border-[var(--border-default)] animate-pulse">
                            <div className="h-12 w-12 rounded-xl bg-[var(--bg-hover)] mb-6"></div>
                            <div className="h-4 w-32 rounded bg-[var(--bg-hover)] mb-3"></div>
                            <div className="h-10 w-48 rounded bg-[var(--bg-hover)] mb-4"></div>
                            <div className="h-3 w-full rounded bg-[var(--bg-hover)]"></div>
                        </div>
                        <div className="rounded-3xl p-8 border bg-[var(--bg-card)] border-[var(--border-default)] animate-pulse">
                            <div className="h-6 w-40 rounded bg-[var(--bg-hover)] mb-6"></div>
                            <div className="h-12 w-full rounded-xl bg-[var(--bg-hover)] mb-4"></div>
                            <div className="h-12 w-full rounded-xl bg-[var(--bg-hover)] mb-4"></div>
                            <div className="h-12 w-full rounded-xl bg-[var(--bg-hover)]"></div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 rounded-3xl p-8 border bg-[var(--bg-card)] border-[var(--border-default)] animate-pulse">
                        <div className="h-6 w-48 rounded bg-[var(--bg-hover)] mb-8"></div>
                        {[1,2,3,4].map(i => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-base)] mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)]"></div>
                                    <div>
                                        <div className="h-4 w-40 rounded bg-[var(--bg-hover)] mb-2"></div>
                                        <div className="h-3 w-28 rounded bg-[var(--bg-hover)]"></div>
                                    </div>
                                </div>
                                <div className="h-5 w-20 rounded bg-[var(--bg-hover)]"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full bg-transparent pt-24 pb-20">
            <Navbar />

            {/* TRANSFER CONFIRMATION MODAL */}
            <AnimatePresence>
                {showConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md p-8 rounded-3xl border shadow-2xl"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                        >
                            <div className="flex items-center gap-3 mb-6" style={{ color: 'var(--brand-primary)' }}>
                                <AlertTriangle size={24} />
                                <h3 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Confirm Transfer</h3>
                            </div>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center p-4 rounded-xl border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)' }}>
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Recipient</span>
                                    <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{transferForm.receiver}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-xl border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)' }}>
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Amount</span>
                                    <span className="font-mono font-bold text-lg" style={{ color: 'var(--brand-primary)' }}>${parseFloat(transferForm.amount || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-xl border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)' }}>
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>From</span>
                                    <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{balanceData?.account_no}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-bold border transition-all hover:opacity-80" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Cancel</button>
                                <button onClick={executeTransfer} className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 shadow-lg bg-[var(--brand-primary)]">
                                    <ShieldCheck size={16} /> Confirm & Execute
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* TRANSACTION DETAIL MODAL */}
            <AnimatePresence>
                {selectedTx && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTx(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg p-8 rounded-3xl border shadow-2xl"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <ScrollText size={20} style={{ color: 'var(--brand-primary)' }} /> Transaction Receipt
                                </h3>
                                <button onClick={() => setSelectedTx(null)} className="p-2 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Transaction ID', value: selectedTx.id },
                                    { label: 'Type', value: selectedTx.type },
                                    { label: 'Amount', value: `$${parseFloat(selectedTx.amount).toFixed(2)}`, highlight: true },
                                    { label: 'Sender', value: selectedTx.sender_account || 'CENTRAL MINT' },
                                    { label: 'Receiver', value: selectedTx.receiver_account },
                                    { label: 'Timestamp', value: new Date(selectedTx.created_at).toLocaleString() },
                                    { label: 'Direction', value: selectedTx.sender_account === balanceData.account_no ? 'OUTGOING' : 'INCOMING' },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 rounded-xl border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)' }}>
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                        <span className={`font-mono font-bold text-sm ${item.highlight ? '' : ''}`} style={{ color: item.highlight ? 'var(--brand-primary)' : 'var(--text-primary)', wordBreak: 'break-all', maxWidth: '60%', textAlign: 'right' }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .shimmer-text { background: linear-gradient(90deg, var(--brand-primary) 0%, #34d399 50%, var(--brand-primary) 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 3s linear infinite; }
            `}</style>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 flex gap-4 border-b border-[var(--border-default)] overflow-x-auto">
                {['overview', 'analytics', 'scheduled', 'underwriting'].map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab)}
                        className="pb-4 px-2 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap"
                        style={{ 
                            color: activeTab === tab ? 'var(--brand-primary)' : 'var(--text-secondary)',
                            borderColor: activeTab === tab ? 'var(--brand-primary)' : 'transparent'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[600px]">
                <AnimatePresence mode="wait">
                    
                    {/* TAB: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <motion.div key="overview" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            <div className="col-span-1 space-y-8">
                                <TiltCard className="rounded-3xl p-6 sm:p-8 border glow-emerald" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg bg-[var(--brand-primary)]">
                                            <Vault size={24} />
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${balanceData.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border-rose-500/30'}`}>
                                            {balanceData.status}
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-wider mb-1 text-[var(--text-secondary)]">Available Liquidity</p>
                                    <h2 className="text-3xl sm:text-4xl font-extrabold font-mono mb-4 shimmer-text">${parseFloat(balanceData.balance).toFixed(2)}</h2>
                                    <div className="pt-4 border-t border-[var(--border-default)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                                        <span>Account ID:</span>
                                        <span className="font-mono font-bold text-[var(--text-primary)]">{balanceData.account_no}</span>
                                    </div>
                                </TiltCard>

                                <div className="rounded-3xl p-6 sm:p-8 border bg-[var(--bg-card)] border-[var(--border-default)]">
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><Activity size={20} className="text-[var(--brand-primary)]"/> Execute Transfer</h3>

                                    <form onSubmit={handleTransferSubmit} className="space-y-4">
                                        <div>
                                            <input required value={transferForm.receiver} onChange={e => setTransferForm({...transferForm, receiver: e.target.value})} type="text" placeholder="Destination FLXXXXXXXXXX" className="w-full p-4 rounded-xl border focus:ring-2 font-mono text-sm bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] outline-emerald-500" />
                                        </div>
                                        <div>
                                            <input required value={transferForm.amount} onChange={e => setTransferForm({...transferForm, amount: e.target.value})} type="number" step="0.01" min="1" placeholder="Amount USD ($)" className="w-full p-4 rounded-xl border focus:ring-2 font-mono text-sm bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] outline-emerald-500" />
                                        </div>
                                        <div>
                                            <select value={transferForm.location} onChange={e => setTransferForm({...transferForm, location: e.target.value})} className="w-full p-4 rounded-xl border focus:ring-2 font-mono text-xs bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-secondary)] outline-emerald-500">
                                                <option value="">Spoof Geographic Node (Optional)</option>
                                                <option value="40.7128,-74.0060">New York, USA</option>
                                                <option value="51.5074,-0.1278">London, UK</option>
                                                <option value="35.6762,139.6503">Tokyo, JP</option>
                                            </select>
                                        </div>
                                        
                                        <button type="submit" disabled={isTransferring} className="w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 group transition-all hover:opacity-90 bg-[var(--brand-primary)] disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isTransferring ? <Activity size={18} className="animate-spin" /> : <>Initiate Protocol <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-8">
                                <div className="rounded-3xl p-6 sm:p-8 border bg-[var(--bg-card)] border-[var(--border-default)]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-[var(--border-default)] gap-4">
                                        <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]"><ShieldCheck size={20} className="text-[var(--brand-primary)]"/> Audit Trail</h3>
                                        <div className="flex items-center gap-2">
                                            {/* Search */}
                                            <div className="relative flex-1 sm:w-48">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                                                <input
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    placeholder="Search TxID, account..."
                                                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs font-mono bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)]"
                                                />
                                            </div>
                                            {/* Filter */}
                                            <select
                                                value={filterType}
                                                onChange={e => setFilterType(e.target.value)}
                                                className="py-2 px-3 rounded-lg border text-xs font-bold bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)]"
                                            >
                                                <option value="all">All</option>
                                                <option value="sent">Sent</option>
                                                <option value="received">Received</option>
                                            </select>
                                        </div>
                                    </div>
                                    {history.length === 0 ? (
                                        <div className="text-center py-12 text-[var(--text-secondary)]">
                                            {searchQuery ? 'No transactions match your search.' : 'No executions found on the ledger.'}
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                                            {history.map((tx) => {
                                                const isSender = tx.sender_account === balanceData.account_no;
                                                return (
                                                    <div 
                                                        key={tx.id} 
                                                        onClick={() => openTxDetail(tx.id)}
                                                        className="flex items-center justify-between p-4 rounded-2xl border bg-[var(--bg-base)] border-[var(--border-default)] hover:-translate-y-0.5 transition-all cursor-pointer hover:shadow-md"
                                                    >
                                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSender ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                                {isSender ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                                                                    {isSender ? `To ${tx.receiver_account}` : `From ${tx.sender_account || 'System'}`}
                                                                </p>
                                                                <p className="text-[10px] font-mono mt-0.5 text-[var(--text-secondary)] truncate">TxID: {tx.id.substring(0,8)}... • {new Date(tx.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-2">
                                                            <p className={`font-bold font-mono text-sm ${isSender ? 'text-rose-500' : 'text-[var(--brand-primary)]'}`}>
                                                                {isSender ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {pagination.totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-default)]">
                                            <p className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                                                Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    disabled={!pagination.hasPrev}
                                                    onClick={() => fetchHistory(pagination.page - 1)}
                                                    className="p-2 rounded-lg border transition-all disabled:opacity-30"
                                                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button 
                                                    disabled={!pagination.hasNext}
                                                    onClick={() => fetchHistory(pagination.page + 1)}
                                                    className="p-2 rounded-lg border transition-all disabled:opacity-30"
                                                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* TAB: ANALYTICS (Window Functions) */}
                    {activeTab === 'analytics' && (
                        <motion.div key="analytics" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="rounded-3xl p-6 sm:p-8 border bg-[var(--bg-card)] border-[var(--border-default)]">
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]"><BarChart2 size={20} className="text-[var(--brand-primary)]"/> SQL Window Functions</h3>
                                    <p className="text-sm mb-6 text-[var(--text-secondary)] leading-relaxed">
                                        These analytics are generated directly by the database engine in a single query using <span className="font-mono text-[var(--brand-primary)]">RANK() OVER()</span> and <span className="font-mono text-[var(--brand-primary)]">SUM() OVER(PARTITION BY type)</span>, demonstrating advanced analytical queries without needing a materialized view.
                                    </p>
                                    {analyticsData.length > 0 ? (
                                        <div className="space-y-4">
                                            {analyticsData.map((row, i) => (
                                                <div key={i} className="p-4 rounded-xl border bg-[var(--bg-base)] border-[var(--border-default)] flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-sm text-[var(--text-primary)]">${parseFloat(row.amount).toFixed(2)} <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-default)] ml-2">{row.type}</span></p>
                                                        <p className="text-[11px] font-mono mt-1 text-[var(--text-secondary)]">Partition Avg: ${parseFloat(row.avg_by_type).toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-right text-xs">
                                                        <p className="text-[var(--text-secondary)]">Velocity Rank</p>
                                                        <p className="font-bold font-mono text-[var(--brand-primary)]">#{row.largest_tx_rank}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-[var(--text-secondary)]">Generate transactions to see analytical window functions in action.</p>}
                                </div>
                                <div className="rounded-3xl p-6 sm:p-8 border bg-[var(--bg-card)] border-[var(--border-default)]">
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><ScrollText size={20} className="text-[var(--brand-primary)]"/> Monthly Statement Builder</h3>
                                    <p className="text-xs mb-4 leading-relaxed text-[var(--text-secondary)]">
                                        Generate a cursor-based running balance ledger using <span className="font-mono font-bold text-[var(--brand-primary)]">sp_generate_monthly_statement</span>.
                                    </p>
                                    <div className="flex flex-wrap gap-3 mb-4">
                                        <div className="flex-1 min-w-[80px]">
                                            <select value={statementYear} onChange={e => setStatementYear(parseInt(e.target.value))} className="w-full p-3 rounded-xl border text-sm font-mono bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)]">
                                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1 min-w-[80px]">
                                            <select value={statementMonth} onChange={e => setStatementMonth(parseInt(e.target.value))} className="w-full p-3 rounded-xl border text-sm font-mono bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)]">
                                                {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{String(i+1).padStart(2, '0')}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={handleGenerateStatement} disabled={stmtLoading} className="px-6 rounded-xl font-bold text-white shadow-lg flex items-center justify-center transition-all disabled:opacity-50 bg-[var(--brand-primary)]">
                                            {stmtLoading ? <Activity size={16} className="animate-spin" /> : 'Generate'}
                                        </button>
                                    </div>
                                    
                                    {statement && statement.length > 0 && (
                                        <>
                                            <div className="flex justify-end mb-3">
                                                <button onClick={exportStatementPDF} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all hover:opacity-80" style={{ borderColor: 'var(--border-default)', color: 'var(--brand-primary)' }}>
                                                    <FileDown size={14} /> Export PDF
                                                </button>
                                            </div>
                                            <div className="max-h-[400px] overflow-auto border border-[var(--border-default)] rounded-xl">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b border-[var(--border-default)] bg-[var(--bg-base)]">
                                                            <th className="text-left py-2 px-2 text-[var(--text-secondary)]">Date</th>
                                                            <th className="text-left py-2 px-2 text-[var(--text-secondary)]">Desc</th>
                                                            <th className="text-right py-2 px-2 text-[var(--brand-primary)]">Balance</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {statement.map((row, i) => (
                                                            <tr key={i} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-hover)]">
                                                                <td className="py-2 px-2 font-mono text-[10px] text-[var(--text-secondary)]">{row.tx_date ? new Date(row.tx_date).toLocaleDateString() : '-'}</td>
                                                                <td className="py-2 px-2 font-medium text-[var(--text-primary)]">{row.description}</td>
                                                                <td className="py-2 px-2 text-right font-mono font-bold text-[var(--text-primary)]">${parseFloat(row.running_balance).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* TAB: SCHEDULED (MySQL Events) */}
                    {activeTab === 'scheduled' && (
                        <motion.div key="scheduled" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="col-span-1 border rounded-3xl p-6 sm:p-8 bg-[var(--bg-card)] border-[var(--border-default)]">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]"><Calendar size={20} className="text-[var(--brand-primary)]"/> Automate Transfers</h3>
                                <p className="text-xs mb-6 text-[var(--text-secondary)] leading-relaxed">
                                    Schedules are executed automatically by the <span className="font-mono text-[var(--brand-primary)]">evt_process_scheduled_transfers</span> MySQL Event running in the background.
                                </p>
                                <form onSubmit={handleScheduleTransfer} className="space-y-4">
                                    <div>
                                        <input required value={scheduleForm.receiver} onChange={e => setScheduleForm({...scheduleForm, receiver: e.target.value})} type="text" placeholder="Destination FLXXXXXXXXXX" className="w-full p-4 rounded-xl border focus:ring-2 font-mono text-sm bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] outline-emerald-500" />
                                    </div>
                                    <div>
                                        <input required value={scheduleForm.amount} onChange={e => setScheduleForm({...scheduleForm, amount: e.target.value})} type="number" step="0.01" min="1" placeholder="Amount USD ($)" className="w-full p-4 rounded-xl border focus:ring-2 font-mono text-sm bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] outline-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 mt-2 text-[var(--text-secondary)]">Frequency (Days)</label>
                                        <input required value={scheduleForm.interval} onChange={e => setScheduleForm({...scheduleForm, interval: e.target.value})} type="number" min="1" placeholder="30" className="w-full p-3 rounded-xl border font-mono text-sm bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)]" />
                                    </div>
                                    <button type="submit" className="w-full py-4 mt-2 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 group transition-all bg-[var(--brand-primary)]">
                                        Inject MySQL Event <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </form>
                            </div>
                            <div className="lg:col-span-2 border rounded-3xl p-6 sm:p-8 bg-[var(--bg-card)] border-[var(--border-default)]">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><Clock size={20} className="text-[var(--brand-primary)]"/> Active Events Queue</h3>
                                {scheduledData.length === 0 ? (
                                    <p className="text-[var(--text-secondary)]">No scheduled events active in the MySQL scheduler queue.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {scheduledData.map(st => (
                                            <div key={st.id} className="p-5 border rounded-2xl bg-[var(--bg-base)] border-[var(--border-default)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                                <div>
                                                    <p className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                                        <span className="font-mono">${parseFloat(st.amount).toFixed(2)}</span>
                                                        <ArrowRight size={14} className="text-[var(--text-secondary)]"/>
                                                        <span className="font-mono text-sm">{st.receiver_account}</span>
                                                    </p>
                                                    <p className="text-xs mt-1 text-[var(--text-secondary)]">Frequency: Every {st.interval_days} days</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border inline-block mb-1 ${st.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border-rose-500/30'}`}>
                                                        {st.status}
                                                    </div>
                                                    <p className="text-[10px] font-mono text-[var(--text-secondary)]">Next: {new Date(st.next_execution).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* TAB: UNDERWRITING (Algorithmic Loan) */}
                    {activeTab === 'underwriting' && (
                        <motion.div key="underwriting" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="rounded-3xl p-6 sm:p-8 border bg-[var(--bg-card)] border-[var(--border-default)]">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]"><ShieldCheck size={20} className="text-[var(--brand-primary)]"/> Algorithmic Underwriting</h3>
                                <p className="text-sm mb-6 text-[var(--text-secondary)] leading-relaxed">
                                    Instead of human analysts, this system utilizes a Stored Procedure (<span className="font-mono text-[var(--brand-primary)]">sp_request_loan</span>) to dynamically gauge your average daily liquidity, calculate transaction frequency over the past 90 days, and instantly render a lending decision.
                                </p>
                                <div className="space-y-4">
                                    <input id="loanAmount" type="number" placeholder="Requested Loan Capital ($)" className="w-full p-4 rounded-xl border focus:ring-2 font-mono text-sm bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] outline-emerald-500" />
                                    <button onClick={async () => {
                                        const amt = document.getElementById('loanAmount').value;
                                        if(!amt) return toast.error('Enter a loan amount');
                                        const loading = toast.loading('Executing Underwriting Sp...');
                                        try {
                                            const res = await api.post('/banking/loan', { amount: parseFloat(amt) });
                                            toast.dismiss(loading);
                                            if (res.data.status === 'PENDING') {
                                                toast.success(`SCORE: ${res.data.score}. ${res.data.message}`, { duration: 6000 });
                                            } else if (res.data.status === 'APPROVED') {
                                                toast.success(`LOAN AUTO-APPROVED! Score: ${res.data.score}.`, { duration: 6000 });
                                                fetchBalance();
                                                fetchHistory(1);
                                            } else {
                                                toast.error(`LOAN DENIED BY ALGORITHM. Score: ${res.data.score}. ${res.data.message}`, { duration: 6000 });
                                            }
                                        } catch (e) {
                                            toast.dismiss(loading);
                                            toast.error(e.response?.data?.error || 'Database computation failed');
                                        }
                                    }} className="w-full py-4 rounded-xl font-bold text-white shadow-lg bg-[var(--brand-primary)] transition-all hover:opacity-90">
                                        Execute Loan Request
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}