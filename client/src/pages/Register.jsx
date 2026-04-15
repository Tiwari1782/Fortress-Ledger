import { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Vault, ArrowRight, AlertCircle, Database, CheckCircle2, XCircle } from 'lucide-react';
import Navbar from '../components/ui/Navbar';

const TiltCard = ({ children, className = "", intensity = 5 }) => {
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

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    // Password strength checks
    const passwordChecks = [
        { label: 'At least 8 characters', test: password.length >= 8 },
        { label: 'One uppercase letter', test: /[A-Z]/.test(password) },
        { label: 'One lowercase letter', test: /[a-z]/.test(password) },
        { label: 'One number', test: /[0-9]/.test(password) },
        { label: 'One special character', test: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
    const passedChecks = passwordChecks.filter(c => c.test).length;
    const strengthPercent = (passedChecks / passwordChecks.length) * 100;
    const strengthColor = strengthPercent <= 40 ? '#e11d48' : strengthPercent <= 80 ? '#f59e0b' : '#059669';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passedChecks < passwordChecks.length) {
            toast.error('Please meet all password requirements');
            return;
        }
        setIsLoading(true);
        try {
            await register(email, password, 'CUSTOMER');
            toast.success('Account created successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Registration failed';
            if (err.response?.data?.details) {
                err.response.data.details.forEach(d => toast.error(d.message));
            } else {
                toast.error(errorMsg);
            }
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col pt-20 overflow-hidden bg-transparent">
            {/* Abstract Background Elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

            <Navbar />
            <div className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-md"
                >
                    <TiltCard className="p-8 md:p-10 rounded-[2rem] border glass glow-emerald">
                        <div className="flex justify-center mb-6 relative">
                            <motion.div 
                                initial={{ rotate: -180, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="relative p-5 rounded-2xl border bg-emerald-500/10 border-emerald-500/20"
                            >
                                <Database size={32} strokeWidth={2} className="text-emerald-500 relative z-10" />
                                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
                            </motion.div>
                        </div>
                        
                        <h2 className="text-[2rem] font-extrabold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
                            Join <span className="shimmer-text">Ledger</span>
                        </h2>
                        <p className="text-center mb-8 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Register for a secure cryptographic account.
                        </p>

                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 mb-6 rounded-xl text-sm text-center font-bold flex items-center justify-center gap-2 border bg-rose-500/10 border-rose-500/30 text-rose-500">
                                <AlertCircle size={16} /> {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Role selector has been completely removed! Definitively registering as CUSTOMER */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Email Identity</label>
                                <input 
                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-xl p-4 font-mono text-sm border transition-all focus:ring-2"
                                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', outlineColor: 'var(--brand-primary)' }}
                                    placeholder="name@institution.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Security Key</label>
                                <input 
                                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-xl p-4 font-mono text-sm border transition-all focus:ring-2"
                                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', outlineColor: 'var(--brand-primary)' }}
                                    placeholder="••••••••"
                                />
                            </div>

                            {/* Password Strength Indicator */}
                            {password.length > 0 && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
                                        <motion.div 
                                            className="h-full rounded-full transition-all duration-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${strengthPercent}%` }}
                                            style={{ background: strengthColor }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                        {passwordChecks.map((check, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[11px] font-medium" style={{ color: check.test ? '#059669' : 'var(--text-secondary)' }}>
                                                {check.test ? <CheckCircle2 size={12} /> : <XCircle size={12} className="opacity-40" />}
                                                {check.label}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            <button type="submit" disabled={isLoading} className="w-full py-4 mt-8 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'var(--brand-primary)' }}>
                                {isLoading ? 'Creating Account...' : <>Generate Profile <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </form>
                        
                        <p className="mt-8 text-center text-sm font-medium border-t pt-6" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}>
                            Entity already verified? <span onClick={() => navigate('/login')} className="font-bold cursor-pointer transition-colors" style={{ color: 'var(--brand-primary)' }}>Access Portal</span>
                        </p>
                    </TiltCard>
                </motion.div>
            </div>
        </div>
    );
}