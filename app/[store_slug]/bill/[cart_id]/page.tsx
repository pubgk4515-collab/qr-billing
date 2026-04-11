'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, Receipt, Loader2, ShoppingBag, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function PremiumDigitalBillPage({ params }: { params: Promise<{ store_slug: string, cart_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug, cart_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [saleData, setSaleData] = useState<any>(null);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();
  const safeCartId = decodeURIComponent(cart_id || '').toUpperCase().trim();

  useEffect(() => {
    if (!safeStoreSlug || !safeCartId) return;
    
    async function fetchEverything() {
      try {
        const { data: store } = await supabase
          .from('stores')
          .select('*') 
          .ilike('slug', safeStoreSlug)
          .single();
          
        if (store) {
          setStoreData(store);

          const { data: saleDataRecord } = await supabase
            .from('sales') 
            .select('*')
            .ilike('cart_id', `%${safeCartId}%`)
            .order('created_at', { ascending: false }) 
            .limit(1)
            .maybeSingle();

          if (saleDataRecord) {
            setSaleData(saleDataRecord); 
          } else {
            setSaleData(null);
          }

          const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', store.id)
            .order('created_at', { ascending: false })
            .limit(6);
            
          if (products) setTrendingProducts(products);
        }
      } catch (err) {
        console.error("Error fetching bill details:", err);
        setSaleData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchEverything();
  }, [safeCartId, safeStoreSlug]);

  const handlePrint = () => {
    window.print();
  };

  const themeColor = storeData?.theme_color || '#111111'; 
  const displayName = storeData?.store_name || storeData?.name || 'Premium Store';
  const displayInitials = displayName.substring(0, 3).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="w-10 h-10 text-zinc-300" style={{ color: themeColor }} />
        </motion.div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Generating VIP Receipt</p>
      </div>
    );
  }

  if (!saleData || !saleData.created_at) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-zinc-400 font-bold">
        <div className="text-center">
          <Receipt className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
          <p>Invoice not found or link expired.</p>
        </div>
      </div>
    );
  }

  const billDate = new Date(saleData.created_at);
  const formattedDate = billDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let itemsList = [];
  try {
    itemsList = typeof saleData.purchased_items === 'string' 
      ? JSON.parse(saleData.purchased_items) 
      : (saleData.purchased_items || []);
  } catch (e) {
    console.error("Failed to parse items", e);
  }

  // 🔥 SMART INCLUSIVE GST MATH ENGINE (2026 Compliant)
  const hasGst = storeData?.has_gst || false;
  const gstNumber = storeData?.gst_number || '';

  let baseAmount = 0;
  let cgst = 0;
  let sgst = 0;

  if (hasGst && itemsList.length > 0) {
    itemsList.forEach((item: any) => {
      const itemPrice = Number(item.products?.price || item.price || 0);
      
      // The Ultimate Rule: 5% up to ₹2500, 18% above ₹2500
      const applicableRate = itemPrice > 2500 ? 18 : 5; 
      
      // Reverse calculation per item
      const itemBase = itemPrice / (1 + applicableRate / 100);
      const itemTax = itemPrice - itemBase;

      baseAmount += itemBase;
      cgst += itemTax / 2;
      sgst += itemTax / 2;
    });

    // Formatting for clean UI
    baseAmount = Number(baseAmount.toFixed(2));
    cgst = Number(cgst.toFixed(2));
    sgst = Number(sgst.toFixed(2));
  } else if (!hasGst) {
    baseAmount = saleData?.total_amount || 0;
  }

  return (
    <div className="min-h-screen print:min-h-0 bg-[#F5F5F7] print:bg-white text-[#111] font-sans selection:bg-black selection:text-white pb-32 print:p-0">
      
      <motion.main 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-md mx-auto bg-white min-h-screen print:min-h-0 sm:min-h-fit sm:mt-12 sm:rounded-[2rem] sm:shadow-[0_20px_60px_rgba(0,0,0,0.06)] print:shadow-none print:mt-4 print:rounded-[2rem] print:border print:border-zinc-200 p-8 sm:p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 print:hidden" style={{ backgroundColor: themeColor }} />

        {/* 1. STORE BRANDING */}
        <div className="flex flex-col items-center text-center mb-10 mt-4 print:mt-0">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-5 shadow-lg overflow-hidden border border-zinc-100 print:shadow-none print:border-black">
            {storeData?.logo_url ? (
              <img src={storeData.logo_url} alt="Store Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-2xl tracking-tighter">
                {displayInitials}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-black leading-none">{displayName}</h1>
          
          {/* 🔥 DYNAMIC GSTIN DISPLAY */}
          {hasGst && gstNumber && (
            <p className="text-[10px] font-bold text-zinc-500 mt-2 uppercase tracking-widest">
              GSTIN: {gstNumber}
            </p>
          )}
          
          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mt-2 flex items-center justify-center gap-1">
            <Store className="w-3 h-3" /> OFFICIAL DIGITAL RECEIPT
          </p>
        </div>

        <div className="border-t-2 border-dashed border-zinc-200 print:border-zinc-300 w-full my-6" />

        {/* 2. ORDER METADATA */}
        <div className="grid grid-cols-2 gap-y-6 text-sm mb-6">
          <div>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Order ID</p>
            <p className="font-black text-zinc-900 text-base">{safeCartId}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Date & Time</p>
            <p className="font-bold text-zinc-800">{formattedDate} <br/> <span className="text-xs text-zinc-500">{formattedTime}</span></p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Status</p>
            <p className="font-bold flex items-center gap-1.5 text-zinc-800">
              <CheckCircle2 className="w-4 h-4" style={{ color: themeColor }} /> 
              {saleData.payment_status === 'completed' ? 'Paid' : 'Pending'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Method</p>
            <p className="font-black uppercase text-zinc-900">{saleData.payment_method || 'CASH'}</p>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-zinc-200 print:border-zinc-300 w-full my-6" />

        {/* 3. ITEMIZED BILLING */}
        <div className="mb-8">
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-5">Purchased Items ({saleData.items_count})</p>
          <div className="flex flex-col gap-5">
            {itemsList.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start group">
                <div className="max-w-[75%]">
                  <p className="font-bold text-sm text-zinc-900 leading-tight">
                    {item.products?.name || item.name || 'Premium Item'}
                  </p>
                  <p className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-widest mt-1">
                    TAG: {item.id || item.tag_id || 'N/A'}
                  </p>
                </div>
                <p className="font-black text-sm text-zinc-900">₹{item.products?.price || item.price || 0}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-200 print:border-zinc-300 w-full my-4" />

        {/* 4. DYNAMIC TOTALS (GST vs Non-GST) */}
        {hasGst ? (
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex justify-between items-center text-sm">
              <p className="text-zinc-500 font-bold">Base Amount</p>
              <p className="font-black text-zinc-800">₹{baseAmount}</p>
            </div>
            <div className="flex justify-between items-center text-sm">
              <p className="text-zinc-500 font-bold">CGST</p>
              <p className="font-black text-zinc-600">₹{cgst}</p>
            </div>
            <div className="flex justify-between items-center text-sm">
              <p className="text-zinc-500 font-bold">SGST</p>
              <p className="font-black text-zinc-600">₹{sgst}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex justify-between items-center text-sm">
              <p className="text-zinc-500 font-bold">Subtotal</p>
              <p className="font-black text-zinc-800">₹{saleData.total_amount}</p>
            </div>
            <div className="flex justify-between items-center text-sm">
              <p className="text-zinc-500 font-bold">Tax & Charges</p>
              <p className="font-black text-zinc-400">₹0.00</p>
            </div>
          </div>
        )}

        <div className="border-t-2 border-dashed border-zinc-200 print:border-zinc-300 w-full my-6" />

        {/* GRAND TOTAL */}
        <div className="flex justify-between items-end mb-12 bg-zinc-50 p-5 rounded-2xl print:bg-transparent print:p-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Grand Total</p>
          <p className="text-4xl font-black tracking-tighter text-zinc-900">₹{saleData.total_amount}</p>
        </div>

        {/* FOOTER */}
        <div className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex flex-col gap-1 items-center">
          <Receipt className="w-4 h-4 mb-1 text-zinc-300" />
          <p>Thank you for shopping at {displayName}</p>
          <p>This is a computer generated receipt.</p>
        </div>
      </motion.main>

      {/* 🚀 PSYCHOLOGICAL RETENTION: TRENDING LOOP */}
      {trendingProducts.length > 0 && (
        <div className="mt-16 print:hidden overflow-hidden w-full">
          <div className="px-6 sm:max-w-md mx-auto mb-6 flex items-center justify-between">
            <h3 className="text-base font-black tracking-tight uppercase text-zinc-800">Trending Now</h3>
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">New Arrivals</span>
          </div>

          <div className="relative w-full flex overflow-x-hidden">
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#F5F5F7] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#F5F5F7] to-transparent z-10" />

            <motion.div 
              className="flex gap-4 px-6 items-center whitespace-nowrap py-4"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ ease: "linear", duration: 30, repeat: Infinity }}
              style={{ width: "fit-content" }}
            >
              {[...trendingProducts, ...trendingProducts].map((product, index) => (
                <div key={index} className="w-[150px] flex-shrink-0 bg-white rounded-3xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-zinc-100 group cursor-pointer hover:shadow-xl transition-all">
                  <div className="w-full h-[160px] bg-zinc-100 rounded-2xl overflow-hidden relative mb-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="text-zinc-300 w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="px-1 pb-1">
                    <h4 className="font-bold text-xs text-zinc-900 truncate">{product.name}</h4>
                    <p className="font-black text-sm mt-0.5" style={{ color: themeColor }}>₹{product.price}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      )}

      {/* ⬇️ FLOATING ACTION BUTTON */}
      <button 
        onClick={handlePrint}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-90 transition-all print:hidden"
      >
        <Download className="w-5 h-5" />
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0.5cm; } 
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

    </div>
  );
}
