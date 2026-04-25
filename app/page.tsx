'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  Loader2,
  ChevronRight,
  Delete,
  ArrowLeft,
  Moon,
  Sun,
  Fingerprint,
  Layers,
  QrCode,
  Lock,
  RefreshCcw,
  BellRing,
  Scan,
  PackageOpen,
  Repeat,
  ShoppingBag,
  TrendingDown,
} from 'lucide-react';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlShopSlug = searchParams.get('shop');

  const [isDark, setIsDark] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeShop, setActiveShop] = useState<string | null>(null);

  // Lifecycle animation states
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const savedShop = localStorage.getItem('active_admin_session');
    if (urlShopSlug) {
      setActiveShop(urlShopSlug);
      setIsModalOpen(true);
    } else if (savedShop) {
      setActiveShop(savedShop);
    }
  }, [urlShopSlug]);

  // Auto‑cycle tag lifecycle demo
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const handlePinSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');

    if (!activeShop) {
      setError('Store identity missing. Use your secure WhatsApp link.');
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
        setError('Store not found in the system.');
        setLoading(false);
        return;
      }

      if (store.admin_pin === pin) {
        localStorage.setItem('active_admin_session', store.slug);
        router.push(`/admin/${store.slug}`);
      } else {
        setError('Incorrect PIN! Please try again.');
        setPin('');
        setLoading(false);
      }
    } catch (err) {
      setError('Network error! Please check your connection.');
      setLoading(false);
    }
  };

  const triggerScreenLock = async () => {
    setError('Verifying Biometrics...');
    setTimeout(() => {
      setError('Biometric pending. Please use PIN.');
      setShowPinPad(true);
    }, 1200);
  };

  const addDigit = (num: string) => {
    if (pin.length < 4) setPin((p) => p + num);
  };
  const removeDigit = () => setPin((p) => p.slice(0, -1));

  const closeModal = () => {
    if (loading) return;
    setIsModalOpen(false);
    setTimeout(() => {
      setShowPinPad(false);
      setPin('');
      setError('');
    }, 300);
  };

  const theme = {
    bg: isDark ? 'bg-[#000000]' : 'bg-white',
    text: isDark ? 'text-white' : 'text-black',
    textMuted: isDark ? 'text-[#888888]' : 'text-[#666666]',
    nav: isDark
      ? 'bg-black/80 border-white/5 backdrop-blur-2xl'
      : 'bg-white/80 border-black/5 backdrop-blur-2xl',
    sectionBg: isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]',
    card: isDark
      ? 'bg-[#111111] border border-white/[0.05] shadow-[0_0_30px_rgba(255,255,255,0.03)]'
      : 'bg-white border border-black/[0.03] shadow-[0_8px_30px_rgba(0,0,0,0.04)]',
    cardInner: isDark ? 'bg-[#1A1A1A]' : 'bg-[#F2F2F7]',
    input: isDark ? 'bg-[#1C1C1E] text-white' : 'bg-[#F2F2F7] text-black',
    modalBg: isDark
      ? 'bg-[#111111] border border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.95)]'
      : 'bg-white border border-black/5 shadow-[0_-20px_80px_rgba(0,0,0,0.1)]',
    primaryBtn: isDark
      ? 'bg-white text-black hover:bg-gray-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]'
      : 'bg-black text-white hover:bg-gray-800 hover:shadow-[0_0_20px_rgba(0,0,0,0.15)]',
    secondaryBtn: isDark
      ? 'bg-[#1A1A1A] text-white hover:bg-[#2C2C2E]'
      : 'bg-[#F2F2F7] text-black hover:bg-[#E5E5EA]',
  };

  // Fixed easing: cubic-bezier as a tuple
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const stagger = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <main
      className={`min-h-screen flex flex-col ${theme.bg} ${theme.text} transition-colors duration-700 font-sans selection:bg-white/20 ${inter.variable}`}
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      {/* ---------- Navigation ---------- */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-500 ${theme.nav}`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-white/80" />
            <span className="text-lg font-semibold tracking-tight">RetailOS</span>
          </div>

          <div
            className={`hidden md:flex items-center gap-10 text-xs font-semibold tracking-[0.15em] uppercase ${theme.textMuted}`}
          >
            <a href="#system" className={`hover:${theme.text} transition-colors`}>
              System
            </a>
            <a href="#control" className={`hover:${theme.text} transition-colors`}>
              Control
            </a>
            <a href="#intelligence" className={`hover:${theme.text} transition-colors`}>
              Intelligence
            </a>
            <a href="#crm" className={`hover:${theme.text} transition-colors`}>
              CRM
            </a>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full transition-all duration-300 ${theme.secondaryBtn} hover:scale-110`}
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div
                    key="sun"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                  >
                    <Sun className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                  >
                    <Moon className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] transition-all active:scale-95 ${theme.primaryBtn}`}
            >
              Console
            </button>
          </div>
        </div>
      </nav>

      {/* ---------- 1. HERO (Dominance) ---------- */}
      <section className="pt-48 pb-36 px-6 max-w-6xl mx-auto flex flex-col items-center text-center z-10 w-full">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
          className={`text-xs font-bold uppercase tracking-[0.25em] mb-8 ${theme.textMuted}`}
        >
          Store Operating System
        </motion.p>

        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
          className="text-5xl md:text-[5.5rem] font-semibold leading-[1.05] tracking-[-0.02em] mb-8 max-w-4xl"
        >
          Track every product.
          <br />
          <span className={theme.textMuted}>Every customer. In real‑time.</span>
        </motion.h1>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
          className={`text-lg md:text-xl font-normal max-w-2xl mb-14 leading-relaxed ${theme.textMuted}`}
        >
          Total retail visibility. Every scan, every bag, every lost sale — revealed and actionable instantly.
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            className={`px-8 py-4 rounded-full font-medium text-sm transition-all active:scale-95 ${theme.primaryBtn}`}
          >
            Get Full Control
          </button>
          <button
            className={`px-8 py-4 rounded-full font-medium text-sm transition-all active:scale-95 ${theme.secondaryBtn}`}
          >
            See the System &darr;
          </button>
        </motion.div>
      </section>

      {/* ---------- 2. SYSTEM REVEAL (Tag Lifecycle) ---------- */}
      <section
        id="system"
        className={`py-32 px-6 ${theme.sectionBg} transition-colors duration-500`}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="mb-20 max-w-2xl"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              The Tag Lifecycle
            </h2>
            <p className={`text-xl font-normal leading-relaxed ${theme.textMuted}`}>
              A lightweight QR tag powers your entire store. Here&apos;s the end‑to‑end sequence that
              turns a physical item into a revenue stream.
            </p>
          </motion.div>

          {/* Lifecycle Stepper */}
          <div className="relative mt-16">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-1/2 left-[8%] right-[8%] h-px bg-white/10 -translate-y-1/2" />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
              {[
                {
                  label: 'Bind',
                  sub: 'Tag assigned to product',
                  icon: PackageOpen,
                },
                {
                  label: 'Scan',
                  sub: 'Customer scans to bag',
                  icon: Scan,
                },
                {
                  label: 'Lock',
                  sub: 'Item reserved globally',
                  icon: Lock,
                },
                {
                  label: 'Sell',
                  sub: 'Checkout releases lock',
                  icon: ShoppingBag,
                },
                {
                  label: 'Reset',
                  sub: 'Tag auto‑resets',
                  icon: Repeat,
                },
              ].map((step, i) => {
                const isActive = i === activeStep;
                const isPast = i < activeStep;
                return (
                  <motion.div
                    key={step.label}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={fadeUp}
                    className="flex flex-col items-center text-center relative"
                  >
                    {/* Step circle */}
                    <div className="relative mb-5">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-700 ${
                          isActive
                            ? 'bg-white/10 ring-1 ring-white/20 shadow-[0_0_25px_rgba(99,102,241,0.3)]'
                            : 'bg-white/5'
                        }`}
                      >
                        <step.icon
                          className={`w-6 h-6 transition-colors duration-500 ${
                            isActive
                              ? 'text-blue-400'
                              : isPast
                              ? 'text-emerald-400'
                              : 'text-white/20'
                          }`}
                        />
                      </div>
                      {/* Glow dot */}
                      {isActive && (
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1 tracking-tight">{step.label}</h3>
                    <p className={`text-sm font-medium ${theme.textMuted}`}>{step.sub}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 3. CONTROL LAYER (Live States) ---------- */}
      <section id="control" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="mb-20 max-w-2xl"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Your store, alive.
            </h2>
            <p className={`text-xl font-normal leading-relaxed ${theme.textMuted}`}>
              See every product state in real‑time. No polling, no reloads — a living dashboard that
              breathes with your floor.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                label: 'Active',
                desc: 'Available for scan',
                color: 'emerald',
                icon: PackageOpen,
              },
              {
                label: 'In Bag',
                desc: 'Reserved by a customer',
                color: 'amber',
                icon: ShoppingBag,
              },
              {
                label: 'Sold',
                desc: 'Billed & cleared',
                color: 'blue',
                icon: Lock,
              },
            ].map((state) => {
              const colorMap: Record<string, string> = {
                emerald: 'border-emerald-400/20 text-emerald-400',
                amber: 'border-amber-400/20 text-amber-400',
                blue: 'border-blue-400/20 text-blue-400',
              };
              const glowMap: Record<string, string> = {
                emerald: 'shadow-[0_0_30px_rgba(52,211,153,0.1)]',
                amber: 'shadow-[0_0_30px_rgba(251,191,36,0.1)]',
                blue: 'shadow-[0_0_30px_rgba(96,165,250,0.1)]',
              };
              return (
                <motion.div
                  key={state.label}
                  variants={fadeUp}
                  className={`${theme.card} rounded-[2.5rem] p-8 relative overflow-hidden transition-all duration-500 hover:scale-[1.02] ${glowMap[state.color]}`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${theme.cardInner} border ${colorMap[state.color]}`}
                  >
                    <state.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2 tracking-tight">{state.label}</h3>
                  <p className={`text-sm ${theme.textMuted}`}>{state.desc}</p>
                  {/* Live indicator */}
                  <div className="mt-6 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-${state.color}-400`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 bg-${state.color}-400`}
                      />
                    </span>
                    <span className={`text-xs font-medium uppercase tracking-wider text-${state.color}-400`}>
                      Live
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ---------- 4. BEHAVIOR INTELLIGENCE ---------- */}
      <section
        id="intelligence"
        className={`py-32 px-6 ${theme.sectionBg} transition-colors duration-500`}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="mb-20 max-w-2xl"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Stop guessing. Start seeing.
            </h2>
            <p className={`text-xl font-normal leading-relaxed ${theme.textMuted}`}>
              Track what customers touch, not just what they buy. Uncover scanning patterns,
              drop‑off rates, and hidden revenue opportunities.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            className="flex flex-col lg:flex-row gap-8"
          >
            {/* Funnel visualization */}
            <div className="lg:w-1/2">
              <div className={`${theme.card} rounded-[3rem] p-10 h-full flex flex-col justify-between`}>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-8 text-white/40">
                    Today&apos;s Scan Intelligence
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Scan className="w-5 h-5 text-white/50" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">1,240</p>
                        <span className={`text-xs ${theme.textMuted}`}>Product scans</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">860</p>
                        <span className={`text-xs ${theme.textMuted}`}>Added to bag</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">620</p>
                        <span className={`text-xs ${theme.textMuted}`}>Completed purchases</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-rose-400">240</p>
                        <span className={`text-xs ${theme.textMuted}`}>Abandoned bags · ₹12,800 leaked</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-white/5">
                  <p className={`text-xs ${theme.textMuted}`}>
                    Every scan is a signal. Every abandoned bag is a second chance.
                  </p>
                </div>
              </div>
            </div>

            {/* Insight text */}
            <div className="lg:w-1/2 flex flex-col justify-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                className="space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 mt-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Missed Revenue, Quantified</h4>
                    <p className={`text-sm leading-relaxed ${theme.textMuted}`}>
                      Know exactly which items were touched, held, and never bought. That&apos;s
                      intelligence your POS can&apos;t provide.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Smart Restocking Triggers</h4>
                    <p className={`text-sm leading-relaxed ${theme.textMuted}`}>
                      High‑touch, low‑conversion items trigger automated stock alerts — so you
                      never run out of what&apos;s hot.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- 5. CRM ENGINE (Addiction Layer) ---------- */}
      <section id="crm" className="py-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-semibold tracking-tight mb-6"
            >
              The Addiction Engine.
            </motion.h2>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className={`text-xl font-normal leading-relaxed mb-10 ${theme.textMuted}`}
            >
              Loyalty loops that run on autopilot. Turn one‑time shoppers into returning customers
              with intelligent WhatsApp recovery and hyper‑personalized offers.
            </motion.p>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={stagger}
              className="space-y-6"
            >
              <motion.div variants={fadeUp} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 mt-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Abandonment Recovery</h4>
                  <p className={`text-sm ${theme.textMuted} leading-relaxed`}>
                    Automatically message customers who left items in their bag. One tap restores
                    their cart.
                  </p>
                </div>
              </motion.div>
              <motion.div variants={fadeUp} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Repeat Purchase Loops</h4>
                  <p className={`text-sm ${theme.textMuted} leading-relaxed`}>
                    Track purchase cycles. Send “back in stock” or “you loved this” nudges exactly
                    when they&apos;re ready.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="lg:w-1/2 w-full">
            {/* Revenue Recovery Widget */}
            <div
              className={`${theme.card} w-full rounded-[3rem] p-8 flex flex-col relative overflow-hidden border-rose-500/10`}
            >
              <div className="flex items-center gap-3 mb-8">
                <BellRing className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-semibold">Today&apos;s Revenue Leak</span>
              </div>

              <div className="mb-8">
                <h3 className="text-5xl font-semibold tracking-tighter text-rose-500 mb-2">
                  ₹3,240
                </h3>
                <p className={`text-sm ${theme.textMuted}`}>
                  Potential revenue identified. 12 items scanned but not billed today.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div
                  className={`w-full p-4 rounded-xl ${theme.cardInner} flex justify-between items-center`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5" />
                    <div>
                      <p className="text-sm font-semibold">Premium Denim</p>
                      <p className={`text-xs ${theme.textMuted}`}>Abandoned by 3 customers</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`w-full p-4 rounded-xl ${theme.cardInner} flex justify-between items-center`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5" />
                    <div>
                      <p className="text-sm font-semibold">Cotton T‑Shirt</p>
                      <p className={`text-xs ${theme.textMuted}`}>Abandoned by 5 customers</p>
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-2xl active:scale-95 transition-all duration-300">
                Trigger WhatsApp Recovery
              </button>

              {/* Repeat Customer Loop Mock */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <Repeat className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Returning Customers</p>
                    <p className={`text-xs ${theme.textMuted}`}>
                      18% of today&apos;s buyers came from a recovery loop.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer
        className={`mt-auto border-t py-10 px-6 transition-colors duration-500 ${
          isDark ? 'border-white/5 bg-black' : 'border-black/5 bg-white'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold tracking-tight">RetailOS</span>
          </div>
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.3em] ${theme.textMuted}`}
          >
            © 2025 Store Operating System. Control never felt this good.
          </p>
        </div>
      </footer>

      {/* ---------- Console Modal (unchanged logic, refined styling) ---------- */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xl sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl border ${theme.modalBg} relative overflow-hidden pb-12 pt-4 px-6 sm:p-10 min-h-[480px] flex flex-col transition-colors duration-500`}
            >
              <div
                className={`w-12 h-1.5 rounded-full mx-auto mb-8 sm:hidden ${
                  isDark ? 'bg-white/20' : 'bg-black/20'
                }`}
              />
              <button
                onClick={closeModal}
                className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-10 ${theme.secondaryBtn}`}
              >
                <X className="w-5 h-5" />
              </button>

              <AnimatePresence mode="wait">
                {!showPinPad ? (
                  <motion.div
                    key="biometric"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center text-center mt-6 flex-1"
                  >
                    <div
                      className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-8 ${theme.cardInner}`}
                    >
                      <ShieldCheck className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2 tracking-tight">Console Access</h2>
                    <p
                      className={`${theme.textMuted} text-sm mb-10 font-medium px-4`}
                    >
                      Authenticate identity to enter the control layer.
                    </p>
                    <button
                      onClick={triggerScreenLock}
                      disabled={loading}
                      className={`w-full font-medium text-sm py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${theme.primaryBtn}`}
                    >
                      <Fingerprint className="w-5 h-5" /> Use Biometrics
                    </button>
                    <div className="flex items-center gap-4 w-full mt-8 mb-6">
                      <div
                        className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.textMuted}`}
                      >
                        OR
                      </span>
                      <div
                        className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
                      />
                    </div>
                    <button
                      onClick={() => setShowPinPad(true)}
                      className={`font-semibold text-xs transition-colors py-2 uppercase tracking-widest ${theme.textMuted} hover:${theme.text}`}
                    >
                      Use Passcode
                    </button>
                    {error && <p className="mt-6 text-red-500 text-xs font-bold">{error}</p>}
                  </motion.div>
                ) : (
                  <motion.div
                    key="pinpad"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col items-center w-full mt-2 flex-1"
                  >
                    <div className="w-full flex items-center mb-8">
                      <button
                        onClick={() => setShowPinPad(false)}
                        className={`p-2 rounded-full transition-colors ${theme.secondaryBtn}`}
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h2 className="text-xl font-semibold ml-4 tracking-tight">
                        Enter Passcode
                      </h2>
                    </div>
                    <div className="flex gap-4 mb-10">
                      {[...Array(4)].map((_, i: number) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-full transition-all duration-300 ${
                            pin.length > i
                              ? 'bg-blue-500 scale-110'
                              : isDark
                              ? 'bg-white/10'
                              : 'bg-black/10'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <button
                          key={n}
                          onClick={() => addDigit(n.toString())}
                          className={`h-14 rounded-2xl text-xl font-medium transition-all ${theme.input}`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={removeDigit}
                        className={`h-14 flex items-center justify-center transition-colors ${theme.textMuted} hover:${theme.text}`}
                      >
                        <Delete className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => addDigit('0')}
                        className={`h-14 rounded-2xl text-xl font-medium transition-all ${theme.input}`}
                      >
                        0
                      </button>
                      <button
                        onClick={handlePinSubmit}
                        disabled={pin.length < 4 || loading}
                        className={`h-14 rounded-2xl flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all ${theme.primaryBtn}`}
                      >
                        {loading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <ChevronRight className="w-8 h-8" />
                        )}
                      </button>
                    </div>
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}