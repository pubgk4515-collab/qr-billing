'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, Receipt, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function BillPage({ params }: { params: Promise<{ store_slug: string, cart_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug, cart_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [saleData, setSaleData] = useState<any>(null);

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();
  const safeCartId = decodeURIComponent(cart_id || '').toUpperCase().trim();

  useEffect(() => {
    if (!safeStoreSlug || !safeCartId) return;
    
    async function fetchBillData() {
      try {
        // 1. Fetch Store Data
        const { data: store } = await supabase
          .from('stores')
          .select('store_name, theme_color, whatsapp_number') 
          .ilike('slug', safeStoreSlug)
          .single();
          
        if (store) setStoreData(store);

        // 2. Fetch Sales/Order Data
        const { data: sale, error } = await supabase
          .from('sales') 
          .select('*')
          .eq('cart_id', safeCartId)
          .single();

        if (sale) {
          setSaleData(sale);
        } else if (error) {
          console.error("Sale not found:", error);
        }
      } catch (err) {
        console.error("Error fetching bill:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBillData();
  }, [safeCartId, safeStoreSlug]);

  const handlePrint = () => {
    window.print();
  };

  const themeColor = storeData?.theme_color || '#10b981'; 
  // Parse items from JSON if available, otherwise fallback to empty array
  const items = saleData?.items ? (typeof saleData.items === 'string' ? JSON.parse(saleData.items) : saleData.items) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Fetching Invoice</p>
      </div>
    );
  }

  if (!saleData) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4 p-6 text-center">
        <Receipt className="w-16 h-16 text-zinc-700 mb-2" />
        <h1 className="text-2xl font-black text-white">Invoice Not Found</h1>
        <p className="text-zinc-500 text-sm">We couldn't find the bill for this Order ID.</p>
        <button onClick={() => router.push(`/${safeStoreSlug}/cart`)} className="mt-4 text-[#10b981] font-bold">Return to Store</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex justify-center p-4 md:p-8 font-sans">
      
      <div className="w-full max-w-md relative z-10 print:max-w-full print:bg-white print:text-black print:p-0">
        
        {/* Non-printable Back Button */}
        <button onClick={() => router.push(`/${safeStoreSlug}/cart`)} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors print:hidden">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-wider">Back to Store</span>
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl print:bg-white print:border-none print:shadow-none print:rounded-none"
        >
          {/* Receipt Header */}
          <div className="p-8 text-center border-b border-dashed border-zinc-800 print:border-zinc-300 relative">
            {/* Glow effect (hidden in print) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent blur-xl print:hidden" style={{ backgroundImage: `linear-gradient(to bottom, ${themeColor}20, transparent)` }} />
            
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center border-2 print:border-black" style={{ borderColor: themeColor }}>
               <Receipt className="w-8 h-8 print:text-black" style={{ color: themeColor }} />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight print:text-black">{storeData?.store_name || 'Store'}</h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1 print:text-zinc-700">Tax Invoice / E-Receipt</p>
          </div>

          {/* Order Details */}
          <div className="p-6 md:p-8 space-y-6 print:p-4">
            
            <div className="flex justify-between items-center text-sm print:text-black">
              <div className="space-y-1">
                <p className="text-zinc-500 font-medium text-xs uppercase tracking-wider print:text-zinc-600">Order ID</p>
                <p className="text-white font-black print:text-black">{safeCartId}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-zinc-500 font-medium text-xs uppercase tracking-wider print:text-zinc-600">Date</p>
                <p className="text-white font-black print:text-black">
                  {new Date(saleData.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-dashed border-t border-dashed border-zinc-800 print:border-zinc-300" />

            {/* Items List */}
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-600 print:text-zinc-800">
                <span>Item</span>
                <span>Price</span>
              </div>
              
              {items.length > 0 ? items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="text-zinc-300 font-medium print:text-black max-w-[70%]">
                    {item.name}
                    {item.quantity && <span className="text-zinc-500 text-xs ml-2 print:text-zinc-600">x{item.quantity}</span>}
                  </div>
                  <div className="text-white font-bold font-mono print:text-black">₹{item.price}</div>
                </div>
              )) : (
                <div className="text-center text-sm text-zinc-500 italic">Items grouped in total</div>
              )}
            </div>

            <div className="w-full h-px bg-dashed border-t border-dashed border-zinc-800 print:border-zinc-300" />

            {/* Total */}
            <div className="flex justify-between items-center bg-black/50 p-4 rounded-2xl border border-white/5 print:bg-zinc-100 print:border-none">
              <span className="text-sm font-black uppercase tracking-widest text-zinc-400 print:text-zinc-600">Grand Total</span>
              <span className="text-2xl font-black text-white print:text-black" style={{ color: themeColor }}>₹{saleData.total_amount || 0}</span>
            </div>
            
            <p className="text-center text-xs text-zinc-600 font-medium pt-4 print:text-zinc-800">
              Thank you for your purchase! <br/> Visit again.
            </p>
          </div>
        </motion.div>

        {/* Print / Download Action */}
        <button 
          onClick={handlePrint}
          className="w-full mt-6 bg-white text-black font-black text-lg py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all print:hidden shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          <Download className="w-6 h-6" />
          Download Receipt
        </button>
          
      </div>
    </div>
  );
}
