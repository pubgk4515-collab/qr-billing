'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase'; // Path check kar lena
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2, Delete, ChevronRight, Smartphone } from 'lucide-react';

export default function GlobalRootLogin() {
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Device Detection (40+ users ke liye UI adjust karne ke liye)
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsDesktop(!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua));
  }, []);

  // 2. THE TYPO KILLER: Sahi Slug par bhejne wala logic
  const handleSmartRedirect = async (userId: string) => {
    try {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('slug')
        .eq('owner_id', userId)
        .single();

      if (storeError || !store) throw new Error("Dukaan nahi mili!");

      // Hamesha DB wala sahi slug use hoga (mrr-fashion wala error khatam)
      router.push(`/admin/${store.slug}`);
    } catch (err) {
      setError("Login failed: Store not linked.");
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');

    try {
      // Yahan hum future mein PIN verify karenge Supabase se
      // Abhi testing ke liye, user login hote hi redirect:
      setTimeout(() => handleSmartRedirect('test-user-id'), 800);
    } catch (err) {
      setError("Galat PIN! Dubara koshish karein.");
      setLoading(false);
    }
  };

  const addDigit = (num: string) => { if (pin.length < 6) setPin(p => p + num); };
  const removeDigit = () => setPin(p => p.slice(0, -1));

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
      
      {/* Background Glow */}
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm flex flex-col items-center z-10"
      >
        <div className="w-20 h-20 bg-[#111] border border-white/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl">
          <Lock className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-4xl font-black mb-2 tracking-tight">Main Gate</h1>
        <p className="text-zinc-500 text-sm mb-10 font-medium uppercase tracking-widest">
          {isDesktop ? "Enter Admin PIN" : "Biometric or PIN Login"}
        </p>

        {/* PIN DOTS */}
        <div className="flex gap-4 mb-12">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pin.length > i ? 'bg-white border-white scale-125 shadow-[0_0_15px_white]' : 'border-white/10'}`} />
          ))}
        </div>

        {/* BADA KEYPAD (For 40+ Uncle's fingers) */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
            <button key={n} onClick={() => addDigit(n)} className="h-20 bg-[#111] border border-white/5 rounded-2xl text-2xl font-black hover:bg-white/10 active:scale-90 transition-all">
              {n}
            </button>
          ))}
          <button onClick={removeDigit} className="h-20 flex items-center justify-center text-zinc-500 hover:text-white"><Delete className="w-8 h-8" /></button>
          <button onClick={() => addDigit('0')} className="h-20 bg-[#111] border border-white/5 rounded-2xl text-2xl font-black">0</button>
          <button 
            onClick={handlePinSubmit} disabled={pin.length < 4 || loading}
            className="h-20 bg-white text-black rounded-2xl flex items-center justify-center disabled:opacity-20 active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ChevronRight className="w-10 h-10" />}
          </button>
        </div>

        {error && <p className="mt-8 text-red-500 font-bold bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>}
      </motion.div>

      <footer className="fixed bottom-10 opacity-20 text-[10px] tracking-[0.5em] font-black uppercase">
        SaaS Engine v1.0
      </footer>
    </main>
  );
}
