'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase'; // Path verify kar lena
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Fingerprint, X, ShieldCheck, Loader2, ChevronRight, Delete, ArrowLeft } from 'lucide-react';

export default function SaaSMainGate() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false); // Modal ke andar PIN view switch karne ke liye
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🚀 TEMP TEST BYPASS: Database verify kiye bina direct aapki dukaan kholne ke liye
  const bypassAndTest = () => {
    // Ye line aapko direct admin dashboard dikhayegi bina error ke
    router.push('/admin/mr-fashion'); 
  };

  // 🔥 Asli Typo Killer Router (Future use ke liye jab Auth lag jayega)
  const handleSmartRedirect = async (userId: string) => {
    try {
      const { data: store, error: storeError } = await supabase.from('stores').select('slug').eq('owner_id', userId).single();
      if (storeError || !store) throw new Error("Store not found!");
      router.push(`/admin/${store.slug}`);
    } catch (err) {
      setError("Dukaan verify nahi ho paayi.");
      setLoading(false);
    }
  };

  // 🔐 BIOMETRIC TRIGGER
  const triggerScreenLock = async () => {
    setLoading(true);
    setError('');
    setTimeout(() => {
      bypassAndTest(); // Testing ke liye bypass function call ho raha hai
    }, 1500);
  };

  // 🔢 PIN SUBMIT TRIGGER
  const handlePinSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');
    setTimeout(() => {
      bypassAndTest(); // Testing ke liye bypass function call ho raha hai
    }, 800);
  };

  const addDigit = (num: string) => { if (pin.length < 4) setPin(p => p + num); };
  const removeDigit = () => setPin(p => p.slice(0, -1));

  // Modal band karte waqt sab reset kar do
  const closeModal = () => {
    if (loading) return;
    setIsModalOpen(false);
    setTimeout(() => { setShowPinPad(false); setPin(''); setError(''); }, 300);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans flex flex-col">
      
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 👑 HEADER BRANDING */}
      <header className="w-full pt-12 flex flex-col items-center justify-center z-10">
        <div className="w-14 h-14 bg-[#111] border border-white/10 rounded-[1rem] flex items-center justify-center mb-4 shadow-2xl">
          <Store className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">QR BILLING</h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mt-1">SaaS Engine</p>
      </header>

      {/* 🎯 MAIN CTA */}
      <div className="flex-1 flex items-center justify-center z-10 px-6">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="group relative px-8 py-5 bg-white text-black rounded-2xl font-black text-lg flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]"
        >
          Login to your Store
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 🔒 THE SMART MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden pb-10 pt-4 px-6 sm:p-8 min-h-[400px] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              
              <button onClick={closeModal} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10">
                <X className="w-5 h-5 text-zinc-400" />
              </button>

              <AnimatePresence mode="wait">
                
                {/* --- VIEW 1: BIOMETRIC --- */}
                {!showPinPad ? (
                  <motion.div 
                    key="biometric" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center text-center mt-4 flex-1"
                  >
                    <div className="w-20 h-20 bg-[#111] rounded-[1.5rem] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                      <ShieldCheck className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black mb-2">Secure Login</h2>
                    <p className="text-zinc-400 text-sm mb-8 font-medium px-4">Confirm your identity to access your store's command center.</p>

                    <button 
                      onClick={triggerScreenLock} disabled={loading}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> Verifying...</> : <><Fingerprint className="w-7 h-7" /> Use Screen Lock</>}
                    </button>

                    {/* OR Divider & Backup PIN Trigger */}
                    <div className="flex items-center gap-4 w-full mt-6 mb-4">
                      <div className="h-[1px] flex-1 bg-white/10"></div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">OR</span>
                      <div className="h-[1px] flex-1 bg-white/10"></div>
                    </div>
                    
                    <button onClick={() => setShowPinPad(true)} className="text-zinc-400 font-bold text-sm hover:text-white transition-colors py-2">
                      Use Admin PIN
                    </button>
                    {error && <p className="mt-4 text-red-500 text-sm font-bold">{error}</p>}
                  </motion.div>
                ) : 

                /* --- VIEW 2: PIN PAD --- */
                (
                  <motion.div 
                    key="pinpad" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col items-center w-full mt-2 flex-1"
                  >
                    <div className="w-full flex items-center mb-6">
                      <button onClick={() => setShowPinPad(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5 text-white" />
                      </button>
                      <h2 className="text-xl font-black ml-4">Enter PIN</h2>
                    </div>

                    {/* PIN Dots (4 digits for quick entry) */}
                    <div className="flex gap-4 mb-8">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pin.length > i ? 'bg-emerald-400 border-emerald-400 scale-125 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'border-white/10'}`} />
                      ))}
                    </div>

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-3 w-full">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                        <button key={n} onClick={() => addDigit(n)} className="h-14 bg-[#111] border border-white/5 rounded-xl text-xl font-black active:bg-white/10 transition-colors">
                          {n}
                        </button>
                      ))}
                      <button onClick={removeDigit} className="h-14 flex items-center justify-center text-zinc-500 hover:text-white"><Delete className="w-6 h-6" /></button>
                      <button onClick={() => addDigit('0')} className="h-14 bg-[#111] border border-white/5 rounded-xl text-xl font-black">0</button>
                      <button 
                        onClick={handlePinSubmit} disabled={pin.length < 4 || loading}
                        className="h-14 bg-emerald-500 text-black rounded-xl flex items-center justify-center disabled:opacity-20 active:scale-95 transition-all"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : <ChevronRight className="w-8 h-8" />}
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
