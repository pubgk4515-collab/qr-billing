'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from './lib/supabase'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldCheck, Loader2, ChevronRight, Delete, ArrowLeft, Zap, 
  BrainCircuit, MessageSquareText, SmartphoneNfc, Sparkles, Send, 
  Moon, Sun, Users, BarChart3, TrendingUp, HandCoins, Building2, Layers3, Target,
  Fingerprint
} from 'lucide-react';

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlShopSlug = searchParams.get('shop'); 

  // THEME STATE (Default to Samsung Premium White)
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

  // 🔥 DYNAMIC THEME CLASSES (Samsung Premium White Aesthetics)
  const theme = {
    bg: isDark ? 'bg-[#050505]' : 'bg-[#FAFAFD]',
    text: isDark ? 'text-white' : 'text-[#111111]',
    textMuted: isDark ? 'text-zinc-400' : 'text-zinc-500',
    nav: isDark ? 'bg-[#050505]/80 border-white/5' : 'bg-white/70 border-black/5 shadow-sm',
    card: isDark ? 'bg-gradient-to-br from-[#111] to-[#0a0a0a] border-white/5' : 'bg-white border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.05)]',
    diagramCell: isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10 shadow-sm',
    diagramLine: isDark ? 'stroke-white/10' : 'stroke-black/10',
    cardInner: isDark ? 'bg-[#050505] border-white/5' : 'bg-[#FAFAFD] border-black/5',
    input: isDark ? 'bg-[#111] border-white/5 text-white active:bg-white/10' : 'bg-[#F2F2F7] border-black/5 text-black active:bg-black/5',
    modalBg: isDark ? 'bg-[#0A0A0A] border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.8)]' : 'bg-white border-black/5 shadow-[0_-20px_80px_rgba(0,0,0,0.15)]',
  };

  return (
    <main className={`min-h-screen flex flex-col ${theme.bg} ${theme.text} relative overflow-x-hidden font-sans transition-colors duration-500 selection:bg-blue-500/30`}>
      
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
            <a href="#visual" className={`hover:${theme.text} transition-colors`}>Ecosystem</a>
            <a href="#data" className={`hover:${theme.text} transition-colors`}>Triple-Signal Data</a>
            <a href="#outcomes" className={`hover:${theme.text} transition-colors`}>Outcomes</a>
          </div>

          <div className="flex items-center gap-3">
            {/* THEME TOGGLE */}
            <button onClick={() => setIsDark(!isDark)} className={`p-2.5 rounded-full border transition-all active:scale-95 ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}>
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><Sun className="w-4 h-4 text-zinc-300" /></motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Moon className="w-4 h-4 text-zinc-600" /></motion.div>
                )}
              </AnimatePresence>
            </button>
            <button onClick={() => setIsModalOpen(true)} className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 border ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black text-white hover:bg-zinc-800 shadow-xl shadow-black/10'}`}>Store Login</button>
          </div>
        </div>
      </nav>

      {/* 🚀 THE STRATEGIC HERO (Profit & Control Focus) */}
      <section className="relative pt-40 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center text-center z-10 mt-10">
        
        {/* 🔥 Logo Backlight for Hero Section */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-[600px] h-[600px] bg-gradient-to-br from-blue-500/30 to-blue-700/30 rounded-full blur-[100px]" />
          <div className={`absolute w-[600px] h-[600px] flex items-center justify-center ${isDark ? 'text-zinc-900' : 'text-gray-100'} font-black text-9xl tracking-tighter`}>QReBill.</div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8 z-10 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100 shadow-sm'}`}>
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Local Retail Control Layer</span>
        </motion.div>
        
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] bg-clip-text text-transparent mb-6 max-w-4xl z-10 ${isDark ? 'bg-gradient-to-b from-white to-zinc-500' : 'bg-gradient-to-b from-black to-zinc-600'}`}>
          Stop Managing a Store. <br />Start Running an Empire.
        </motion.h1>
        
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`text-lg md:text-xl font-medium max-w-2xl mb-12 leading-relaxed z-10 ${theme.textMuted}`}>
          QReBill is the ultimate control system for scaling local empires. Lightning-fast QR checkout, predictive Data Intelligence, and automated supply management. Reclaim your competitive advantage.
        </motion.p>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4 z-10">
          <button className="px-8 py-4 bg-blue-600 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all shadow-[0_10px_40px_rgba(37,99,235,0.3)] flex items-center gap-2 active:scale-95">Book a Control Session <ChevronRight className="w-4 h-4" /></button>
          <button className={`px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all active:scale-95 border ${isDark ? 'bg-[#111] border-white/10 hover:bg-white/5' : 'bg-white border-black/10 hover:bg-gray-50 shadow-sm'}`}>Explore Architecture</button>
        </motion.div>
      </section>

      {/* 🧠 SECTION 1: THE OPERATIONAL ECOSYSTEM (Interactive Visual) */}
      <section id="visual" className="max-w-6xl mx-auto px-6 py-24 z-10 relative">
        <div className="text-center mb-16 max-w-2xl mx-auto flex flex-col items-center">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-gray-100 border-black/10'}`}><Layers3 className="w-3.5 h-3.5 text-blue-500"/><span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Full Integration Ecosystem</span></motion.div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">Normal POS is Offline. <br/> This is Real-Time Control.</h2>
            <p className={`text-lg font-medium leading-relaxed ${theme.textMuted}`}>Standard billing creates a gap. QReBill builds a liquid system connecting customers, data, and predictive decisions instantly.</p>
        </div>
        
        {/* 📐 The Ecosystem Diagram */}
        <div className="relative p-6 sm:p-12">
            <div className={`absolute inset-0 ${isDark ? 'opacity-10' : 'opacity-5'} pointer-events-none`}>
                <svg width="100%" height="100%"><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="currentColor" /></pattern><rect width="100%" height="100%" fill="url(#grid)" /></svg>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-center justify-items-center relative z-10">
                {/* 🔵 CUSTOMER FLOW */}
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} className="md:col-span-1 flex flex-col gap-4 w-full">
                    <div className={`${theme.diagramCell} p-5 rounded-2xl`}>
                        <Users className="w-7 h-7 text-blue-500 mb-3" />
                        <h4 className="font-bold text-sm">Customers</h4>
                        <p className="text-xs text-zinc-500 mt-1">QR Scan ➡️ Digital Bag ➡️ Instant Self-Checkout.</p>
                    </div>
                </motion.div>
                
                {/* 🔵 OWNER VISIBILITY (Adaptable dual-side flow) */}
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="md:col-span-1 flex flex-col gap-4 w-full">
                    <div className={`${theme.diagramCell} p-5 rounded-2xl relative`}>
                        <Zap className="w-7 h-7 text-orange-500 mb-3" />
                        <h4 className="font-bold text-sm">Owner Real-Time Dash</h4>
                        <p className="text-xs text-zinc-500 mt-1"> Kaun scan kar raha hai? Kya dekh raha hai? ➡️ Full visibility instantly.</p>
                        <div className={`absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
                        <div className={`absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
                    </div>
                </motion.div>
                
                {/* 🔵 DATA ENGINE (Triple Signal Trace) */}
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="md:col-span-1 flex flex-col gap-4 w-full">
                    <div className={`${theme.diagramCell} p-5 rounded-2xl`}>
                        <SmartphoneNfc className="w-7 h-7 text-blue-500 mb-3" />
                        <h4 className="font-bold text-sm">Triple-Signal Data Engine</h4>
                        <p className="text-xs text-zinc-500 mt-1">Tracing Intent (Scan), Behavior (Cart), and Truth (Bill).</p>
                    </div>
                </motion.div>
                
                {/* 🔵 AI INTELLIGENCE (Predictive Cycles) */}
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="md:col-span-1 flex flex-col gap-4 w-full">
                    <div className={`${theme.diagramCell} p-5 rounded-2xl`}>
                        <BrainCircuit className="w-7 h-7 text-purple-500 mb-3" />
                        <h4 className="font-bold text-sm">AI-Driven Predictions</h4>
                        <p className="text-xs text-zinc-500 mt-1">Automatic Lost Cart Recovery Loops. Predictive Cycles.</p>
                    </div>
                </motion.div>
                
                {/* 🔵 BUSINESS OUTCOME (Profit & Growth) */}
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="md:col-span-1 flex flex-col gap-4 w-full">
                    <div className={`${theme.diagramCell} p-5 rounded-2xl`}>
                        <TrendingUp className="w-7 h-7 text-emerald-500 mb-3" />
                        <h4 className="font-bold text-sm">Profit Acceleration</h4>
                        <p className="text-xs text-zinc-500 mt-1">Revenue Reactivation. Lifecycle Automation.</p>
                    </div>
                </motion.div>
            </div>
        </div>
      </section>

      {/* 🧩 SECTION 2: THE DATA ENGINE ADVANTAGE (Unique USP) */}
      <section id="data" className="max-w-6xl mx-auto px-6 py-24 z-10 relative">
        <div className={`relative ${theme.card} rounded-[3rem] p-10 md:p-20 overflow-hidden`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                <div>
                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-gray-100 border-black/10'}`}><BarChart3 className="w-3.5 h-3.5 text-blue-500"/><span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Triple-Signal Technology</span></motion.div>
                    <h3 className="text-4xl font-black mb-6 tracking-tight"> normal POS just records payments. We record intention.</h3>
                    <p className={`${theme.textMuted} font-medium leading-relaxed mb-10`}>The QReBill 'Triple-Signal' Data Engine is a competitive edge India has never seen. We trace Customer Intent (via QR Scan), Behavior (via Digital Cart interactions), and Truth (final Billing) to build a predictive consumer database.</p>
                    <div className="flex flex-col gap-4">
                        {[
                            { icon: Target, title: 'INTENT (The QR Scan)', desc: 'Know exactly which premium products the customer is interested in before they decide.' },
                            { icon: MessageSquareText, title: 'BEHAVIOR (Cart Interactions)', desc: 'Track abandoned items and full digital bag cycles for recovery.' },
                            { icon: HandCoins, title: 'TRUTH (Final Billing)', desc: 'Connect behavioral data to real financial truth for hyper-personalization.' }
                        ].map((item, idx) => (
                            <div key={idx} className={`flex items-start gap-4 p-4 rounded-2xl ${theme.cardInner}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-gray-100 border-black/10'}`}><item.icon className="w-5 h-5 text-blue-500"/></div>
                                <div><h5 className="font-black text-sm mb-0.5 tracking-tight">{item.title}</h5><p className={`text-xs ${theme.textMuted} font-medium`}>{item.desc}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="hidden md:block w-full h-[500px] bg-[#050505] rounded-[2rem] border border-white/5 relative overflow-hidden flex items-center justify-center">
                    <BrainCircuit className="w-32 h-32 text-blue-500/20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 text-white font-black text-xs tracking-widest uppercase">Predictive Loop Active</div>
                </div>
            </div>
        </div>
      </section>

      {/* 🚀 SECTION 3: BUSINESS OUTCOMES (Re-framing Features) */}
      <section id="outcomes" className="max-w-6xl mx-auto px-6 py-24 z-10 relative">
        <div className="text-center mb-16 max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">QReBill Drives direct Profit Acceleration.</h2>
            <p className={`text-lg font-medium leading-relaxed ${theme.textMuted}`}>We move beyond efficiency. Our AI-driven automation reacts to customer behavior to reclaim lost revenue and build system dependency.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* TIER 1: Revenue Loss Recovery */}
            <div className={`md:col-span-1 ${theme.card} rounded-[2rem] p-8 flex flex-col relative overflow-hidden group transition-colors duration-500`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 relative z-10 border ${isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-100'}`}>
                    <TrendingUp className="w-6 h-6 text-rose-500" />
                </div>
                <h3 className="text-2xl font-black mb-3 relative z-10 tracking-tight">Automated Revenue Loss Recovery Engine</h3>
                <p className={`${theme.textMuted} text-sm font-medium leading-relaxed relative z-10 mb-8`}> Graphs tell you the past. Our AI recovers your present revenue. Detect abandoned carts, trigger automated WhatsApp loops, and reclaim lost sales without human intervention.</p>
                <div className={`mt-auto ${theme.cardInner} rounded-2xl p-4 relative z-10 transition-colors duration-500 flex justify-between items-center`}>
                   <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">Lost Carts Recovered: +₹14k/mo</p>
                   <p className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}> AI Reactivation Complete.</p>
                </div>
            </div>

            {/* TIER 2: Lifecycle Automation */}
            <div className={`md:col-span-1 ${theme.card} rounded-[2rem] p-8 flex flex-col justify-center relative overflow-hidden group transition-colors duration-500`}>
                <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                        <Users className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black mb-3 tracking-tight">AI-Driven Customer Lifecycle Automation</h3>
                        <p className={`${theme.textMuted} text-sm font-medium leading-relaxed max-w-md`}> Detect Spending speed to separate 'Whales' from casual buyers. QReBill doesn't just send messages; it builds predictive repeat-loops for every customer cluster automatically. Reclaim complete system dependency.</p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 🏢 SECTION 4: ENTERPRISE VISION (Network Effects) */}
      <section id="enterprise" className="max-w-6xl mx-auto px-6 py-24 z-10 relative">
        <div className={`relative ${theme.card} rounded-[3rem] p-10 md:p-16 overflow-hidden flex flex-col md:flex-row items-center gap-12`}>
            <div className={`hidden md:flex w-24 h-24 bg-gradient-to-br from-zinc-800 to-black rounded-[2rem] flex-col items-center justify-center mb-6 shrink-0 border ${isDark ? 'border-white/10 shadow-lg shadow-black/50' : 'border-black/10'}`}>
              <Building2 className="w-12 h-12 text-blue-500" />
            </div>
            <div>
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-gray-100 border-black/10'}`}><Building2 className="w-3.5 h-3.5 text-blue-500"/><span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Enterprise OS Vision</span></motion.div>
                <h3 className="text-3xl font-black mb-6 tracking-tight"> Selective Supply Chain Control</h3>
                <p className={`${theme.textMuted} font-medium leading-relaxed mb-6`}>We don't just sell software; we are expanding a retail network. As a QReBill partner, we will give you access to 'selective supply control' and 'network demand intelligence' for specific high-margin categories, ensuring your business scaling is frictionless and data-driven.</p>
                <p className={`${theme.textMuted} font-medium leading-relaxed mb-10`}>The higher high-ticket price point (₹10,000/mo) reflects your direct access to a competitive advantage designed for local empires, not just individual stores.</p>
                <button className="px-8 py-4 bg-blue-600 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all shadow-[0_10px_40px_rgba(37,99,235,0.3)] active:scale-95">Book Enterprise Demo</button>
            </div>
        </div>
      </section>

      {/* FOOTER (Finally sticks to the bottom!) */}
      <footer className={`mt-auto border-t relative z-10 transition-colors duration-500 ${isDark ? 'bg-[#050505] border-white/5' : 'bg-white border-black/5'}`}>
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Zap className="w-4 h-4 text-blue-500 fill-blue-500" />
            <span className="text-lg font-black tracking-tight">QReBill.</span>
          </div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>© 2026 QReBill SaaS. Designed for Empire Builders.</p>
        </div>
      </footer>

      {/* 🔒 THE ORIGINAL FLOATING LOGIN MODAL (Apple Style) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md sm:items-center sm:p-4">
            <motion.div initial={{ y: "100%", scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: "100%", scale: 0.95 }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className={`w-full sm:max-w-md rounded-t-[3rem] sm:rounded-[2.5rem] border ${theme.modalBg} relative overflow-hidden pb-12 pt-4 px-6 sm:p-10 min-h-[480px] flex flex-col transition-colors duration-500`}>
              <div className={`w-12 h-1.5 rounded-full mx-auto mb-8 sm:hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
              <button onClick={closeModal} className={`absolute top-8 right-8 p-2 rounded-full transition-colors z-10 ${isDark ? 'bg-white/5 hover:bg-white/10 text-zinc-400' : 'bg-black/5 hover:bg-black/10 text-zinc-600'}`}><X className="w-5 h-5" /></button>
              <AnimatePresence mode="wait">
                {!showPinPad ? (
                  <motion.div key="biometric" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center text-center mt-6 flex-1">
                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 border ${isDark ? 'bg-[#111] border-white/5 shadow-inner' : 'bg-blue-50 border-blue-100 shadow-sm'}`}><ShieldCheck className="w-12 h-12 text-blue-500" /></div>
                    <h2 className="text-3xl font-black mb-3 tracking-tight">Secure Access</h2>
                    <p className={`${theme.textMuted} text-sm mb-10 font-medium px-6 leading-relaxed`}>Confirm your identity to manage your store's command center.</p>
                    <button onClick={triggerScreenLock} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-lg py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_30px_rgba(37,99,235,0.2)]"><Fingerprint className="w-7 h-7" /> Use Screen Lock</button>
                    <div className="flex items-center gap-4 w-full mt-10 mb-6"><div className={`h-[1px] flex-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}></div><span className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme.textMuted}`}>OR</span><div className={`h-[1px] flex-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}></div></div>
                    <button onClick={() => setShowPinPad(true)} className={`font-bold text-sm transition-colors py-2 uppercase tracking-widest ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>Use Admin PIN</button>
                    {error && <p className="mt-6 text-red-500 text-sm font-bold bg-red-500/10 px-4 py-2 rounded-xl">{error}</p>}
                  </motion.div>
                ) : (
                  <motion.div key="pinpad" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center w-full mt-4 flex-1">
                    <div className="w-full flex items-center mb-8"><button onClick={() => setShowPinPad(false)} className={`p-3 rounded-full transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}><ArrowLeft className="w-6 h-6" /></button><h2 className="text-2xl font-black ml-4 tracking-tight">Enter PIN</h2></div>
                    <div className="flex gap-5 mb-12">{[...Array(4)].map((_, i) => (<div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-blue-500 border-blue-500 scale-125 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : (isDark ? 'border-white/10' : 'border-black/10')}`} />))}</div>
                    <div className="grid grid-cols-3 gap-3 w-full">{['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (<button key={n} onClick={() => addDigit(n)} className={`h-16 rounded-[1.2rem] text-2xl font-black transition-all ${theme.input}`}>{n}</button>))}
                      <button onClick={removeDigit} className={`h-16 flex items-center justify-center transition-colors ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-black'}`}><Delete className="w-7 h-7" /></button>
                      <button onClick={() => addDigit('0')} className={`h-16 rounded-[1.2rem] text-2xl font-black transition-all ${theme.input}`}>0</button>
                      <button onClick={handlePinSubmit} disabled={pin.length < 4 || loading} className="h-16 bg-blue-600 text-white rounded-[1.2rem] flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all shadow-lg">{loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <ChevronRight className="w-10 h-10" />}</button></div>
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
    <Suspense fallback={<div className={`min-h-screen flex items-center justify-center bg-[#FAFAFD]`}><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>}>
      <LandingContent />
    </Suspense>
  );
}
