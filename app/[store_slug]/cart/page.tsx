'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingBag, ArrowRight, Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Adjust path if needed

export default function CartPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    async function fetchStoreAndCart() {
      try {
        // 1. Get Store Branding
        const { data: store, error } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color')
          .eq('slug', store_slug)
          .single();

        if (error || !store) throw new Error('Store not found');
        setStoreData(store);

        // 2. Load Cart from Local Storage (Store Specific!)
        const cartKey = `cart_${store_slug}`;
        const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setCartItems(savedCart);

      } catch (err) {
        console.error("Error loading cart:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStoreAndCart();
  }, [store_slug]);

  // 🗑️ Remove Item from Cart
  const removeItem = (tagId: string) => {
    const updatedCart = cartItems.filter(item => item.tag_id !== tagId);
    setCartItems(updatedCart);
    localStorage.setItem(`cart_${store_slug}`, JSON.stringify(updatedCart));
  };

  // 💰 Calculate Totals
  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const totalItems = cartItems.length;

  // 🚀 Handle Checkout
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    // Yahan tumhara Order Create karne ka logic aayega
    // Temporary simulation for UX:
    setTimeout(() => {
      alert('Redirecting to Payment Gateway... (Backend integration next!)');
      setIsCheckingOut(false);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Loading Bag</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col relative font-sans selection:bg-white/20">
      
      {/* 👑 PREMIUM BRANDED HEADER */}
      <header 
        className="px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-2xl"
        style={{ 
          backgroundColor: storeData?.theme_color || '#18181b', // Fallback to zinc-900
          backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)' 
        }}
      >
        {storeData?.logo_url ? (
          <img src={storeData.logo_url} alt="logo" className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg" />
        ) : (
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold shadow-inner">
            {storeData?.store_name?.charAt(0) || 'S'}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-black leading-tight text-white">{storeData?.store_name}</h1>
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/70 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Secure Checkout
          </p>
        </div>
        <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold">
          {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
        </div>
      </header>

      {/* 🛍️ CART ITEMS AREA */}
      <div className="flex-1 p-5 pb-40 flex flex-col gap-4">
        <h2 className="text-2xl font-black mb-2">My Bag</h2>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4 mt-20">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5">
              <ShoppingBag className="w-10 h-10 opacity-50" />
            </div>
            <div className="text-center">
              <h3 className="text-white font-bold text-lg">Your bag is empty</h3>
              <p className="text-sm mt-1">Scan a product tag to add it to your bag.</p>
            </div>
            <button 
              onClick={() => router.push(`/${store_slug}`)}
              className="mt-4 px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all text-sm"
            >
              Scan Items
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.tag_id} className="bg-zinc-900/60 border border-white/10 p-3 rounded-2xl flex gap-4 items-center relative overflow-hidden group">
                
                {/* Product Image */}
                <div className="w-20 h-24 bg-black rounded-xl overflow-hidden flex-shrink-0 border border-white/5">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-zinc-700" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between h-full py-1">
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-white line-clamp-2 pr-6">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                        Size: {item.size}
                      </span>
                    </div>
                  </div>
                  <p className="text-emerald-400 font-black text-lg mt-2">₹{item.price}</p>
                </div>

                {/* Delete Button */}
                <button 
                  onClick={() => removeItem(item.tag_id)}
                  className="absolute top-3 right-3 p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔥 PREMIUM FLOATING CHECKOUT BAR */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/95 to-transparent z-40 pointer-events-none">
          <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-2 pl-6 rounded-[2rem] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.9)] pointer-events-auto">
            
            <div className="flex flex-col justify-center">
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-0.5">Grand Total</p>
              <p className="text-2xl font-black text-white leading-none tracking-tight">₹{subtotal}</p>
            </div>
            
            <button 
              onClick={handleCheckout}
              disabled={isCheckingOut}
              style={{ backgroundColor: storeData?.theme_color || '#10b981', color: '#000' }}
              className="font-black px-8 py-4 rounded-[1.5rem] flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-xl disabled:opacity-50"
            >
              {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <CreditCard className="w-5 h-5" /> Pay Now
                </>
              )}
            </button>
            
          </div>
        </div>
      )}
      
    </main>
  );
}
