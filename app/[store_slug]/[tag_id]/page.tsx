'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function MagicScanPage({ params }: { params: Promise<{ store_slug: string, tag_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug, tag_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDetails() {
      try {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color')
          .eq('slug', store_slug)
          .single();

        if (storeError || !store) throw new Error('Store not found!');
        setStoreData(store);

        const { data: tag, error: tagError } = await supabase
          .from('qr_tags')
          .select('*, products(*)')
          .eq('id', tag_id)
          .eq('store_id', store.id)
          .single();

        if (tagError || !tag || !tag.products) throw new Error('Product not found or has been removed.');
        setProductData(tag.products);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [store_slug, tag_id]);

  // 🛒 Add to Cart Logic
  const handleAddToBag = () => {
    // 1. Dukaandaar ke naam se ek unique cart banayenge browser me
    const cartKey = `cart_${store_slug}`;
    const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // 2. Check karenge ki kya ye tag pehle se bag me hai
    const alreadyInCart = currentCart.find((item: any) => item.tag_id === tag_id);
    
    if (!alreadyInCart) {
      currentCart.push({
        tag_id: tag_id,
        product_id: productData.id,
        name: productData.name,
        price: productData.price,
        size: productData.size || 'Free Size',
        image_url: productData.image_url
      });
      localStorage.setItem(cartKey, JSON.stringify(currentCart));
    }
    
    // 3. Cart page pe bhej denge
    router.push('/billing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Fetching Details</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
          <span className="text-red-500 text-2xl font-bold">!</span>
        </div>
        <h1 className="text-xl font-bold mb-2">Item Unavailable</h1>
        <p className="text-zinc-500">{error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col relative font-sans selection:bg-white/20">
      
      {/* 👑 PREMIUM HEADER */}
      <header 
        className="px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-2xl"
        style={{ 
          backgroundColor: storeData?.theme_color || '#000000',
          backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)' 
        }}
      >
        {storeData?.logo_url ? (
          <img src={storeData.logo_url} alt="logo" className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg" />
        ) : (
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold shadow-inner">
            {storeData?.store_name?.charAt(0) || 'S'}
          </div>
        )}
        <div>
          <h1 className="text-lg font-black leading-tight text-white">{storeData?.store_name || 'Premium Store'}</h1>
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/70 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Verified Partner
          </p>
        </div>
      </header>

      {/* 📦 MAIN CONTENT AREA */}
      <div className="flex-1 p-5 pb-40 flex flex-col">
        
        {/* Product Image Card */}
        <div className="w-full aspect-[4/5] bg-zinc-900 rounded-[2rem] overflow-hidden mb-6 relative border border-white/10 shadow-2xl shadow-black">
          {productData?.image_url ? (
            <img src={productData.image_url} alt={productData.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
              <ShoppingBag className="w-10 h-10 opacity-50" />
              <span className="font-bold uppercase text-xs tracking-widest">No Image</span>
            </div>
          )}
          {/* Tag ID Badge */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-mono font-bold shadow-lg">
            {tag_id}
          </div>
        </div>

        {/* Product Details (Size moved here for premium look) */}
        <div className="mb-6 px-1">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {/* Dynamic Size Pill */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
               <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Size</span>
               <span className="text-white font-black text-sm">{productData?.size || 'Free Size'}</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-emerald-500/20">
               <span className="text-emerald-400 text-[10px] font-black uppercase tracking-wider">In Stock</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-black mb-2 leading-tight tracking-tight">{productData?.name}</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">Please verify the size and details before adding to bag. Scan again if payment session expires.</p>
        </div>
      </div>

      {/* 🔥 THE PREMIUM FLOATING ACTION BAR 🔥 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40 pointer-events-none">
        <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-2 pl-6 rounded-[2rem] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto">
          
          {/* Price Block */}
          <div className="flex flex-col justify-center">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Total Price</p>
            <p className="text-2xl font-black text-white leading-none tracking-tight">₹{productData?.price}</p>
          </div>
          
          {/* Action Button */}
          <button 
            onClick={handleAddToBag}
            className="bg-white text-black font-black px-8 py-4 rounded-[1.5rem] flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.15)]"
          >
            <ShoppingBag className="w-5 h-5" /> Add to Bag
          </button>
          
        </div>
      </div>
      
    </main>
  );
}
