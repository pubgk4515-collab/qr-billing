'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, Receipt, Loader2, ShoppingBag, Store, Info } from 'lucide-react';
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
    if (!safeStoreSlug || !safeCartId) {
      setLoading(false);
      return;
    }
    
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

  const themeColor = storeData?.theme_color || '#e11d48'; // Matched a bit with the red reference theme
  const displayName = storeData?.store_name || storeData?.name || 'Store';
  const displayInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map((word: string) => word)
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="w-10 h-10 text-zinc-300" style={{ color: themeColor }} />
        </motion.div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Generating Receipt</p>
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

  let itemsList = [];
  try {
    itemsList = typeof saleData.purchased_items === 'string' 
      ? JSON.parse(saleData.purchased_items) 
      : (saleData.purchased_items || []);
  } catch (e) {
    console.error("Failed to parse items", e);
  }

  // 🔥 KARNIVAL/ENTERPRISE STYLE MATH ENGINE
  const hasGst = storeData?.has_gst || false;
  
  let totalSaleExact = 0;
  let processedItems: any[] = [];
  let taxSummary: Record<string, { cgst: number, sgst: number }> = {};

  if (hasGst && itemsList.length > 0) {
    itemsList.forEach((item: any) => {
      const price = Number(item.products?.price || item.price || 0);
      const qty = item.quantity || 1; // Assuming 1 if qty not tracked
      const itemTotal = price * qty;
      
      const gstRate = itemTotal > 2500 ? 18 : 5; 
      const halfRate = (gstRate / 2).toFixed(2); 
      
      const exactBase = itemTotal / (1 + gstRate / 100);
      const exactTax = itemTotal - exactBase;
      const exactHalfTax = exactTax / 2;

      totalSaleExact += itemTotal;

      // Grouping taxes for the summary table
      if (!taxSummary[halfRate]) {
        taxSummary[halfRate] = { cgst: 0, sgst: 0 };
      }
      taxSummary[halfRate].cgst += exactHalfTax;
      taxSummary[halfRate].sgst += exactHalfTax;

      processedItems.push({
        ...item,
        unitPriceStr: price.toFixed(2),
        qty: qty,
        gstAmountStr: exactTax.toFixed(2),
        totalStr: itemTotal.toFixed(2)
      });
    });
  } else {
    itemsList.forEach((item: any) => {
      const price = Number(item.products?.price || item.price || 0);
      const qty = item.quantity || 1;
      const itemTotal = price * qty;
      totalSaleExact += itemTotal;

      processedItems.push({
        ...item,
        unitPriceStr: price.toFixed(2),
        qty: qty,
        gstAmountStr: "0.00",
        totalStr: itemTotal.toFixed(2)
      });
    });
  }

  // Calculate final rounded amounts
  const amountPayable = Math.round(totalSaleExact);
  const roundOffAmount = (amountPayable - totalSaleExact).toFixed(2);

  return (
    <div className="min-h-screen bg-[#F5F5F7] print:bg-white text-[#111] font-sans selection:bg-black selection:text-white pb-32 print:p-0">
      
      <motion.main 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-[400px] mx-auto bg-white min-h-screen print:min-h-0 sm:min-h-fit sm:my-8 sm:rounded-[1.5rem] sm:shadow-2xl print:shadow-none print:mt-0 print:rounded-none p-6 sm:p-8"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-200">
              {storeData?.logo_url ? (
                <img src={storeData.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-lg">{displayInitials}</span>
              )}
            </div>
            <div>
              <h1 className="text-base font-black uppercase leading-tight">{displayName}</h1>
              {hasGst && storeData?.gst_number && (
                <p className="text-[10px] text-zinc-500 font-semibold uppercase">GSTIN: {storeData.gst_number}</p>
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center print:hidden">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        <div className="border-b border-zinc-200 w-full mb-4" />

        <p className="text-sm font-bold text-zinc-800 mb-4">Order Summary <span className="text-zinc-400 font-normal">#{safeCartId}</span></p>

        {/* ITEMS LIST (Karnival Style) */}
        <div className="flex flex-col gap-4 mb-6">
          {processedItems.map((item: any, idx: number) => (
            <div key={idx} className="flex gap-3 bg-zinc-50/50 p-3 rounded-xl border border-zinc-100">
               <div className="w-10 h-10 bg-white rounded flex items-center justify-center border border-zinc-200 flex-shrink-0">
                  <span className="text-[10px] font-black text-zinc-400">{displayInitials}</span>
               </div>
               <div className="flex-1">
                 <h2 className="font-bold text-xs text-zinc-900 uppercase mb-2 pr-4 relative">
                   {item.products?.name || item.name || 'Item'} ({item.id || item.tag_id || 'N/A'})
                   <Info className="w-3.5 h-3.5 text-zinc-400 absolute right-0 top-0" />
                 </h2>
                 <div className="grid grid-cols-2 gap-y-1 text-xs">
                   <p className="text-zinc-500">Price</p>
                   <p className="text-right font-medium">₹{item.unitPriceStr}</p>
                   
                   <p className="text-zinc-500">Qty.</p>
                   <p className="text-right font-medium">{item.qty}</p>
                   
                   {hasGst && (
                     <>
                       <p className="text-zinc-500 flex items-center gap-1">GST <Info className="w-3 h-3 text-zinc-400"/></p>
                       <p className="text-right font-medium">₹{item.gstAmountStr}</p>
                     </>
                   )}
                   
                   <p className="text-zinc-800 font-bold mt-1">Total</p>
                   <p className="text-right font-bold text-zinc-800 mt-1">₹{item.totalStr}</p>
                 </div>
               </div>
            </div>
          ))}
        </div>

        <div className="border-b border-zinc-200 w-full mb-4" />

        {/* TOTALS */}
        <div className="flex flex-col gap-1.5 text-sm mb-6">
          <div className="flex justify-between items-center">
            <p className="text-zinc-600">Total Sale</p>
            <p className="font-medium text-zinc-900">₹{totalSaleExact.toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-zinc-900 font-bold text-base">Amount Payable</p>
            <p className="font-bold text-base text-zinc-900">₹{amountPayable.toFixed(2)}</p>
          </div>
        </div>

        {/* PAYMENT TENDER INFO */}
        <div className="mb-6">
          <p className="font-bold text-sm text-zinc-900 mb-2">Tender</p>
          <div className="flex justify-between items-center text-sm text-zinc-600">
            <div>
              <p>{saleData.payment_method || 'Cash / Offline'}</p>
              {saleData.transaction_id && <p className="text-xs text-zinc-400">Ref. No: {saleData.transaction_id}</p>}
            </div>
            <p className="font-medium text-zinc-900">₹{amountPayable.toFixed(2)}</p>
          </div>
        </div>

        {/* TAX SUMMARY TABLE */}
        {hasGst && Object.keys(taxSummary).length > 0 && (
          <div className="mb-8">
            <p className="text-sm font-bold text-zinc-800 mb-3">Tax Summary</p>
            <div className="w-full text-xs text-zinc-600">
              <div className="grid grid-cols-3 font-bold text-zinc-800 border-b border-zinc-200 pb-2 mb-2">
                <p>Tax</p>
                <p className="text-center">Rate</p>
                <p className="text-right">Tax Amount</p>
              </div>
              
              {/* Loop through the grouped rates dynamically */}
              {Object.entries(taxSummary).map(([rate, amounts], i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="grid grid-cols-3">
                    <p>CGST</p>
                    <p className="text-center">{rate}%</p>
                    <p className="text-right">₹{amounts.cgst.toFixed(2)}</p>
                  </div>
                  <div className="grid grid-cols-3 mb-2">
                    <p>SGST</p>
                    <p className="text-center">{rate}%</p>
                    <p className="text-right">₹{amounts.sgst.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-b border-zinc-200 w-full mb-4" />

        {/* FINAL PAID AMOUNT & BARCODE */}
        <div className="flex justify-between items-center font-bold text-sm text-zinc-900 mb-6">
          <p>Total Amount Paid</p>
          <p>₹{amountPayable.toFixed(2)}</p>
        </div>

        <div className="flex flex-col items-center justify-center mb-6">
           {/* Simulated Barcode visual */}
           <div className="w-full h-16 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_5px,transparent_5px,transparent_8px,#000_8px,#000_12px,transparent_12px,transparent_14px)] opacity-90 mb-2"></div>
           <p className="text-xs text-zinc-500 font-medium tracking-widest">{safeCartId}</p>
        </div>

      </motion.main>

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={handlePrint}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(225,29,72,0.3)] hover:scale-110 active:scale-90 transition-all print:hidden"
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
