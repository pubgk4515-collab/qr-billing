'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  QrCode, 
  ChevronLeft,
  ArrowRight,
  Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function MagicScanPage({ params }: { params: Promise<{ store_slug: string, tag_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug, tag_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isInBag, setIsInBag] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();
  const safeTagId = decodeURIComponent(tag_id || '').toUpperCase().trim();

  useEffect(() => {
    if (!safeStoreSlug || !safeTagId) return;

        async function fetchDetails() {
      try {
        // 1. PEHLE STORE FETCH KARO (Yahan se 'store' variable banega)
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color')
          .ilike('slug', safeStoreSlug)
          .single();

        if (storeError || !store) throw new Error(`Dukaan '${store_slug}' nahi mili! Kripya sahi QR scan karein.`);
        setStoreData(store);

        // 2. PHIR TAG FETCH KARO (Ab 'store.id' properly kaam karega)
        const { data: tag, error: tagError } = await supabase
          .from('qr_tags')
          .select('*, products(*)')
          .ilike('id', safeTagId)
          .eq('store_id', store.id) // Error was here, now fixed!
          .single();

        if (tagError || !tag) throw new Error(`QR Code ${safeTagId} is store ka nahi hai.`);
        if (!tag.products) throw new Error(`Ye QR Code abhi kisi kapde se juda nahi hai.`);
        if (tag.status === 'sold') throw new Error(`Ye kapda bik chuka hai ya checkout mein hai.`);

        // 🔥 GLOBAL SYNC & SWAP CHECK:
        if (tag.status === 'in_cart') {
          // Agar database me in_cart hai, toh kisi ne add kar liya hai
          setIsInBag(true); 
        } else {
          // Agar local cart mein purana swapped item pada hai toh check karo
          const cartKey = `cart_${safeStoreSlug}`;
          const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
          const existingItemInCart = currentCart.find((item: any) => item.tag_id === safeTagId);

          if (existingItemInCart && existingItemInCart.product_id === tag.products.id) {
             setIsInBag(true);
          } else {
             setIsInBag(false);
          }
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

    const handleAddToBag = async () => {
    if (!productData || isInBag) return;
    setIsAdding(true);
    
    try {
      // 1. Database mein status 'in_cart' karo
      const { error: updateError } = await supabase
        .from('qr_tags')
        .update({ status: 'in_cart' }) // Naya status use karenge
        .eq('id', safeTagId);

      if (updateError) throw updateError;

      // 2. Local storage mein purani tarah save karo (for speed)
      const cartKey = `cart_${safeStoreSlug}`;
      const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      currentCart.push({
        tag_id: safeTagId,
        product_id: productData.id,
        name: productData.name,
        price: productData.price,
        image_url: productData.image_url
      });
      localStorage.setItem(cartKey, JSON.stringify(currentCart));
      
      router.push(`/${safeStoreSlug}/cart`);
    } catch (err) {
      alert("Nahi ho paya! Shayad kisi aur ne pehle hi utha liya.");
    } finally {
      setIsAdding(false);
    }
  };


  // --- UI RENDER HELPERS ---
  const themeColor = storeData?.theme_color || '#dc2626';

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-zinc-500" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Authenticating</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      
      {/* 👑 MINIMALIST HEADER */}
      <header className="px-6 py-5 flex items-center justify-between sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push(`/${safeStoreSlug}/cart`)} 
            className="p-2 bg-white/5 rounded-full"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase">{storeData?.store_name}</h1>
            <p className="text-[8px] font-bold text-emerald-500 tracking-widest uppercase">Verified Partner</p>
          </div>
        </div>
        <button onClick={() => router.push(`/${safeStoreSlug}/cart`)} className="relative p-2 bg-white/5 rounded-full">
            <ShoppingBag className="w-5 h-5 text-zinc-400" />
            {isInBag && <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-black" />}
        </button>
      </header>

      <div className="flex-1 p-6 flex flex-col">
        
        {/* PRODUCT IMAGE HERO */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full aspect-[4/5] bg-[#0A0A0A] rounded-[3rem] overflow-hidden mb-8 relative border border-white/10 shadow-2xl"
        >
          {productData?.image_url ? (
            <img src={productData.image_url} alt="Item" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-800"><Package className="w-20 h-20" /></div>
          )}
          
          {/* Status Overlay */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
             <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-[10px] font-black tracking-widest uppercase">
                {safeTagId}
             </div>
             {isInBag && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-emerald-500 text-black px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                   <ShieldCheck className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-widest">In Your Bag</span>
                </motion.div>
             )}
          </div>
        </motion.div>

        {/* DETAILS SECTION */}
        <div className="px-2">
          <AnimatePresence mode="wait">
            {isInBag ? (
              // ✨ ALREADY ADDED INTERFACE
              <motion.div key="added" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black mb-2 tracking-tight">Item Already Added</h2>
                <p className="text-zinc-500 text-sm font-medium mb-10 max-w-[250px]">You have already added {productData?.name} to your bag.</p>
                
                {/* ACTIONS */}
                <div className="w-full flex flex-col gap-4">
                  <button 
                    onClick={() => router.push(`/${safeStoreSlug}/scan`)} // In-built scanner route
                    className="w-full py-5 bg-white text-black rounded-[2rem] font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
                  >
                    <QrCode className="w-5 h-5" /> Scan to Add More
                  </button>
                  <button 
                    onClick={() => router.push(`/${safeStoreSlug}/cart`)}
                    className="w-full py-5 bg-[#111] text-zinc-400 rounded-[2rem] font-black flex items-center justify-center gap-3 active:scale-95 transition-all border border-white/5"
                  >
                    Review My Bag <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              // 🛍️ STANDARD ADD TO BAG INTERFACE
              <motion.div key="new" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#111] px-4 py-1.5 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {productData?.size || 'Free Size'}
                  </div>
                </div>
                <h2 className="text-5xl font-black mb-4 tracking-tighter leading-none">{productData?.name}</h2>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-10">Premium quality item verified by {storeData?.store_name}. Checkout to confirm your order.</p>

                {/* FLOATING ACTION BAR */}
                <div className="fixed bottom-8 left-6 right-6 z-50">
                   <div className="bg-[#111]/90 backdrop-blur-2xl border border-white/10 p-3 pl-8 rounded-[3rem] flex items-center justify-between shadow-3xl">
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Price</p>
                        <p className="text-3xl font-black tracking-tighter">₹{productData?.price}</p>
                      </div>
                      <button 
                        onClick={handleAddToBag}
                        disabled={isAdding}
                        className="h-16 px-10 rounded-[2.5rem] font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl"
                        style={{ backgroundColor: themeColor }}
                      >
                        {isAdding ? <Loader2 className="animate-spin w-6 h-6" /> : <><ShoppingBag className="w-5 h-5" /> Add to Bag</>}
                      </button>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </main>
  );
}
