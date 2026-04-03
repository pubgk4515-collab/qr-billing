'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, ShieldCheck, ArrowRight, Trash2, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Cart page mein sirf store_slug aayega, tag_id nahi hota
export default function CartPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // 🔥 THE BUG FIX: Safe URL param reading
  const safeStoreSlug = (store_slug || '').toLowerCase();

  useEffect(() => {
    if (!safeStoreSlug) return;

    async function loadCartAndStore() {
      try {
        // 1. Fetch Store Branding
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

        // 2. Fetch Bag Items from Local Storage safely
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

  // Remove Item Function (Customer bag se item nikal sake)
  const handleRemoveItem = (tagIdToRemove: string) => {
    const cartKey = `cart_${safeStoreSlug}`;
    const updatedCart = cartItems.filter(item => item.tag_id !== tagIdToRemove);
    setCartItems(updatedCart);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
  };

  // Checkout Handler
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    
    // Yahan aapka app/actions/billingActions.ts wala logic aayega
    // P.S. Rule ke hisaab se hum Local Storage se data delete NAHI kar rahe hain.
    // Admin Command Center se jab approve hoga tabhi bill generate hoga.
    
    setTimeout(() => {
      // Demo redirect (Aap isko apne asli checkout/bill flow pe set kar lena)
      alert("Payment Flow / Live Polling Initiated! Redirecting...");
      setIsCheckingOut(false);
      // router.push(`/${safeStoreSlug}/checkout`); 
    }, 1500);
  };

  // Calculate Subtotal
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (Number(item.price) || 0), 0);
  };

  // UI 1: Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Loading Bag</p>
      </div>
    );
  }

  // UI 2: Main Cart Page
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col relative font-sans selection:bg-white/20">
      
      {/* 👑 PREMIUM HEADER */}
      <header className="px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-2xl" style={{ backgroundColor: storeData?.theme_color || '#000000', backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)' }}>
        {storeData?.logo_url ? (
          <img src={storeData.logo_url} alt="logo" className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg" />
        ) : (
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold shadow-inner">{storeData?.store_name?.charAt(0) || 'S'}</div>
        )}
        <div>
          <h1 className="text-lg font-black leading-tight text-white">Your Bag</h1>
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/70 flex items-center gap-1">{storeData?.store_name || 'Premium Store'}</p>
        </div>
      </header>

      {/* 📦 CART ITEMS LIST */}
      <div className="flex-1 p-5 pb-40 flex flex-col gap-4">
        
        {cartItems.length === 0 ? (
          // Empty Cart UI
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 mt-20">
            <ShoppingBag className="w-16 h-16 text-zinc-600 mb-4" />
            <h2 className="text-xl font-bold mb-2">Your bag is empty</h2>
            <p className="text-sm text-zinc-500 max-w-[250px] mb-8">Scan a product's QR code in the store to add it to your bag.</p>
            <button 
              onClick={() => alert("Open Scanner Mobile Camera!")} // Next task integration here
              className="px-6 py-3 bg-white/10 rounded-full flex items-center gap-2 font-bold hover:bg-white/20 active:scale-95 transition-all"
            >
              <QrCode className="w-5 h-5" /> Scan Product
            </button>
          </div>
        ) : (
          // Cart Items UI
          <>
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-xl font-black">{cartItems.length} {cartItems.length > 1 ? 'Items' : 'Item'}</h2>
              <button className="text-xs text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <QrCode className="w-3 h-3" /> Scan More
              </button>
            </div>

            {cartItems.map((item, index) => (
              <div key={index} className="flex gap-4 bg-zinc-900/50 p-3 rounded-2xl border border-white/5 relative group">
                {/* Product Image */}
                <div className="w-20 h-24 bg-black rounded-xl overflow-hidden shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-zinc-700" />
                    </div>
                  )}
                </div>
                
                {/* Product Details */}
                <div className="flex flex-col justify-center flex-1 py-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm leading-tight pr-4">{item.name}</h3>
                    <button 
                      onClick={() => handleRemoveItem(item.tag_id)}
                      className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Size: {item.size}</p>
                  <div className="flex justify-between items-end mt-auto">
                    <p className="font-black text-lg">₹{item.price}</p>
                    <span className="text-[9px] font-mono text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded border border-white/5">{item.tag_id}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Bill Summary */}
            <div className="mt-6 p-5 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-400 text-sm">Subtotal</span>
                <span className="font-bold">₹{calculateTotal()}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-zinc-400 text-sm">Platform Fee</span>
                <span className="text-emerald-400 text-sm font-bold">Free</span>
              </div>
              <div className="w-full h-px bg-white/10 mb-4"></div>
              <div className="flex justify-between items-center">
                <span className="font-bold">Total Amount</span>
                <span className="font-black text-2xl">₹{calculateTotal()}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 🔥 PREMIUM ACTION BAR (Checkout Dock) - Only show if cart has items */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40 pointer-events-none">
          <div className="bg-zinc-900/90 backdrop-blur-lg border border-white/10 p-2 pl-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto">
            
            <div className="flex flex-col justify-center min-w-[80px]">
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Pay Now</p>
              <p className="text-2xl font-black text-white leading-none tracking-tight">₹{calculateTotal()}</p>
            </div>
            
            <button 
              onClick={handleCheckout}
              disabled={isCheckingOut}
              style={{ 
                backgroundColor: storeData?.theme_color || '#ffffff',
                color: storeData?.theme_color ? '#ffffff' : '#000000' 
              }}
              className={`font-black px-6 py-5 rounded-full flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(255,255,255,0.15)] ${isCheckingOut ? 'opacity-70 scale-95' : 'hover:opacity-90 active:scale-95'}`}
            >
              {isCheckingOut ? (
                <>Processing <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : (
                <>Checkout <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            
          </div>
        </div>
      )}
      
    </main>
  );
}
