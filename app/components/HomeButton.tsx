'use client';

import { Home } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function HomeButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Agar hum pehle se hi home page par hain, toh button chhupa sakte hain (Optional)
  if (pathname === '/') return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => router.push('/')}
      className="fixed bottom-28 right-6 z- bg-zinc-900/80 backdrop-blur-xl border border-white/20 p-4 rounded-full shadow-2xl shadow-black/50 group transition-all"
    >
      <Home className="w-6 h-6 text-emerald-400 group-hover:text-white transition-colors" />
      
      {/* Tooltip jo hover karne par dikhega */}
      <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-zinc-800 text-white text-[10px] font-bold px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest border border-white/10">
        Home
      </span>
    </motion.button>
  );
}
