import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ArrowRight, Mail, Lock, User } from 'lucide-react';

interface AuthProps {
  onSuccess: (user: any, token: string) => void;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function Auth({ onSuccess, onClose, initialMode = 'login' }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = mode === 'login' ? { email, password } : { email, password, name };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        onSuccess(data.user, data.token);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-bg brutal-border p-10 overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-ink hover:text-bg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-8">
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">
               {mode === 'login' ? 'Authentication' : 'Registration'}
            </div>
            <h2 className="text-4xl font-black uppercase italic tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-2">
                  <User className="w-3 h-3" /> Full Name
                </label>
                <input 
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="brutal-input"
                  placeholder="e.g. John Doe"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email Address
              </label>
              <input 
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brutal-input"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-2">
                <Lock className="w-3 h-3" /> Password
              </label>
              <input 
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="brutal-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-100 border border-red-500 text-red-700 font-mono text-[10px] uppercase font-bold">
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full brutal-btn bg-ink text-bg text-lg py-4 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="text-center space-y-4">
            <button 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-mono text-xs font-bold uppercase tracking-widest hover:underline block w-full"
            >
              {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
            {mode === 'login' && (
              <button 
                onClick={() => { setEmail('demo@example.com'); setPassword('demo123'); }}
                className="font-mono text-[10px] uppercase font-bold opacity-40 hover:opacity-100 transition-opacity"
              >
                Use Demo Credentials: demo@example.com / demo123
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
