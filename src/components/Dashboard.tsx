import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Copy, 
  Download, 
  Key, 
  RefreshCw, 
  Trash2, 
  LogOut, 
  CheckCircle, 
  Loader2, 
  Clock, 
  ShieldAlert, 
  User, 
  Bot, 
  Globe 
} from 'lucide-react';
import { WASession } from '../types';

interface DashboardProps {
  token: string;
  user: { id: string; name: string; email: string; role: 'user' | 'admin' };
  session: WASession | null;
  setSession: React.Dispatch<React.SetStateAction<WASession | null>>;
  onNavigateToBot: () => void;
  socket: any;
}

const COUNTRY_CODES = [
  { code: '92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '91', country: 'India', flag: '🇮🇳' },
  { code: '62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '55', country: 'Brazil', flag: '🇧🇷' },
  { code: '880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '33', country: 'France', flag: '🇫🇷' },
  { code: '49', country: 'Germany', flag: '🇩🇪' },
];

export default function Dashboard({ token, user, session, setSession, onNavigateToBot, socket }: DashboardProps) {
  const [countryCode, setCountryCode] = useState('92');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [expiry, setExpiry] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-clear toast after 3s
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Countdown timer for pairing code
  useEffect(() => {
    if (expiry > 0) {
      timerRef.current = setInterval(() => {
        setExpiry((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setPairingCode('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiry]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setPairingCode('');

    // Clean phone number (keep digits only)
    const rawNumber = phoneNumber.replace(/[^0-9]/g, '');
    if (!rawNumber) {
      setError('Please enter a valid phone number');
      setLoading(false);
      return;
    }

    const fullPhone = `${countryCode}${rawNumber}`;

    try {
      const response = await fetch('/api/whatsapp/pair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: fullPhone })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request pairing code');
      }

      setPairingCode(data.code);
      setExpiry(data.expiresSeconds || 120);
      showToast('Pairing code generated successfully!');
      
      // Update local session status
      setSession({
        id: user.id,
        userId: user.id,
        phone: fullPhone,
        status: 'connecting'
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong while pairing');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  const handleDownloadCreds = async () => {
    try {
      const response = await fetch('/api/whatsapp/download-creds', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Could not download credentials');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'creds.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('creds.json downloaded successfully!');
    } catch (err: any) {
      showToast('Error downloading credentials');
    }
  };

  const handleCopySessionToken = async () => {
    try {
      const response = await fetch('/api/whatsapp/session-token', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not fetch session token');
      }
      setSessionToken(data.token);
      copyToClipboard(data.token, 'Session ID Token');
    } catch (err: any) {
      showToast(err.message || 'Error getting session token');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp? This will remove all local session credentials.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Disconnect failed');
      }
      setSession(null);
      setPairingCode('');
      setExpiry(0);
      setSessionToken('');
      showToast('WhatsApp session disconnected and deleted.');
    } catch (err: any) {
      showToast(err.message || 'Error disconnecting');
    } finally {
      setLoading(false);
    }
  };

  const formatExpiry = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Format Pairing Code with hyphen (e.g. ABCD-EFGH) if not already formatted
  const formatPairingCode = (code: string) => {
    if (!code) return '';
    const clean = code.replace(/[^A-Za-z0-9]/g, '');
    if (clean.length === 8) {
      return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }
    return code;
  };

  const isConnected = session?.status === 'connected';
  const isConnecting = session?.status === 'connecting';

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-8">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 rounded-xl bg-green-500 px-4 py-3 text-xs font-bold text-black shadow-lg flex items-center gap-2 border border-green-500/20"
          >
            <CheckCircle className="h-4 w-4" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="text-left">
          <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">WhatsApp Dashboard</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Welcome, <span className="font-semibold text-green-400">{user.name}</span>. Manage your linked connections below.</p>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && (
            <button
              onClick={onNavigateToBot}
              className="flex items-center gap-1.5 rounded-xl bg-green-500/10 px-4 py-2.5 text-xs font-semibold text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all"
              id="dash_go_bot_btn"
            >
              <Bot className="h-4 w-4" />
              Open Bot Controls
            </button>
          )}

          <div className="flex items-center gap-1.5 rounded-full bg-zinc-900/60 px-3.5 py-1.5 text-xs border border-zinc-800">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-zinc-300 font-medium capitalize font-mono">{session?.status || 'disconnected'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-12">
        {/* LEFT COLUMN: Input Phone & Code displays */}
        <div className="md:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {!isConnected ? (
              /* Disconnected or Connecting panel (Generate Code) */
              <motion.div
                key="disconnect-panel"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 md:p-8 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3 mb-6 text-left">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Connect WhatsApp Account</h2>
                    <p className="text-xs text-zinc-400">Generate an official Baileys pairing token</p>
                  </div>
                </div>

                <form onSubmit={handleGenerateCode} className="space-y-5">
                  <div className="grid gap-4 grid-cols-12 text-left">
                    {/* Country Code Select */}
                    <div className="col-span-4 space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Country Code</label>
                      <div className="relative">
                        <Globe className="absolute top-3.5 left-3 h-4 w-4 text-zinc-500" />
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pr-2.5 pl-9 text-xs text-white focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none transition-all font-mono"
                          id="country_code_select"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code} className="bg-zinc-950 text-white">
                              {c.flag} +{c.code}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Phone Input */}
                    <div className="col-span-8 space-y-1 text-left">
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">WhatsApp Number</label>
                      <input
                        type="text"
                        required
                        placeholder="3001234567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm text-white placeholder-zinc-600 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all font-mono"
                        id="phone_number_input"
                      />
                    </div>
                  </div>

                  <span className="block text-[10px] text-zinc-500 leading-relaxed italic text-left">
                    Note: Enter phone number without country prefixes or preceding zeroes (e.g. 3001234567). Baileys will automatically link this dynamically.
                  </span>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-green-500 py-3.5 text-sm font-bold text-black hover:bg-green-400 focus:ring-2 focus:ring-green-400 focus:outline-none disabled:opacity-50 transition-all shadow-md shadow-green-500/10"
                    id="generate_pairing_code_btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Baileys session...
                      </>
                    ) : (
                      'Generate Pairing Code'
                    )}
                  </button>
                </form>

                {/* Displaying pairing code */}
                <AnimatePresence>
                  {pairingCode && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 text-center relative overflow-hidden"
                    >
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-green-400 border border-green-500/20 font-mono">
                        <Clock className="h-3 w-3" />
                        <span>{formatExpiry(expiry)}</span>
                      </div>

                      <span className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">WhatsApp Pairing Code</span>
                      
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl font-black text-white font-mono tracking-widest bg-zinc-900 py-2.5 px-6 rounded-xl border border-zinc-800 select-all shadow-inner">
                          {formatPairingCode(pairingCode)}
                        </span>
                        
                        <button
                          onClick={() => copyToClipboard(pairingCode, 'Pairing Code')}
                          className="rounded-xl bg-zinc-900 p-3 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800 transition-colors"
                          title="Copy Code"
                          id="copy_pairing_code_btn"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>

                      <span className="block mt-4 text-[10px] text-zinc-400 max-w-sm mx-auto leading-relaxed">
                        To pair, open WhatsApp on your phone &gt; tap Settings/Menu &gt; <b>Linked Devices</b> &gt; <b>Link with Phone Number</b>, and type this code.
                      </span>

                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-green-400" />
                        <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider font-mono">Waiting for pairing detection...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* Connected Successful screen */
              <motion.div
                key="connected-panel"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="rounded-2xl border border-green-500/20 bg-green-950/10 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-green-500/5 blur-[50px] -z-10" />

                <div className="flex items-center gap-3 mb-6 text-left">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/20 text-green-400 border border-green-500/20">
                    <CheckCircle className="h-5 w-5 animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">WhatsApp Connected Successfully</h2>
                    <p className="text-xs text-green-400">Your Baileys credentials and session are safe & active</p>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Great! Your WhatsApp credentials have been generated and cached locally in our container. You can now download your credential JSON payload, fetch your encrypted Session token, or run bot message tests in the Control Panel.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2 pt-2">
                    {/* Download creds */}
                    <button
                      onClick={handleDownloadCreds}
                      className="flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 py-3.5 text-xs font-bold text-green-400 hover:bg-green-500/20 transition-all"
                      id="download_creds_json_btn"
                    >
                      <Download className="h-4 w-4" />
                      Download creds.json
                    </button>

                    {/* Copy Session ID */}
                    <button
                      onClick={handleCopySessionToken}
                      className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-3.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all"
                      id="copy_session_id_btn"
                    >
                      <Key className="h-4 w-4" />
                      Copy Session ID Token
                    </button>
                  </div>

                  {sessionToken && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-zinc-950 p-3 flex items-center justify-between border border-zinc-800"
                    >
                      <div className="overflow-hidden">
                        <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Secure Token String</span>
                        <span className="block truncate text-xs font-mono text-green-400">{sessionToken}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(sessionToken, 'Session Token')}
                        className="p-1.5 text-zinc-400 hover:text-white"
                        title="Copy String"
                        id="copy_session_token_text_btn"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}

                  <div className="border-t border-zinc-800 pt-4 mt-6 flex items-center justify-between">
                    <button
                      onClick={onNavigateToBot}
                      className="flex items-center gap-1.5 rounded-xl bg-green-500 px-5 py-2.5 text-xs font-bold text-black shadow-md shadow-green-500/10 hover:bg-green-400 transition-all"
                      id="go_to_bot_play_btn"
                    >
                      <Bot className="h-4 w-4 animate-spin-slow" />
                      Open Bot Playground
                    </button>

                    <button
                      onClick={handleDisconnect}
                      disabled={loading}
                      className="flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                      id="disconnect_wa_session_btn"
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      Disconnect WhatsApp
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: WhatsApp Metadata Profile State Card */}
        <div className="md:col-span-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wider text-left font-mono">Connection Metadata</h3>

            <AnimatePresence mode="wait">
              {isConnected ? (
                /* Paired Profile Display */
                <motion.div
                  key="paired-meta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={session?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session?.name || 'WA')}`}
                      alt="WhatsApp Avatar"
                      className="h-16 w-16 rounded-full border-2 border-green-500 object-cover bg-zinc-800"
                    />
                    <div>
                      <span className="block font-black text-white text-base leading-tight">{session?.name || 'WhatsApp Account'}</span>
                      <span className="block text-xs text-zinc-400 mt-1 font-mono">+{session?.phone}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-zinc-950/40 p-4 border border-zinc-850 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Device Status</span>
                      <span className="font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20 font-mono">Online</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-mono">Instance Library</span>
                      <span className="font-mono font-semibold text-green-400">Baileys v5.0.0</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-mono">Last Synced</span>
                      <span className="font-mono text-zinc-350">
                        {session?.lastConnected ? new Date(session.lastConnected).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all font-mono"
                    id="delete_session_right_btn"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Session Folder
                  </button>
                </motion.div>
              ) : (
                /* No Active Session Display */
                <motion.div
                  key="unpaired-meta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-10 text-center text-zinc-500"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 border border-zinc-800 text-zinc-600">
                    <User className="h-6 w-6" />
                  </div>
                  <span className="block text-sm font-semibold text-zinc-400">No Linked Account</span>
                  <p className="mt-1.5 text-xs text-zinc-500 max-w-xs mx-auto leading-normal">
                    Generate an 8-digit Pairing Code to link your WhatsApp account profile securely to this session hub.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
