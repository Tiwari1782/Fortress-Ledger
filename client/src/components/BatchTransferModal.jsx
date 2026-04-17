import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, ShieldCheck, Activity, Users } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function BatchTransferModal({ isOpen, onClose, onSuccess, currentBalance }) {
    const [batch, setBatch] = useState([{ receiver_account_no: '', amount: '' }]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [results, setResults] = useState(null);

    if (!isOpen) return null;

    const handleAddRow = () => {
        setBatch([...batch, { receiver_account_no: '', amount: '' }]);
    };

    const handleRemoveRow = (index) => {
        setBatch(batch.filter((_, i) => i !== index));
    };

    const handleChange = (index, field, value) => {
        const newBatch = [...batch];
        newBatch[index][field] = value;
        setBatch(newBatch);
    };

    const handleExecute = async () => {
        // Validate
        const validBatch = batch.filter(row => row.receiver_account_no && row.amount);
        if (validBatch.length === 0) {
            return toast.error("Please add at least one valid transfer.");
        }

        const totalAmount = validBatch.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
        if (totalAmount > parseFloat(currentBalance)) {
            return toast.error(`Total batch amount ($${totalAmount}) exceeds your balance ($${currentBalance}).`);
        }

        setIsExecuting(true);
        const loadingToast = toast.loading('Executing Batch Payout via Savepoints...');

        try {
            const res = await api.post('/banking/batch-transfer', { batch: validBatch });
            toast.dismiss(loadingToast);
            toast.success(res.data.message);
            setResults(res.data.results);
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.error || 'Critical Batch Failure');
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl p-8 rounded-3xl border shadow-2xl relative"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                    onClick={e => e.stopPropagation()}
                >
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 mb-2" style={{ color: 'var(--brand-primary)' }}>
                        <Users size={24} />
                        <h3 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Batch Payouts</h3>
                    </div>
                    <p className="text-xs mb-6 text-[var(--text-secondary)]">
                        Execute multiple transfers in a single database transaction. Uses 
                        <span className="font-mono text-[var(--brand-primary)] mx-1">SAVEPOINT</span> 
                        logic so if one transfer fails, the rest succeed.
                    </p>

                    {results ? (
                        <div className="space-y-4">
                            <h4 className="font-bold text-sm text-[var(--text-primary)]">Execution Results</h4>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {results.map((res, i) => (
                                    <div key={i} className={`p-4 rounded-xl border flex justify-between items-center ${
                                        res.status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
                                    }`}>
                                        <div>
                                            <p className="font-mono text-xs font-bold text-[var(--text-primary)]">{res.receiver}</p>
                                            {res.status === 'SUCCESS' ? (
                                                <p className="text-[10px] text-emerald-500 mt-1">Tx: {res.transaction_id.substring(0,8)}</p>
                                            ) : (
                                                <p className="text-[10px] text-rose-500 mt-1">Error: {res.error}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold font-mono text-sm" style={{ color: 'var(--text-primary)' }}>${parseFloat(res.amount).toFixed(2)}</p>
                                            <p className={`text-[10px] font-bold ${res.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'}`}>{res.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={onClose} className="w-full mt-4 py-3 rounded-xl text-sm font-bold border transition-all hover:opacity-80" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Close</button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 mb-6">
                                {batch.map((row, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <input 
                                            value={row.receiver_account_no} 
                                            onChange={e => handleChange(i, 'receiver_account_no', e.target.value)} 
                                            type="text" 
                                            placeholder="Destination FLXXXXXXXXXX" 
                                            className="flex-1 p-3 rounded-xl border focus:ring-2 font-mono text-sm bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] outline-emerald-500" 
                                        />
                                        <input 
                                            value={row.amount} 
                                            onChange={e => handleChange(i, 'amount', e.target.value)} 
                                            type="number" step="0.01" min="1" 
                                            placeholder="Amount ($)" 
                                            className="w-1/3 p-3 rounded-xl border focus:ring-2 font-mono text-sm bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] outline-emerald-500" 
                                        />
                                        <button 
                                            onClick={() => handleRemoveRow(i)}
                                            disabled={batch.length === 1}
                                            className="p-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-30"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <button onClick={handleAddRow} className="flex items-center gap-2 text-xs font-bold text-[var(--brand-primary)] hover:opacity-80 transition-opacity">
                                    <Plus size={16} /> Add Recipient
                                </button>
                                
                                <div className="flex items-center gap-3">
                                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold border transition-all hover:opacity-80" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>Cancel</button>
                                    <button 
                                        onClick={handleExecute} 
                                        disabled={isExecuting} 
                                        className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 shadow-lg bg-[var(--brand-primary)] disabled:opacity-50"
                                    >
                                        {isExecuting ? <Activity size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Execute Batch
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
