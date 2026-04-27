'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, ShieldCheck, AlertCircle, QrCode, ChevronLeft, ArrowRight, Package, Verified } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function MagicScanPage({ params }: { params: Promise<{ store_slug: string; tag_id: string }> }) {
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
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', safeStoreSlug)
          .single();

        if (storeError || !store) throw new Error(`Store '${store_slug}' not found! Please scan the correct QR code.`);
        setStoreData(store);

        const { data: tag, error: tagError } = await supabase
          .from('qr_tags')
          .select('*, products(*)')
          .ilike('id', safeTagId)
          .eq('store_id', store.id)
          .single();

        if (tagError || !tag) throw new Error(`QR Code ${safeTagId} is not associated with this store.`);
        if (!tag.products) throw new Error(`This QR code is not currently attached to any piece of clothing.`);
        if (tag.status === 'sold') throw new Error(`This item has already been sold or is in the checkout process.`);

        supabase
          .from('products')
          .update({ scan_count: (tag.products.scan_count || 0) + 1 })
          .eq('id', tag.products.id)
          .then(({ error }) => {
            if (error) console.error('Silent Tracking Error:', error);
          });

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

      currentCart.push({
        tag_id: safeTagId,
        product_id: productData.id,
        name: productData.name,
        price: productData.price,
        image_url: productData.image_url,
        category: productData.category || 'Normal Apparel',
      });

      localStorage.setItem(cartKey, JSON.stringify(currentCart));

      router.push(`/${safeStoreSlug}/cart`);
    } catch (err) {
      console.error('Add to cart error:', err);
      alert('Nahi ho paya! Shayad kisi aur ne pehle hi utha liya.');
    } finally {
      setIsAdding(false);
    }
  };

  const themeColor = storeData?.theme_color || '#10b981';
  const displayName = storeData?.store_name || storeData?.name || 'Premium Store';
  const displayInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map((word: string) => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (loading)
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-500" style={{ color: themeColor }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Authenticating</p>
      </div>
    );

  if (error) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-semibold mb-3 tracking-tight">Item Unavailable</h1>
        <p className="text-zinc-400 mb-8 max-w-sm font-medium leading-relaxed">{error}</p>
        <button
          onClick={() => router.push(`/${safeStoreSlug}/cart`)}
          className="px-8 py-4 bg-white text-black hover:bg-gray-100 transition-all rounded-full font-semibold flex items-center gap-2 active:scale-95"
        >
          <ShoppingBag className="w-5 h-5" /> View My Bag
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#030303] text-white flex flex-col font-sans selection:bg-white/20">
      {/* Subtle grain texture overlay for depth */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${themeColor}20 0.5px, transparent 0.5px), radial-gradient(circle at 75% 75%, ${themeColor}20 0.5px, transparent 0.5px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* ── HEADER – Brand Identity Block ── */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#030303]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <button
          onClick={() => router.push(`/${safeStoreSlug}/cart`)}
          className="p-2.5 -ml-2 rounded-full hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>

        {/* Center: elevated brand block */}
        <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3 mb-0.5">
            {/* Brand logo / initials */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold tracking-tight border shadow-inner"
              style={{
                backgroundColor: `${themeColor}20`,
                color: themeColor,
                borderColor: `${themeColor}30`,
              }}
            >
              {storeData?.logo_url ? (
                <img src={storeData.logo_url} alt="logo" className="w-full h-full rounded-full object-cover" />
              ) : (
                displayInitials
              )}
            </div>
            <h1 className="text-sm font-semibold tracking-wide uppercase text-white leading-none">
              {displayName}
            </h1>
          </div>
          {/* Trust badge */}
          <div
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider"
            style={{ backgroundColor: `${themeColor}10`, color: themeColor }}
          >
            <Verified className="w-2.5 h-2.5" />
            Verified Store
          </div>
        </div>

        <button
          onClick={() => router.push(`/${safeStoreSlug}/cart`)}
          className="relative p-2.5 -mr-2 rounded-full hover:bg-white/[0.06] transition-colors"
        >
          <ShoppingBag className="w-5 h-5 text-zinc-400" />
          {isInBag && (
            <span
              className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#030303]"
              style={{ backgroundColor: themeColor }}
            />
          )}
        </button>
      </header>

      <div className="relative z-10 flex-1 p-6 flex flex-col">
        {/* ── PRODUCT IMAGE CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full aspect-[4/5] bg-[#0D0D0D] rounded-[2.5rem] overflow-hidden mb-8 relative border border-white/[0.06] shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
        >
          {productData?.image_url ? (
            <img src={productData.image_url} alt={productData?.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-800">
              <Package className="w-20 h-20" />
            </div>
          )}

          {/* Subtle brand gradient overlay at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${themeColor}08, transparent)`,
            }}
          />

          {/* Top-right: Tag chip + status */}
          <div className="absolute top-5 right-5 flex flex-col gap-2 items-end">
            <div className="bg-[#050505]/70 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/[0.08] text-[10px] font-semibold tracking-widest uppercase shadow-lg">
              <span className="text-zinc-500">TAG</span>{' '}
              <span style={{ color: themeColor }}>{safeTagId}</span>
            </div>
            {isInBag && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg"
                style={{ backgroundColor: `${themeColor}25`, border: `1px solid ${themeColor}40`, color: themeColor }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">In Your Bag</span>
              </motion.div>
            )}
          </div>

          {/* Subtle brand watermark */}
          <div className="absolute top-5 left-5">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-40"
              style={{ color: themeColor }}
            >
              {displayName}
            </p>
          </div>
        </motion.div>

        {/* ── DETAILS SECTION ── */}
        <div className="px-2">
          <AnimatePresence mode="wait">
            {isInBag ? (
              // ── ALREADY IN BAG STATE ──
              <motion.div
                key="added"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center flex flex-col items-center"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${themeColor}12`, border: `1px solid ${themeColor}30` }}
                >
                  <ShieldCheck className="w-7 h-7" style={{ color: themeColor }} />
                </div>

                <h2 className="text-2xl font-semibold mb-2 tracking-tight">Already Reserved</h2>
                <p className="text-zinc-400 text-sm font-medium mb-10 max-w-[280px]">
                  <span className="text-white font-semibold">{productData?.name}</span> is securely
                  waiting in your bag.
                </p>

                <div className="w-full flex flex-col gap-3">
                  <button
                    onClick={() => router.push(`/${safeStoreSlug}/scan`)}
                    className="w-full py-4 bg-white text-black rounded-[1.5rem] font-semibold flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                  >
                    <QrCode className="w-5 h-5" /> Scan Next Item
                  </button>
                  <button
                    onClick={() => router.push(`/${safeStoreSlug}/cart`)}
                    className="w-full py-4 bg-white/[0.04] text-zinc-300 rounded-[1.5rem] font-semibold flex items-center justify-center gap-3 hover:bg-white/[0.08] active:scale-[0.98] transition-all border border-white/[0.06]"
                  >
                    Review My Bag <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              // ── STANDARD PRODUCT VIEW ──
              <motion.div
                key="new"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {/* Size + Brand subtitle */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06] text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                    SIZE: {productData?.size || 'FREE'}
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    by <span className="text-zinc-300">{displayName}</span>
                  </p>
                </div>

                {/* Product name */}
                <h2 className="text-4xl font-semibold mb-3 tracking-tight leading-tight">
                  {productData?.name}
                </h2>

                {/* Trust line */}
                <div className="flex items-center gap-2 mb-6">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: themeColor }} />
                  <p className="text-xs font-medium text-zinc-500">
                    Verified · Secure Checkout · Digital Ledger
                  </p>
                </div>

                <p className="text-zinc-500 text-[13px] font-medium leading-relaxed mb-24">
                  Premium quality item, officially verified and ready for instant reservation.
                </p>

                {/* ── FLOATING ACTION BAR ── */}
                <div className="fixed bottom-6 left-4 right-4 z-50">
                  <div className="bg-[#111]/95 backdrop-blur-2xl border border-white/[0.08] p-2.5 pl-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_40px_80px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div>
                      <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest mb-0.5">
                        Price
                      </p>
                      <p className="text-3xl font-semibold tracking-tight">₹{productData?.price}</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleAddToBag}
                      disabled={isAdding}
                      className="h-14 px-8 rounded-[2rem] font-semibold flex items-center justify-center gap-2 text-black transition-all shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                      style={{ backgroundColor: themeColor }}
                    >
                      {isAdding ? (
                        <Loader2 className="animate-spin w-5 h-5" />
                      ) : (
                        <>
                          <ShoppingBag className="w-5 h-5" /> Add to Bag
                        </>
                      )}
                    </motion.button>
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