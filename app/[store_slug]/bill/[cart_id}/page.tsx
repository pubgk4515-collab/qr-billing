'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase'; // Path verify kar lena (4 levels deep)
import { motion } from 'framer-motion';
import { Loader2, MapPin, Download, CheckCircle2, Store, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function DigitalBillPage({ params }: { params: Promise<{ store_slug: string, cart_id: string }> }) {
  const resolvedParams = use(params);
  const { store_slug, cart_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [billData, setBillData] = useState<any>(null);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();
  const safeCartId = decodeURIComponent(cart_id || '').toUpperCase().trim();

  useEffect(() => {
    if (!safeStoreSlug || !safeCartId) return;

    async function fetchBillAndStore() {
      try {
        // 1. Fetch Store Data
        const { data: store } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', safeStoreSlug)
          .single();

        if (!store) throw new Error("Store not found");
        setStoreData(store);

        // 2. Fetch Bill Data
        const { data: bill } = await supabase
          .from('sales')
          .select('*')
          .eq('cart_id', safeCartId)
          .eq('store_id', store.id)
          .single();

        if (bill) setBillData(bill);

        // 3. Fetch Trending Products (Latest 5-6 items for the marquee)
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .limit(6);

        if (products) setTrendingProducts(products);

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBillAndStore();
  }, [safeStoreSlug, safeCartId]);

  // Handle PDF Download (Native Browser Print)
  const handleDownload = () => {
    window.print();
  };

  const themeColor = storeData?.theme_color || '#10b981';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Loading Invoice...</p>
      </div>
    );
  }

  if (!billData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-zinc-500 font-bold">
        Bill not found or invalid request.
      </div>
    );
  }

  // Format Date safely
  const billDate = new Date(billData.created_at);
  const formattedDate = billDate.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const formattedTime = billDate.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-[#fafafa] text-black font-sans selection:bg-black selection:text-white pb-32">
      
      {/* 🧾 BILL SECTION (MVP Style) */}
      {/* We use print:w-full print:p-0 print:shadow-none to format it perfectly for PDF generation */}
      <main className="max-w-md mx-auto bg-white min-h-screen sm:min-h-0 sm:mt-10 sm:rounded-[2rem] sm:shadow-[0_20px_60px_rgba(0,0,0,0.05)] print:shadow-none print:mt-0 p-8 sm:p-10 relative">
        
        {/* Store Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-4">
            {storeData?.logo_url ? (
              <img src={storeData.logo_url} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-white font-black text-xl tracking-tighter">
                {storeData?.store_name?.substring(0, 3).toUpperCase() || 'SME'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">{storeData?.store_name || 'Premium Store'}</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" /> {storeData?.address || 'Store Location, City'}
          </p>
        </div>

        <div className="border-t-2 border-dashed border-zinc-200 w-full my-6" />

        {/* Bill Meta Data */}
        <div className="grid grid-cols-2 gap-y-6 text-sm mb-6">
          <div>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Order ID</p>
            <p className="font-black text-base">{billData.cart_id}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Date & Time</p>
            <p className="font-bold text-zinc-800">{formattedDate} at {formattedTime}</p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Status</p>
            <p className="font-bold flex items-center gap-1.5 text-zinc-800">
              <CheckCircle2 className="w-4 h-4" style={{ color: themeColor }} /> 
              {billData.payment_status === 'completed' ? 'Payment Completed' : 'Pending'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Method</p>
            <p className="font-black uppercase">{billData.payment_method}</p>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-zinc-200 w-full my-6" />

        {/* Purchased Items List */}
        <div className="mb-6">
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-4">Purchased Items ({billData.items_count})</p>
          <div className="flex flex-col gap-4">
            {billData.purchased_items && billData.purchased_items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm text-zinc-900">{idx + 1}. {item.name || item.products?.name || 'Item'}</p>
                  <p className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-widest mt-0.5">TAG: {item.tag || item.id}</p>
                </div>
                <p className="font-black text-sm">₹{item.price || item.products?.price}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-200 w-full my-4" />

        {/* Totals */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-center text-sm">
            <p className="text-zinc-500 font-bold">Subtotal</p>
            <p className="font-black text-zinc-800">₹{billData.total_amount}</p>
          </div>
          <div className="flex justify-between items-center text-sm">
            <p className="text-zinc-500 font-bold">Tax</p>
            <p className="font-black text-zinc-800">₹0.00</p>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-zinc-200 w-full my-6" />

        <div className="flex justify-between items-end mb-10">
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Grand Total</p>
          <p className="text-3xl font-black tracking-tighter">₹{billData.total_amount}</p>
        </div>

        <div className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          <p>Thank you for shopping</p>
          <p>Visit again!</p>
        </div>
      </main>

      {/* 🚀 TRENDING PRODUCTS CAROUSEL (Hidden during printing) */}
      {trendingProducts.length > 0 && (
        <div className="mt-20 print:hidden overflow-hidden">
          <div className="px-6 sm:max-w-md mx-auto mb-6 flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight uppercase">Trending Now</h3>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">At {storeData?.store_name}</span>
          </div>

          {/* Endless Marquee Container */}
          <div className="relative w-full flex overflow-x-hidden">
            {/* Gradient Mask for smooth fade at edges */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#fafafa] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#fafafa] to-transparent z-10" />

            <motion.div 
              className="flex gap-4 px-4 items-center whitespace-nowrap"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ ease: "linear", duration: 25, repeat: Infinity }}
              style={{ width: "fit-content" }}
            >
              {/* Render the array twice to create a seamless loop effect */}
              {[...trendingProducts, ...trendingProducts].map((product, index) => (
                <div key={index} className="w-[160px] flex-shrink-0 bg-white rounded-[1.5rem] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-zinc-100 flex flex-col gap-3">
                  <div className="w-full h-[180px] bg-zinc-100 rounded-xl overflow-hidden relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="text-zinc-300 w-8 h-8" /></div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 truncate">{product.name}</h4>
                    <p className="font-black text-sm mt-0.5">₹{product.price}</p>
                  </div>
                  
                  {/* ⚡ NO-LOGIC CHECKOUT BUTTON (Just Animation) */}
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: themeColor }}
                  >
                    Checkout
                  </motion.button>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      )}

      {/* ⬇️ FLOATING DOWNLOAD BUTTON (Hidden during printing) */}
      <button 
        onClick={handleDownload}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-white border border-zinc-200 rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.1)] active:scale-90 transition-all print:hidden group"
      >
        <Download className="w-5 h-5 text-zinc-800 group-hover:translate-y-0.5 transition-transform" />
      </button>

    </div>
  );
}
