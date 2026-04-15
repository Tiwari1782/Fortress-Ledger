import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';

// Import Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminUserDetail from './pages/AdminUserDetail';
import NotFound from './pages/NotFound';

// Import Components
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/ui/Footer';

const GlobalBackground = () => {
    const orbRef1 = useRef(null);
    const orbRef2 = useRef(null);
    const orbRef3 = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;
            if (orbRef1.current) orbRef1.current.style.transform = `translate(${x * 30}px, ${y * 20}px)`;
            if (orbRef2.current) orbRef2.current.style.transform = `translate(${x * -20}px, ${y * 30}px)`;
            if (orbRef3.current) orbRef3.current.style.transform = `translate(${x * 15}px, ${y * -25}px)`;
        };
        window.addEventListener("mousemove", handler);
        return () => window.removeEventListener("mousemove", handler);
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: "radial-gradient(var(--text-primary) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            
            {/* Parallax Orbs */}
            <div ref={orbRef1} className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[80px] transition-transform duration-700 ease-out" style={{ background: "var(--brand-primary)" }} />
            <div ref={orbRef2} className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[80px] transition-transform duration-700 ease-out" style={{ background: "var(--brand-secondary)" }} />
            <div ref={orbRef3} className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full opacity-[0.03] blur-[60px] transition-transform duration-700 ease-out" style={{ background: "var(--brand-primary)" }} />
        </div>
    );
};

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <GlobalBackground />
          <div className="min-h-screen relative z-10 flex flex-col">
            <div className="flex-grow">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Protected Customer Routes */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Protected Admin Routes */}
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <Admin />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/user/:id" 
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <AdminUserDetail />
                      </ProtectedRoute>
                    } 
                  />

                  {/* 404 Catch-All Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
            </div>
            {/* Global Footer */}
            <Footer />
          </div>
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            },
            success: {
              iconTheme: { primary: '#059669', secondary: '#ffffff' },
            },
            error: {
              iconTheme: { primary: '#e11d48', secondary: '#ffffff' },
            },
          }}
        />
      </ThemeProvider>
    </Router>
  );
}