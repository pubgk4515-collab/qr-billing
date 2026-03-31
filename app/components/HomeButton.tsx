'use client';

import { Home } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // 🔥 THE ULTIMATE BYPASS WEAPON

export default function HomeButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Yeh ensure karega ki button sirf client side par render ho
  useEffect(() => {
    setMounted(true);
  }, []);

    // 🔥 Agar user home page par hai, YA FIR kisi Bill wale page par hai, toh isko hide kar do
  if (pathname === '/' || pathname.startsWith('/bill') || !mounted) return null;


  // 🔥 React Portal isko baki saare design se azaad karke seedha <body> pe fek dega
  return createPortal(
    <button
      onClick={() => router.push('/')}
      style={{ zIndex: 2147483647 }} // Maximum possible Z-Index limit in CSS
      className="fixed bottom-30 right-6 sm:bottom-20 sm:right-8 bg-zinc-900 border border-emerald-500/50 p-4 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:bg-zinc-800 transition-all active:scale-95 group"
    >
      <Home className="w-6 h-6 text-emerald-400 group-hover:text-emerald-300" />
    </button>,
    document.body // Target direct body element
  );
}
