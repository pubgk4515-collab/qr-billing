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
  const [taxRules, setTaxRules] = useState<any[]>([]); 

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();
  const safeCartId = decodeURIComponent(cart_id || '').toUpperCase().trim();

  useEffect(() => {
    if (!safeStoreSlug || !safeCartId) return;
    
    async function fetchEverything() {
      try {
        const { data: rules } = await supabase.from('tax_rules').select('*');
        if (rules) setTaxRules(rules);

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

  // 🔥 ADVANCED ENRICHED GST ENGINE (Per-Item Breakdown + Tax Summary Table)
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

      const applicableRate = matchedRule ? Number(matchedRule.gst_rate) : (itemPrice > 2500 ? 18 : 5); 
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
    <div className="min-h-screen print:min-h-0 bg-[#F5F5F7] print:bg-white text-[#111] font-sans selection:bg-black selection:text-white pb-32 print:p-0">
      
      <motion.main 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-md mx-auto bg-white min-h-screen print:min-h-0 sm:min-h-fit sm:mt-12 sm:rounded-[2rem] sm:shadow-[0_20px_60px_rgba(0,0,0,0.06)] print:shadow-none print:mt-0 print:rounded-none print:border-none p-6 sm:p-10 print:p-4 relative overflow-hidden receipt-container"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 print:hidden" style={{ backgroundColor: themeColor }} />

        {/* 1. STORE BRANDING */}
        <div className="flex flex-col items-center text-center mb-8 mt-4 print:mt-0 avoid-break">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-lg overflow-hidden border border-zinc-100 print:shadow-none print:border-black print:rounded-lg print:w-12 print:h-12">
            {storeData?.logo_url ? (
              <img src={storeData.logo_url} alt="Store Logo" className="w-full h-full object-cover grayscale" />
            ) : (
              <span className="text-white font-black text-2xl tracking-tighter print:text-xl">
                {displayInitials}
              </span>
            )}
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase text-black leading-none print:text-lg">{displayName}</h1>
          
          {hasGst && gstNumber && (
            <p className="text-[10px] font-bold text-zinc-500 mt-2 uppercase tracking-widest print:text-black">
              GSTIN: {gstNumber}
            </p>
          )}
          
          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mt-2 flex items-center justify-center gap-1 print:text-black">
            <Store className="w-3 h-3 print:hidden" /> OFFICIAL DIGITAL RECEIPT
          </p>
        </div>

        <div className="border-t-2 border-dashed border-zinc-200 print:border-black w-full my-6 print:my-3 avoid-break" />

        {/* 2. ORDER METADATA */}
        <div className="grid grid-cols-2 gap-y-6 print:gap-y-3 text-sm mb-6 print:mb-3 px-2 avoid-break">
          <div>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1 print:text-black">Order ID</p>
            <p className="font-black text-zinc-900 text-base print:text-sm">{safeCartId}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1 print:text-black">Date & Time</p>
            <p className="font-bold text-zinc-800 print:text-xs">{formattedDate} <br/> <span className="text-xs text-zinc-500 print:text-black">{formattedTime}</span></p>
          </div>
        </div>

        <div className="border-t border-zinc-200 print:border-black w-full my-6 print:my-3 avoid-break" />

        {/* 3. ITEMIZED BILLING */}
        <div className="mb-8 print:mb-4">
          <p className="text-[11px] text-zinc-800 font-black mb-4 print:mb-2 avoid-break">Order Summary <span className="text-zinc-400 font-medium print:text-black">#{safeCartId.substring(0,8)}</span></p>
          
          <div className="flex flex-col gap-3 print:gap-2">
            {enrichedItems.map((item, idx) => (
              <div key={idx} className="bg-white border border-zinc-200 print:border-black rounded-2xl print:rounded-none p-4 print:p-2 flex gap-4 print:gap-2 shadow-sm print:shadow-none relative overflow-hidden avoid-break">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-200 print:hidden" style={{ backgroundColor: themeColor }} />
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3 print:mb-1">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 uppercase leading-tight pr-4 print:text-xs">{item.name}</h4>
                      <p className="text-[9px] font-mono font-bold text-zinc-400 mt-0.5 print:text-black">TAG: {item.tagId}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-y-1.5 print:gap-y-0.5 text-[13px] print:text-[10px]">
                    <div className="text-zinc-500 print:text-black">Price</div>
                    <div className="text-right font-medium text-zinc-800 print:text-black">₹{item.displayPrice}</div>
                    
                    <div className="text-zinc-500 print:text-black">Qty.</div>
                    <div className="text-right font-medium text-zinc-800 print:text-black">{item.displayQty}</div>
                    
                    <div className="text-zinc-500 flex items-center gap-1 print:text-black">GST</div>
                    <div className="text-right font-medium text-zinc-800 print:text-black">₹{item.displayGst}</div>
                    
                    <div className="text-zinc-800 font-bold mt-1 print:mt-0 print:text-black">Total</div>
                    <div className="text-right font-black text-zinc-900 mt-1 print:mt-0 print:text-black">₹{item.displayTotal}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t-2 border-dashed border-zinc-200 print:border-black w-full my-6 print:my-3 avoid-break" />

        {/* 4. TOTALS & PAYMENT */}
        <div className="px-2 mb-8 print:mb-4 avoid-break">
          <div className="flex justify-between items-center text-sm print:text-[11px] mb-2 print:mb-1">
            <p className="text-zinc-800 font-medium">Total Sale</p>
            <p className="font-bold text-zinc-800">₹{saleData.total_amount?.toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center text-sm print:text-xs font-black mb-6 print:mb-3">
            <p className="text-zinc-900">Amount Payable</p>
            <p className="text-zinc-900">₹{saleData.total_amount?.toFixed(2)}</p>
          </div>

          <p className="text-[11px] font-bold text-zinc-800 mb-3 print:mb-1">Tender</p>
          <div className="flex justify-between items-center text-sm print:text-[11px] border-b border-zinc-100 print:border-black pb-2 mb-2 print:pb-1 print:mb-1">
            <p className="text-zinc-600 capitalize print:text-black">{saleData.payment_method || 'Cash'}</p>
            <p className="font-medium text-zinc-800">₹{saleData.total_amount?.toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center text-sm print:text-[11px]">
            <p className="text-zinc-500 print:text-black">Ref. No.</p>
            <p className="font-mono text-xs text-zinc-500 print:text-black">{saleData.id?.substring(0,8) || 'N/A'}</p>
          </div>
        </div>

        {/* 5. TAX SUMMARY TABLE */}
        {hasGst && (
          <div className="px-2 mb-8 print:mb-4 avoid-break">
            <p className="text-[11px] font-bold text-zinc-800 mb-3 print:mb-1">Tax Summary</p>
            
            <div className="grid grid-cols-[1fr_1fr_auto] gap-y-2 text-sm print:text-[10px] border-b border-zinc-200 print:border-black pb-2 mb-2 print:pb-1 print:mb-1">
              <div className="font-bold text-zinc-900">Tax</div>
              <div className="font-bold text-zinc-900">Rate</div>
              <div className="font-bold text-zinc-900 text-right">Tax Amount</div>
            </div>

            <div className="flex flex-col gap-2 print:gap-1 text-[13px] print:text-[10px] text-zinc-600 print:text-black mb-4 print:mb-2">
              {sortedTaxRates.map((tax, idx) => (
                <div key={`cgst-${idx}`} className="grid grid-cols-[1fr_1fr_auto]">
                  <div>CGST</div>
                  <div>{tax.rate.toFixed(2)}%</div>
                  <div className="text-right font-medium">₹{tax.amount.toFixed(2)}</div>
                </div>
              ))}
              {sortedTaxRates.map((tax, idx) => (
                <div key={`sgst-${idx}`} className="grid grid-cols-[1fr_1fr_auto]">
                  <div>SGST</div>
                  <div>{tax.rate.toFixed(2)}%</div>
                  <div className="text-right font-medium">₹{tax.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-sm print:text-xs pt-2 border-t border-zinc-200 print:border-black font-black">
              <p className="text-zinc-900">Total Amount Paid</p>
              <p className="text-zinc-900">₹{saleData.total_amount?.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex flex-col gap-1 items-center mt-10 print:mt-6 print:text-black avoid-break">
          <p>Thank you for shopping at {displayName}</p>
          <p className="print:text-[8px]">This is a computer generated receipt.</p>
        </div>
      </motion.main>

      {/* TRENDING LOOP - HIDDEN IN PRINT */}
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

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={handlePrint}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-90 transition-all print:hidden"
      >
        <Download className="w-5 h-5" />
      </button>

      {/* 🔥 THE THERMAL PRINT MAGIC SPELL */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { 
            margin: 0; 
            size: 80mm auto; 
          } 
          html, body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-container {
            width: 80mm !important;
            max-width: 80mm !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            color: black !important;
          }
          * {
            color: black !important;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
        }
      `}} />

    </div>
  );
}
