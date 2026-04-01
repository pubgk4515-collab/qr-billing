// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Phone, KeyRound, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { loginStore } from '../actions/authActions';

export default function StoreLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsLoading(true);
    
    // Server action ko call kiya
    const res = await loginStore(phone, passcode);
    
    if (res.success) {
      // Login success! Seedha Admin Dashboard pe bhej do
      router.push('/admin');
    } else {
      setError(res.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md z-10"
      >
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl">
          
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-black rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-lg shadow-black/50">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Optimus HQ</h1>
            <p className="text-zinc-400 text-sm mt-2 font-medium">Enter your store credentials to access the command center.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone Number Input */}
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Store Phone Number"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none focus:border-emerald-500 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
                required
              />
            </div>

            {/* Passcode Input */}
            <div className="relative group">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="password"
                maxLength={4}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                placeholder="4-Digit Passcode"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black tracking-widest text-lg outline-none focus:border-emerald-500 focus:bg-zinc-900 transition-all placeholder:text-zinc-600 placeholder:tracking-normal placeholder:font-medium placeholder:text-base"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm font-bold text-center bg-red-500/10 py-2 rounded-xl border border-red-500/20">
                {error}
              </motion.p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || phone.length < 10 || passcode.length < 4}
              className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl mt-4 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>Access Terminal <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>

        </div>
      </motion.div>
    </main>
  );
}
