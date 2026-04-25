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
  const [isMobile, setIsMobile] = useState(true); // mobile‑first

  /* ── Detect device ── */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    setIsMobile(!mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Hero staging (desktop only) ── */
  useEffect(() => {
    if (isMobile) return;
    const stages = [0, 1200, 2400, 3800];
    const timers = stages.map((delay, i) =>
      setTimeout(() => setHeroStage(i), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isMobile]);

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
    sectionBg: isDark ? 'bg-[#020202]' : 'bg-[#F5F5F7]',
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

  /* ── Section wrapper with subtle zoom ── */
  const SectionWrapper = ({
    children,
    className = '',
    dark = false,
  }: {
    children: React.ReactNode;
    className?: string;
    dark?: boolean;
  }) => (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: easeOutCubic }}
      className={`${dark ? theme.sectionBg : ''} ${className}`}
    >
      {children}
    </motion.section>
  );

  /* ── Hero mobile screens ── */
  const MobileHero = () => (
    <>
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-black">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40%' }}
          variants={slowReveal(0)}
          className="text-3xl font-semibold text-white/70"
        >
          You think your store is under control.
        </motion.p>
      </section>
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-black">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40%' }}
          variants={slowReveal(0)}
          className="text-5xl font-bold"
        >
          It&apos;s not.
        </motion.p>
      </section>
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-black">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40%' }}
          variants={slowReveal(0)}
          className="text-3xl font-semibold text-white/70 mb-12"
        >
          You just don&apos;t see what&apos;s happening.
        </motion.p>
        <motion.button
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40%' }}
          variants={slowReveal(0.3)}
          className={`px-10 py-5 rounded-full font-medium text-sm tracking-wide bg-white text-black active:scale-95`}
        >
          Show me what I&apos;m missing
        </motion.button>
      </section>
    </>
  );

  /* ── Desktop Hero ── */
  const DesktopHero = () => (
    <section className="relative pt-52 pb-44 px-6 max-w-4xl mx-auto flex flex-col items-center text-center z-10 w-full min-h-[90vh] justify-center">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-white/[0.015] blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {heroStage >= 0 && (
          <motion.p
            key="line1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: easeOutCubic }}
            className="text-lg md:text-xl font-normal mb-6 text-white/70"
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
            className="text-lg md:text-xl font-normal mb-16 text-white/70"
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
            <button className="px-10 py-5 rounded-full font-medium text-sm tracking-wide transition-all active:scale-95 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] bg-white text-black">
              Show me what I&apos;m missing
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );

  return (
    <main
      className={`min-h-screen flex flex-col ${theme.bg} ${theme.text} transition-colors duration-1000 font-sans selection:bg-white/20 ${inter.variable}`}
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-700 ${theme.nav}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 opacity-80">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase">QReBill</span>
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

      {/* ── Hero ── */}
      {isMobile ? <MobileHero /> : <DesktopHero />}

      {/* ── Realization ── */}
      <SectionWrapper dark className="py-24 md:py-40 px-6 min-h-screen flex items-center">
        <div className="max-w-2xl mx-auto text-center w-full">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40%' }}
            variants={staggerChildren}
            className="space-y-12 md:space-y-10"
          >
            {['Customers walk in.', 'They pick things up.', 'They put them down.', 'They leave.'].map(
              (line, i) => (
                <motion.p
                  key={line}
                  variants={slowReveal(i * 0.3)}
                  className={`text-3xl md:text-3xl font-medium ${
                    i === 3 ? 'text-rose-400' : theme.textFaint
                  }`}
                >
                  {line}
                </motion.p>
              )
            )}
            {/* Pause */}
            <motion.div variants={fadeOnly(1.6)} className="pt-6 pb-2">
              <div className={`h-px w-24 mx-auto ${theme.divider}`} />
            </motion.div>
            <motion.p variants={slowReveal(2.0)} className="text-2xl md:text-2xl font-semibold">
              You never know why.
            </motion.p>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* ── First Visual Punch ── */}
      <SectionWrapper className="py-24 md:py-44 px-6 max-w-5xl mx-auto text-center min-h-screen flex flex-col justify-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40%' }}
          variants={slowReveal(0)}
          className="mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight">Only one gets it.</h2>
        </motion.div>

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
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-white/[0.03] border border-white/[0.04]">
                <step.icon className={`w-8 h-8 ${step.color}`} />
              </div>
              <p className="text-sm font-medium text-white/70">{step.label}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={slowReveal(1.4)}
          className="mt-16 text-base font-medium text-white/40 max-w-lg mx-auto"
        >
          No double selling. No arguments. One scan. One owner.
        </motion.p>
      </SectionWrapper>

      {/* ── Tag System – The Living Cycle ── */}
      <SectionWrapper dark className="py-24 md:py-40 px-6 min-h-screen flex flex-col justify-center">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40%' }}
            variants={slowReveal(0)}
            className="mb-20 max-w-xl"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              One tag. Everything visible.
            </h2>
          </motion.div>

          <div className="relative mt-10 md:mt-20">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-white/[0.03] -translate-y-1/2" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 relative">
              {['Active', 'In Bag', 'Sold', 'Ready'].map((label, i) => {
                const isActive = i === activeStep;
                const icons = [QrCode, ShoppingBag, TrendingDown, RefreshCcw];
                const Icon = icons[i];
                const glow = isActive ? 'shadow-[0_0_40px_rgba(255,255,255,0.05)]' : '';
                return (
                  <motion.div
                    key={label}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    variants={slowReveal(i * 0.15)}
                    className={`flex flex-col items-center text-center transition-all duration-700 ${glow}`}
                  >
                    <motion.div
                      animate={
                        isActive
                          ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 2 } }
                          : {}
                      }
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-500 ${
                        isActive ? 'bg-white/[0.08] ring-1 ring-white/10' : 'bg-white/[0.02]'
                      }`}
                    >
                      {label === 'In Bag' && isActive ? (
                        <Lock className="w-7 h-7 text-amber-400 animate-pulse" />
                      ) : (
                        <Icon
                          className={`w-7 h-7 transition-colors duration-500 ${
                            isActive ? 'text-white' : 'text-white/20'
                          }`}
                        />
                      )}
                    </motion.div>
                    <h3
                      className={`text-lg font-semibold mt-4 ${
                        isActive ? 'text-white' : theme.textFaint
                      }`}
                    >
                      {label}
                    </h3>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* In Bag power card */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={slowReveal(0.6)}
            className="mt-16 md:mt-20 p-8 md:p-10 rounded-[2.5rem] bg-[#0A0A0A] border border-amber-400/10 max-w-2xl mx-auto text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                In Bag = Locked
              </span>
            </div>
            <p className="text-xl font-medium leading-relaxed">
              Once scanned, it&apos;s gone. No one else can touch it.
            </p>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* ── Control ── */}
      <SectionWrapper className="py-24 md:py-44 px-6 max-w-4xl mx-auto text-center min-h-screen flex flex-col justify-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40%' }}
          variants={staggerChildren}
          className="space-y-10 md:space-y-8"
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

        {/* Mid‑page CTA on mobile */}
        {isMobile && (
          <motion.button
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40%' }}
            variants={slowReveal(1.0)}
            className="mt-14 px-10 py-5 rounded-full font-semibold text-sm bg-white text-black active:scale-95"
          >
            See your store live
          </motion.button>
        )}
      </SectionWrapper>

      {/* ── Loss ── */}
      <SectionWrapper dark className="py-24 md:py-40 px-6 min-h-screen flex items-center">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-16 w-full">
          <div className="lg:w-1/2">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40%' }}
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
              className="text-base text-white/50"
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
              className="bg-[#0A0A0A] border border-white/[0.03] rounded-[3rem] p-8 md:p-10"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Scanned today</span>
                  <span className="text-3xl font-semibold">
                    <AnimatedNumber value={1240} duration={2} />
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">In bags</span>
                  <span className="text-3xl font-semibold">
                    <AnimatedNumber value={860} duration={2} delay={0.3} />
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Abandoned</span>
                  <span className="text-3xl font-semibold text-rose-400">
                    <AnimatedNumber value={380} duration={2} delay={0.6} />
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-rose-400">Lost today</span>
                  <span className="text-3xl font-semibold text-rose-400">
                    ₹<AnimatedNumber value={18400} duration={2.5} delay={0.9} />
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── CRM ── */}
      <SectionWrapper className="py-24 md:py-40 px-6 max-w-5xl mx-auto text-center min-h-screen flex flex-col justify-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40%' }}
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

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={slowReveal(1.0)}
          className="mt-16 flex flex-col md:flex-row items-center justify-center gap-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/5 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-rose-400" />
            </div>
            <span className="text-sm text-white/40">Leave</span>
          </div>
          <div className="h-px w-12 bg-white/5 hidden md:block" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-500/5 flex items-center justify-center">
              <BellRing className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-sm text-white/40">Reminded</span>
          </div>
          <div className="h-px w-12 bg-white/5 hidden md:block" />
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
          className="mt-12 text-base text-white/50 max-w-md mx-auto"
        >
          One tap. They&apos;re back in your store. Automatically.
        </motion.p>
      </SectionWrapper>

      {/* ── Final ── */}
      <SectionWrapper dark className="py-24 md:py-44 px-6 min-h-screen flex flex-col justify-center">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40%' }}
            variants={staggerChildren}
            className="space-y-8"
          >
            <motion.p
              variants={slowReveal(0)}
              className="text-2xl md:text-3xl font-medium text-white/40"
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
              <div className="h-px w-20 mx-auto bg-white/5" />
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
            <button className="px-12 py-6 rounded-full font-semibold text-base tracking-wide bg-white text-black active:scale-95 hover:shadow-[0_0_50px_rgba(255,255,255,0.12)] transition-all">
              I want to know
            </button>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* Footer */}
      <footer className={`border-t py-8 px-6 ${theme.divider} ${theme.bg}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-2 md:mb-0">
            <Eye className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40">
              QReBill
            </span>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
            Blind stores lose. Smart stores don&apos;t.
          </p>
        </div>
      </footer>

      {/* ── Console Modal ── */}
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
              {/* ... remaining modal content unchanged ... */}
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