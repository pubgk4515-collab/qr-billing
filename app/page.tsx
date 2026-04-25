'use client';

import { useState, useEffect, Suspense, useRef, useLayoutEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from './lib/supabase';
import {
  motion,
  AnimatePresence,
  useInView,
  useAnimate,
  useMotionValue,
  Variants,
} from 'framer-motion';
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

/* ── Easing ── */
const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ── Theme helpers ── */
const THEME_KEY = 'qrebill-theme';
const DARK_CLASS = 'dark';
const LIGHT_CLASS = 'light';

function getSystemTheme(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadThemeFromStorage(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light') return false;
  if (stored === 'dark') return true;
  return getSystemTheme();
}

function applyThemeClass(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle(DARK_CLASS, isDark);
  root.classList.toggle(LIGHT_CLASS, !isDark);
  // Legacy – keep for inline styles that rely on data attribute
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

/* ── Smooth Animated Number (Framer Motion) ── */
function AnimatedNumber({
  value,
  duration = 1.5,
  delay = 0,
}: {
  value: number;
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20%' });
  const motionVal = useMotionValue(0);
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const controls = animate(
      motionVal,
      value,
      { duration, delay, ease: easeOut }
    );
    return () => controls?.stop();
  }, [isInView, value, duration, delay, motionVal, animate]);

  return (
    <motion.span ref={ref}>
      {motionVal}
    </motion.span>
  );
}

/* ── Variants ── */
const fastReveal = (delay = 0): Variants => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay, ease: easeOut },
  },
});

const fadeIn = (delay = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, delay, ease: 'easeOut' },
  },
});

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ── Landing Content ── */
function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlShopSlug = searchParams.get('shop');

  // Theme
  const [isDark, setIsDark] = useState(loadThemeFromStorage);

  // Apply class immediately before paint
  useLayoutEffect(() => {
    applyThemeClass(isDark);
  }, [isDark]);

  // Listen to system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Persist theme changes
  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeShop, setActiveShop] = useState<string | null>(null);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePinSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');
    if (!activeShop) {
      setError('Store identity missing.');
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
        setError('Store not found.');
        setLoading(false);
        return;
      }
      if (store.admin_pin === pin) {
        localStorage.setItem('active_admin_session', store.slug);
        router.push(`/admin/${store.slug}`);
      } else {
        setError('Incorrect PIN.');
        setPin('');
        setLoading(false);
      }
    } catch (err) {
      setError('Network error.');
      setLoading(false);
    }
  };

  const triggerScreenLock = async () => {
    setError('Verifying...');
    setTimeout(() => {
      setError('Use PIN instead.');
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

  // Theme‑based classes
  const theme = {
    bg: 'bg-black',
    text: 'text-white',
    muted: 'text-[#777]',
    faint: 'text-[#444]',
    nav: 'bg-black/80 border-white/5 backdrop-blur-2xl',
    darkSection: 'bg-[#020202]',
    card: 'bg-[#0A0A0A] border border-white/[0.03]',
    cardInner: 'bg-[#111]',
    divider: 'bg-white/5',
    primaryBtn: 'bg-white text-black hover:bg-gray-100 transition-colors',
    secondaryBtn: 'bg-[#111] text-white hover:bg-[#222] transition-colors',
  };

  // Button press style
  const pressable = 'active:scale-95 transition-transform duration-100';

  return (
    <main
      className={`min-h-screen flex flex-col ${theme.bg} ${theme.text} font-sans selection:bg-white/20 ${inter.variable}`}
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      {/* ═══ NAV ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b ${theme.nav}`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 opacity-80">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-[0.15em] uppercase">QReBill</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full transition-all duration-200 ${theme.secondaryBtn} ${pressable}`}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div
                    key="sun"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.12em] ${pressable} ${theme.primaryBtn}`}
            >
              Enter
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ 1. HERO ═══ */}
      <section className="pt-40 pb-20 md:pt-48 md:pb-28 px-6 max-w-4xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.15] mb-6"
        >
          It&apos;s not your store.
          <br />
          <span className={theme.muted}>It&apos;s what you can&apos;t see.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
          className={`text-lg md:text-xl max-w-xl mx-auto mb-12 ${theme.muted}`}
        >
          You only see what gets billed. Everything else is invisible.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
        >
          <button
            className={`px-8 py-4 rounded-full font-medium text-sm tracking-wide ${pressable} transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] ${theme.primaryBtn}`}
          >
            See it live
          </button>
        </motion.div>
      </section>

      {/* ═══ 2. REALIZATION ═══ */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className={`py-28 md:py-32 px-6 ${theme.darkSection}`}
      >
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="space-y-5"
          >
            {[
              'Customers walk in.',
              'They pick things up.',
              'They put them down.',
              'They leave.',
            ].map((line, i) => (
              <motion.p
                key={line}
                variants={fastReveal(i * 0.12)}
                className={`text-2xl md:text-3xl font-medium ${
                  i === 3 ? 'text-rose-400' : theme.faint
                }`}
              >
                {line}
              </motion.p>
            ))}
            <motion.div variants={fadeIn(0.6)} className="pt-4">
              <div className={`h-px w-20 mx-auto ${theme.divider}`} />
            </motion.div>
            <motion.p variants={fastReveal(0.8)} className="text-xl md:text-2xl font-semibold pt-2">
              You never know why.
            </motion.p>
          </motion.div>
        </div>
      </motion.section>

      {/* ═══ 3. VISUAL PUNCH ═══ */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="py-28 md:py-32 px-6 max-w-4xl mx-auto text-center"
      >
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fastReveal(0)}
          className="text-3xl md:text-5xl font-semibold tracking-tight mb-14"
        >
          Only one gets it.
        </motion.h2>

        <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16">
          {[
            { icon: Scan, label: 'Customer scans', color: 'text-white/60' },
            { icon: Lock, label: 'Item locks instantly', color: 'text-amber-400' },
            { icon: EyeOff, label: 'Others blocked', color: 'text-rose-400' },
          ].map((step, i) => (
            <motion.div
              key={step.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fastReveal(i * 0.15)}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/[0.04]">
                <step.icon className={`w-7 h-7 ${step.color}`} />
              </div>
              <p className="text-sm font-medium text-white/60">{step.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fastReveal(0.5)}
          className="mt-12 text-sm text-white/40 max-w-md mx-auto"
        >
          No double selling. One scan. One owner.
        </motion.p>
      </motion.section>

      {/* ═══ 4. TAG SYSTEM ═══ */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className={`py-28 md:py-32 px-6 ${theme.darkSection}`}
      >
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fastReveal(0)}
            className="text-3xl md:text-5xl font-semibold tracking-tight mb-16 text-center"
          >
            One tag. Everything visible.
          </motion.h2>

          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-white/[0.03] -translate-y-1/2" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 relative">
              {['Active', 'In Bag', 'Sold', 'Ready'].map((label, i) => {
                const isActive = i === activeStep;
                const icons = [QrCode, ShoppingBag, TrendingDown, RefreshCcw];
                const Icon = icons[i];
                return (
                  <motion.div
                    key={label}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    variants={fastReveal(i * 0.1)}
                    className="flex flex-col items-center text-center"
                  >
                    <motion.div
                      animate={
                        isActive
                          ? { scale: [1, 1.04, 1] }
                          : {}
                      }
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${
                        isActive
                          ? 'bg-white/[0.06] ring-1 ring-white/10'
                          : 'bg-white/[0.02]'
                      }`}
                    >
                      {label === 'In Bag' && isActive ? (
                        <Lock className="w-6 h-6 text-amber-400" />
                      ) : (
                        <Icon
                          className={`w-6 h-6 transition-colors duration-500 ${
                            isActive ? 'text-white' : 'text-white/20'
                          }`}
                        />
                      )}
                    </motion.div>
                    <h3
                      className={`text-sm font-semibold mt-3 ${
                        isActive ? 'text-white' : theme.faint
                      }`}
                    >
                      {label}
                    </h3>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* In Bag highlight */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fastReveal(0.4)}
            className="mt-14 max-w-lg mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/5 border border-amber-400/10 mb-4">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                In Bag = Locked
              </span>
            </div>
            <p className="text-lg font-medium">
              Once scanned, it&apos;s gone. No one else can touch it.
            </p>
          </motion.div>

          {/* Mid CTA */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fastReveal(0.6)}
            className="mt-12 text-center"
          >
            <button
              className={`px-8 py-4 rounded-full font-medium text-sm ${pressable} transition-all ${theme.primaryBtn}`}
            >
              See your store live
            </button>
          </motion.div>
        </div>
      </motion.section>

      {/* ═══ 5. CONTROL ═══ */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="py-28 md:py-32 px-6 max-w-3xl mx-auto text-center"
      >
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fastReveal(0)}
          className="text-3xl md:text-5xl font-semibold tracking-tight mb-12"
        >
          You&apos;re not guessing anymore.
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="space-y-5"
        >
          {[
            'You see who is buying.',
            'You see who is hesitating.',
            'You see what is dying on your shelf.',
          ].map((line, i) => (
            <motion.p
              key={line}
              variants={fastReveal(i * 0.15)}
              className={`text-2xl md:text-3xl font-medium ${
                i === 2 ? 'text-rose-400' : theme.text
              }`}
            >
              {line}
            </motion.p>
          ))}
        </motion.div>
      </motion.section>

      {/* ═══ 6. LOSS ═══ */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className={`py-28 md:py-32 px-6 ${theme.darkSection}`}
      >
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-14 lg:gap-20">
          <div className="lg:w-1/2">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fastReveal(0)}
              className="text-4xl md:text-5xl font-semibold tracking-tight mb-8"
            >
              <AnimatedNumber value={1240} duration={1.2} /> scanned.
              <br />
              <span className="text-rose-400">
                <AnimatedNumber value={380} duration={1.2} delay={0.6} /> abandoned.
              </span>
            </motion.h2>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fastReveal(0.3)}
              className="text-lg font-medium text-rose-400 mb-3"
            >
              10 picked, 0 bought. You stocked it, you paid for it. It didn&apos;t sell.
            </motion.p>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fastReveal(0.5)}
              className="text-sm text-white/40"
            >
              That&apos;s money you&apos;ll never see again.
            </motion.p>
          </div>

          <div className="lg:w-1/2 w-full">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fastReveal(0.2)}
              className={`${theme.card} rounded-[2.5rem] p-8 md:p-10`}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Scanned today</span>
                  <span className="text-2xl md:text-3xl font-semibold">
                    <AnimatedNumber value={1240} duration={1.5} />
                  </span>
                </div>
                <div className={`h-px ${theme.divider}`} />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">In bags</span>
                  <span className="text-2xl md:text-3xl font-semibold">
                    <AnimatedNumber value={860} duration={1.5} delay={0.2} />
                  </span>
                </div>
                <div className={`h-px ${theme.divider}`} />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Abandoned</span>
                  <span className="text-2xl md:text-3xl font-semibold text-rose-400">
                    <AnimatedNumber value={380} duration={1.5} delay={0.4} />
                  </span>
                </div>
                <div className={`h-px ${theme.divider}`} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-rose-400">Lost today</span>
                  <span className="text-2xl md:text-3xl font-semibold text-rose-400">
                    ₹<AnimatedNumber value={18400} duration={2} delay={0.6} />
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ═══ 7. CRM ═══ */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="py-28 md:py-32 px-6 max-w-4xl mx-auto text-center"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="space-y-4"
        >
          <motion.h2
            variants={fastReveal(0)}
            className="text-3xl md:text-5xl font-semibold tracking-tight"
          >
            They didn&apos;t buy.
          </motion.h2>
          <motion.p
            variants={fastReveal(0.2)}
            className="text-3xl md:text-5xl font-semibold tracking-tight"
          >
            You don&apos;t let them disappear.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fastReveal(0.5)}
          className="mt-12 flex flex-col md:flex-row items-center justify-center gap-5 md:gap-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/5 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
            <span className="text-sm text-white/40">Leave</span>
          </div>
          <div className="h-px w-10 bg-white/5 hidden md:block" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/5 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-white/40">Reminded</span>
          </div>
          <div className="h-px w-10 bg-white/5 hidden md:block" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 text-white/50" />
            </div>
            <span className="text-sm font-medium">Return</span>
          </div>
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fastReveal(0.8)}
          className="mt-10 text-sm text-white/40 max-w-sm mx-auto"
        >
          One tap. They&apos;re back. Automatically.
        </motion.p>
      </motion.section>

      {/* ═══ 8. FINAL ═══ */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className={`py-32 md:py-40 px-6 ${theme.darkSection} text-center`}
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="space-y-6"
        >
          <motion.p
            variants={fastReveal(0)}
            className="text-2xl md:text-3xl font-medium text-white/40"
          >
            Some stores guess.
          </motion.p>
          <motion.p
            variants={fastReveal(0.3)}
            className="text-3xl md:text-4xl font-semibold"
          >
            Some stores know.
          </motion.p>
          <motion.div variants={fadeIn(0.6)} className="pt-2">
            <div className="h-px w-16 mx-auto bg-white/5" />
          </motion.div>
          <motion.p
            variants={fastReveal(0.8)}
            className="text-3xl md:text-4xl font-semibold"
          >
            Which one are you?
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fastReveal(1.0)}
          className="mt-12"
        >
          <button
            className={`px-10 py-5 rounded-full font-semibold text-sm tracking-wide ${pressable} transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] ${theme.primaryBtn}`}
          >
            I want to know
          </button>
        </motion.div>
      </motion.section>

      {/* ═══ FOOTER ═══ */}
      <footer className={`border-t py-7 px-6 ${theme.divider} bg-black`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs font-semibold tracking-[0.15em] uppercase text-white/30">
              QReBill
            </span>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/30">
            Blind stores lose. Smart stores don&apos;t.
          </p>
        </div>
      </footer>

      {/* ═══ CONSOLE MODAL ═══ */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-lg sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl border bg-[#0A0A0A] border-white/10 relative overflow-hidden pb-12 pt-4 px-6 sm:p-10 min-h-[480px] flex flex-col"
            >
              <div className="w-12 h-1.5 rounded-full mx-auto mb-8 sm:hidden bg-white/20" />
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
                    <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-8 bg-[#111]">
                      <ShieldCheck className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2 tracking-tight">Store Access</h2>
                    <p className="text-[#777] text-sm mb-10 font-medium px-4">
                      Verify identity to enter your dashboard.
                    </p>
                    <button
                      onClick={triggerScreenLock}
                      disabled={loading}
                      className={`w-full font-medium text-sm py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 bg-white text-black hover:bg-gray-100`}
                    >
                      <Fingerprint className="w-5 h-5" /> Use Biometrics
                    </button>
                    <div className="flex items-center gap-4 w-full mt-8 mb-6">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#777]">
                        OR
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                    <button
                      onClick={() => setShowPinPad(true)}
                      className="font-semibold text-xs transition-colors py-2 uppercase tracking-widest text-[#777] hover:text-white"
                    >
                      Use Passcode
                    </button>
                    {error && <p className="mt-6 text-red-500 text-xs font-bold">{error}</p>}
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
                        className="p-2 rounded-full transition-colors bg-[#111] text-white hover:bg-[#222]"
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
                          className={`w-4 h-4 rounded-full transition-all duration-200 ${
                            pin.length > i ? 'bg-blue-500 scale-110' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <button
                          key={n}
                          onClick={() => addDigit(n.toString())}
                          className="h-14 rounded-2xl text-xl font-medium transition-all active:scale-95 bg-[#1C1C1E] text-white"
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={removeDigit}
                        className="h-14 flex items-center justify-center transition-colors active:scale-95 text-[#777] hover:text-white"
                      >
                        <Delete className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => addDigit('0')}
                        className="h-14 rounded-2xl text-xl font-medium transition-all active:scale-95 bg-[#1C1C1E] text-white"
                      >
                        0
                      </button>
                      <button
                        onClick={handlePinSubmit}
                        disabled={pin.length < 4 || loading}
                        className="h-14 rounded-2xl flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all bg-white text-black hover:bg-gray-100"
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