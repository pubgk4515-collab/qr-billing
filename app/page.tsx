'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from './lib/supabase'; // Path check kar lena agar 'lib' folder bahar hai toh
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Fingerprint, X, ShieldCheck, Loader2, ChevronRight, Delete, ArrowLeft } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlShopSlug = searchParams.get('shop'); 

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Memory State: Pehle se save shop ya URL se aaya shop
  const [activeShop, setActiveShop] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check memory (localStorage)
    const savedShop = localStorage.getItem('active_admin_session');
    
    if (urlShopSlug) {
      // Naya WhatsApp link aaya hai toh usse priority do
      setActiveShop(urlShopSlug);
      // Link aate hi modal automatically khul jaye uncle ke liye
      setIsModalOpen(true);
    } else if (savedShop) {
      // Purana saved shop hai
      setActiveShop(savedShop);
    }
  }, [urlShopSlug]);

  // 🔥 REAL AUTH LOGIC: PIN Match check aur Sahi Slug par redirection
  const handlePinSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');

    if (!activeShop) {
      setError("Dukaan ki pehchan nahi ho paayi. WhatsApp link use karein.");
      setLoading(false);
      return;
    }

    try {
      // Supabase se asli PIN aur Slug uthao
      const { data: store, error: dbError } = await supabase
        .from('stores')
        .select('slug, admin_pin')
        .eq('slug', activeShop)
        .single();

      if (dbError || !store) {
        setError("Dukaan system mein nahi mili.");
        setLoading(false);
        return;
      }

      // PIN Verification
      if (store.admin_pin === pin) {
        // ✅ SUCCESS: Memory mein save karo (Device Bonding)
        localStorage.setItem('active_admin_session', store.slug);
        
        // Sahi slug par bhej do (Typos ka khatma)
        router.push(`/admin/${store.slug}`); 
      } else {
        // ❌ WRONG PIN
        setError("Galat PIN! Kripya dobara try karein.");
        setPin(''); 
        setLoading(false);
      }
    } catch (err) {
      setError("Network error! Connection check karein.");
      setLoading(false);
    }
  };

  // 🔐 BIOMETRIC TRIGGER (Future Ready)
  const triggerScreenLock = async () => {
    setError("Biometric verify ho raha hai...");
    // Abhi ke liye PIN ki taraf bhej rahe hain bypass ke liye
    setTimeout(() => {
        setError("Biometric pending. PIN use karein.");
        setShowPinPad(true);
    }, 1200);
  };

  const addDigit = (num: string) => { if (pin.length < 4) setPin(p => p + num); };
  const removeDigit = () => setPin(p => p.slice(0, -1));

  const closeModal = () => {
    if (loading) return;
    setIsModalOpen(false);
    setTimeout(() => { setShowPinPad(false); setPin(''); setError(''); }, 300);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans flex flex-col">
      
      {/* Background Aesthetic Glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* 👑 TOP CENTER BRANDING */}
      <header className="w-full pt-16 flex flex-col items-center justify-center z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="w-16 h-16 bg-[#111] border border-white/10 rounded-[1.2rem] flex items-center justify-center mb-4 shadow-2xl"
        >
          <Store className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-4xl font-black tracking-tighter">QR BILLING</h1>
        <div className="flex items-center gap-2 mt-1">
           <span className="h-[1px] w-4 bg-white/20"></span>
           <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-bold">SaaS Engine</p>
           <span className="h-[1px] w-4 bg-white/20"></span>
        </div>
      </header>

      {/* 🎯 MAIN LOGIN BUTTON */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 px-6">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="group relative px-10 py-6 bg-white text-black rounded-[2rem] font-black text-xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-[0_30px_60px_rgba(255,255,255,0.2)]"
        >
          Login to your Store
          <ChevronRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
        </button>
        {activeShop && (
           <p className="mt-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">
             Store: <span className="text-white">{activeShop}</span>
           </p>
        )}
      </div>

      {/* 🔒 FLOATING MODAL (APPLE STYLE) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center sm:p-4">
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[3rem] sm:rounded-[3rem] border border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] relative overflow-hidden pb-12 pt-4 px-6 sm:p-10 min-h-[480px] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 sm:hidden" />
              <button onClick={closeModal} className="absolute top-8 right-8 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"><X className="w-5 h-5 text-zinc-500" /></button>

              <AnimatePresence mode="wait">
                {!showPinPad ? (
                  <motion.div key="biometric" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center text-center mt-6 flex-1">
                    <div className="w-24 h-24 bg-[#111] rounded-[2rem] flex items-center justify-center mb-8 border border-white/5 shadow-inner"><ShieldCheck className="w-12 h-12 text-emerald-400" /></div>
                    <h2 className="text-3xl font-black mb-3">Secure Access</h2>
                    <p className="text-zinc-500 text-sm mb-10 font-medium px-6 leading-relaxed">Confirm your identity to manage your store's dashboard.</p>

                    <button onClick={triggerScreenLock} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg py-6 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_30px_rgba(16,185,129,0.2)]">
                       <Fingerprint className="w-8 h-8" /> Use Screen Lock
                    </button>

                    <div className="flex items-center gap-4 w-full mt-10 mb-6">
                      <div className="h-[1px] flex-1 bg-white/5"></div><span className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">OR</span><div className="h-[1px] flex-1 bg-white/5"></div>
                    </div>
                    
                    <button onClick={() => setShowPinPad(true)} className="text-zinc-400 font-bold text-sm hover:text-white transition-colors py-2 uppercase tracking-widest">Use Admin PIN</button>
                    {error && <p className="mt-6 text-red-500 text-sm font-bold bg-red-500/10 px-4 py-2 rounded-xl">{error}</p>}
                  </motion.div>
                ) : (
                  <motion.div key="pinpad" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center w-full mt-4 flex-1">
                    <div className="w-full flex items-center mb-8">
                      <button onClick={() => setShowPinPad(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><ArrowLeft className="w-6 h-6 text-white" /></button>
                      <h2 className="text-2xl font-black ml-4">Enter PIN</h2>
                    </div>

                    <div className="flex gap-5 mb-12">
                      {[...Array(4)].map((_, i) => (<div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-emerald-400 border-emerald-400 scale-125 shadow-[0_0_20px_rgba(52,211,153,0.6)]' : 'border-white/10'}`} />))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                        <button key={n} onClick={() => addDigit(n)} className="h-16 bg-[#111] border border-white/5 rounded-2xl text-2xl font-black active:bg-white/10 transition-all">{n}</button>
                      ))}
                      <button onClick={removeDigit} className="h-16 flex items-center justify-center text-zinc-600 hover:text-white transition-colors"><Delete className="w-8 h-8" /></button>
                      <button onClick={() => addDigit('0')} className="h-16 bg-[#111] border border-white/5 rounded-2xl text-2xl font-black">0</button>
                      <button onClick={handlePinSubmit} disabled={pin.length < 4 || loading} className="h-16 bg-emerald-500 text-black rounded-2xl flex items-center justify-center disabled:opacity-20 active:scale-95 transition-all shadow-lg">
                        {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <ChevronRight className="w-10 h-10" />}
                      </button>
                    </div>
                    {error && <p className="mt-8 text-red-500 text-sm font-bold">{error}</p>}
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

// 🌐 EXPORT WITH SUSPENSE (Zaroori hai useSearchParams ke liye)
export default function SaaSMainGate() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
