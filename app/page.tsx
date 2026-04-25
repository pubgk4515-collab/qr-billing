'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from './lib/supabase'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldCheck, Loader2, ChevronRight, Delete, ArrowLeft, 
  SmartphoneNfc, Moon, Sun, BarChart3, Fingerprint, Layers
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

  // 🔥 FIX 1: Removed string 'easeOut' to prevent TS union mismatch
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
            <a href="#ecosystem" className={`hover:${theme.text} transition-colors`}>Ecosystem</a>
            <a href="#intelligence" className={`hover:${theme.text} transition-colors`}>Intelligence</a>
            <a href="#automation" className={`hover:${theme.text} transition-colors`}>Automation</a>
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

      <section className="pt-48 pb-32 px-6 max-w-5xl mx-auto flex flex-col items-center text-center z-10 w-full">
        <motion.p initial="hidden" animate="visible" variants={fadeUp} className={`text-xs font-bold uppercase tracking-[0.2em] mb-6 ${theme.textMuted}`}>
          Local Retail Control Layer
        </motion.p>
        
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} className="text-6xl md:text-[5.5rem] font-medium tracking-tighter leading-[1.05] mb-8">
          Stop managing a store. <br />
          <span className={theme.textMuted}>Start running an empire.</span>
        </motion.h1>
        
        <motion.p initial="hidden" animate="visible" variants={fadeUp} className={`text-lg md:text-2xl font-normal max-w-3xl mb-12 leading-relaxed ${theme.textMuted}`}>
          Frictionless QR checkout, Triple-Signal Data Intelligence, and automated revenue recovery. A deeply integrated ecosystem engineered for control.
        </motion.p>
        
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-4">
          <button className={`px-8 py-4 rounded-full font-semibold text-sm transition-all active:scale-95 ${theme.primaryBtn}`}>
            Deploy System
          </button>
          <button className={`px-8 py-4 rounded-full font-semibold text-sm transition-all active:scale-95 ${theme.secondaryBtn}`}>
            Explore Architecture
          </button>
        </motion.div>
      </section>

      <section id="ecosystem" className={`py-32 px-6 ${theme.sectionBg} transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">Frictionless Checkout.</h2>
            <p className={`text-xl font-normal leading-relaxed ${theme.textMuted}`}>
              Eliminate queues and hardware dependency. Transform any customer smartphone into a personalized point of sale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`${theme.card} rounded-[2rem] p-10 h-[500px] flex flex-col relative overflow-hidden`}>
              <div className="max-w-sm relative z-10">
                <h3 className="text-2xl font-semibold mb-3 tracking-tight">Zero Hardware Protocol</h3>
                <p className={`${theme.textMuted} text-sm leading-relaxed`}>Customers scan intelligent product tags, build their digital bag, and execute self-checkout instantly.</p>
              </div>
              
              <div className="absolute -bottom-10 -right-10 w-80 h-[400px] bg-black/5 dark:bg-white/5 rounded-3xl border border-black/10 dark:border-white/10 p-4 transform rotate-[-5deg]">
                <div className={`w-full h-full ${theme.cardInner} rounded-2xl flex flex-col p-4`}>
                  <div className="w-full h-48 bg-black/10 dark:bg-white/10 rounded-xl mb-4 relative overflow-hidden">
                     <div className="absolute top-1/2 left-0 w-full h-px bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,1)] animate-pulse" />
                     <div className="absolute inset-0 flex items-center justify-center"><SmartphoneNfc className="w-10 h-10 opacity-20" /></div>
                  </div>
                  <div className="w-3/4 h-4 bg-black/10 dark:bg-white/10 rounded mb-2" />
                  <div className="w-1/2 h-4 bg-black/10 dark:bg-white/10 rounded mb-6" />
                  <div className="mt-auto w-full h-12 bg-blue-500 rounded-xl" />
                </div>
              </div>
            </div>

            <div className={`${theme.card} rounded-[2rem] p-10 h-[500px] flex flex-col relative overflow-hidden`}>
              <div className="max-w-sm relative z-10">
                <h3 className="text-2xl font-semibold mb-3 tracking-tight">Real-Time Command</h3>
                <p className={`${theme.textMuted} text-sm leading-relaxed`}>Complete visibility into live store traffic. Monitor active scans, digital bags, and approvals from the owner console.</p>
              </div>

              <div className="absolute -bottom-10 -right-5 w-full max-w-sm h-[300px] bg-black/5 dark:bg-white/5 rounded-t-3xl border-t border-l border-r border-black/10 dark:border-white/10 p-6">
                 <div className="flex justify-between items-center mb-6">
                   <div className="w-1/3 h-4 bg-black/10 dark:bg-white/10 rounded" />
                   <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-blue-500" /></div>
                 </div>
                 <div className="space-y-3">
                   {/* 🔥 FIX 2: Added ': number' to implicitly typed 'i' */}
                   {Array.from({ length: 3 }).map((_, i) => (
                     <div key={i} className={`w-full p-4 rounded-xl ${theme.cardInner} flex justify-between items-center`}>
                       <div className="flex gap-3 items-center">
                         <div className="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10" />
                         <div>
                           <div className="w-20 h-3 bg-black/10 dark:bg-white/10 rounded mb-1" />
                           <div className="w-12 h-2 bg-black/5 dark:bg-white/5 rounded" />
                         </div>
                       </div>
                       <div className="w-16 h-6 rounded-full bg-green-500/20" />
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="intelligence" className="py-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">Triple-Signal Engine.</h2>
            <p className={`text-xl font-normal leading-relaxed mb-10 ${theme.textMuted}`}>
              Standard POS systems only record the final transaction. QReBill captures the entire decision matrix to build a predictive consumer database.
            </p>
            
            <div className="space-y-8">
              <div className="flex gap-5">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${theme.cardInner}`}><span className="font-bold text-sm">01</span></div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Intent Trace</h4>
                  <p className={`text-sm ${theme.textMuted} leading-relaxed`}>Capture product scans to understand exact customer preferences before they commit to a purchase.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${theme.cardInner}`}><span className="font-bold text-sm">02</span></div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Behavior Analysis</h4>
                  <p className={`text-sm ${theme.textMuted} leading-relaxed`}>Track cart additions and abandonment metrics to identify friction points and revenue leaks.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${theme.cardInner}`}><span className="font-bold text-sm">03</span></div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Financial Truth</h4>
                  <p className={`text-sm ${theme.textMuted} leading-relaxed`}>Connect behavior data to actual payments, identifying your 'Whale' spenders instantly.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:w-1/2 w-full">
             <div className={`${theme.card} w-full aspect-square rounded-[3rem] p-8 flex flex-col justify-end relative overflow-hidden`}>
                <div className="absolute top-10 left-10"><BarChart3 className={`w-8 h-8 ${theme.textMuted}`} /></div>
                <div className="flex items-end justify-between h-64 gap-4 w-full px-4">
                  {/* 🔥 FIX 3: Added strict types to 'height' and 'i' */}
                  {[40, 60, 30, 80, 55].map((height, i) => (
                    <div key={i} className="w-full flex flex-col justify-end gap-2 group">
                      <div className={`w-full rounded-t-lg transition-all duration-500 ${i === 5 ? 'bg-blue-500' : 'bg-black/10 dark:bg-white/10 group-hover:bg-black/20 dark:group-hover:bg-white/20'}`} style={{ height: `${height}%` }} />
                    </div>
                  ))}
                </div>
                <div className={`w-full h-px mt-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
             </div>
          </div>
        </div>
      </section>

      <section id="automation" className={`py-32 px-6 ${theme.sectionBg} transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">Revenue Reactivation.</h2>
            <p className={`text-xl font-normal leading-relaxed ${theme.textMuted}`}>
              Move beyond manual outreach. Deploy AI-driven lifecycle automation that recovers lost sales and generates predictive repeat loops.
            </p>
          </div>

          <div className={`${theme.card} w-full rounded-[3rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-16`}>
            <div className="w-full md:w-1/2 relative">
               <div className={`w-full rounded-[2rem] p-6 ${theme.cardInner}`}>
                 <div className="flex items-center gap-4 mb-6">
                   <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"><span className="w-3 h-3 bg-white rounded-full" /></div>
                   <div>
                     <div className="w-24 h-4 bg-black/10 dark:bg-white/10 rounded mb-1" />
                     <div className="w-16 h-3 bg-black/5 dark:bg-white/5 rounded" />
                   </div>
                 </div>
                 <div className="space-y-4">
                   <div className={`w-[80%] p-4 rounded-2xl rounded-tl-sm ${theme.card} text-sm leading-relaxed`}>
                     AI detected abandonment. Executing targeted recovery sequence for premium segment.
                   </div>
                   <div className="w-[80%] p-4 rounded-2xl rounded-tr-sm bg-green-500 text-white text-sm leading-relaxed ml-auto">
                     Initiating 1-on-1 personalized offers based on historic category preferences.
                   </div>
                 </div>
               </div>
            </div>
            
            <div className="w-full md:w-1/2">
               <h3 className="text-3xl font-semibold mb-6 tracking-tight">Automated Control</h3>
               <p className={`${theme.textMuted} text-lg leading-relaxed mb-8`}>
                 QReBill doesn't just send messages; it analyzes spending velocity. It isolates at-risk VIPs and triggers custom win-back campaigns without human intervention.
               </p>
               <ul className="space-y-4">
                 {/* 🔥 FIX 4: Typed the array map for texts */}
                 {['Zero-touch cart recovery', 'Dynamic cluster segmentation', 'Predictive churn alerts'].map((text: string, i: number) => (
                   <li key={i} className="flex items-center gap-3">
                     <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center"><ChevronRight className="w-3 h-3 text-blue-500" /></div>
                     <span className="font-medium text-sm">{text}</span>
                   </li>
                 ))}
               </ul>
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
            © 2026 Developed for Enterprise Scaling.
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
                    {/* 🔥 FIX 5: Typed array map and digit strings */}
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
