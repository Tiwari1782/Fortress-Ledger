import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isDefconActive, setIsDefconActive] = useState(false);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const newSocket = io('http://localhost:5000', {
            withCredentials: true,
        });

        setSocket(newSocket);

        // Listen for global DEFCON broadcast
        newSocket.on('DEFCON_ACTIVATED', (data) => {
            setIsDefconActive(data.locked);
            if(data.locked) {
                toast.error('DEFCON 1 ACTIVATED. SYSTEM LOCKED.', { duration: 10000 });
            } else {
                toast.success('DEFCON LIFTED. SYSTEM ONLINE.');
            }
        });

        return () => newSocket.close();
    }, []);

    // Also inject user into their specific socket room when user changes
    useEffect(() => {
        if (socket && user) {
            import('../api/axios').then(({ default: api }) => {
                api.get('/banking/balance').then(res => {
                    if (res.data.account_no) {
                        socket.emit('join_account', res.data.account_no);
                    }
                }).catch(e => {});
            });
        }
    }, [socket, user]);

    // Toast listener for private transfers
    useEffect(() => {
        if (!socket) return;
        const handler = (data) => {
            toast.success(`INCOMING TRANSFER: $${data.amount} received from ${data.sender}!`, {
                icon: '💸',
                style: { border: '2px solid emerald', padding: '16px', color: '#10b981', fontWeight: 'bold' }
            });
        };
        socket.on('transfer_received', handler);
        return () => socket.off('transfer_received', handler);
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket, isDefconActive }}>
            {children}
            {isDefconActive && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-rose-950/90 backdrop-blur-3xl overflow-hidden pointer-events-auto">
                    <style>{`
                        @keyframes defcon-strobe {
                            0% { opacity: 0.1; }
                            50% { opacity: 0.8; }
                            100% { opacity: 0.1; }
                        }
                    `}</style>
                    <div className="absolute inset-0 bg-rose-600 mix-blend-overlay animate-[defcon-strobe_1s_infinite]"></div>
                    <div className="relative text-rose-500 font-mono text-[10vw] font-black tracking-tighter mix-blend-hard-light leading-none z-10 text-center drop-shadow-[0_0_25px_rgba(225,29,72,0.8)]">
                        LOCKED
                    </div>
                    <div className="relative z-10 mt-8 px-8 py-4 border-2 border-rose-500/50 bg-rose-900/50 rounded-2xl flex flex-col items-center">
                        <span className="text-rose-400 font-bold tracking-widest text-sm mb-2">SYSTEM HALTED</span>
                        <span className="text-white font-mono text-center max-w-md text-xs opacity-80 leading-relaxed">
                            FortressLedger Administrator has issued a Global Network Lockdown. All financial routing engines have been severed from external gateways pending security resolution.
                        </span>
                    </div>
                </div>
            )}
        </SocketContext.Provider>
    );
};
