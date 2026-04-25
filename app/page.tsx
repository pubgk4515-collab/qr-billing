'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from './lib/supabase'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldCheck, Loader2, ChevronRight, Delete, ArrowLeft, 
  SmartphoneNfc, Moon, Sun, BarChart3, Fingerprint, Layers,
  QrCode, Lock, RefreshCcw, BellRing
} from 'lucide-react';

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlShopSlug = searchParams.get('shop'); 

  const [isDark, setIsDark] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const theme = {
    bg: isDark ? 'bg-black' : 'bg-white',
    text: isDark ? 'text-white' : 'text-black',
    textMuted: isDark ? 'text-[#888888]' : 'text-[#666666]',
    nav: isDark ? 'bg-black/70 border-white/10' : 'bg-white/70 border-black/5',
    sectionBg: isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]',
    card: isDark ? 'bg-[#111111] border-white/5' : 'bg-white border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
    cardInner: isDark ? 'bg-[#1C1C1E]' : 'bg-[#F2F2F7]',
    input: isDark ? 'bg-[#1C1C1E] text-white' : 'bg-[#F2F2F7] text-black',
    modalBg: isDark ? 'bg-[#111111] border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.9)]' : 'bg-white border-black/5 shadow-[0_-20px_80px_rgba(0,0,0,0.1)]',
    primaryBtn: isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800',
    secondaryBtn: isDark ? 'bg-[#1C1C1E] text-white hover:bg-[#2C2C2E]' : 'bg-[#F2F2F7] text-black hover:bg-[#E5E5EA]',
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <main className={`min-h-screen flex flex-col ${theme.bg} ${theme.text} transition-colors duration-500 font-sans selection:bg-blue-500/30`}>
      
      <nav className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl border-b ${theme.nav} transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            <span className="text-lg font-bold tracking-tight">QReBill</span>
          </div>
          
          <div className={`hidden md:flex items-center gap-8 text-xs font-semibold tracking-wide uppercase ${theme.textMuted}`}>
            <a href="#inventory" className={`hover:${theme.text} transition-colors`}>Smart Tags</a>
            <a href="#control" className={`hover:${theme.text} transition-colors`}>Floor Control</a>
            <a href="#crm" className={`hover:${theme.text} transition-colors`}>Live CRM</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition-colors ${theme.secondaryBtn}`}>
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div key="sun" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Sun className="w-4 h-4" /></motion.div>
                ) : (
                  <motion.div key="moon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Moon className="w-4 h-4" /></motion.div>
                )}
              </AnimatePresence>
            </button>
            <button onClick={() => setIsModalOpen(true)} className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all active:scale-95 ${theme.primaryBtn}`}>
              Console
            </button>
          </div>
        </div>
      </nav>

      {/* 🚀 THE NEW HERO: 100% Focused on Live Tracking & Control */}
      <section className="pt-48 pb-32 px-6 max-w-5xl mx-auto flex flex-col items-center text-center z-10 w-full">
        <motion.p initial="hidden" animate="visible" variants={fadeUp} className={`text-xs font-bold uppercase tracking-[0.2em] mb-6 ${theme.textMuted}`}>
          Beyond Billing. Total Retail Infrastructure.
        </motion.p>
        
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} className="text-6xl md:text-[5.5rem] font-medium tracking-tighter leading-[1.05] mb-8">
          Every Product. <br />
          <span className={theme.textMuted}>Tracked Live.</span>
        </motion.h1>
        
        <motion.p initial="hidden" animate="visible" variants={fadeUp} className={`text-lg md:text-xl font-normal max-w-3xl mb-12 leading-relaxed ${theme.textMuted}`}>
          Deploy intelligent QR tags. Watch customers scan, build bags, and checkout in real-time. Global inventory locking prevents double-scans automatically.
        </motion.p>
        
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-4">
          <button className={`px-8 py-4 rounded-full font-semibold text-sm transition-all active:scale-95 ${theme.primaryBtn}`}>
            Deploy Control System
          </button>
          <button className={`px-8 py-4 rounded-full font-semibold text-sm transition-all active:scale-95 ${theme.secondaryBtn}`}>
            See Tag System
          </button>
        </motion.div>
      </section>

      {/* 🧩 SECTION 1: THE "TAG" SYSTEM (The Real Innovation) */}
      <section id="inventory" className={`py-32 px-6 ${theme.sectionBg} transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">How Tags Power Your Store.</h2>
            <p className={`text-xl font-normal leading-relaxed ${theme.textMuted}`}>
              Every physical item gets a unique digital identity. This isn't just a barcode; it's a state-machine that updates instantly across your entire retail floor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tag Flow 1 */}
            <div className={`${theme.card} rounded-[2rem] p-8 flex flex-col relative overflow-hidden`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${theme.cardInner}`}>
                <QrCode className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3 tracking-tight">1. Customer Scans</h3>
              <p className={`${theme.textMuted} text-sm leading-relaxed mb-6`}>
                The physical product connects to the customer's phone, moving instantly into their personal 'Digital Bag'.
              </p>
              <div className={`mt-auto p-4 rounded-xl ${theme.cardInner} font-mono text-xs flex justify-between`}>
                <span className={theme.textMuted}>TAG001_SHIRT</span>
                <span className="text-blue-500 font-bold">SCANNED</span>
              </div>
            </div>

            {/* Tag Flow 2: The "In-Bag" Conflict Resolver */}
            <div className={`${theme.card} rounded-[2rem] p-8 flex flex-col relative overflow-hidden`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${theme.cardInner}`}>
                <Lock className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3 tracking-tight">2. Global System Lock</h3>
              <p className={`${theme.textMuted} text-sm leading-relaxed mb-6`}>
                First scanner claims the item. The system globally locks this specific tag. No two customers can scan or buy the same piece.
              </p>
              <div className={`mt-auto p-4 rounded-xl ${theme.cardInner} font-mono text-xs flex justify-between border border-rose-500/20`}>
                <span className={theme.textMuted}>TAG001_SHIRT</span>
                <span className="text-rose-500 font-bold">IN BAG (LOCKED)</span>
              </div>
            </div>

            {/* Tag Flow 3 */}
            <div className={`${theme.card} rounded-[2rem] p-8 flex flex-col relative overflow-hidden`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${theme.cardInner}`}>
                <RefreshCcw className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3 tracking-tight">3. Payment & Auto-Reset</h3>
              <p className={`${theme.textMuted} text-sm leading-relaxed mb-6`}>
                Upon successful checkout, the inventory deducts. If the cart is abandoned, the tag auto-resets for the next customer.
              </p>
              <div className={`mt-auto p-4 rounded-xl ${theme.cardInner} font-mono text-xs flex justify-between border border-emerald-500/20`}>
                <span className={theme.textMuted}>TAG001_SHIRT</span>
                <span className="text-emerald-500 font-bold">BILLED & CLEARED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📊 SECTION 2: ACTIONABLE CRM (Stop showing graphs, show MONEY) */}
      <section id="crm" className="py-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">Stop Looking at Charts. <br/>Look at the Money.</h2>
            <p className={`text-xl font-normal leading-relaxed mb-10 ${theme.textMuted}`}>
              Generic POS systems show you what you earned. QReBill shows you exactly what you lost today, and gives you the trigger to win it back.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 mt-1"><span className="w-2 h-2 rounded-full bg-rose-500"/></div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Abandonment Tracing</h4>
                  <p className={`text-sm ${theme.textMuted} leading-relaxed`}>Know exactly which customer scanned which product, put it in their bag, but walked out without paying.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-1"><span className="w-2 h-2 rounded-full bg-green-500"/></div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Instant Revenue Recovery</h4>
                  <p className={`text-sm ${theme.textMuted} leading-relaxed`}>One tap to launch a hyper-personalized WhatsApp campaign targeting exactly those lost items.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:w-1/2 w-full">
             {/* 🔥 The "Actionable Data" UI Widget */}
             <div className={`${theme.card} w-full rounded-[3rem] p-8 flex flex-col relative overflow-hidden border-rose-500/10`}>
                <div className="flex items-center gap-3 mb-8">
                  <BellRing className="w-5 h-5 text-rose-500" />
                  <span className="text-sm font-semibold">Today's Revenue Leak</span>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-5xl font-medium tracking-tighter text-rose-500 mb-2">₹3,240</h3>
                  <p className={`text-sm ${theme.textMuted}`}>Potential loss identified. 12 items scanned but not billed today.</p>
                </div>

                <div className="space-y-3 mb-8">
                  <div className={`w-full p-4 rounded-xl ${theme.cardInner} flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-black/10 dark:bg-white/10" />
                      <div><p className="text-sm font-semibold">Premium Denim</p><p className={`text-xs ${theme.textMuted}`}>Abandoned by 3 customers</p></div>
                    </div>
                  </div>
                  <div className={`w-full p-4 rounded-xl ${theme.cardInner} flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-black/10 dark:bg-white/10" />
                      <div><p className="text-sm font-semibold">Cotton T-Shirt</p><p className={`text-xs ${theme.textMuted}`}>Abandoned by 5 customers</p></div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-2xl active:scale-95 transition-transform">
                  Trigger WhatsApp Recovery
                </button>
             </div>
          </div>
        </div>
      </section>

      <footer className={`mt-auto border-t py-12 px-6 transition-colors duration-500 ${isDark ? 'border-white/10 bg-black' : 'border-black/5 bg-white'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Layers className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold tracking-tight">QReBill OS.</span>
          </div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>
            © 2026 Designed for Retail Empires.
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-md sm:items-center sm:p-4">
            <motion.div initial={{ y: "100%", scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: "100%", scale: 0.95 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className={`w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl border ${theme.modalBg} relative overflow-hidden pb-12 pt-4 px-6 sm:p-10 min-h-[480px] flex flex-col transition-colors duration-500`}>
              <div className={`w-12 h-1.5 rounded-full mx-auto mb-8 sm:hidden ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />
              <button onClick={closeModal} className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-10 ${theme.secondaryBtn}`}><X className="w-5 h-5" /></button>
              <AnimatePresence mode="wait">
                {!showPinPad ? (
                  <motion.div key="biometric" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center text-center mt-6 flex-1">
                    <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-8 ${theme.cardInner}`}><ShieldCheck className="w-10 h-10 text-blue-500" /></div>
                    <h2 className="text-2xl font-semibold mb-2 tracking-tight">Console Access</h2>
                    <p className={`${theme.textMuted} text-sm mb-10 font-medium px-4`}>Authenticate identity to enter the control layer.</p>
                    <button onClick={triggerScreenLock} disabled={loading} className={`w-full font-bold text-sm py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${theme.primaryBtn}`}><Fingerprint className="w-5 h-5" /> Use Biometrics</button>
                    <div className="flex items-center gap-4 w-full mt-8 mb-6"><div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div><span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.textMuted}`}>OR</span><div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div></div>
                    <button onClick={() => setShowPinPad(true)} className={`font-semibold text-xs transition-colors py-2 uppercase tracking-widest ${theme.textMuted} hover:${theme.text}`}>Use Passcode</button>
                    {error && <p className="mt-6 text-red-500 text-xs font-bold">{error}</p>}
                  </motion.div>
                ) : (
                  <motion.div key="pinpad" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center w-full mt-2 flex-1">
                    <div className="w-full flex items-center mb-8"><button onClick={() => setShowPinPad(false)} className={`p-2 rounded-full transition-colors ${theme.secondaryBtn}`}><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold ml-4 tracking-tight">Enter Passcode</h2></div>
                    <div className="flex gap-4 mb-10">{[...Array(4)].map((_, i: number) => (<div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-blue-500 scale-110' : (isDark ? 'bg-white/10' : 'bg-black/10')}`} />))}</div>
                    <div className="grid grid-cols-3 gap-3 w-full max-w-xs">{['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n: string) => (<button key={n} onClick={() => addDigit(n)} className={`h-14 rounded-2xl text-xl font-medium transition-all ${theme.input}`}>{n}</button>))}
                      <button onClick={removeDigit} className={`h-14 flex items-center justify-center transition-colors ${theme.textMuted} hover:${theme.text}`}><Delete className="w-6 h-6" /></button>
                      <button onClick={() => addDigit('0')} className={`h-14 rounded-2xl text-xl font-medium transition-all ${theme.input}`}>0</button>
                      <button onClick={handlePinSubmit} disabled={pin.length < 4 || loading} className={`h-14 rounded-2xl flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all ${theme.primaryBtn}`}>{loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ChevronRight className="w-8 h-8" />}</button></div>
                    {error && <p className="mt-6 text-red-500 text-xs font-bold">{error}</p>}
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-black animate-spin" /></div>}>
      <LandingContent />
    </Suspense>
  );
}
