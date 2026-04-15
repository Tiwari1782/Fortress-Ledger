import { Shield, Moon, Sun, LogOut, LayoutDashboard, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar() {
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const { user, logout } = useContext(AuthContext);

    return (
        <nav className="w-full fixed top-0 z-50 glass" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="p-2 rounded-xl text-white shadow-lg" style={{ background: 'var(--brand-primary)' }}>
                        <Shield size={20} strokeWidth={2.5} />
                    </div>
                    <span className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Fortress<span style={{ color: 'var(--brand-primary)' }}>Ledger</span>
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={toggleTheme} className="p-2.5 rounded-xl border transition-all" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    
                    {user ? (
                        <>
                            <button onClick={() => navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard')} className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all hover:opacity-80" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                                <LayoutDashboard size={16} style={{ color: 'var(--brand-primary)' }}/> Dashboard
                            </button>
                            <button onClick={() => navigate('/profile')} className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all hover:opacity-80" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                                <User size={16} style={{ color: 'var(--brand-primary)' }}/> Profile
                            </button>
                            <button onClick={logout} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all bg-rose-600 hover:bg-rose-700">
                                <LogOut size={16} /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => navigate('/login')} className="hidden sm:block px-6 py-2.5 text-sm font-bold rounded-xl border transition-all" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                                Log In
                            </button>
                            <button onClick={() => navigate('/register')} className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all" style={{ background: 'var(--brand-primary)' }}>
                                Open Account
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}