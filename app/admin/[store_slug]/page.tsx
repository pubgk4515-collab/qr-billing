'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, CheckCircle2, Clock, Loader2, IndianRupee, Package, BarChart3, Plus, Smartphone, Zap, X, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  const [storeData, setStoreData] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [manualTag, setManualTag] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  useEffect(() => {
    if (!safeStoreSlug) return;
    async function fetchStoreAndOrders() {
      try {
        const { data: store, error: storeError } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (storeError || !store) throw storeError;
        setStoreData(store);
        fetchPendingOrders(store.id);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStoreAndOrders();
  }, [safeStoreSlug]);

  const fetchPendingOrders = async (storeId: string) => {
    const { data } = await supabase.from('sales').select('*').eq('store_id', storeId).eq('payment_status', 'pending').order('created_at', { ascending: false });
    if (data) setPendingOrders(data);
  };

  useEffect(() => {
    if (!storeData?.id) return;
    const interval = setInterval(() => fetchPendingOrders(storeData.id), 5000);
    return () => clearInterval(interval);
  }, [storeData?.id]);

  const handleApprovePayment = async (orderId: string) => {
    try {
      const { error } = await supabase.from('sales').update({ payment_status: 'completed' }).eq('id', orderId);
      if (error) throw error;
      setPendingOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (err) {
      alert("Failed to approve payment.");
    }
  };

  const themeColor = storeData?.theme_color || '#10b981';

  if (loading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-8 h-8 text-zinc-600 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24 overflow-x-hidden relative">
      
      {/* 👑 HEADER */}
      <header className="bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10" style={{ backgroundColor: `${themeColor}15` }}>
              <Store className="w-5 h-5" style={{ color: themeColor }} />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight leading-none">{storeData?.store_name}</h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-1 flex items-center gap-2">
                Command Center <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
              </p>
            </div>
          </div>
          
          {/* Inventory Button */}
          <Link href={`/admin/${safeStoreSlug}/inventory`} className="px-4 py-2 bg-[#111] hover:bg-white/5 border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: themeColor }} />
            Inventory
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">

        {/* 📊 MINI STATS & APPLE-STYLE TRIGGER */}
        <div 
          onClick={() => setIsStatsOpen(true)}
          className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 cursor-pointer hover:border-white/10 transition-all group relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" style={{ backgroundColor: `${themeColor}10` }} />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Today's Revenue</p>
              <h2 className="text-4xl font-black tracking-tighter flex items-center gap-1">
                <IndianRupee className="w-7 h-7 text-zinc-400" /> 12,450
              </h2>
            </div>
            <div className="w-12 h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-4 font-medium flex items-center gap-1">
            <span style={{ color: themeColor }}>+14%</span> from yesterday • Tap to view deep analytics
          </p>
        </div>

        {/* 🛒 MANUAL CART CREATOR */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-yellow-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest">Manual Checkout</h3>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" placeholder="Enter Tag ID (e.g. TAG001)" 
                value={manualTag} onChange={e => setManualTag(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-mono focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="flex-1 relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="tel" placeholder="Customer Phone" 
                value={manualPhone} onChange={e => setManualPhone(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20"
              />
            </div>
            <button className="bg-white text-black font-black px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 active:scale-95 transition-all whitespace-nowrap">
              <Plus className="w-4 h-4" /> Create Bill
            </button>
          </div>
        </div>

        {/* 🔴 LIVE QUEUE & ONLINE ALERTS */}
        <div>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-xl font-black">Live Action Queue</h2>
            <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-zinc-300">{pendingOrders.length} Pending</span>
          </div>

          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {pendingOrders.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-[#0A0A0A] rounded-[2rem] border border-white/5">
                  <CheckCircle2 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">All clear! No pending payments.</p>
                </motion.div>
              ) : (
                pendingOrders.map((order) => (
                  <motion.div 
                    key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
                    className="bg-[#111] border border-white/5 rounded-[1.5rem] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
                  >
                    {/* Glowing side bar based on payment type */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: order.payment_method === 'ONLINE' ? '#3B82F6' : themeColor }} />

                    <div className="flex-1 pl-3">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded ${order.payment_method === 'ONLINE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                          {order.payment_method}
                        </span>
                        {order.customer_phone && (
                          <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                            <Smartphone className="w-3 h-3" /> {order.customer_phone}
                          </span>
                        )}
                      </div>
                      <h3 className="font-mono text-xl font-black text-white">{order.cart_id}</h3>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                      <div>
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500 block mb-0.5">Amount</span>
                        <span className="text-xl font-black">₹{order.total_amount}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleApprovePayment(order.id)}
                        className="px-6 py-3 rounded-xl font-black text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                        style={{ backgroundColor: order.payment_method === 'ONLINE' ? '#3B82F6' : themeColor }}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>

      {/* 🍏 APPLE-STYLE DEEP ANALYTICS MODAL */}
      <AnimatePresence>
        {isStatsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ y: "100%", scale: 0.9 }} animate={{ y: 0, scale: 1 }} exit={{ y: "100%", scale: 0.9 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#0a0a0a] w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(255,255,255,0.05)] overflow-hidden relative"
            >
              {/* Top Handle for mobile */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2 md:hidden" />
              
              <button onClick={() => setIsStatsOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10">
                <X className="w-5 h-5 text-zinc-400" />
              </button>

              <div className="p-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-3xl font-black tracking-tight mb-2">Store Intelligence</h2>
                <p className="text-sm text-zinc-400 mb-8">Your empire's performance at a glance.</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Sales</p>
                    <p className="text-2xl font-black text-white">482</p>
                  </div>
                  <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Avg. Order Value</p>
                    <p className="text-2xl font-black text-white flex items-center"><IndianRupee className="w-4 h-4" /> 1,240</p>
                  </div>
                  <div className="bg-[#111] border border-white/5 p-5 rounded-2xl col-span-2 relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10">
                       <MessageCircle className="w-24 h-24" />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">WhatsApp Bills Sent</p>
                    <p className="text-4xl font-black" style={{ color: themeColor }}>390</p>
                  </div>
                </div>

                <button onClick={() => setIsStatsOpen(false)} className="w-full mt-8 bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-colors">
                  Close Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
