'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Naya unique icon for the bottom dock
const ScanFrameIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 8V6C4 4.89543 4.89543 4 6 4H8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 4H18C19.1046 4 20 4.89543 20 6V8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 16V18C20 19.1046 19.1046 20 18 20H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 20H6C4.89543 20 4 19.1046 4 18V16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 12H16M12 8V16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

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
        // Fetch Store Branding
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

        // Fetch Bag Items from Local Storage safely
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

  // Remove Item Function
  const handleRemoveItem = (tagIdToRemove: string) => {
    const cartKey = `cart_${safeStoreSlug}`;
    const updatedCart = cartItems.filter(item => item.tag_id !== tagIdToRemove);
    setCartItems(updatedCart);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
  };

  // Checkout Handler
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    
    // Billing and Polling Logic would go here
    
    setTimeout(() => {
      // Demo alert and redirect (for now)
      alert("Checkout started! Live Polling Initiated...");
      setIsCheckingOut(false);
      // router.push(`/${safeStoreSlug}/bill`); 
    }, 1500);
  };

  // Calculate Total
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (Number(item.price) || 0), 0);
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Loading Bag</p>
      </div>
    );
  }

  // Main UI
  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col relative font-sans selection:bg-white/10">
      
      {/* 👑 PREMIUM RED HEADER (From Reference) */}
      <header className="px-5 py-4 flex items-center justify-between sticky top-0 z-50 bg-gradient-to-b from-[#8C0303] to-[#600202] shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Circular M Logo with subtle gradient */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-2xl text-white bg-gradient-to-br from-[#8C0303] to-[#C71B1B] shadow-inner border border-white/5">
            M
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight text-white">{storeData?.store_name || 'Mr. Fashion'}</h1>
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/80">SECURE CHECKOUT</p>
          </div>
        </div>
        {/* Rounded Item Count Badge */}
        <div className="text-[10px] font-mono tracking-wider text-white bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
          {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
        </div>
      </header>

      {/* 📦 CART CONTENT */}
      <div className="flex-1 p-5 pb-40 flex flex-col gap-5 mt-4">
        
        {/* New Large Page Title */}
        <h2 className="text-3xl font-extrabold tracking-tight mb-2">My Bag</h2>
        
        {cartItems.length === 0 ? (
          // Empty Cart UI
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 mt-16">
            <ShoppingBag className="w-16 h-16 text-zinc-700 mb-6" />
            <h2 className="text-xl font-bold mb-2 text-zinc-300">Your bag is empty</h2>
            <p className="text-sm text-zinc-600 max-w-[260px]">Scan a product's QR code in the store to add it to your bag and see it here.</p>
          </div>
        ) : (
          // Product List (Refined Layout)
          cartItems.map((item, index) => (
            <div key={index} className="flex gap-4 bg-[#111] p-3 rounded-2xl border border-white/5 relative group shadow-lg">
              {/* Product Image - Consistent Model Shot */}
              <div className="w-20 h-28 bg-black rounded-xl overflow-hidden shrink-0 border border-white/5">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-zinc-700" />
                  </div>
                )}
              </div>
              
              {/* Product Details - Premium Look */}
              <div className="flex flex-col justify-center flex-1 py-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm leading-tight pr-6">{item.name}</h3>
                  {/* Pink Circular Trash Button (From Reference) */}
                  <button 
                    onClick={() => handleRemoveItem(item.tag_id)}
                    className="w-7 h-7 bg-[#4E1010] rounded-full flex items-center justify-center text-[#E62B2B] hover:bg-[#6A1616] transition-colors shadow-inner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] font-mono text-zinc-600 mt-1 uppercase tracking-wider">SIZE: {item.size}</p>
                <div className="flex justify-between items-end mt-auto">
                  {/* Cyan Total Price */}
                  <p className="font-black text-2xl text-[#03E3B6]">₹{item.price}</p>
                  <span className="text-[10px] font-mono text-zinc-600 bg-black/30 px-2 py-0.5 rounded border border-white/5 tracking-wider uppercase">{item.tag_id}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🔥 PREMIUM ACTION BAR (The New Bottom Dock) - Only if items are present */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40 pointer-events-none">
          <div className="bg-[#111]/95 backdrop-blur-lg border border-white/10 p-2 pl-6 rounded-full flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto">
            
            {/* Left Section: Cyan TOTAL price */}
            <div className="flex flex-col justify-center min-w-[90px]">
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider mb-0.5">TOTAL</p>
              <p className="text-2xl font-black text-[#03E3B6] leading-none tracking-tight">₹{calculateTotal()}</p>
            </div>
            
            {/* Center Section: Scan Frame Icon */}
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shadow-inner border border-white/5">
                <ScanFrameIcon />
              </div>
            </div>
            
            {/* Right Section: Red Checkout Button */}
            <button 
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className={`font-black text-sm px-7 py-4 rounded-full flex items-center justify-center gap-2 transition-all bg-gradient-to-br from-[#8C0303] to-[#600202] shadow-inner text-white ${isCheckingOut ? 'opacity-70' : 'hover:scale-[1.02] active:scale-95'}`}
            >
              {isCheckingOut ? (
                <>Processing <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : (
                <>Checkout <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            
          </div>
        </div>
      )}
      
    </main>
  );
}
