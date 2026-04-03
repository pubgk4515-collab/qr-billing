'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function MagicScanPage({ params }: { params: Promise<{ store_slug: string, tag_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug, tag_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [error, setError] = useState('');
  
  // 🔥 Naya State: Crash rokne ke liye loading state
  const [isAdding, setIsAdding] = useState(false);

  // 🔥 FUTURE-PROOF: UNIVERSAL SAFE KEYS (Prevents Empty Bag & URL Bugs)
  const safeStoreSlug = store_slug.toLowerCase();
  const safeTagId = tag_id.toUpperCase();

  useEffect(() => {
    async function fetchDetails() {
      try {
        // 1. Fetch Store (Case Insensitive using .ilike)
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color')
          .ilike('slug', safeStoreSlug)
          .single();

        if (storeError || !store) {
          throw new Error(`Store '${store_slug}' not found! Please check the URL or scan a valid code.`);
        }
        setStoreData(store);

        // 2. Fetch Tag & Product (Case Insensitive using .ilike)
        const { data: tag, error: tagError } = await supabase
          .from('qr_tags')
          .select('*, products(*)')
          .ilike('id', safeTagId)
          .eq('store_id', store.id)
          .single();

        if (tagError || !tag) {
          throw new Error(`QR Code ${safeTagId} does not exist in our system or belongs to another store.`);
        }
        if (!tag.products) {
          throw new Error(`QR Code ${safeTagId} is not linked to any product yet.`);
        }
        if (tag.status === 'sold') {
          throw new Error(`This item is currently locked in checkout or already sold out.`);
        }

        setProductData(tag.products);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [safeStoreSlug, safeTagId]);

  // 🛒 Add to Cart Logic (100% Bulletproof Local Storage + Anti Crash)
  const handleAddToBag = () => {
    setIsAdding(true); // Spinner chalu karo
    
    // setTimeout phone ke browser ko crash hone se rokenge (UI thread block nahi hoga)
    setTimeout(() => {
      const cartKey = `cart_${safeStoreSlug}`;
      const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      
      // Check if the item is already in the bag
      const alreadyInCart = currentCart.find((item: any) => item.tag_id === safeTagId);
      
      if (!alreadyInCart) {
        currentCart.push({
          tag_id: safeTagId,
          product_id: productData.id,
          name: productData.name,
          price: productData.price,
          size: productData.size || 'Free Size',
          image_url: productData.image_url
        });
        // Save exactly to the safe lowercase slug key
        localStorage.setItem(cartKey, JSON.stringify(currentCart));
      }
      
      // Always redirect to the safe lowercase slug cart
      router.push(`/${safeStoreSlug}/cart`);
    }, 150); // 150ms ka micro-delay
  };

  // UI 1: Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Fetching Details</p>
      </div>
    );
  }

  // UI 2: Error State (Invalid Tag, Sold Out, etc.)
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black mb-3">Item Unavailable</h1>
        <p className="text-zinc-400 mb-8 max-w-sm">{error}</p>
        <button 
          onClick={() => router.push(`/${safeStoreSlug}/cart`)}
          className="px-8 py-4 bg-white/10 hover:bg-white/20 transition-all rounded-full font-bold flex items-center gap-2 active:scale-95"
        >
          <ShoppingBag className="w-5 h-5" /> View My Bag
        </button>
      </div>
    );
  }

  // UI 3: Main Product Page
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
          <h1 className="text-lg font-black leading-tight text-white">{storeData?.store_name || 'Premium Store'}</h1>
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/70 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified Partner</p>
        </div>
      </header>

      {/* 📦 MAIN CONTENT */}
      <div className="flex-1 p-5 pb-40 flex flex-col">
        
        {/* Product Image Box */}
        <div className="w-full aspect-[4/5] bg-zinc-900 rounded-[2rem] overflow-hidden mb-6 relative border border-white/10 shadow-2xl shadow-black">
          {productData?.image_url ? (
            <img src={productData.image_url} alt={productData.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
              <ShoppingBag className="w-10 h-10 opacity-50" />
              <span className="font-bold uppercase text-xs tracking-widest">No Image</span>
            </div>
          )}
          {/* Tag ID Badge Overlay */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-mono font-bold shadow-lg">
            {safeTagId}
          </div>
        </div>

        {/* Details Section */}
        <div className="mb-6 px-1">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {/* Size Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
               <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Size</span>
               <span className="text-white font-black text-sm">{productData?.size || 'Free Size'}</span>
            </div>
            {/* Stock Badge - Custom Branded */}
            <div 
              className="inline-flex items-center gap-2 backdrop-blur-sm px-3 py-1.5 rounded-lg border"
              style={{ 
                backgroundColor: storeData?.theme_color ? `${storeData.theme_color}1A` : 'rgba(16, 185, 129, 0.1)', // 1A is 10% opacity in hex
                borderColor: storeData?.theme_color ? `${storeData.theme_color}33` : 'rgba(16, 185, 129, 0.2)',
                color: storeData?.theme_color || '#34d399'
              }}
            >
               <span className="text-[10px] font-black uppercase tracking-wider">In Stock</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-black mb-2 leading-tight tracking-tight">{productData?.name}</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">Please verify the size and details before adding to bag.</p>
        </div>
      </div>

      {/* 🔥 PREMIUM ACTION BAR (Floating Add to Bag) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40 pointer-events-none">
        {/* Changed backdrop-blur-2xl to backdrop-blur-lg to prevent Chrome crashes */}
        <div className="bg-zinc-900/90 backdrop-blur-lg border border-white/10 p-2 pl-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto">
          
          <div className="flex flex-col justify-center min-w-[80px]">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Price</p>
            <p className="text-2xl font-black text-white leading-none tracking-tight">₹{productData?.price}</p>
          </div>
          
          {/* Dynamic Branded Button */}
          <button 
            onClick={handleAddToBag}
            disabled={isAdding}
            style={{ 
              backgroundColor: storeData?.theme_color || '#ffffff',
              color: storeData?.theme_color ? '#ffffff' : '#000000' 
            }}
            className={`font-black px-8 py-5 rounded-full flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(255,255,255,0.15)] ${isAdding ? 'opacity-70 scale-95' : 'hover:opacity-90 active:scale-95'}`}
          >
            {isAdding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ShoppingBag className="w-5 h-5" />
            )}
            {isAdding ? 'Adding...' : 'Add to Bag'}
          </button>
          
        </div>
      </div>
      
    </main>
  );
}
