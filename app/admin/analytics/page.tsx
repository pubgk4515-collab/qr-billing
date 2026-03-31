'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ActivityIcon, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 🎯 Dono data Server Actions se aayenge (No Vercel Env Errors!)
import { getStoreData } from '../../actions/adminActions'; 
import { getSalesData } from '../../actions/billingActions'; 

export default function AdminAnalyticsPage() {
  const router = useRouter();

  // 📦 Data States
  const [data, setData] = useState<{ qrTags: any[], sales: any[] }>({ qrTags: [], sales: [] });
  const [loading, setLoading] = useState(true);

  // Load fresh data securely from SERVER
  async function loadData() {
    setLoading(true);
    try {
      // Parallel server fetching - Super fast & Secure
      const [storeRes, salesRes] = await Promise.all([
        getStoreData(),
        getSalesData()
      ]);

      if (storeRes.success && salesRes.success) {
        setData({ 
          qrTags: storeRes.qrTags || [],
          sales: salesRes.sales || []
        });
      } else {
        alert(`❌ Error: ${salesRes.message || storeRes.message || 'Database issue'}`);
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      alert("❌ Critical Fetch Error");
    } finally {
      setLoading(false);
    }
  }

  // 🚀 Component mount hote hi data load karo (No PIN required)
  useEffect(() => {
    loadData();
  }, []);

  // ========================================================
  // 📊 BULLETPROOF BUSINESS ANALYTICS CALCULATIONS
  // ========================================================
  
  // 1. Gross Revenue
  const totalRevenue = data.sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  
  // 2. Total Items Sold
  const totalItemsSold = data.sales.reduce((sum, sale) => sum + Number(sale.items_count || 0), 0);
  
  // 3. Average Order Value
  const averageOrderValue = data.sales.length > 0 ? Math.round(totalRevenue / data.sales.length) : 0;
  
  // 4. Inventory Value
  const unsoldItemsList = data.qrTags.filter(t => t.products && t.status !== 'sold');
  const potentialRevenue = unsoldItemsList.reduce((sum, tag) => sum + Number(tag.products?.price || 0), 0);
  
  // 5. Mock Scans (Placeholder)
  const mockTotalScans = totalItemsSold > 0 ? (totalItemsSold * 3 + 12) : 0; 
  const dropOffRate = mockTotalScans > 0 ? Math.round(((mockTotalScans - totalItemsSold) / mockTotalScans) * 100) : 0;

  // ==========================================
  // 🟢 THE PREMIUM ANALYTICS DASHBOARD
  // ==========================================
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      <header className="px-6 pt-12 pb-6 sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="bg-zinc-900 p-3 rounded-full border border-white/5 hover:bg-zinc-800 transition active:scale-95">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <div>
              <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
                <ActivityIcon className="w-9 h-9 text-emerald-400" strokeWidth={2.5}/> Analytics
              </h1>
              <p className="text-zinc-500 text-sm font-medium">Real-time business performance overview.</p>
            </div>
          </div>
          {/* Unlock button removed from here */}
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-center text-zinc-600 gap-4">
             <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
             <p className="font-mono text-sm">Loading business data...</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            <div className="col-span-2 md:col-span-4 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
              <div className="flex justify-between items-start mb-1 z-10 relative">
                <p className="text-emerald-400/80 text-xs font-black uppercase tracking-widest">Gross Revenue</p>
                <p className="text-emerald-400 font-bold mb-1 text-sm">INR</p>
              </div>
              <p className="text-7xl font-black text-white tracking-tighter z-10 relative">
                ₹{totalRevenue.toLocaleString()}
              </p>
            </div>

            <div className="col-span-1 bg-zinc-900/50 backdrop-blur-3xl border border-white/5 p-7 rounded-[2.5rem] shadow-xl">
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Items Sold</p>
              <p className="text-4xl font-black text-white tracking-tight">{totalItemsSold}</p>
            </div>

            <div className="col-span-1 bg-zinc-900/50 backdrop-blur-3xl border border-white/5 p-7 rounded-[2.5rem] shadow-xl">
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Avg. Order</p>
              <p className="text-4xl font-black text-white tracking-tight">₹{averageOrderValue.toLocaleString()}</p>
            </div>

            <div className="col-span-2 bg-white/5 border border-white/10 p-7 rounded-[2.5rem] shadow-xl flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full"></div>
                <div className="z-10 relative">
                    <p className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">Scan Drop-off</p>
                    <div className="flex items-end gap-2">
                        <p className="text-4xl font-black text-white tracking-tight">{dropOffRate}%</p>
                        <p className="text-zinc-500 text-sm font-medium mb-1.5">didn't buy</p>
                    </div>
                </div>
                <div className="text-right z-10 relative">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Total Scans</p>
                    <p className="text-2xl font-bold text-white font-mono">{mockTotalScans}</p>
                </div>
            </div>

            <div className="col-span-2 bg-blue-500/5 border border-blue-500/10 p-7 rounded-[2.5rem] flex justify-between items-center shadow-xl">
                <div>
                    <p className="text-blue-400/80 text-xs font-black uppercase tracking-widest mb-2">Inventory Value</p>
                    <p className="text-zinc-400 text-sm font-medium">Unsold in-stock items</p>
                </div>
                <p className="text-3xl font-black text-blue-400 tracking-tighter">₹{potentialRevenue.toLocaleString()}</p>
            </div>

          </motion.div>
        )}
      </div>

    </main>
  );
}
