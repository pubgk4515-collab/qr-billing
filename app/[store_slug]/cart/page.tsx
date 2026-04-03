'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, Trash2, QrCode, CreditCard, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

  // SaaS Dynamic Color Fallback (Agar dukaandar ne color set nahi kiya toh elegant Emerald aayega)
  const themeColor = storeData?.theme_color || '#10b981';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col relative font-sans selection:bg-white/10 pb-40">
      
      {/* 👑 LUXURIOUS SAAS BRANDING (Top minimalist indicator) */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-3 opacity-80">
        {storeData?.logo_url ? (
          <img src={storeData.logo_url} alt="logo" className="w-6 h-6 rounded-full object-cover border border-white/20" />
        ) : (
          <Store className="w-5 h-5" style={{ color: themeColor }} />
        )}
        <span className="text-xs font-mono tracking-[0.2em] uppercase text-zinc-400">
          {storeData?.store_name || 'Premium Store'}
        </span>
      </div>

      {/* 🎒 MY BAG HEADER (MVP Style) */}
      <header className="px-6 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-8 h-8" style={{ color: themeColor }} />
          <h1 className="text-4xl font-black tracking-tight">My Bag</h1>
        </div>
        
        {/* Dynamic Theme Pill */}
        <div 
          className="px-4 py-1.5 rounded-full font-bold text-sm border shadow-lg"
          style={{ 
            borderColor: themeColor, 
            color: themeColor,
            backgroundColor: `${themeColor}15` // 15% opacity background
          }}
        >
          {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
        </div>
      </header>

      {/* 📦 CART CONTENT */}
      <div className="px-6 flex flex-col gap-4">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center opacity-70 mt-20">
            <ShoppingBag className="w-16 h-16 text-zinc-700 mb-6" />
            <h2 className="text-xl font-bold mb-2 text-zinc-300">Your bag is empty</h2>
            <p className="text-sm text-zinc-600">Scan a product's QR code in the store.</p>
          </div>
        ) : (
          cartItems.map((item, index) => (
            // MVP Style Compact Product Card
            <div key={index} className="flex items-center p-3 bg-[#141414] rounded-[1.5rem] border border-white/5 gap-4 shadow-lg">
              
              {/* Left: Image */}
              <div className="w-16 h-16 bg-black rounded-xl overflow-hidden shrink-0 border border-white/5">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                    <ShoppingBag className="w-5 h-5 text-zinc-700" />
                  </div>
                )}
              </div>
              
              {/* Middle: Name & Tag */}
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-base leading-tight mb-1">{item.name}</h3>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{item.tag_id}</span>
              </div>

              {/* Right: Price & Trash */}
              <div className="flex items-center gap-4 pr-1">
                <p className="font-black text-xl">₹{item.price}</p>
                <button 
                  onClick={() => handleRemoveItem(item.tag_id)}
                  className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-zinc-900 transition-all border border-white/5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🔥 THE ELEGANT MVP DOCK */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/10 p-3 rounded-[2.5rem] flex items-center justify-between shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
            
            {/* Left: MASSIVE Dynamic QR Button */}
            <button 
              onClick={() => alert("Opening Scanner...")}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-inner hover:scale-105 active:scale-95 transition-all"
              style={{ backgroundColor: themeColor }}
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
              className={`bg-white text-black font-black text-base px-6 py-4 rounded-[1.8rem] flex items-center justify-center gap-2 shadow-lg ${isCheckingOut ? 'opacity-70' : 'hover:bg-zinc-200 active:scale-95 transition-all'}`}
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
        </div>
      )}
      
    </main>
  );
}
