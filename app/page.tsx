'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence, useInView, Variants } from 'framer-motion';
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
  QrCode,
  ShoppingBag,
  RefreshCcw,
  BellRing,
  Scan,
  TrendingDown,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

/* ── Properly typed easing ── */
const easeOutCubic: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ── Cinematic text reveal helpers ── */
const slowReveal = (delay = 0): Variants => ({
  hidden: { opacity: 0, y: 30, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.9, delay, ease: easeOutCubic },
  },
});

const fadeOnly = (delay = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1, delay, ease: 'easeOut' },
  },
});

/* ── Number counter ── */
function AnimatedNumber({
  value,
  duration = 2,
  delay = 0,
}: {
  value: number;
  duration?: number;
  delay?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = value / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

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
  const [activeStep, setActiveStep] = useState(0);
  const [heroStage, setHeroStage] = useState(0);

  /* ── Hero cinematic staging ── */
  useEffect(() => {
    const stages = [0, 1200, 2400, 3800];
    const timers = stages.map((delay, i) =>
      setTimeout(() => setHeroStage(i), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const savedShop = localStorage.getItem('active_admin_session');
    if (urlShopSlug) {
      setActiveShop(urlShopSlug);
      setIsModalOpen(true);
    } else if (savedShop) {
      setActiveShop(savedShop);
    }
  }, [urlShopSlug]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 2800);
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
    textMuted: isDark ? 'text-[#777]' : 'text-[#555]',
    textFaint: isDark ? 'text-[#444]' : 'text-[#999]',
    nav: isDark
      ? 'bg-black/80 border-white/5 backdrop-blur-2xl'
      : 'bg-white/80 border-black/5 backdrop-blur-2xl',
    sectionBg: isDark ? 'bg-[#030303]' : 'bg-[#F5F5F7]',
    card: isDark
      ? 'bg-[#0A0A0A] border border-white/[0.03]'
      : 'bg-white border border-black/[0.03]',
    cardInner: isDark ? 'bg-[#111]' : 'bg-[#F2F2F7]',
    input: isDark ? 'bg-[#1C1C1E] text-white' : 'bg-[#F2F2F7] text-black',
    modalBg: isDark
      ? 'bg-[#0A0A0A] border border-white/10'
      : 'bg-white border border-black/5',
    primaryBtn: isDark
      ? 'bg-white text-black hover:bg-gray-100'
      : 'bg-black text-white hover:bg-gray-800',
    secondaryBtn: isDark
      ? 'bg-[#111] text-white hover:bg-[#222]'
      : 'bg-[#F2F2F7] text-black',
    divider: isDark ? 'bg-white/5' : 'bg-black/5',
  };

  const staggerChildren = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.25 } },
  };

  return (
    <main
      className={`min-h-screen flex flex-col ${theme.bg} ${theme.text} transition-colors duration-1000 font-sans selection:bg-white/20 ${inter.variable}`}
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-700 ${theme.nav}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 opacity-80">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase">
              QReBill
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full transition-all duration-500 ${theme.secondaryBtn}`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.15em] transition-all active:scale-95 ${theme.primaryBtn}`}
            >
              Enter
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════ 1. HERO — CINEMATIC ENTRY ═══════════════════════ */}
      <section className="relative pt-52 pb-44 px-6 max-w-4xl mx-auto flex flex-col items-center text-center z-10 w-full min-h-[90vh] justify-center">
        {/* Subtle ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-white/[0.015] blur-[120px] pointer-events-none" />

        <AnimatePresence mode="wait">
          {heroStage >= 0 && (
            <motion.p
              key="line1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: easeOutCubic }}
              className={`text-lg md:text-xl font-normal mb-6 ${theme.textMuted}`}
            >
              You think your store is under control.
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {heroStage >= 1 && (
            <motion.p
              key="line2"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-5xl md:text-6xl font-semibold tracking-tight mb-8"
            >
              It&apos;s not.
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {heroStage >= 2 && (
            <motion.p
              key="line3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: easeOutCubic }}
              className={`text-lg md:text-xl font-normal mb-16 ${theme.textMuted}`}
            >
              You just don&apos;t see what&apos;s happening.
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {heroStage >= 3 && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <button
                className={`px-10 py-5 rounded-full font-medium text-sm tracking-wide transition-all active:scale-95 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] ${theme.primaryBtn}`}
              >
                Show me what I&apos;m missing
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ═══════════════════════ 2. REALIZATION — SILENCE + LOSS ═══════════════════════ */}
      <section className={`py-40 px-6 ${theme.sectionBg} transition-colors duration-1000`}>
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-120px' }}
            variants={staggerChildren}
            className="space-y-10"
          >
            {[
              'Customers walk in.',
              'They pick things up.',
              'They put them down.',
              'They leave.',
            ].map((line, i) => (
              <motion.p
                key={line}
                variants={slowReveal(i * 0.3)}
                className={`text-2xl md:text-3xl font-medium ${
                  i === 3 ? 'text-rose-400' : theme.textFaint
                }`}
              >
                {line}
              </motion.p>
            ))}

            {/* Pause */}
            <motion.div variants={fadeOnly(1.6)} className="pt-6 pb-2">
              <div className={`h-px w-24 mx-auto ${theme.divider}`} />
            </motion.div>

            <motion.p
              variants={slowReveal(2.0)}
              className="text-xl md:text-2xl font-semibold"
            >
              You never know why.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ 3. FIRST VISUAL PUNCH — FULL SCREEN ═══════════════════════ */}
      <section className="py-44 px-6 max-w-5xl mx-auto text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-120px' }}
          variants={slowReveal(0)}
          className="mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight">
            Only one gets it.
          </h2>
        </motion.div>

        {/* Visual: scan → lock → block */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerChildren}
          className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16"
        >
          {[
            { icon: Scan, label: 'Customer scans', color: 'text-white/70' },
            { icon: Lock, label: 'Item locks instantly', color: 'text-amber-400' },
            { icon: EyeOff, label: 'Others blocked', color: 'text-rose-400' },
          ].map((step, i) => (
            <motion.div
              key={step.label}
              variants={slowReveal(i * 0.4)}
              className="flex flex-col items-center gap-4"
            >
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center bg-white/[0.03] border border-white/[0.04]`}
              >
                <step.icon className={`w-8 h-8 ${step.color}`} />
              </div>
              <p className={`text-sm font-medium ${theme.textMuted}`}>
                {step.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={slowReveal(1.4)}
          className={`mt-16 text-base font-medium ${theme.textFaint} max-w-lg mx-auto`}
        >
          No double selling. No arguments at the counter. One scan. One owner.
        </motion.p>
      </section>

      {/* ═══════════════════════ 4. TAG SYSTEM — THE LIVING CYCLE ═══════════════════════ */}
      <section className={`py-40 px-6 ${theme.sectionBg} transition-colors duration-1000`}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-120px' }}
            variants={slowReveal(0)}
            className="mb-20 max-w-xl"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Every item is now alive.
            </h2>
            <p className={`text-lg font-normal ${theme.textMuted}`}>
              A small tag. Four states. Total visibility.
            </p>
          </motion.div>

          <div className="relative mt-20">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-white/[0.03] -translate-y-1/2" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
              {[
                { label: 'Active', sub: 'On the floor', icon: QrCode, color: 'emerald' },
                { label: 'In Bag', sub: 'Locked', icon: ShoppingBag, color: 'amber' },
                { label: 'Sold', sub: 'Gone', icon: TrendingDown, color: 'blue' },
                { label: 'Ready', sub: 'Reset', icon: RefreshCcw, color: 'slate' },
              ].map((step, i) => {
                const isActive = i === activeStep;
                const glow = isActive
                  ? 'shadow-[0_0_40px_rgba(255,255,255,0.05)]'
                  : '';
                return (
                  <motion.div
                    key={step.label}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    variants={slowReveal(i * 0.2)}
                    className={`flex flex-col items-center text-center transition-all duration-700 ${glow}`}
                  >
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 ${
                        isActive
                          ? 'bg-white/[0.06] ring-1 ring-white/10 scale-105'
                          : 'bg-white/[0.02]'
                      }`}
                    >
                      <step.icon
                        className={`w-7 h-7 transition-colors duration-500 ${
                          isActive ? 'text-white' : 'text-white/20'
                        }`}
                      />
                    </div>
                    <h3
                      className={`text-base font-semibold mt-4 ${
                        isActive ? 'text-white' : theme.textFaint
                      }`}
                    >
                      {step.label}
                    </h3>
                    <p className={`text-xs mt-1 ${theme.textFaint}`}>{step.sub}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ 5. CONTROL — GOD MODE ═══════════════════════ */}
      <section className="py-44 px-6 max-w-4xl mx-auto text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-120px' }}
          variants={staggerChildren}
          className="space-y-8"
        >
          {[
            'You see who is buying.',
            'You see who is hesitating.',
            'You see what is dying on your shelf.',
          ].map((line, i) => (
            <motion.p
              key={line}
              variants={slowReveal(i * 0.35)}
              className={`text-3xl md:text-4xl font-medium ${
                i === 2 ? 'text-rose-400' : theme.text
              }`}
            >
              {line}
            </motion.p>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════════ 6. LOSS — EMOTIONAL SPIKE ═══════════════════════ */}
      <section className={`py-40 px-6 ${theme.sectionBg} transition-colors duration-1000`}>
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="lg:w-1/2">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-120px' }}
              variants={slowReveal(0)}
              className="text-5xl md:text-6xl font-semibold tracking-tight mb-10"
            >
              <AnimatedNumber value={10} duration={1.5} /> picked.
              <br />
              <span className="text-rose-400">
                <AnimatedNumber value={0} duration={1.5} delay={0.8} /> bought.
              </span>
            </motion.h2>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={slowReveal(0.6)}
              className="text-xl font-medium text-rose-400 mb-4"
            >
              You stocked it. You paid for it. It didn&apos;t sell.
            </motion.p>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={slowReveal(1.0)}
              className={`text-base ${theme.textMuted}`}
            >
              That&apos;s not a slow day. That&apos;s money you&apos;ll never see again.
            </motion.p>
          </div>

          <div className="lg:w-1/2 w-full">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={slowReveal(0.3)}
              className={`${theme.card} rounded-[3rem] p-10`}
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${theme.textFaint}`}>Scanned today</span>
                  <span className="text-3xl font-semibold">
                    <AnimatedNumber value={1240} duration={2} />
                  </span>
                </div>
                <div className={`h-px ${theme.divider}`} />
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${theme.textFaint}`}>In bags</span>
                  <span className="text-3xl font-semibold">
                    <AnimatedNumber value={860} duration={2} delay={0.3} />
                  </span>
                </div>
                <div className={`h-px ${theme.divider}`} />
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${theme.textFaint}`}>Abandoned</span>
                  <span className="text-3xl font-semibold text-rose-400">
                    <AnimatedNumber value={380} duration={2} delay={0.6} />
                  </span>
                </div>
                <div className={`h-px ${theme.divider}`} />
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium text-rose-400`}>Lost today</span>
                  <span className="text-3xl font-semibold text-rose-400">
                    ₹<AnimatedNumber value={18400} duration={2.5} delay={0.9} />
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ 7. CRM — RECOVERY ═══════════════════════ */}
      <section className="py-40 px-6 max-w-5xl mx-auto text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-120px' }}
          variants={staggerChildren}
          className="space-y-6"
        >
          <motion.h2
            variants={slowReveal(0)}
            className="text-4xl md:text-5xl font-semibold tracking-tight"
          >
            They didn&apos;t buy.
          </motion.h2>
          <motion.p
            variants={slowReveal(0.4)}
            className="text-4xl md:text-5xl font-semibold tracking-tight"
          >
            You don&apos;t let them disappear.
          </motion.p>
        </motion.div>

        {/* Recovery animation hint */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={slowReveal(1.0)}
          className="mt-16 flex items-center justify-center gap-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/5 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-rose-400" />
            </div>
            <span className={`text-sm ${theme.textFaint}`}>Leave</span>
          </div>
          <div className={`h-px w-12 ${theme.divider}`} />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-500/5 flex items-center justify-center">
              <BellRing className="w-6 h-6 text-green-400" />
            </div>
            <span className={`text-sm ${theme.textFaint}`}>Reminded</span>
          </div>
          <div className={`h-px w-12 ${theme.divider}`} />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
              <RefreshCcw className="w-6 h-6 text-white/60" />
            </div>
            <span className="text-sm font-medium">Return</span>
          </div>
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={slowReveal(1.6)}
          className={`mt-12 text-base ${theme.textMuted} max-w-md mx-auto`}
        >
          One tap. They&apos;re back in your store. Automatically.
        </motion.p>
      </section>

      {/* ═══════════════════════ 8. FINAL — IDENTITY SHIFT ═══════════════════════ */}
      <section className={`py-44 px-6 ${theme.sectionBg} transition-colors duration-1000`}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-120px' }}
            variants={staggerChildren}
            className="space-y-8"
          >
            <motion.p
              variants={slowReveal(0)}
              className={`text-2xl md:text-3xl font-medium ${theme.textFaint}`}
            >
              Some stores guess.
            </motion.p>

            <motion.p
              variants={slowReveal(0.6)}
              className="text-3xl md:text-4xl font-semibold"
            >
              Some stores know.
            </motion.p>

            <motion.div variants={fadeOnly(1.2)} className="pt-4">
              <div className={`h-px w-20 mx-auto ${theme.divider}`} />
            </motion.div>

            <motion.p
              variants={slowReveal(1.6)}
              className="text-3xl md:text-4xl font-semibold"
            >
              Which one are you?
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={slowReveal(2.2)}
            className="mt-16"
          >
            <button
              className={`px-12 py-6 rounded-full font-semibold text-base tracking-wide transition-all active:scale-95 hover:shadow-[0_0_50px_rgba(255,255,255,0.12)] ${theme.primaryBtn}`}
            >
              I want to know
            </button>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className={`border-t py-8 px-6 ${theme.divider} ${theme.bg}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-2 md:mb-0">
            <Eye className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40">
              QReBill
            </span>
          </div>
          <p className={`text-[10px] font-medium uppercase tracking-[0.2em] ${theme.textFaint}`}>
            Blind stores lose. Smart stores don&apos;t.
          </p>
        </div>
      </footer>

      {/* ═══════════════════════ CONSOLE MODAL ═══════════════════════ */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xl sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl border ${theme.modalBg} relative overflow-hidden pb-12 pt-4 px-6 sm:p-10 min-h-[480px] flex flex-col`}
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
                    key="bio"
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
                    <h2 className="text-2xl font-semibold mb-2 tracking-tight">
                      Store Access
                    </h2>
                    <p className={`${theme.textMuted} text-sm mb-10 font-medium px-4`}>
                      Verify identity to enter your dashboard.
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
                        className={`h-px flex-1 ${
                          isDark ? 'bg-white/10' : 'bg-black/10'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.textMuted}`}
                      >
                        OR
                      </span>
                      <div
                        className={`h-px flex-1 ${
                          isDark ? 'bg-white/10' : 'bg-black/10'
                        }`}
                      />
                    </div>
                    <button
                      onClick={() => setShowPinPad(true)}
                      className={`font-semibold text-xs transition-colors py-2 uppercase tracking-widest ${theme.textMuted} hover:text-white`}
                    >
                      Use Passcode
                    </button>
                    {error && (
                      <p className="mt-6 text-red-500 text-xs font-bold">{error}</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="pin"
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
                      {[...Array(4)].map((_, i) => (
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
                        className={`h-14 flex items-center justify-center transition-colors ${theme.textMuted} hover:text-white`}
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
                    {error && (
                      <p className="mt-6 text-red-500 text-xs font-bold">{error}</p>
                    )}
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