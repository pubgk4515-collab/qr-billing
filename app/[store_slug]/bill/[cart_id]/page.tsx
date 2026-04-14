'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Receipt, Loader2, ShoppingBag, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { toPng } from 'html-to-image';

export default function PremiumDigitalBillPage({ params }: { params: Promise<{ store_slug: string, cart_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug, cart_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false); 
  const [storeData, setStoreData] = useState<any>(null);
  const [saleData, setSaleData] = useState<any>(null);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [taxRules, setTaxRules] = useState<any[]>([]); 

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();
  const safeCartId = decodeURIComponent(cart_id || '').toUpperCase().trim();

  useEffect(() => {
    if (!safeStoreSlug || !safeCartId) return;
    
    async function fetchEverything() {
      try {
        const { data: rules, error: rulesError } = await supabase.from('tax_rules').select('*');
        if (rulesError) console.error("Tax Rules RLS Error:", rulesError);
        else if (rules) setTaxRules(rules);

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

          if (saleDataRecord) setSaleData(saleDataRecord); 

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
      } finally {
        setLoading(false);
      }
    }
    fetchEverything();
  }, [safeCartId, safeStoreSlug]);

    // 🔥 ENTERPRISE DYNAMIC PDF GENERATOR (80mm Thermal)
  const handleDownloadReceipt = async () => {
    const receiptElement = document.getElementById('receipt-container'); 
    if (!receiptElement) return;

    setIsDownloading(true);

    try {
      // 🔥 THE FIX: Dynamically import jsPDF ONLY when the button is clicked (Client-side bypass)
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;

      // 1. Capture Ultra-HD Image first (Avoids CSS crashes)
      const dataUrl = await toPng(receiptElement, { 
        quality: 1.0,
        pixelRatio: 3, // 3x resolution for crisp thermal printing
        backgroundColor: '#ffffff',
        style: {
          transform: 'none',
          boxShadow: 'none',
          margin: '0',
          borderRadius: '0'
        }
      });

      // 2. Load image to calculate exact dimensions
      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      // 3. The Math Magic: Lock width to 80mm, calculate dynamic height
      const pdfWidth = 80; // Standard 80mm thermal paper
      const pdfHeight = (img.height * pdfWidth) / img.width; // Maintains perfect aspect ratio

      // 4. Create custom-sized PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight] // 🔥 DYNAMIC HEIGHT MAGIC
      });

      // 5. Add HD image to PDF and Download
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`RG_Receipt_${safeCartId.substring(0,8)}.pdf`);

    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };


  const themeColor = storeData?.theme_color || '#111111'; 
  const displayName = storeData?.store_name || storeData?.name || 'Premium Store';
  const displayInitials = displayName.substring(0, 3).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-zinc-300 animate-spin" style={{ color: themeColor }} />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Generating VIP Receipt</p>
      </div>
    );
  }

  if (!saleData || !saleData.created_at) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-zinc-400 font-bold">
        <div className="text-center">
          <Receipt className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
          <p>Invoice not found.</p>
        </div>
      </div>
    );
  }

  const billDate = new Date(saleData.created_at);
  const formattedDate = billDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let itemsList = [];
  try {
    itemsList = typeof saleData.purchased_items === 'string' ? JSON.parse(saleData.purchased_items) : (saleData.purchased_items || []);
  } catch (e) {
    console.error("Failed to parse items", e);
  }

  const hasGst = storeData?.has_gst || false;
  const gstNumber = storeData?.gst_number || '';

  let baseAmount = 0;
  let enrichedItems: any[] = [];
  let taxSummary: Record<string, { rate: number, amount: number }> = {};

  if (hasGst && itemsList.length > 0) {
    itemsList.forEach((item: any) => {
      const itemPrice = Number(item.products?.price || item.price || 0);
      const itemCategory = item.products?.category || item.category || 'Normal Apparel'; 
      
      const matchedRule = taxRules.find(rule => 
        rule.category.toLowerCase() === itemCategory.toLowerCase() && 
        itemPrice >= Number(rule.min_price) && 
        itemPrice <= Number(rule.max_price)
      );

      // 🔥 CTO FALLBACK LOGIC: Ensures 18% for Leather even if DB rule is missing
      let applicableRate = 5;
      if (matchedRule) {
        applicableRate = Number(matchedRule.gst_rate);
      } else if (itemCategory.toLowerCase().includes('leather')) {
        applicableRate = 18; 
      } else {
        applicableRate = itemPrice > 2500 ? 18 : 5;
      }
      
      const halfRate = applicableRate / 2;
      const itemBase = itemPrice / (1 + applicableRate / 100);
      const itemTax = itemPrice - itemBase;

      baseAmount += itemBase;

      if (!taxSummary[halfRate]) {
        taxSummary[halfRate] = { rate: halfRate, amount: 0 };
      }
      taxSummary[halfRate].amount += (itemTax / 2);

      enrichedItems.push({
        name: item.products?.name || item.name || 'Premium Item',
        tagId: item.id || item.tag_id || 'N/A',
        displayPrice: itemPrice.toFixed(2),
        displayQty: 1, 
        displayGst: itemTax.toFixed(2),
        displayTotal: itemPrice.toFixed(2)
      });
    });
    baseAmount = Number(baseAmount.toFixed(2));
  } else {
    baseAmount = saleData?.total_amount || 0;
    enrichedItems = itemsList.map((item: any) => ({
      name: item.products?.name || item.name || 'Premium Item',
      tagId: item.id || item.tag_id || 'N/A',
      displayPrice: Number(item.products?.price || item.price || 0).toFixed(2),
      displayQty: 1,
      displayGst: "0.00",
      displayTotal: Number(item.products?.price || item.price || 0).toFixed(2)
    }));
  }

  const sortedTaxRates = Object.values(taxSummary).sort((a, b) => a.rate - b.rate);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#111] font-sans selection:bg-black selection:text-white pb-32 flex flex-col items-center">
      
      {/* 🚫 NO ANIMATION WRAPPER FOR CLEAN CAPTURE */}
      <div className="w-full flex justify-center mt-0 sm:mt-12 bg-white sm:bg-transparent">
        
        <div 
          id="receipt-container"
          className="bg-white relative overflow-hidden sm:shadow-2xl sm:rounded-2xl sm:border border-zinc-100 px-6 py-8 sm:p-10 w-full"
          style={{ maxWidth: '80mm', margin: '0 auto' }}
        >
          <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: themeColor }} />

          <div className="flex flex-col items-center text-center mb-8 mt-2">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4 overflow-hidden border border-zinc-100">
              {storeData?.logo_url ? (
                <img src={storeData.logo_url} alt="Store Logo" className="w-full h-full object-cover grayscale" />
              ) : (
                <span className="text-white font-black text-2xl tracking-tighter">
                  {displayInitials}
                </span>
              )}
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-black leading-none">{displayName}</h1>
            {hasGst && gstNumber && <p className="text-[10px] font-bold text-zinc-500 mt-2 uppercase tracking-widest">GSTIN: {gstNumber}</p>}
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mt-2 flex items-center justify-center gap-1"><Store className="w-3 h-3" /> DIGITAL RECEIPT</p>
          </div>

          <div className="border-t-2 border-dashed border-zinc-200 w-full my-6" />

          <div className="grid grid-cols-2 gap-y-6 text-sm mb-6 px-2">
            <div>
              <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Order ID</p>
              <p className="font-black text-zinc-900 text-base">{safeCartId.substring(0,8)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Date & Time</p>
              <p className="font-bold text-zinc-800">{formattedDate} <br/> <span className="text-xs text-zinc-500">{formattedTime}</span></p>
            </div>
          </div>

          <div className="border-t border-zinc-200 w-full my-6" />

          <div className="mb-8">
            <p className="text-[11px] text-zinc-800 font-black mb-4">Order Summary</p>
            <div className="flex flex-col gap-3">
              {enrichedItems.map((item, idx) => (
                <div key={idx} className="bg-white border border-zinc-200 p-4 flex gap-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-200" style={{ backgroundColor: themeColor }} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 uppercase leading-tight pr-4">{item.name}</h4>
                        <p className="text-[9px] font-mono font-bold text-zinc-400 mt-0.5">TAG: {item.tagId.substring(0,6)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-y-1.5 text-[13px]">
                      <div className="text-zinc-500">Price</div>
                      <div className="text-right font-medium text-zinc-800">₹{item.displayPrice}</div>
                      <div className="text-zinc-500">Qty.</div>
                      <div className="text-right font-medium text-zinc-800">{item.displayQty}</div>
                      <div className="text-zinc-500 flex items-center gap-1">GST</div>
                      <div className="text-right font-medium text-zinc-800">₹{item.displayGst}</div>
                      <div className="text-zinc-800 font-bold mt-1">Total</div>
                      <div className="text-right font-black text-zinc-900 mt-1">₹{item.displayTotal}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t-2 border-dashed border-zinc-200 w-full my-6" />

          <div className="px-2 mb-8">
            <div className="flex justify-between items-center text-sm mb-2"><p className="text-zinc-800 font-medium">Total Sale</p><p className="font-bold text-zinc-800">₹{saleData.total_amount?.toFixed(2)}</p></div>
            <div className="flex justify-between items-center text-sm font-black mb-6"><p className="text-zinc-900">Amount Payable</p><p className="text-zinc-900">₹{saleData.total_amount?.toFixed(2)}</p></div>
            <p className="text-[11px] font-bold text-zinc-800 mb-3">Tender</p>
            <div className="flex justify-between items-center text-sm border-b border-zinc-100 pb-2 mb-2"><p className="text-zinc-600 capitalize">{saleData.payment_method || 'Cash'}</p><p className="font-medium text-zinc-800">₹{saleData.total_amount?.toFixed(2)}</p></div>
          </div>

          {hasGst && (
            <div className="px-2 mb-8">
              <p className="text-[11px] font-bold text-zinc-800 mb-3">Tax Summary</p>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-y-2 text-sm border-b border-zinc-200 pb-2 mb-2">
                <div className="font-bold text-zinc-900">Tax</div><div className="font-bold text-zinc-900">Rate</div><div className="font-bold text-zinc-900 text-right">Amount</div>
              </div>
              <div className="flex flex-col gap-2 text-[13px] text-zinc-600 mb-4">
                {sortedTaxRates.map((tax, idx) => (<div key={`cgst-${idx}`} className="grid grid-cols-[1fr_1fr_auto]"><div>CGST</div><div>{tax.rate.toFixed(2)}%</div><div className="text-right font-medium">₹{tax.amount.toFixed(2)}</div></div>))}
                {sortedTaxRates.map((tax, idx) => (<div key={`sgst-${idx}`} className="grid grid-cols-[1fr_1fr_auto]"><div>SGST</div><div>{tax.rate.toFixed(2)}%</div><div className="text-right font-medium">₹{tax.amount.toFixed(2)}</div></div>))}
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-200 font-black"><p className="text-zinc-900">Total Amount Paid</p><p className="text-zinc-900">₹{saleData.total_amount?.toFixed(2)}</p></div>
            </div>
          )}

          <div className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex flex-col gap-1 items-center mt-10"><p>Thank you for shopping at {displayName}</p></div>
        </div>
      </div>

      {trendingProducts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-16 overflow-hidden w-full"
        >
          <div className="px-6 sm:max-w-md mx-auto mb-6 flex items-center justify-between">
            <h3 className="text-base font-black tracking-tight uppercase text-zinc-800">Trending Now</h3>
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">New Arrivals</span>
          </div>
          <div className="relative w-full flex overflow-x-hidden">
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#F5F5F7] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#F5F5F7] to-transparent z-10" />
            <motion.div className="flex gap-4 px-6 items-center whitespace-nowrap py-4" animate={{ x: ["0%", "-50%"] }} transition={{ ease: "linear", duration: 30, repeat: Infinity }} style={{ width: "fit-content" }}>
              {[...trendingProducts, ...trendingProducts].map((product, index) => (
                <div key={index} className="w-[150px] flex-shrink-0 bg-white rounded-3xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-zinc-100">
                  <div className="w-full h-[160px] bg-zinc-100 rounded-2xl overflow-hidden relative mb-3">
                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="text-zinc-300 w-8 h-8" /></div>}
                  </div>
                  <div className="px-1 pb-1">
                    <h4 className="font-bold text-xs text-zinc-900 truncate">{product.name}</h4>
                    <p className="font-black text-sm mt-0.5" style={{ color: themeColor }}>₹{product.price}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}

      <button onClick={handleDownloadReceipt} disabled={isDownloading} className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-90 transition-all disabled:opacity-70 disabled:hover:scale-100">
        {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
      </button>

    </div>
  );
}
