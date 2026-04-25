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
  ShoppingBag,
  RefreshCcw,
  BellRing,
  Scan,
  TrendingDown,
  Eye,
  EyeOff,
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
    }, 2500);
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
    textMuted: isDark ? 'text-[#777777]' : 'text-[#555555]',
    textFaint: isDark ? 'text-[#555555]' : 'text-[#999999]',
    nav: isDark
      ? 'bg-black/80 border-white/5 backdrop-blur-2xl'
      : 'bg-white/80 border-black/5 backdrop-blur-2xl',
    sectionBg: isDark ? 'bg-[#050505]' : 'bg-[#F5F5F7]',
    card: isDark
      ? 'bg-[#0D0D0D] border border-white/[0.04]'
      : 'bg-white border border-black/[0.03] shadow-[0_2px_20px_rgba(0,0,0,0.03)]',
    cardInner: isDark ? 'bg-[#141414]' : 'bg-[#F2F2F7]',
    input: isDark ? 'bg-[#1C1C1E] text-white' : 'bg-[#F2F2F7] text-black',
    modalBg: isDark
      ? 'bg-[#0D0D0D] border border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.95)]'
      : 'bg-white border border-black/5 shadow-[0_-20px_80px_rgba(0,0,0,0.1)]',
    primaryBtn: isDark
      ? 'bg-white text-black hover:bg-gray-100'
      : 'bg-black text-white hover:bg-gray-800',
    secondaryBtn: isDark
      ? 'bg-[#141414] text-white hover:bg-[#222]'
      : 'bg-[#F2F2F7] text-black hover:bg-[#E5E5EA]',
    divider: isDark ? 'bg-white/5' : 'bg-black/5',
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const stagger = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12 },
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
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-white/70" />
            <span className="text-lg font-semibold tracking-tight">QReBill</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full transition-all duration-300 ${theme.secondaryBtn}`}
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
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.15em] transition-all active:scale-95 ${theme.primaryBtn}`}
            >
              Store Login
            </button>
          </div>
        </div>
      </nav>

      {/* ---------- 1. HERO ---------- */}
      <section className="pt-44 pb-36 px-6 max-w-4xl mx-auto flex flex-col items-center text-center z-10 w-full">
        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="text-5xl md:text-[5rem] font-semibold leading-[1.08] tracking-[-0.02em] mb-8 max-w-3xl"
        >
          Nothing in your store goes unseen.
        </motion.h1>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className={`text-lg md:text-xl font-normal max-w-xl mb-14 leading-relaxed ${theme.textMuted}`}
        >
          See what customers pick. What they leave. And what you lose.
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <button
            className={`px-8 py-4 rounded-full font-medium text-sm transition-all active:scale-95 ${theme.primaryBtn}`}
          >
            See It Live
          </button>
        </motion.div>
      </section>

      {/* ---------- 2. REALIZATION ---------- */}
      <section className={`py-36 px-6 ${theme.sectionBg} transition-colors duration-500`}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="space-y-6"
          >
            <motion.p
              variants={fadeUp}
              className={`text-2xl md:text-3xl font-medium leading-relaxed ${theme.textFaint}`}
            >
              Customers walk in.
            </motion.p>
            <motion.p
              variants={fadeUp}
              className={`text-2xl md:text-3xl font-medium leading-relaxed ${theme.textFaint}`}
            >
              They pick things up.
            </motion.p>
            <motion.p
              variants={fadeUp}
              className={`text-2xl md:text-3xl font-medium leading-relaxed ${theme.textFaint}`}
            >
              They put things down.
            </motion.p>
            <motion.p
              variants={fadeUp}
              className={`text-2xl md:text-3xl font-medium leading-relaxed ${theme.textFaint}`}
            >
              They leave.
            </motion.p>

            <motion.div variants={fadeUp} className="pt-8">
              <div className={`h-px w-32 mx-auto mb-8 ${theme.divider}`} />
              <p className="text-xl md:text-2xl font-semibold">
                You only see what gets billed.
              </p>
              <p className={`text-lg md:text-xl mt-3 ${theme.textMuted}`}>
                Everything else is invisible.
              </p>
            </motion.div>
          </motion.div>

          {/* Blind spot visual */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            className="mt-16 flex items-center justify-center gap-8"
          >
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-white/60" />
              <span className={`text-sm font-medium ${theme.textMuted}`}>What you see</span>
            </div>
            <div className={`h-px w-16 ${theme.divider}`} />
            <div className="flex items-center gap-3">
              <EyeOff className="w-5 h-5 text-rose-400" />
              <span className="text-sm font-medium text-rose-400">What you miss</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- 3. SYSTEM REVEAL ---------- */}
      <section className="py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="mb-20 max-w-2xl"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Every item in your store is now live.
            </h2>
            <p className={`text-xl font-normal leading-relaxed ${theme.textMuted}`}>
              A small QR tag on each product. That&apos;s it. The system handles the rest.
            </p>
          </motion.div>

          {/* 4-State Lifecycle */}
          <div className="relative mt-16">
            <div className="hidden md:block absolute top-1/2 left-[6%] right-[6%] h-px bg-white/5 -translate-y-1/2" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 relative">
              {[
                {
                  label: 'Active',
                  sub: 'Available on the floor',
                  icon: QrCode,
                  color: 'emerald',
                },
                {
                  label: 'In Bag',
                  sub: 'Locked instantly for one customer',
                  icon: ShoppingBag,
                  color: 'amber',
                },
                {
                  label: 'Sold',
                  sub: 'Checked out. Done.',
                  icon: TrendingDown,
                  color: 'blue',
                },
                {
                  label: 'Ready',
                  sub: 'Tag resets. Back in play.',
                  icon: RefreshCcw,
                  color: 'slate',
                },
              ].map((step, i) => {
                const isActive = i === activeStep;
                const isPast = i < activeStep;
                const colorGlow: Record<string, string> = {
                  emerald: 'shadow-[0_0_30px_rgba(52,211,153,0.15)]',
                  amber: 'shadow-[0_0_30px_rgba(251,191,36,0.15)]',
                  blue: 'shadow-[0_0_30px_rgba(96,165,250,0.15)]',
                  slate: 'shadow-[0_0_30px_rgba(148,163,184,0.1)]',
                };
                return (
                  <motion.div
                    key={step.label}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={fadeUp}
                    className="flex flex-col items-center text-center relative"
                  >
                    <div className="relative mb-5">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-700 ${
                          isActive
                            ? `bg-white/10 ring-1 ring-white/15 ${colorGlow[step.color]}`
                            : 'bg-white/[0.03]'
                        }`}
                      >
                        <step.icon
                          className={`w-7 h-7 transition-colors duration-500 ${
                            isActive
                              ? 'text-white'
                              : isPast
                              ? 'text-white/40'
                              : 'text-white/15'
                          }`}
                        />
                      </div>
                      {isActive && (
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/5 blur-xl animate-pulse" />
                      )}
                    </div>
                    <h3
                      className={`text-lg font-semibold mb-1 tracking-tight ${
                        isActive ? 'text-white' : theme.textMuted
                      }`}
                    >
                      {step.label}
                    </h3>
                    <p className={`text-sm font-medium ${theme.textFaint}`}>{step.sub}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* In Bag power moment */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            className={`mt-20 p-10 rounded-[2.5rem] ${theme.card} border-amber-400/10 max-w-2xl mx-auto text-center`}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                In Bag = Locked
              </span>
            </div>
            <p className="text-xl font-medium leading-relaxed">
              Once a customer scans, that item is theirs.
            </p>
            <p className={`text-base mt-2 leading-relaxed ${theme.textMuted}`}>
              No other customer can scan it. No double selling. No confusion at the counter.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---------- 4. CONTROL MOMENT ---------- */}
      <section className={`py-36 px-6 ${theme.sectionBg} transition-colors duration-500`}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-6"
          >
            You don&apos;t guess anymore.
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className={`text-xl md:text-2xl font-normal max-w-2xl mx-auto leading-relaxed ${theme.textMuted}`}
          >
            You see everything.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            {[
              { label: 'Who scanned', detail: 'Every customer identified' },
              { label: 'What they took', detail: 'Item tracked in real-time' },
              { label: 'What they left', detail: 'Abandoned items flagged' },
            ].map((item) => (
              <div
                key={item.label}
                className={`${theme.card} rounded-2xl p-6 text-center`}
              >
                <p className="text-lg font-semibold mb-1">{item.label}</p>
                <p className={`text-sm ${theme.textFaint}`}>{item.detail}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------- 5. BEHAVIOR INSIGHT ---------- */}
      <section className="py-36 px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-semibold tracking-tight mb-8"
            >
              10 people picked it up.
              <br />
              <span className="text-rose-400">0 bought it.</span>
            </motion.h2>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeUp}
              className={`text-xl font-normal leading-relaxed mb-6 ${theme.textMuted}`}
            >
              That&apos;s not data.
            </motion.p>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeUp}
              className="text-2xl font-semibold"
            >
              That&apos;s lost money.
            </motion.p>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeUp}
              className="mt-10 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </div>
                <p className={`text-sm leading-relaxed ${theme.textMuted}`}>
                  You now see which items get touched the most — and which ones never convert.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </div>
                <p className={`text-sm leading-relaxed ${theme.textMuted}`}>
                  Move slow stock. Double down on what people actually want.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className={`${theme.card} rounded-[3rem] p-10`}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Scan className="w-5 h-5 text-white/40" />
                    <span className="text-sm font-medium">Scanned today</span>
                  </div>
                  <span className="text-2xl font-semibold">1,240</span>
                </div>
                <div className={`h-px ${theme.divider}`} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-medium">Went into bags</span>
                  </div>
                  <span className="text-2xl font-semibold">860</span>
                </div>
                <div className={`h-px ${theme.divider}`} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                    <span className="text-sm font-medium">Never bought</span>
                  </div>
                  <span className="text-2xl font-semibold text-rose-400">380</span>
                </div>
                <div className={`h-px ${theme.divider}`} />
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${theme.textFaint}`}>Revenue left behind</span>
                  <span className="text-2xl font-semibold text-rose-400">₹18,400</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 6. CRM / RETURN LOOP ---------- */}
      <section className={`py-36 px-6 ${theme.sectionBg} transition-colors duration-500`}>
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-semibold tracking-tight mb-6"
            >
              Customers don&apos;t come back on their own.
            </motion.h2>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className={`text-xl font-normal leading-relaxed mb-6 ${theme.textMuted}`}
            >
              You bring them back.
            </motion.p>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeUp}
              className={`text-base leading-relaxed ${theme.textFaint}`}
            >
              When someone abandons a bag, QReBill sends them a WhatsApp message. Not spam — a
              simple reminder of what they left behind.
            </motion.p>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeUp}
              className="mt-8 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Repeat buyers grow.</p>
                <p className={`text-xs ${theme.textFaint}`}>
                  One tap. They&apos;re back in your store.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className={`${theme.card} rounded-[3rem] p-8 border-rose-500/5`}>
              <div className="flex items-center gap-3 mb-6">
                <BellRing className="w-5 h-5 text-rose-400" />
                <span className="text-sm font-semibold">Pending recovery</span>
              </div>

              <p className="text-5xl font-semibold tracking-tighter text-rose-400 mb-2">
                ₹3,240
              </p>
              <p className={`text-sm mb-8 ${theme.textMuted}`}>
                12 items scanned today. Never billed.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { name: 'Premium Denim', count: 3 },
                  { name: 'Cotton T-Shirt', count: 5 },
                ].map((item) => (
                  <div
                    key={item.name}
                    className={`w-full p-4 rounded-xl ${theme.cardInner} flex justify-between items-center`}
                  >
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className={`text-xs ${theme.textFaint}`}>
                      {item.count} customer{item.count > 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>

              <button className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-2xl active:scale-95 transition-all duration-300">
                Send WhatsApp Reminder
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 7. FINAL PUSH ---------- */}
      <section className="py-40 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-6"
          >
            Stores that see more, sell more.
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            className={`text-lg mb-12 ${theme.textMuted}`}
          >
            Stop running your store blind.
          </motion.p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
          >
            <button
              className={`px-10 py-5 rounded-full font-semibold text-base transition-all active:scale-95 ${theme.primaryBtn}`}
            >
              Start Using QReBill
            </button>
          </motion.div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer
        className={`mt-auto border-t py-10 px-6 transition-colors duration-500 ${
          isDark ? 'border-white/5 bg-black' : 'border-black/5 bg-white'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Eye className="w-4 h-4 text-white/50" />
            <span className="text-sm font-semibold tracking-tight">QReBill</span>
          </div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${theme.textFaint}`}
          >
            © 2025 QReBill. See everything.
          </p>
        </div>
      </footer>

      {/* ---------- Console Modal ---------- */}
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
                    <h2 className="text-2xl font-semibold mb-2 tracking-tight">
                      Store Access
                    </h2>
                    <p className={`${theme.textMuted} text-sm mb-10 font-medium px-4`}>
                      Verify your identity to enter your store dashboard.
                    </p>
                    <button
                      onClick={triggerScreenLock}
                      disabled={loading}
                      className={`w-full font-medium text-sm py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${theme.primaryBtn}`}
                    >
                      <Fingerprint className="w-5 h-5" /> Use Biometrics
                    </button>
                    <div className="flex items-center gap-4 w-full mt-8 mb-6">
                      <div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.textMuted}`}
                      >
                        OR
                      </span>
                      <div className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
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