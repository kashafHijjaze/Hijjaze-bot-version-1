import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  Layout, 
  Bot, 
  Shield, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Sparkles, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  Menu, 
  X,
  MessageSquare
} from 'lucide-react';
import io from 'socket.io-client';

// Shared types
import { User, WASession } from './types';

// Sub-components
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import BotControl from './components/BotControl';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';

export default function App() {
  // Theme & Navigation States
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<'landing' | 'dashboard' | 'bot' | 'admin'>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Authentication States
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // WhatsApp Connection State
  const [session, setSession] = useState<WASession | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const socketRef = useRef<any>(null);

  // Load persistence states on startup
  useEffect(() => {
    // 1. Theme Configuration
    const savedTheme = localStorage.getItem('hijjaze_theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.add('light');
    } else {
      setDarkMode(true);
      document.documentElement.classList.remove('light');
    }

    // 2. Authentication Config
    const savedToken = localStorage.getItem('hijjaze_token');
    const savedUser = localStorage.getItem('hijjaze_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Socket Connection Pipeline
  useEffect(() => {
    // Initialize Socket client targeting root port 3000
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connection established with backend.');
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Real-time WhatsApp connection status broadcast
    socket.on('wa-status', (waSession: any) => {
      console.log('Received live WhatsApp connection state broadcast:', waSession);
      if (waSession && waSession.status && waSession.status !== 'disconnected') {
        setSession(waSession);
      } else {
        setSession(null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Join Socket.IO Room when User Logs In
  useEffect(() => {
    if (user && socketRef.current) {
      socketRef.current.emit('join', user.id);
      fetchWhatsAppStatus();
    } else {
      setSession(null);
    }
  }, [user]);

  // Query API to load existing session status
  const fetchWhatsAppStatus = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/whatsapp/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status && data.status !== 'disconnected') {
          setSession(data);
        } else {
          setSession(null);
        }
      }
    } catch (err) {
      console.error('Error querying WhatsApp status:', err);
    }
  };

  // Toggle visual dark & light styling
  const toggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      localStorage.setItem('hijjaze_theme', 'dark');
      document.documentElement.classList.remove('light');
    } else {
      localStorage.setItem('hijjaze_theme', 'light');
      document.documentElement.classList.add('light');
    }
  };

  const handleAuthSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('hijjaze_token', newToken);
    localStorage.setItem('hijjaze_user', JSON.stringify(newUser));
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of Hijjaze Bot Session Generator?')) {
      setToken(null);
      setUser(null);
      setSession(null);
      localStorage.removeItem('hijjaze_token');
      localStorage.removeItem('hijjaze_user');
      setActivePage('landing');
    }
  };

  const navigateToPage = (page: 'landing' | 'dashboard' | 'bot' | 'admin') => {
    setMobileMenuOpen(false);
    if (page === 'landing') {
      setActivePage(page);
      return;
    }

    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (page === 'admin' && user.role !== 'admin') {
      alert('Access Denied: Admin panel requires admin level credentials.');
      return;
    }

    setActivePage(page);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#09090b] text-zinc-100' : 'bg-zinc-50 text-zinc-900 light'}`}>
      
      {/* GLASSMORPHIC NAVIGATION HEADER BAR */}
      <nav className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-300 ${darkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-zinc-200'}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Logo Brand Title */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateToPage('landing')}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 text-black font-black text-sm shadow-md shadow-green-500/10">
                H
              </div>
              <div className="text-left">
                <span className={`block font-black text-base tracking-tight leading-none ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>hijjaze bot</span>
                <span className="block text-[9px] text-zinc-500 font-medium uppercase tracking-widest mt-0.5">Session Generator</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => navigateToPage('landing')}
                className={`rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-all ${activePage === 'landing' ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-500/15 text-green-600') : (darkMode ? 'text-zinc-400 hover:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900')}`}
                id="nav_landing_btn"
              >
                Home Portal
              </button>
              
              <button 
                onClick={() => navigateToPage('dashboard')}
                className={`rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-all ${activePage === 'dashboard' ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-500/15 text-green-600') : (darkMode ? 'text-zinc-400 hover:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900')}`}
                id="nav_dash_btn"
              >
                Pairing Console
              </button>

              <button 
                onClick={() => navigateToPage('bot')}
                className={`rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-all ${activePage === 'bot' ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-500/15 text-green-600') : (darkMode ? 'text-zinc-400 hover:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900')}`}
                id="nav_bot_btn"
              >
                Bot Playground
              </button>

              {user?.role === 'admin' && (
                <button 
                  onClick={() => navigateToPage('admin')}
                  className={`rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-all ${activePage === 'admin' ? 'bg-red-500/10 text-red-400' : (darkMode ? 'text-red-400/80 hover:text-red-400' : 'text-red-600 hover:text-red-800')}`}
                  id="nav_admin_btn"
                >
                  Admin Telemetry
                </button>
              )}
            </div>

            {/* Actions Controls (Theme toggle, User Logins) */}
            <div className="hidden md:flex items-center gap-3">
              {/* Dark / Light Toggle */}
              <button
                onClick={toggleTheme}
                className={`rounded-full p-2 transition-colors ${darkMode ? 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'}`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                id="theme_toggle_btn"
              >
                {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
              </button>

              {/* Socket Status indicator */}
              <div 
                className={`flex h-8 w-8 items-center justify-center rounded-xl border ${socketConnected ? 'border-green-500/10 bg-green-500/5 text-green-400' : 'border-red-500/10 bg-red-500/5 text-red-400'}`}
                title={socketConnected ? 'Socket Pipeline Connected' : 'Socket Connection Lost'}
              >
                {socketConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              </div>

              {/* User Sign-In Controls */}
              {user ? (
                <div className={`flex items-center gap-3 border-l pl-3 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <div className="flex items-center gap-2">
                    <img
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                      alt="Avatar"
                      className={`h-8 w-8 rounded-full border bg-zinc-800 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}
                    />
                    <div className="text-left text-xs">
                      <span className={`block font-semibold leading-tight max-w-[80px] truncate ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{user.name}</span>
                      <span className="block text-[9px] text-zinc-500 capitalize">{user.role}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className={`rounded-xl border p-2 transition-all ${darkMode ? 'border-zinc-800 bg-zinc-900/50 text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'border-zinc-200 bg-zinc-100 text-red-600 hover:bg-red-50 hover:text-red-700'}`}
                    title="Sign Out"
                    id="nav_logout_btn"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 text-xs shadow-md shadow-green-500/5 transition-all"
                  id="nav_login_btn"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Navigation Menu Toggle */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={toggleTheme}
                className="rounded-full p-2 text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
                id="mobile_theme_toggle"
              >
                {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`rounded-xl p-2 transition-colors ${darkMode ? 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'}`}
                id="mobile_menu_toggle"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`border-t md:hidden overflow-hidden ${darkMode ? 'border-zinc-800 bg-zinc-950/95 backdrop-blur-xl' : 'border-zinc-200 bg-white/95 backdrop-blur-xl'}`}
            >
              <div className="space-y-1.5 px-4 py-4 text-left">
                <button 
                  onClick={() => navigateToPage('landing')}
                  className={`block w-full text-left rounded-xl px-4 py-2.5 text-xs font-bold ${activePage === 'landing' ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-500/15 text-green-600') : 'text-zinc-400'}`}
                >
                  Home Portal
                </button>

                <button 
                  onClick={() => navigateToPage('dashboard')}
                  className={`block w-full text-left rounded-xl px-4 py-2.5 text-xs font-bold ${activePage === 'dashboard' ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-500/15 text-green-600') : 'text-zinc-400'}`}
                >
                  Pairing Console
                </button>

                <button 
                  onClick={() => navigateToPage('bot')}
                  className={`block w-full text-left rounded-xl px-4 py-2.5 text-xs font-bold ${activePage === 'bot' ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-500/15 text-green-600') : 'text-zinc-400'}`}
                >
                  Bot Playground
                </button>

                {user?.role === 'admin' && (
                  <button 
                    onClick={() => navigateToPage('admin')}
                    className={`block w-full text-left rounded-xl px-4 py-2.5 text-xs font-bold text-red-400 ${activePage === 'admin' ? 'bg-red-500/10' : ''}`}
                  >
                    Admin Telemetry
                  </button>
                )}

                <div className={`border-t pt-4 mt-4 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  {user ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                          alt="Avatar"
                          className={`h-8 w-8 rounded-full border bg-zinc-800 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}
                        />
                        <div className="text-left text-xs">
                          <span className={`block font-semibold ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{user.name}</span>
                          <span className="block text-[9px] text-neutral-500 uppercase">{user.role}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setAuthModalOpen(true);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-xs font-bold text-black shadow hover:bg-green-400"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign In to Account
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ACTIVE SCREEN RENDERER WITH TRANSITIONS */}
      <main className="pb-16">
        <AnimatePresence mode="wait">
          {activePage === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <LandingPage 
                onStart={() => navigateToPage('dashboard')} 
                darkMode={darkMode} 
              />
            </motion.div>
          )}

          {activePage === 'dashboard' && user && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Dashboard 
                token={token!} 
                user={user} 
                session={session}
                setSession={setSession}
                onNavigateToBot={() => navigateToPage('bot')}
                socket={socketRef.current}
              />
            </motion.div>
          )}

          {activePage === 'bot' && user && (
            <motion.div
              key="bot"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <BotControl 
                token={token!} 
                session={session} 
              />
            </motion.div>
          )}

          {activePage === 'admin' && user && user.role === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AdminPanel token={token!} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* LOGIN/REGISTRATION AUTH MODAL POPUP */}
      <AnimatePresence>
        {authModalOpen && (
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={handleAuthSuccess}
            userEmailMetadata="kashafhijjaze@gmail.com"
          />
        )}
      </AnimatePresence>

    </div>
  );
}
