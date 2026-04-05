'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Path verify kar lena

export default function MagicScanPage({ params }: { params: Promise<{ store_slug: string, tag_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug, tag_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isInBag, setIsInBag] = useState(false);

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();
  const safeTagId = decodeURIComponent(tag_id || '').toUpperCase().trim();

  useEffect(() => {
    if (!safeStoreSlug || !safeTagId) return;

    async function fetchDetails() {
      try {
        // 1. Fetch Store
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color')
          .ilike('slug', safeStoreSlug)
          .single();

        if (storeError || !store) throw new Error(`Dukaan '${store_slug}' nahi mili! Kripya sahi QR scan karein.`);
        setStoreData(store);

        // 2. Fetch Tag & Product
        const { data: tag, error: tagError } = await supabase
          .from('qr_tags')
          .select('*, products(*)')
          .ilike('id', safeTagId)
          .eq('store_id', store.id)
          .single();

        if (tagError || !tag) throw new Error(`QR Code ${safeTagId} is store ka nahi hai.`);
        if (!tag.products) throw new Error(`Ye QR Code abhi kisi kapde se juda nahi hai.`);
        if (tag.status === 'sold') throw new Error(`Ye kapda bik chuka hai ya checkout mein hai.`);

        setProductData(tag.products);

        // Check if already in cart
        const cartKey = `cart_${safeStoreSlug}`;
        const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setIsInBag(currentCart.some((item: any) => item.tag_id === safeTagId));

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [safeStoreSlug, safeTagId]);

  // 🛒 Add to Cart Logic (Local Storage)
  const handleAddToBag = () => {
    if (!productData || isInBag) return;
    setIsAdding(true);
    
    setTimeout(() => {
      const cartKey = `cart_${safeStoreSlug}`;
      const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      
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
        localStorage.setItem(cartKey, JSON.stringify(currentCart));
      }
      
      router.push(`/${safeStoreSlug}/cart`);
    }, 300); // Thoda smooth feel ke liye
  };

  if (loading || !store_slug || !tag_id) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Fetching Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black mb-3">Item Unavailable</h1>
        <p className="text-zinc-400 mb-8 max-w-sm font-medium leading-relaxed">{error}</p>
        <button onClick={() => router.push(`/${safeStoreSlug}/cart`)} className="px-8 py-4 bg-white text-black hover:bg-zinc-200 transition-all rounded-full font-black flex items-center gap-2 active:scale-95">
          <ShoppingBag className="w-5 h-5" /> View My Bag
        </button>
      </div>
    );
  }

  const themeColor = storeData?.theme_color || '#dc2626'; // Default Red like in screenshot

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col relative font-sans selection:bg-white/20">
      
      {/* 👑 PREMIUM HEADER */}
      <header className="px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-2xl backdrop-blur-md bg-black/50 border-b border-white/5">
        {storeData?.logo_url ? (
          <img src={storeData.logo_url} alt="logo" className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-black shadow-inner text-lg" style={{ backgroundColor: themeColor }}>
            {storeData?.store_name?.charAt(0) || 'S'}
          </div>
        )}
        <div>
          <h1 className="text-lg font-black leading-tight tracking-tight text-white">{storeData?.store_name || 'Premium Store'}</h1>
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Verified Partner</p>
        </div>
      </header>

      {/* 📦 MAIN CONTENT */}
      <div className="flex-1 p-5 pb-40 flex flex-col">
        <div className="w-full aspect-[4/5] bg-[#111] rounded-[2.5rem] overflow-hidden mb-6 relative border border-white/10 shadow-2xl shadow-black">
          {productData?.image_url ? (
            <img src={productData.image_url} alt={productData.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
              <ShoppingBag className="w-12 h-12 opacity-50" />
              <span className="font-black uppercase text-xs tracking-widest">No Image</span>
            </div>
          )}
          <div className="absolute top-5 right-5 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-black tracking-widest uppercase shadow-xl">
            {safeTagId}
          </div>
        </div>

        <div className="mb-6 px-1">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 bg-[#111] px-4 py-2 rounded-xl border border-white/5 shadow-inner">
               <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Size</span>
               <span className="text-white font-black text-sm">{productData?.size || 'Free Size'}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 shadow-inner">
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">In Stock</span>
            </div>
          </div>
          
          <h2 className="text-4xl font-black mb-3 leading-tight tracking-tighter">{productData?.name}</h2>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed">Please verify the size and details before adding to your bag.</p>
        </div>
      </div>

      {/* 🔥 PREMIUM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black via-black/90 to-transparent z-40 pointer-events-none">
        <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 p-3 pl-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto">
          
          <div className="flex flex-col justify-center min-w-[80px]">
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Price</p>
            <p className="text-3xl font-black text-white leading-none tracking-tighter">₹{productData?.price}</p>
          </div>
          
          <button 
            onClick={handleAddToBag}
            disabled={isAdding || isInBag} 
            style={{ backgroundColor: isInBag ? '#1a1a1a' : themeColor, color: isInBag ? '#666' : '#ffffff' }}
            className="font-black px-8 py-5 rounded-[2rem] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl w-[60%]"
          >
            {isInBag ? (
              <>Added <ShieldCheck className="w-5 h-5" /></>
            ) : isAdding ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <><ShoppingBag className="w-5 h-5" /> Add to Bag</>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
