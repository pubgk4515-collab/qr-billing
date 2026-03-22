'use client';

import { LayoutDashboard, ShoppingBag, Loader2, Zap, Rocket, ChevronRight, Hash, QrCode, ShieldCheck, Laptop } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 pb-20 overflow-hidden relative">
      
      {/* 🔮 Background Neons (Futuristic Glow) */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -z-10 pointer-events-none" />

      {/* 🟢 HEADER */}
      <header className="bg-zinc-950/60 backdrop-blur-xl p-6 sticky top-0 z-50 border-b border-zinc-900 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl md:text-3xl font-black text-white tracking-tighter flex items-center gap-2">
                  <Hash className="w-8 h-8 text-emerald-400" />
                  RC<span className="text-zinc-500">Billing</span>
              </motion.div>
          </Link>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
             <p className="text-[10px] sm:text-xs font-bold bg-zinc-900 text-zinc-400 px-4 py-2 rounded-full border border-zinc-800 uppercase tracking-widest shadow-inner">
                 Enterprise Edition
             </p>
          </motion.div>
        </div>
      </header>

      {/* 🚀 HERO SECTION */}
      <div className="max-w-7xl mx-auto p-6 mt-12 md:mt-20 text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-emerald-400 px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-lg mb-8">
          <Zap className="w-4 h-4 text-emerald-400"/> Next-Gen Retail OS
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring' }} className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter mb-6 leading-none">
          Rampurhat <br/><span className="text-emerald-400 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-600">Collection</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-lg md:text-2xl text-zinc-400 font-medium max-w-2xl mx-auto mb-12 md:mb-16 leading-relaxed">
          The future of local commerce is here. Scan smart tags, manage live inventory, and generate digital bills in milliseconds.
        </motion.p>
        
        {/* 🎯 MAIN CALL-TO-ACTIONS */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
            
            {/* 🛒 Billing/POS Button */}
            <Link href="/billing" className="w-full sm:w-auto flex-1">
                <button className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-zinc-950 font-black px-8 py-5 rounded-2xl text-lg md:text-xl shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all group">
                    <ShoppingBag className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" /> 
                    Launch Smart POS
                </button>
            </Link>

            {/* ⚙️ Admin Dashboard Button */}
            <Link href="/admin" className="w-full sm:w-auto flex-1">
                <button className="w-full flex items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white font-black px-8 py-5 rounded-2xl text-lg md:text-xl transition-all border border-zinc-800 group shadow-lg">
                    <LayoutDashboard className="w-6 h-6 text-zinc-500 group-hover:text-emerald-400 transition-colors" /> 
                    Store Admin 
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:translate-x-1 transition-transform"/>
                </button>
            </Link>
        </motion.div>
      </div>

      {/* 💎 FEATURES HIGHLIGHT (The "SaaS" Touch) */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="max-w-7xl mx-auto p-6 mt-16 md:mt-24">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
                icon={<QrCode className="w-8 h-8 text-blue-400" />} 
                title="Smart QR Tags" 
                desc="Generate & print unlimited QR tags. Link products instantly from your phone."
            />
            <FeatureCard 
                icon={<Laptop className="w-8 h-8 text-emerald-400" />} 
                title="Ultra-Fast POS" 
                desc="Scan items, auto-calculate totals, and process sales without typing a single word."
            />
            <FeatureCard 
                icon={<ShieldCheck className="w-8 h-8 text-orange-400" />} 
                title="Cloud Inventory" 
                desc="Real-time stock syncing. Secure, cloud-based data that never gets lost."
            />
         </div>
      </motion.div>

      {/* 🚀 BOTTOM BADGE */}
      <div className="mt-24 pb-12 flex justify-center">
        <Link href="/admin">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-flex items-center gap-3 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all shadow-xl">
                <Rocket className="w-4 h-4 text-orange-400"/> Quick Setup
            </motion.button>
        </Link>
      </div>

    </main>
  );
}

// 🧩 Helper Component for Feature Cards
function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-8 rounded-[2rem] hover:bg-zinc-900 transition-colors group">
            <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                {icon}
            </div>
            <h3 className="text-xl font-black text-white mb-3">{title}</h3>
            <p className="text-zinc-500 font-medium leading-relaxed">{desc}</p>
        </div>
    )
}