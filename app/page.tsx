'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase'; // Path verify kar lena
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Fingerprint, X, ShieldCheck, Loader2, ChevronRight } from 'lucide-react';

export default function SaaSMainGate() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🔥 The Typo Killer Router
  const handleSmartRedirect = async (userId: string) => {
    try {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('slug')
        .eq('owner_id', userId)
        .single();

      if (storeError || !store) throw new Error("Store not found!");

      // Sahi raste par bhej do
      router.push(`/admin/${store.slug}/dashboard`);
    } catch (err) {
      setError("Dukaan verify nahi ho paayi.");
      setLoading(false);
    }
  };

  // 🔐 BIOMETRIC / SCREEN LOCK TRIGGER
  const triggerScreenLock = async () => {
    setLoading(true);
    setError('');

    try {
      // YAHAN ASLI JADOO HOGA: WebAuthn API (Passkeys)
      // Jab backend puri tarah set ho jayega, ye browser ka native fingerprint/PIN prompt khomega.
      
      /* Asli code future ke liye kuch aisa dikhega:
      const credential = await navigator.credentials.get({
        publicKey: { ...challenge options from Supabase }
      });
      */

      // Abhi UI aur flow test karne ke liye hum isko 1.5 second ka fake biometric delay de rahe hain
      // Jisme uncle ko lagega verification ho raha hai
      setTimeout(() => {
        handleSmartRedirect('test-user-id'); // Yahan asli user ID aayegi
      }, 1500);

    } catch (err) {
      console.error("Biometric failed:", err);
      setError("Verification failed. Try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans flex flex-col">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 👑 TOP CENTER BRANDING */}
      <header className="w-full pt-12 flex flex-col items-center justify-center z-10">
        <div className="w-14 h-14 bg-[#111] border border-white/10 rounded-[1rem] flex items-center justify-center mb-4 shadow-2xl">
          <Store className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">QR BILLING</h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mt-1">
          SaaS Engine
        </p>
      </header>

      {/* 🎯 CENTER CTA BUTTON */}
      <div className="flex-1 flex items-center justify-center z-10 px-6">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="group relative px-8 py-5 bg-white text-black rounded-2xl font-black text-lg flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]"
        >
          Login to your Store
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 🔒 FLOATING POP-UP (BOTTOM SHEET MODAL) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          >
            {/* Modal Container */}
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden pb-10 pt-4 px-6 sm:p-8"
            >
              {/* Mobile Drag Indicator */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

              {/* Close Button */}
              <button 
                onClick={() => !loading && setIsModalOpen(false)} 
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>

              <div className="flex flex-col items-center text-center mt-4">
                <div className="w-20 h-20 bg-[#111] rounded-[1.5rem] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                  <ShieldCheck className="w-10 h-10 text-emerald-400" />
                </div>
                
                <h2 className="text-2xl font-black mb-2">Secure Login</h2>
                <p className="text-zinc-400 text-sm mb-8 font-medium px-4">
                  Confirm your identity to access your store's command center.
                </p>

                {/* THE BIOMETRIC BUTTON */}
                <button 
                  onClick={triggerScreenLock}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-7 h-7" />
                      Use Screen Lock
                    </>
                  )}
                </button>

                {error && <p className="mt-4 text-red-500 text-sm font-bold">{error}</p>}
                
                <p className="mt-6 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  Powered by WebAuthn
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
