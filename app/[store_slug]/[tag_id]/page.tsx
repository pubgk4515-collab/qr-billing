'use client';

import { use, useEffect, useState } from 'react';
import { ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Updated path & file from previous step

export default function MagicScanPage({ params }: { params: Promise<{ store_slug: string, tag_id: string }> }) {
  const resolvedParams = use(params);
  const { store_slug, tag_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDetails() {
      try {
        // 1. Dukaan ki Pehchaan nikalo (Slug se)
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color')
          .eq('slug', store_slug)
          .single();

        if (storeError || !store) throw new Error('Store not found!');
        setStoreData(store);

        // 2. Us dukaan ka specific TAG (Kapda) nikalo
        const { data: tag, error: tagError } = await supabase
          .from('qr_tags')
          .select('*, products(*)')
          .eq('id', tag_id)
          .eq('store_id', store.id)
          .single();

        if (tagError || !tag || !tag.products) throw new Error('Product not found or empty tag!');
        setProductData(tag.products);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [store_slug, tag_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <span className="text-red-500 text-2xl font-bold">!</span>
        </div>
        <h1 className="text-xl font-bold mb-2">Oops! Something went wrong</h1>
        <p className="text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative">
      {/* 80/20 Rule: 20% Branding Header */}
      <header 
        className="px-6 py-4 flex items-center gap-3 border-b border-white/10 sticky top-0 z-50 backdrop-blur-md"
        style={{ backgroundColor: storeData?.theme_color || '#000000' }}
      >
        {storeData?.logo_url ? (
          <img src={storeData.logo_url} alt="logo" className="w-10 h-10 rounded-full object-cover border border-white/20" />
        ) : (
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold">
            {storeData?.store_name?.charAt(0) || 'S'}
          </div>
        )}
        <div>
          <h1 className="text-lg font-black leading-tight">{storeData?.store_name || 'Premium Store'}</h1>
          <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase text-white/70">Verified Partner</p>
        </div>
      </header>

      {/* Main Content Area (Scrollable Image & Name) */}
      <div className="flex-1 p-6 pb-56 flex flex-col">
        {/* Product Image */}
        <div className="w-full aspect-[4/5] bg-zinc-900 rounded-3xl overflow-hidden mb-6 relative border border-white/5 shadow-2xl">
          {productData?.image_url ? (
            <img src={productData.image_url} alt={productData.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold uppercase text-xs">No Product Image</div>
          )}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono font-bold">
            {tag_id}
          </div>
        </div>

        {/* Product Name (Keep visible here) */}
        <div className="mb-6">
          <h2 className="text-3xl font-black mb-1 line-clamp-2">{productData?.name}</h2>
          <p className="text-sm text-zinc-500">Scan again or show at counter if payment fails.</p>
        </div>
      </div>

      {/* 🔥 THE UPDATED FLOATING CART BAR 🔥 */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-black/70 backdrop-blur-xl border-t border-white/10 z-40 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
        
        {/* Size Display Row */}
        <div className="mb-4">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2">Item Size</p>
          <div className="w-14 h-12 rounded-xl font-black text-lg flex items-center justify-center bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {productData?.size || 'N/A'}
          </div>
        </div>

        {/* Price & Add to Bag Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Price</p>
            <p className="text-4xl font-black text-emerald-400">₹{productData?.price}</p>
          </div>
          
          <button className="bg-white text-black font-black px-8 py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.1)]">
            <ShoppingBag className="w-6 h-6" /> Add to Bag & Pay
          </button>
        </div>
      </div>
    </main>
  );
}
