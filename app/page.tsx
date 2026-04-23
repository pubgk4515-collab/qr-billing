'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from './lib/supabase'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Fingerprint, X, ShieldCheck, Loader2, ChevronRight, 
  Delete, ArrowLeft, Zap, BrainCircuit, MessageSquareText, 
  BarChart3, SmartphoneNfc, Sparkles, 
  Send
} from 'lucide-react';

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlShopSlug = searchParams.get('shop'); 

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Memory State
  const [activeShop, setActiveShop] = useState<string | null>(null);

  useEffect(() => {
    const savedShop = localStorage.getItem('active_admin_session');
    if (urlShopSlug) {
      setActiveShop(urlShopSlug);
      setIsModalOpen(true);
    } else if (savedShop) {
      setActiveShop(savedShop);
    }
  }, [urlShopSlug]);

  const handlePinSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');

    if (!activeShop) {
      setError("Store identity missing. Use your secure WhatsApp link.");
      setLoading(false);
      return;
    }

    try {
      const { data: store, error: dbError } = await supabase
        .from('stores')
        .select('slug, admin_pin')
        .eq('slug', activeShop)
        .single();

      if (dbError || !store) {
        setError("Store not found in the system.");
        setLoading(false);
        return;
      }

      if (store.admin_pin === pin) {
        localStorage.setItem('active_admin_session', store.slug);
        router.push(`/admin/${store.slug}`); 
      } else {
        setError("Incorrect PIN! Please try again.");
        setPin(''); 
        setLoading(false);
      }
    } catch (err) {
      setError("Network error! Please check your connection.");
      setLoading(false);
    }
  };

  const triggerScreenLock = async () => {
    setError("Verifying Biometrics...");
    setTimeout(() => {
        setError("Biometric pending. Please use PIN.");
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
    <main className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden font-sans selection:bg-emerald-500/30">
      
      {/* 🌌 BACKGROUND GLOWS */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* 👑 NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)]">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">QReBill.</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#ai" className="hover:text-white transition-colors">Neural AI</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95">
            Store Login
          </button>
        </div>
      </nav>

      {/* 🚀 HERO SECTION */}
      <section className="relative pt-40 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center text-center z-10 mt-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">The Future of Retail is Here</span>
        </motion.div>
        
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 mb-6 max-w-4xl">
          Kill Paper Bills. <br />Print Money.
        </motion.h1>
        
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-xl text-zinc-400 font-medium max-w-2xl mb-12 leading-relaxed">
          The ultimate Operating System for local retail empires. Lightning-fast QR checkout meets predictive AI that reads your customer's mind. No hardware required.
        </motion.p>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4">
          <button className="px-8 py-4 bg-emerald-500 text-black rounded-full font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_40px_rgba(52,211,153,0.3)] hover:shadow-[0_0_60px_rgba(52,211,153,0.5)] flex items-center gap-2 active:scale-95">
            Start Free Trial <ChevronRight className="w-4 h-4" />
          </button>
          <button className="px-8 py-4 bg-[#111] border border-white/10 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95">
            Book a Demo
          </button>
        </motion.div>
      </section>

      {/* 🍱 BENTO GRID FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
          
          {/* BENTO 1: Large Left - Neural Insights */}
          <div className="md:col-span-1 md:row-span-2 bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] group-hover:bg-purple-500/20 transition-all duration-500" />
            <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-6 relative z-10">
              <BrainCircuit className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 relative z-10">Neural Insights Engine</h3>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed relative z-10 mb-8">
              Graphs tell you the past. Our AI tells you the future. Detect 'Whale' spenders, abandonment clusters, and hidden buying patterns automatically.
            </p>
            {/* Fake UI Element */}
            <div className="mt-auto bg-[#050505] border border-white/5 rounded-2xl p-4 relative z-10">
               <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">Abandonment Alert</p>
               <p className="text-xs font-bold text-zinc-300">12 drop-offs for Red Hoodie share a preference for Slim Fit.</p>
            </div>
          </div>

          {/* BENTO 2: Top Right Wide - QR Checkout */}
          <div className="md:col-span-2 bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[80px] group-hover:bg-emerald-500/20 transition-all duration-500" />
            <div className="flex items-start gap-6 relative z-10">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center shrink-0">
                <SmartphoneNfc className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white mb-3">Scan. Bill. Done in 3 Seconds.</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-md">
                  No barcode scanners. No heavy PCs. Just scan the unique QR on your product using any smartphone and instantly generate digital invoices.
                </p>
              </div>
            </div>
          </div>

          {/* BENTO 3: Bottom Right Wide - Campaign Blaster */}
          <div className="md:col-span-2 bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] group-hover:bg-blue-500/10 transition-all duration-500" />
            <div className="flex items-center justify-between relative z-10">
              <div className="max-w-md">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquareText className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-3">WhatsApp Campaign Blaster</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                  Filter your database by VIPs or "At Risk" customers. Generate highly personalized 1-on-1 WhatsApp offers with a single tap. 
                </p>
              </div>
              <div className="hidden sm:flex w-32 h-32 bg-[#050505] border border-white/5 rounded-[2rem] items-center justify-center shadow-inner">
                 <Send className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER PUSH */}
      <footer className="border-t border-white/5 bg-[#050505] relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
            <span className="text-lg font-black tracking-tight text-white">QReBill.</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">© 2026 QReBill SaaS. Designed for Empire Builders.</p>
        </div>
      </footer>

      {/* 🔒 THE ORIGINAL FLOATING LOGIN MODAL (Kept exactly as you built it) */}
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

export default function SaaSMainGate() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>}>
      <LandingContent />
    </Suspense>
  );
}
