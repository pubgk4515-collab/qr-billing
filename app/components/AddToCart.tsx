'use client';

import { useState } from 'react';
import { addToCartServer } from '../actions/cartActions';
import { ShoppingBag, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AddToCart({ productId }: { productId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleAddToCart = async () => {
    setStatus('loading');
    
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('session_id', sessionId);
    }

    const response = await addToCartServer(sessionId, productId);

    if (response.success) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000); 
    } else {
      alert("Error: " + response.message);
      setStatus('idle');
    }
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.96 }} 
      onClick={handleAddToCart} 
      disabled={status !== 'idle'}
      className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg ${
        status === 'success' 
          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
          // Ye line change ki hai: Dark mode mein button White dikhega!
          : 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-white/10'
      }`}
    >
      {status === 'idle' && <><ShoppingBag className="w-5 h-5" /> Add to Bag</>}
      {status === 'loading' && <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>}
      {status === 'success' && <><Check className="w-5 h-5" /> Added Successfully</>}
    </motion.button>
  );
}