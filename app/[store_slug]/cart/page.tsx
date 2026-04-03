'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, Trash2, QrCode, CreditCard, Store, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Safe slug for DB and LocalStorage
  const safeStoreSlug = (store_slug || '').toLowerCase();

  useEffect(() => {
    if (!safeStoreSlug) return;

    async function loadCartAndStore() {
      try {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color')
          .ilike('slug', safeStoreSlug)
          .single();

        if (storeError || !store) {
          console.error("Store not found");
          setLoading(false);
          return;
        }
        setStoreData(store);

        const cartKey = `cart_${safeStoreSlug}`;
        const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setCartItems(savedCart);

      } catch (err: any) {
        console.error("Error loading cart:", err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCartAndStore();
  }, [safeStoreSlug]);

  const handleRemoveItem = (tagIdToRemove: string) => {
    const cartKey = `cart_${safeStoreSlug}`;
    const updatedCart = cartItems.filter(item => item.tag_id !== tagIdToRemove);
    setCartItems(updatedCart);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      alert("Payment Flow / Live Polling Initiated! Redirecting...");
      setIsCheckingOut(false);
    }, 1500);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (Number(item.price) || 0), 0);
  };

  // SaaS Dynamic Color Fallback (Red from your screenshot as default if empty)
  const themeColor = storeData?.theme_color || '#B91C1C';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-zinc-600" />
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col relative font-sans selection:bg-white/10 pb-40">
      
      {/* 👑 THE GLASSMORPHIC BOUTIQUE HEADER */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between"
      >
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>

        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          {storeData?.logo_url ? (
            <img src={storeData.logo_url} alt="logo" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <Store className="w-4 h-4" style={{ color: themeColor }} />
          )}
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-zinc-200">
            {storeData?.store_name || 'Premium Store'}
          </span>
        </div>

        <div className="text-[10px] font-mono tracking-widest text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          {cartItems.length} {cartItems.length === 1 ? 'ITEM' : 'ITEMS'}
        </div>
      </motion.header>

      {/* 🎒 MASSIVE TYPOGRAPHY HERO SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="px-6 pt-10 pb-6"
      >
        <h1 className="text-[3.5rem] leading-none font-black tracking-tighter">
          My Bag<span style={{ color: themeColor }}>.</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-3 font-medium">Review your items before secure checkout.</p>
      </motion.div>

      {/* 📦 CART CONTENT (Staggered Animation List) */}
      <div className="px-6 flex flex-col gap-5">
        <AnimatePresence>
          {cartItems.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center mt-12 p-10 bg-white/[0.02] rounded-[2rem] border border-white/5"
            >
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.05)]"
                style={{ backgroundColor: `${themeColor}15` }}
              >
                <ShoppingBag className="w-8 h-8" style={{ color: themeColor }} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">Your bag is empty</h2>
              <p className="text-sm text-zinc-500">Scan a product's QR code in the store to add it to your bag.</p>
            </motion.div>
          ) : (
            cartItems.map((item, index) => (
              <motion.div 
                key={item.tag_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
                className="flex items-center p-3 bg-[#111] rounded-[1.5rem] border border-white/5 gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden group"
              >
                {/* Subtle gradient glow behind the card on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

                {/* Left: Image (Fashion Aspect Ratio) */}
                <div className="w-20 h-24 bg-black rounded-[1rem] overflow-hidden shrink-0 border border-white/10 relative">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <ShoppingBag className="w-6 h-6 text-zinc-700" />
                    </div>
                  )}
                </div>
                
                {/* Middle: Name & Tag */}
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-lg leading-tight mb-1">{item.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">{item.tag_id}</span>
                  </div>
                </div>

                {/* Right: Price & Trash */}
                <div className="flex flex-col items-end gap-3 pr-2">
                  <p className="font-black text-2xl tracking-tight">₹{item.price}</p>
                  <button 
                    onClick={() => handleRemoveItem(item.tag_id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* 🔥 THE ELEGANT MVP DOCK */}
      {cartItems.length > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
          className="fixed bottom-6 left-4 right-4 z-50"
        >
          <div className="bg-[#161616]/95 backdrop-blur-2xl border border-white/10 p-3 rounded-[2.5rem] flex items-center justify-between shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)]">
            
            {/* Left: MASSIVE Dynamic QR Button */}
            <button 
              onClick={() => alert("Opening Scanner...")}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-inner hover:scale-105 active:scale-95 transition-all"
              style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${themeColor}` }}
            >
              <QrCode className="w-7 h-7 text-black" strokeWidth={2.5} />
            </button>
            
            {/* Center: Grand Total Stack */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-0.5">Grand Total</span>
              <span className="text-2xl font-black text-white leading-none tracking-tight">₹{calculateTotal()}</span>
            </div>
            
            {/* Right: Elegant White Buy Button */}
            <button 
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className={`bg-white text-black font-black text-base px-7 py-4 rounded-[1.8rem] flex items-center justify-center gap-2 shadow-lg ${isCheckingOut ? 'opacity-70' : 'hover:bg-zinc-200 active:scale-95 transition-all'}`}
            >
              {isCheckingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" /> Buy
                </>
              )}
            </button>
            
          </div>
        </motion.div>
      )}
      
    </main>
  );
}
