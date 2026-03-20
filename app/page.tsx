'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { QrCode, ShoppingBag, LayoutDashboard, ArrowRight, Zap } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 bg-emerald-500/10 blur-[120px] -z-10 rounded-full" />

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 text-xs font-bold mb-6 tracking-widest uppercase">
          <Zap className="w-3 h-3 fill-current" /> Next-Gen Retail
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
          Rampurhat <br /> Collection
        </h1>
        
        <p className="text-zinc-400 text-lg md:text-xl mb-10 leading-relaxed max-w-md mx-auto">
          Experience the future of local shopping. Scan tags, build your bag, and checkout in seconds.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          
          <Link href="/cart" className="w-full sm:w-auto">
            <motion.button 
              whileTap={{ scale: 0.96 }}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" /> View My Bag
            </motion.button>
          </Link>

          <Link href="/admin" className="w-full sm:w-auto">
            <motion.button 
              whileTap={{ scale: 0.96 }}
              className="w-full sm:w-auto px-8 py-4 bg-zinc-900 text-zinc-300 font-bold rounded-2xl border border-zinc-800 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" /> Store Admin <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>

        </div>
      </motion.div>

      {/* Feature Pills */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-4 text-zinc-500 text-sm font-medium"
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <QrCode className="w-4 h-4" /> Quick Scan
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <Zap className="w-4 h-4" /> Live Sync
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50 col-span-2 md:col-span-1 justify-center">
          🚀 0-Cost Setup
        </div>
      </motion.div>

      {/* Footer Branding */}
      <footer className="absolute bottom-8 text-zinc-600 text-xs font-bold tracking-[0.2em] uppercase">
        Powered by Optimus AI
      </footer>

    </main>
  );
}