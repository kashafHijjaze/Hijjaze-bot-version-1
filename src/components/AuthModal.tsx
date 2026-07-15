import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Chrome, ArrowRight, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, user: any) => void;
  userEmailMetadata?: string; // e.g. kashafhijjaze@gmail.com
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, userEmailMetadata = 'kashafhijjaze@gmail.com' }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleSelect, setShowGoogleSelect] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { email, password, name };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuthSuccess(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (selectedEmail: string, displayName: string, avatarSeed: string) => {
    setError('');
    setLoading(true);
    setShowGoogleSelect(false);

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedEmail,
          name: displayName,
          googleId: 'g_' + Math.random().toString(36).substr(2, 9),
          imageUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${avatarSeed}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Google Sign-In failed');
      }

      onAuthSuccess(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
      />

      {/* Main Content Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 p-8 shadow-2xl backdrop-blur-xl text-left"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          id="close_auth_modal_btn"
        >
          <X className="h-5 w-5" />
        </button>

        {!showGoogleSelect ? (
          <div>
            <div className="mb-6 text-center">
              <motion.div 
                initial={{ rotate: -10 }}
                animate={{ rotate: 10 }}
                transition={{ repeat: Infinity, repeatType: "mirror", duration: 2 }}
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 shadow-md shadow-green-500/10"
              >
                <Sparkles className="h-6 w-6" />
              </motion.div>
              <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                {isLogin
                  ? 'Access your WhatsApp paired sessions dashboard'
                  : 'Get started with Hijjaze Bot pairing code generator'}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Name</label>
                  <div className="relative">
                    <User className="absolute top-3 left-3 h-5 w-5 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pr-4 pl-10 text-sm text-white placeholder-zinc-500 focus:border-green-500/50 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all"
                      id="auth_name_input"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 h-5 w-5 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pr-4 pl-10 text-sm text-white placeholder-zinc-500 focus:border-green-500/50 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all"
                    id="auth_email_input"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => alert('Demo account: Use admin@hijjaze.com / admin123 or register a new one!')}
                      className="text-[10px] text-green-400 hover:underline hover:text-green-300"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute top-3 left-3 h-5 w-5 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pr-4 pl-10 text-sm text-white placeholder-zinc-500 focus:border-green-500/50 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all"
                    id="auth_pwd_input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400 focus:ring-2 focus:ring-green-400 focus:outline-none disabled:opacity-50 transition-all shadow-md shadow-green-500/10"
                id="auth_submit_btn"
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <span className="absolute w-full border-t border-zinc-800" />
              <span className="relative bg-zinc-950 px-3 text-xs text-zinc-500">Or continue with</span>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={() => setShowGoogleSelect(true)}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-850 transition-all"
              id="auth_google_btn"
            >
              <Chrome className="h-4 w-4 text-green-400" />
              Sign in with Google
            </button>

            <div className="mt-6 text-center text-xs text-zinc-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 font-semibold text-green-400 hover:underline hover:text-green-300"
                id="auth_switch_mode_btn"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        ) : (
          /* Google Account Selection Modal inside glass card (Iframe safe setup) */
          <div>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white border border-zinc-800">
                <Chrome className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Sign in with Google</h3>
              <p className="mt-1 text-xs text-zinc-400">
                Select an account to authorize with <b>Hijjaze Bot</b>
              </p>
            </div>

            <div className="space-y-2.5">
              {/* User email from metadata */}
              <button
                onClick={() => handleGoogleSignIn(userEmailMetadata, 'Kashaf Hijjaze', 'kashaf')}
                className="flex w-full items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3.5 text-left hover:bg-green-500/10 transition-all"
                id="google_account_meta_btn"
              >
                <img
                  src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=kashaf`}
                  alt="Avatar"
                  className="h-9 w-9 rounded-full bg-zinc-900 border border-green-500/20"
                />
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white">Kashaf Hijjaze</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <span className="block truncate text-xs text-zinc-400 font-mono">{userEmailMetadata}</span>
                </div>
                <span className="rounded-md bg-green-500/20 px-2 py-0.5 text-[9px] font-bold text-green-400 uppercase font-mono">
                  Primary
                </span>
              </button>

              {/* Developer backup account */}
              <button
                onClick={() => handleGoogleSignIn('developer@gmail.com', 'Dev Tester', 'tester')}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-left hover:bg-zinc-850 transition-all"
                id="google_account_dev_btn"
              >
                <img
                  src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=tester`}
                  alt="Avatar"
                  className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800"
                />
                <div className="flex-1 overflow-hidden">
                  <span className="block text-sm font-semibold text-white">Dev Tester</span>
                  <span className="block truncate text-xs text-zinc-400 font-mono font-mono">developer@gmail.com</span>
                </div>
              </button>

              {/* Custom login account input */}
              <div className="rounded-xl border border-dashed border-zinc-850 p-3.5 text-center">
                <span className="block text-[11px] text-zinc-500 mb-2">Want a custom Google Account?</span>
                <input
                  type="email"
                  placeholder="Enter custom google email..."
                  className="w-full rounded-xl bg-zinc-950 px-3 py-1.5 text-xs text-white border border-zinc-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 mb-2 text-center font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      const emailVal = e.currentTarget.value;
                      const nameVal = emailVal.split('@')[0];
                      handleGoogleSignIn(emailVal, nameVal.charAt(0).toUpperCase() + nameVal.slice(1), nameVal);
                    }
                  }}
                />
                <span className="text-[9px] text-zinc-550">Press Enter to sign in instantly</span>
              </div>
            </div>

            <button
              onClick={() => setShowGoogleSelect(false)}
              className="mt-4 w-full rounded-xl py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:underline transition-all"
              id="google_back_btn"
            >
              Go back to normal sign-in
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
