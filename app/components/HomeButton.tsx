'use client';

import { Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FloatingHomeButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/')} // Yahan apna home route daal dena (e.g., '/dashboard')
      className="fixed bottom-8 right-6 z- bg-[#09090b] border border-emerald-500/50 p-4 rounded-full shadow-lg shadow-emerald-500/20 text-emerald-400 hover:bg-zinc-900 hover:border-emerald-400 active:scale-95 transition-all flex items-center justify-center group"
      aria-label="Back to Home"
    >
      <Home 
        className="w-6 h-6 group-hover:text-emerald-300 transition-colors" 
        strokeWidth={2} 
      />
    </button>
  );
}
