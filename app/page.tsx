'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ScanLine, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* 🌟 Premium Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-4xl relative z-10 flex flex-col items-center"
      >
        {/* 👑 Elegant Header Section */}
        <div className="mb-16 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 shadow-xl"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">Next-Gen Retail Experience</span>
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-500">
            Premium Store.
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl font-medium max-w-xl mx-auto">
            Elevate your shopping experience. Scan, pay, and walk out with elegance. No queues, pure luxury.
          </p>
        </div>

        {/* ✨ Luxurious Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          
          {/* CUSTOMER CARD */}
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.03)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/billing')}
            className="group relative bg-zinc-900/40 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] text-left overflow-hidden transition-all hover:border-emerald-500/30 shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none" />
            
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
              <ScanLine className="w-8 h-8 text-emerald-400" />
            </div>
            
            <h2 className="text-2xl font-black mb-3 text-white tracking-tight">Self-Checkout</h2>
            <p className="text-zinc-400 text-sm mb-10 leading-relaxed">
              Scan clothing tags with your phone, build your bag, and pay instantly. Your personal digital counter.
            </p>
            
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm uppercase tracking-widest">
              Start Shopping <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </motion.button>

          {/* ADMIN / OWNER CARD */}
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.03)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/login')}
            className="group relative bg-zinc-900/40 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] text-left overflow-hidden transition-all hover:border-blue-500/30 shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none" />
            
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
            
            <h2 className="text-2xl font-black mb-3 text-white tracking-tight">Command Center</h2>
            <p className="text-zinc-400 text-sm mb-10 leading-relaxed">
              Store management portal. Approve payments, handle walk-in customers via POS, and manage inventory.
            </p>
            
            <div className="flex items-center gap-2 text-blue-400 font-black text-sm uppercase tracking-widest">
              Owner Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </motion.button>

        </div>
        
                {/* Footer subtle text & Contact Agency Button */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 flex flex-col items-center gap-5 relative z-10"
        >
          <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase font-black">
            Designed for Modern Retail
          </p>
          
          <button 
            onClick={() => router.push('/contact')}
            className="group flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300"
          >
            <span className="text-xs font-bold tracking-widest text-zinc-400 group-hover:text-emerald-400 transition-colors uppercase">
              Contact Agency
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </button>
        </motion.div>
      </motion.div>
    </main>
  );
}
