 "use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from './lib/supabase'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Fingerprint, X, ShieldCheck, Loader2, ChevronRight, 
  Delete, ArrowLeft, Zap, BrainCircuit, MessageSquareText, 
  SmartphoneNfc, Sparkles, Send, Moon, Sun 
} from 'lucide-react';

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlShopSlug = searchParams.get('shop'); 

  // THEME STATE (Default to Premium White)
  const [isDark, setIsDark] = useState(false);

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

  // 🔥 DYNAMIC THEME CLASSES
  const theme = {
    bg: isDark ? 'bg-[#050505]' : 'bg-[#FAFAFD]',
    text: isDark ? 'text-white' : 'text-[#111111]',
    textMuted: isDark ? 'text-zinc-400' : 'text-zinc-500',
    nav: isDark ? 'bg-[#050505]/80 border-white/5' : 'bg-white/70 border-black/5',
    card: isDark ? 'bg-gradient-to-br from-[#111] to-[#0a0a0a] border-white/5' : 'bg-white border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.05)]',
    cardInner: isDark ? 'bg-[#050505] border-white/5' : 'bg-[#FAFAFD] border-black/5',
    input: isDark ? 'bg-[#111] border-white/5 text-white active:bg-white/10' : 'bg-[#F2F2F7] border-black/5 text-black active:bg-black/5',
    modalBg: isDark ? 'bg-[#0A0A0A] border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.8)]' : 'bg-white border-black/5 shadow-[0_-20px_80px_rgba(0,0,0,0.15)]',
  };

  return (
    <main className={`min-h-screen ${theme.bg} ${theme.text} relative overflow-x-hidden font-sans transition-colors duration-500 selection:bg-blue-500/30`}>
      
      {/* 🌌 HYBRID GLOWS (Adapts to theme) */}
      <div className={`absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] ${isDark ? 'bg-blue-500/10' : 'bg-blue-500/5'} blur-[150px] rounded-full pointer-events-none transition-colors duration-500`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] ${isDark ? 'bg-purple-500/10' : 'bg-purple-500/5'} blur-[150px] rounded-full pointer-events-none transition-colors duration-500`} />

      {/* 👑 PREMIUM NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl border-b ${theme.nav} transition-colors duration-500`}>
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight">QReBill.</span>
          </div>
          
          <div className={`hidden md:flex items-center gap-8 text-sm font-bold ${theme.textMuted}`}>
            <a href="#features" className={`hover:${theme.text} transition-colors`}>Platform</a>
            <a href="#ai" className={`hover:${theme.text} transition-colors`}>Neural AI</a>
            <a href="#pricing" className={`hover:${theme.text} transition-colors`}>Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            {/* THEME TOGGLE */}
            <button 
              onClick={() => setIsDark(!isDark)} 
              className={`p-2.5 rounded-full border transition-all active:scale-95 ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <Sun className="w-4 h-4 text-zinc-300" />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Moon className="w-4 h-4 text-zinc-600" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            <button onClick={() => setIsModalOpen(true)} className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 border ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black text-white hover:bg-zinc-800 shadow-xl shadow-black/10'}`}>
              Store Login
            </button>
          </div>
        </div>
      </nav>

      {/* 🚀 HERO SECTION (Apple x Samsung Vibe) */}
      <section className="relative pt-40 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center text-center z-10 mt-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100 shadow-sm'}`}>
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">The Future of Retail OS</span>
        </motion.div>
        
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] bg-clip-text text-transparent mb-6 max-w-4xl ${isDark ? 'bg-gradient-to-b from-white to-zinc-500' : 'bg-gradient-to-b from-black to-zinc-600'}`}>
          Kill Paper Bills. <br />Print Money.
        </motion.h1>
        
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`text-lg md:text-xl font-medium max-w-2xl mb-12 leading-relaxed ${theme.textMuted}`}>
          The ultimate Operating System for local retail empires. Lightning-fast QR checkout meets predictive AI that reads your customer's mind.
        </motion.p>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4">
          <button className="px-8 py-4 bg-blue-600 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all shadow-[0_10px_40px_rgba(37,99,235,0.3)] flex items-center gap-2 active:scale-95">
            Start Free Trial <ChevronRight className="w-4 h-4" />
          </button>
          <button className={`px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all active:scale-95 border ${isDark ? 'bg-[#111] border-white/10 hover:bg-white/5' : 'bg-white border-black/10 hover:bg-gray-50 shadow-sm'}`}>
            Book a Demo
          </button>
        </motion.div>
      </section>

      {/* 🍱 LIQUID BENTO GRID FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
          
          {/* BENTO 1: Neural Insights */}
          <div className={`md:col-span-1 md:row-span-2 ${theme.card} rounded-[2rem] p-8 flex flex-col relative overflow-hidden group transition-colors duration-500`}>
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] transition-all duration-500 ${isDark ? 'bg-purple-500/10 group-hover:bg-purple-500/20' : 'bg-purple-500/5 group-hover:bg-purple-500/10'}`} />
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 relative z-10 border ${isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-100'}`}>
              <BrainCircuit className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-2xl font-black mb-3 relative z-10 tracking-tight">Neural AI Engine</h3>
            <p className={`${theme.textMuted} text-sm font-medium leading-relaxed relative z-10 mb-8`}>
              Graphs tell you the past. Our AI tells you the future. Detect 'Whale' spenders and hidden buying patterns automatically.
            </p>
            <div className={`mt-auto ${theme.cardInner} rounded-2xl p-4 relative z-10 transition-colors duration-500`}>
               <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">Pattern Detected</p>
               <p className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>12 drop-offs for Red Hoodie share a preference for Slim Fit.</p>
            </div>
          </div>

          {/* BENTO 2: QR Checkout */}
          <div className={`md:col-span-2 ${theme.card} rounded-[2rem] p-8 flex flex-col justify-center relative overflow-hidden group transition-colors duration-500`}>
            <div className={`absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[80px] transition-all duration-500 ${isDark ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-blue-500/5 group-hover:bg-blue-500/10'}`} />
            <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                <SmartphoneNfc className="w-7 h-7 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black mb-3 tracking-tight">Scan. Bill. Done in 3 Seconds.</h3>
                <p className={`${theme.textMuted} text-sm font-medium leading-relaxed max-w-md`}>
                  No heavy PCs. Just scan the unique QR on your product using any smartphone and instantly generate elegant digital invoices.
                </p>
              </div>
            </div>
          </div>

          {/* BENTO 3: Campaign Blaster */}
          <div className={`md:col-span-2 ${theme.card} rounded-[2rem] p-8 flex flex-col justify-center relative overflow-hidden group transition-colors duration-500`}>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] transition-all duration-500 ${isDark ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-emerald-500/5 group-hover:bg-emerald-500/10'}`} />
            <div className="flex items-center justify-between relative z-10">
              <div className="max-w-md">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                  <MessageSquareText className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black mb-3 tracking-tight">Campaign Blaster</h3>
                <p className={`${theme.textMuted} text-sm font-medium leading-relaxed`}>
                  Generate highly personalized 1-on-1 WhatsApp offers with a single tap based on customer visit frequency and favorites.
                </p>
              </div>
              <div className={`hidden sm:flex w-32 h-32 rounded-[2rem] items-center justify-center ${theme.cardInner} transition-colors duration-500`}>
                 <Send className="w-10 h-10 text-emerald-500 ml-2" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER PUSH */}
      <footer className={`border-t relative z-10 transition-colors duration-500 ${isDark ? 'bg-[#050505] border-white/5' : 'bg-white border-black/5'}`}>
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Zap className="w-4 h-4 text-blue-500 fill-blue-500" />
            <span className="text-lg font-black tracking-tight">QReBill.</span>
          </div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>© 2026 QReBill SaaS. Designed for Empire Builders.</p>
        </div>
      </footer>

      {/* 🔒 ONE UI 8.5 x iOS 17 FLOATING LOGIN MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md sm:items-center sm:p-4">
            <motion.div 
              initial={{ y: "100%", scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: "100%", scale: 0.95 }} transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className={`w-full sm:max-w-md rounded-t-[3rem] sm:rounded-[2.5rem] border ${theme.modalBg} relative overflow-hidden pb-12 pt-4 px-6 sm:p-10 min-h-[480px] flex flex-col transition-colors duration-500`}
            >
              <div className={`w-12 h-1.5 rounded-full mx-auto mb-8 sm:hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
              <button onClick={closeModal} className={`absolute top-8 right-8 p-2 rounded-full transition-colors z-10 ${isDark ? 'bg-white/5 hover:bg-white/10 text-zinc-400' : 'bg-black/5 hover:bg-black/10 text-zinc-600'}`}><X className="w-5 h-5" /></button>

              <AnimatePresence mode="wait">
                {!showPinPad ? (
                  <motion.div key="biometric" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center text-center mt-6 flex-1">
                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 border ${isDark ? 'bg-[#111] border-white/5 shadow-inner' : 'bg-blue-50 border-blue-100 shadow-sm'}`}>
                      <ShieldCheck className="w-12 h-12 text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-black mb-3 tracking-tight">Secure Access</h2>
                    <p className={`${theme.textMuted} text-sm mb-10 font-medium px-6 leading-relaxed`}>Confirm your identity to manage your store's command center.</p>

                    <button onClick={triggerScreenLock} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-lg py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_30px_rgba(37,99,235,0.2)]">
                       <Fingerprint className="w-7 h-7" /> Use Screen Lock
                    </button>

                    <div className="flex items-center gap-4 w-full mt-10 mb-6">
                      <div className={`h-[1px] flex-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme.textMuted}`}>OR</span>
                      <div className={`h-[1px] flex-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}></div>
                    </div>
                    
                    <button onClick={() => setShowPinPad(true)} className={`font-bold text-sm transition-colors py-2 uppercase tracking-widest ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>Use Admin PIN</button>
                    {error && <p className="mt-6 text-red-500 text-sm font-bold bg-red-500/10 px-4 py-2 rounded-xl">{error}</p>}
                  </motion.div>
                ) : (
                  <motion.div key="pinpad" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center w-full mt-4 flex-1">
                    <div className="w-full flex items-center mb-8">
                      <button onClick={() => setShowPinPad(false)} className={`p-3 rounded-full transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}><ArrowLeft className="w-6 h-6" /></button>
                      <h2 className="text-2xl font-black ml-4 tracking-tight">Enter PIN</h2>
                    </div>

                    <div className="flex gap-5 mb-12">
                      {[...Array(4)].map((_, i) => (<div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-blue-500 border-blue-500 scale-125 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : (isDark ? 'border-white/10' : 'border-black/10')}`} />))}
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                        <button key={n} onClick={() => addDigit(n)} className={`h-16 rounded-[1.2rem] text-2xl font-black transition-all ${theme.input}`}>{n}</button>
                      ))}
                      <button onClick={removeDigit} className={`h-16 flex items-center justify-center transition-colors ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-black'}`}><Delete className="w-7 h-7" /></button>
                      <button onClick={() => addDigit('0')} className={`h-16 rounded-[1.2rem] text-2xl font-black transition-all ${theme.input}`}>0</button>
                      <button onClick={handlePinSubmit} disabled={pin.length < 4 || loading} className="h-16 bg-blue-600 text-white rounded-[1.2rem] flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all shadow-lg">
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FAFAFD]"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>}>
      <LandingContent />
    </Suspense>
  );
}
