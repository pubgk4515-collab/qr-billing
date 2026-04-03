'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, CheckCircle2, Clock, Loader2, IndianRupee } from 'lucide-react';

export default function AdminDashboard({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  const [storeData, setStoreData] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // 1. Dukaan ka data aur Theme color laao
  useEffect(() => {
    if (!safeStoreSlug) return;

    async function fetchStoreAndOrders() {
      try {
        // Store Details
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', safeStoreSlug)
          .single();

        if (storeError || !store) throw storeError;
        setStoreData(store);

        // Initial Pending Orders fetch
        fetchPendingOrders(store.id);

      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStoreAndOrders();
  }, [safeStoreSlug]);

  // 2. Pending Orders laane ka function
  const fetchPendingOrders = async (storeId: string) => {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) setPendingOrders(data);
  };

  // 3. LIVE POLLING (Har 5 second me naye orders check karega)
  useEffect(() => {
    if (!storeData?.id) return;
    
    const interval = setInterval(() => {
      fetchPendingOrders(storeData.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [storeData?.id]);

  // 4. THE MAGIC BUTTON: Approve Payment
  const handleApprovePayment = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ payment_status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;

      // Approve hote hi list se hata do
      setPendingOrders(prev => prev.filter(order => order.id !== orderId));
      
    } catch (err) {
      console.error("Approval failed:", err);
      alert("Failed to approve payment. Please try again.");
    }
  };

  const themeColor = storeData?.theme_color || '#10b981';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      
      {/* 👑 PREMIUM WHITE-LABELED HEADER */}
      <header className="bg-[#111] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {storeData?.logo_url ? (
              <img src={storeData.logo_url} alt="Logo" className="w-10 h-10 rounded-full border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                <Store className="w-5 h-5" style={{ color: themeColor }} />
              </div>
            )}
            <div>
              <h1 className="font-black text-xl tracking-tight">{storeData?.store_name}</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Command Center</p>
            </div>
          </div>
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-black mb-2">Live Queue</h2>
          <p className="text-sm text-zinc-400">Waiting for your approval.</p>
        </div>

        {/* 📦 PENDING ORDERS LIST */}
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {pendingOrders.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-20 bg-[#111] rounded-[2rem] border border-white/5 border-dashed"
              >
                <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium">No pending payments.</p>
              </motion.div>
            ) : (
              pendingOrders.map((order) => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#111] border border-white/10 rounded-[1.5rem] p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg relative overflow-hidden"
                >
                  {/* Subtle left border glow */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 opacity-50" style={{ backgroundColor: themeColor }} />

                  <div className="flex-1 flex flex-col gap-1 pl-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                      Pending Approval
                    </span>
                    <h3 className="font-mono text-2xl font-black text-white">{order.cart_id}</h3>
                    <p className="text-sm text-zinc-400">
                      {order.items_count} {order.items_count === 1 ? 'item' : 'items'} • {order.payment_method}
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 block mb-1">Amount</span>
                      <span className="text-2xl font-black flex items-center gap-1">
                        <IndianRupee className="w-5 h-5 text-zinc-400" />
                        {order.total_amount}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleApprovePayment(order.id)}
                      className="px-8 py-4 rounded-xl font-black text-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                      style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${themeColor}` }}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Approve
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}
