'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, ShieldCheck, AlertCircle, QrCode, ChevronLeft, ArrowRight, Package } from 'lucide-react';
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
        // 1. DYNAMIC STORE FETCH (Bulletproof logic catching both name and logo)
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', safeStoreSlug)
          .single();

        if (storeError || !store) throw new Error(`Store '${store_slug}' not found! Please scan the correct QR code.`);
        setStoreData(store);

        // 2. TAG & PRODUCT FETCH
        const { data: tag, error: tagError } = await supabase
          .from('qr_tags')
          .select('*, products(*)')
          .ilike('id', safeTagId)
          .eq('store_id', store.id) 
          .single();

        if (tagError || !tag) throw new Error(`QR Code ${safeTagId} is not associated with this store.`);
        if (!tag.products) throw new Error(`This QR code is not currently attached to any piece of clothing.`);
        if (tag.status === 'sold') throw new Error(`This item has already been sold or is in the checkout process.`);

        // SILENT TRACKER FOR ANALYTICS
        supabase
          .from('products')
          .update({ scan_count: (tag.products.scan_count || 0) + 1 })
          .eq('id', tag.products.id)
          .then(({ error }) => {
             if (error) console.error("Silent Tracking Error:", error);
          });

        // GLOBAL SYNC & SWAP CHECK
        if (tag.status === 'in_cart') {
          setIsInBag(true); 
        } else {
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
    if (!productData || isInBag || !storeData) return; 
    setIsAdding(true);
    
    try {
      const { error: updateError } = await supabase
        .from('qr_tags')
        .update({ status: 'in_cart' }) 
        .eq('id', safeTagId)
        .eq('store_id', storeData.id); 

      if (updateError) throw updateError;

      const cartKey = `cart_${safeStoreSlug}`;
      const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      
      // 🔥 FIX: THE GST GHOST KILLER
      // Ab product ki category strictly save hogi taaki bill engine 18% GST laga sake!
      currentCart.push({
        tag_id: safeTagId,
        product_id: productData.id,
        name: productData.name,
        price: productData.price,
        image_url: productData.image_url,
        category: productData.category || 'Normal Apparel' 
      });
      
      localStorage.setItem(cartKey, JSON.stringify(currentCart));
      
      router.push(`/${safeStoreSlug}/cart`);
    } catch (err) {
      alert("Nahi ho paya! Shayad kisi aur ne pehle hi utha liya.");
    } finally {
      setIsAdding(false);
    }
  };

  const themeColor = storeData?.theme_color || '#10b981'; 
  const displayName = storeData?.store_name || storeData?.name || 'Premium Store';
  const displayInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map((word: string) => word)
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-zinc-500" style={{ color: themeColor }} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Authenticating</p>
    </div>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black mb-3">Item Unavailable</h1>
        <p className="text-zinc-400 mb-8 max-w-sm font-medium leading-relaxed">{error}</p>
        <button onClick={() => router.push(`/${safeStoreSlug}/cart`)} className="px-8 py-4 bg-white text-black hover:bg-zinc-200 transition-all rounded-full font-black flex items-center gap-2 active:scale-95 shadow-xl">
          <ShoppingBag className="w-5 h-5" /> View My Bag
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      
      {/* 👑 VIP DYNAMIC HEADER */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => router.push(`/${safeStoreSlug}/cart`)} className="p-2 -ml-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>
        
        <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 mb-0.5">
            {storeData?.logo_url ? (
              <img src={storeData.logo_url} alt="logo" className="w-5 h-5 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#222] text-[8px] font-black text-white border border-white/10">
                {displayInitials}
              </div>
            )}
            <h1 className="text-sm font-black tracking-widest uppercase text-white leading-none">{displayName}</h1>
          </div>
          <p className="text-[8px] font-bold tracking-[0.2em] uppercase" style={{ color: themeColor }}>Verified Partner</p>
        </div>

        <button onClick={() => router.push(`/${safeStoreSlug}/cart`)} className="relative p-2 -mr-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <ShoppingBag className="w-5 h-5 text-zinc-400" />
            {isInBag && <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#050505]" style={{ backgroundColor: themeColor }} />}
        </button>
      </header>

      <div className="flex-1 p-6 flex flex-col">
        
        {/* 📸 PRODUCT IMAGE HERO (More Organized) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full aspect-[4/5] bg-[#111] rounded-[2.5rem] overflow-hidden mb-8 relative border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {productData?.image_url ? (
            <img src={productData.image_url} alt="Item" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-800"><Package className="w-20 h-20" /></div>
          )}
          
          <div className="absolute top-5 right-5 flex flex-col gap-2 items-end">
             <div className="bg-[#050505]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-[10px] font-black tracking-widest uppercase shadow-lg">
                TAG: {safeTagId}
             </div>
             {isInBag && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-4 py-2 rounded-xl flex items-center gap-2 shadow-xl border border-black/10" style={{ backgroundColor: themeColor, color: '#000' }}>
                   <ShieldCheck className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Added to Bag</span>
                </motion.div>
             )}
          </div>
        </motion.div>

        {/* 📋 DETAILS SECTION */}
        <div className="px-2">
          <AnimatePresence mode="wait">
            {isInBag ? (
              // ✨ ALREADY ADDED INTERFACE
              <motion.div key="added" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-inner" style={{ backgroundColor: `${themeColor}1A`, border: `1px solid ${themeColor}33` }}>
                  <ShieldCheck className="w-8 h-8" style={{ color: themeColor }} />
                </div>
                
                <h2 className="text-3xl font-black mb-2 tracking-tight text-white">Item Already Added</h2>
                <p className="text-zinc-500 text-sm font-medium mb-10 max-w-[280px]">You have already securely added <span className="text-white font-bold">{productData?.name}</span> to your bag.</p>
                
                <div className="w-full flex flex-col gap-3">
                  <button onClick={() => router.push(`/${safeStoreSlug}/scan`)} className="w-full py-4 bg-white text-black rounded-[1.5rem] font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl">
                    <QrCode className="w-5 h-5" /> Scan Next Item
                  </button>
                  <button onClick={() => router.push(`/${safeStoreSlug}/cart`)} className="w-full py-4 bg-[#111] text-zinc-400 rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:text-white hover:bg-[#1a1a1a] active:scale-95 transition-all border border-white/5">
                    Review My Bag <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              // 🛍️ STANDARD ADD TO BAG INTERFACE
              <motion.div key="new" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-[#111] px-3 py-1.5 rounded-lg border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400 shadow-inner">
                    SIZE: {productData?.size || 'FREE'}
                  </div>
                </div>
                <h2 className="text-4xl font-black mb-4 tracking-tighter leading-none text-white">{productData?.name}</h2>
                <p className="text-zinc-500 text-[13px] font-medium leading-relaxed mb-32">Premium quality item officially verified by <strong className="text-zinc-300">{displayName}</strong>. Secure checkout is backed by digital ledger.</p>

                {/* 💳 FLOATING ACTION BAR */}
                <div className="fixed bottom-6 left-4 right-4 z-50">
                   <div className="bg-[#161616]/95 backdrop-blur-3xl border border-white/10 p-2.5 pl-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)]">
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Price</p>
                        <p className="text-3xl font-black tracking-tighter text-white">₹{productData?.price}</p>
                      </div>
                      <button 
                        onClick={handleAddToBag}
                        disabled={isAdding}
                        className="h-14 px-8 rounded-[2rem] font-black flex items-center justify-center gap-2 text-black active:scale-95 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                        style={{ backgroundColor: themeColor }}
                      >
                        {isAdding ? <Loader2 className="animate-spin w-5 h-5" /> : <><ShoppingBag className="w-5 h-5" /> Add to Bag</>}
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
