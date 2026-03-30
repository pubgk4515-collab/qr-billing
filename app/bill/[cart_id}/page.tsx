// app/bill/[cart_id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, Share2, ReceiptText, ChevronLeft, MapPin, CheckCircle2 } from 'lucide-react';
import { getSaleByCartId } from '../../actions/billingActions';

export default function DigitalBillPage() {
  const params = useParams();
  const router = useRouter();
  const cartId = params.cart_id as string;
  
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBill() {
      if (!cartId) return;
      try {
        const res = await getSaleByCartId(cartId);
        if (res.success && res.data) {
          setOrderData(res.data);
        } else {
          setError('Bill not found or invalid Link.');
        }
      } catch (err) {
        setError('Error fetching the bill.');
      } finally {
        setLoading(false);
      }
    }
    fetchBill();
  }, [cartId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${cartId}`,
          text: `Here is my digital receipt for order ${cartId}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      alert("Sharing not supported on this browser. You can copy the link!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 animate-pulse">Generating your premium receipt...</p>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <ReceiptText className="w-16 h-16 text-zinc-700 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Oops!</h1>
        <p className="text-zinc-500">{error}</p>
        <button onClick={() => router.push('/')} className="mt-8 text-emerald-400 font-bold hover:underline">
          Return to Store
        </button>
      </div>
    );
  }

  // Format Date
  const billDate = new Date(orderData.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans py-10 px-4 md:px-0 flex flex-col items-center relative overflow-hidden print:bg-white print:text-black print:py-0">
      
      {/* Background Ambient Glow (Hides on Print) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none print:hidden" />

      {/* Top Nav (Hides on Print) */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 relative z-10 print:hidden">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <p className="font-bold text-zinc-500 tracking-widest uppercase text-xs">Digital Receipt</p>
        <div className="w-11" /> {/* Spacer for centering */}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden relative z-10 print:shadow-none print:border-none print:bg-white print:rounded-none"
      >
        {/* BILL HEADER */}
        <div className="p-8 text-center border-b border-dashed border-zinc-700 print:border-zinc-300">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center print:bg-zinc-100 border border-zinc-200">
            {/* Store Logo Placeholder - Replace with actual logo if needed */}
            <span className="text-2xl font-black text-black tracking-tighter">SME</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1 text-white print:text-black">PREMIUM STORE</h1>
          <p className="text-xs text-zinc-400 flex items-center justify-center gap-1 print:text-zinc-600">
            <MapPin className="w-3 h-3" /> Rampurhat, West Bengal
          </p>
        </div>

        {/* BILL INFO */}
        <div className="p-8 bg-black/20 print:bg-transparent">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1 print:text-zinc-400">Order ID</p>
              <p className="font-mono text-sm font-bold text-emerald-400 print:text-black">{cartId}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1 print:text-zinc-400">Date & Time</p>
              <p className="text-xs text-zinc-300 font-medium print:text-zinc-700">{billDate}</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-8 pb-6 border-b border-dashed border-zinc-700 print:border-zinc-300">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center print:bg-zinc-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 print:text-black" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest print:text-zinc-400">Status</p>
                <p className="text-xs font-bold text-emerald-400 print:text-black">Payment Completed</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest print:text-zinc-400">Method</p>
              <p className="text-xs font-bold text-white uppercase print:text-black">{orderData.payment_method}</p>
            </div>
          </div>

          {/* ITEMS LIST */}
          <div className="mb-6">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-4 print:text-zinc-400">Purchased Items ({orderData.items_count})</p>
            <div className="space-y-4">
              {orderData.purchased_items && orderData.purchased_items.map((item: any, idx: number) => {
                const product = item.products || item;
                return (
                  <div key={idx} className="flex justify-between items-start group">
                    <div className="flex items-start gap-3">
                      <p className="text-zinc-500 font-mono text-xs mt-0.5 print:text-zinc-400">{idx + 1}.</p>
                      <div>
                        <p className="font-bold text-sm text-zinc-200 group-hover:text-white transition-colors print:text-black">{product.name || 'Premium Item'}</p>
                        <p className="text-[10px] text-zinc-600 font-mono mt-0.5 print:text-zinc-500">TAG: {item.id}</p>
                      </div>
                    </div>
                    <p className="font-bold text-sm text-white print:text-black">₹{product.price || 0}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TOTALS */}
          <div className="pt-6 border-t border-zinc-800 print:border-zinc-300">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-zinc-400 print:text-zinc-600">Subtotal</p>
              <p className="text-xs font-bold text-zinc-300 print:text-zinc-800">₹{orderData.total_amount}</p>
            </div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-xs text-zinc-400 print:text-zinc-600">Tax</p>
              <p className="text-xs font-bold text-zinc-300 print:text-zinc-800">₹0.00</p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-dashed border-zinc-700 print:border-zinc-300">
              <p className="text-sm uppercase font-black tracking-widest text-white print:text-black">Grand Total</p>
              <p className="text-2xl font-black text-emerald-400 print:text-black">₹{orderData.total_amount}</p>
            </div>
          </div>
        </div>

        {/* FOOTER BARCODE */}
        <div className="p-8 bg-zinc-950 text-center border-t border-zinc-800 print:bg-white print:border-t-0">
          <div className="w-full h-12 bg-zinc-800 rounded-md mb-4 overflow-hidden opacity-50 flex items-center justify-between px-2 print:bg-zinc-200 print:opacity-100">
             {/* Fake barcode lines for aesthetic */}
             {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="h-full bg-zinc-500 print:bg-black" style={{ width: `${Math.random() * 4 + 1}px` }}></div>
             ))}
          </div>
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1 print:text-zinc-600">Thank you for shopping</p>
          <p className="text-xs text-zinc-600 print:text-zinc-500">Visit again!</p>
        </div>
      </motion.div>

      {/* ACTION BUTTONS (Hides on Print) */}
      <div className="w-full max-w-md mt-6 flex gap-3 relative z-10 print:hidden">
        <button 
          onClick={handlePrint}
          className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition"
        >
          <Download className="w-4 h-4" /> Save PDF
        </button>
        <button 
          onClick={handleShare}
          className="flex-1 bg-emerald-500 text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition"
        >
          <Share2 className="w-4 h-4" /> Share Bill
        </button>
      </div>

    </main>
  );
}
