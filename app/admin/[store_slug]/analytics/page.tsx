'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BarChart3, Eye, ShoppingBag, 
  TrendingUp, AlertTriangle, Activity, Loader2,
  Lock, Zap, ShieldAlert, ChevronRight, Crown,
  Users, MessageCircle, Percent, Crosshair
} from 'lucide-react';

export default function StoreAnalytics({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // DEV MODE: Plan Switcher (starter, growth, pro)
  const [currentPlan, setCurrentPlan] = useState<'starter' | 'growth' | 'pro'>('starter');

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  
  // Analytics States
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [lostRevenue, setLostRevenue] = useState(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [dropoffProducts, setDropoffProducts] = useState<any[]>([]);
  const [aiAlerts, setAiAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!safeStoreSlug) return;

    async function fetchAnalytics() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (!store) return;
        setStoreData(store);

        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, items_count, purchased_items')
          .eq('store_id', store.id)
          .eq('payment_status', 'completed');

        let revenue = 0;
        let itemsSold = 0;
        if (sales) {
          sales.forEach(sale => {
            revenue += Number(sale.total_amount || 0);
            itemsSold += Number(sale.items_count || 0);
          });
        }
        setTotalRevenue(revenue);
        setTotalSales(itemsSold);

        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, size, image_url, scan_count')
          .eq('store_id', store.id);

        let scans = 0;
        let totalLostValue = 0;

        if (products) {
          products.forEach(p => {
            const productScans = Number(p.scan_count || 0);
            scans += productScans;
            const estimatedDropoffs = Math.max(0, productScans - Math.floor(itemsSold / products.length));
            totalLostValue += estimatedDropoffs * Number(p.price || 0);
          });
          
          setTotalScans(scans);
          setLostRevenue(totalLostValue);

          const sortedByScans = [...products].sort((a, b) => (b.scan_count || 0) - (a.scan_count || 0));
          setDropoffProducts(sortedByScans.slice(0, 3));
          setTopProducts(sortedByScans.slice(0, 3)); 
        }

        const { data: alerts } = await supabase
          .from('system_alerts')
          .select('*')
          .limit(3);
        if (alerts) setAiAlerts(alerts);

      } catch (err) {
        console.error("Analytics Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [safeStoreSlug]);

  const themeColor = storeData?.theme_color || '#10b981';
  const conversionRate = totalScans > 0 ? ((totalSales / totalScans) * 100).toFixed(1) : '0.0';

  // --- REUSABLE LOCKED OVERLAY COMPONENT ---
  const LockedOverlay = ({ title, planRequired, price }: { title: string, planRequired: string, price: string }) => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0A0A0A]/70 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
        <Lock className="w-6 h-6 text-zinc-300" />
      </div>
      <h3 className="text-xl font-black text-white mb-1">{title}</h3>
      <p className="text-xs text-zinc-400 font-bold mb-6 max-w-[200px] leading-relaxed">Upgrade to <span className="text-white">{planRequired}</span> to unlock these powerful retail insights.</p>
      <button 
        className="px-6 py-3 rounded-full font-black text-sm text-black flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        style={{ backgroundColor: themeColor }}
      >
        <Crown className="w-4 h-4" />
        Unlock for ₹{price}/mo
      </button>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-32 selection:bg-white/10">
      
      {/* 👑 PREMIUM HEADER */}
      <header className="bg-[#0A0A0A]/80 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: themeColor }} /> Intelligence
              </h1>
            </div>
          </div>
          
          {/* DEV TOGGLE - TO SHOW DEMO TO CLIENTS */}
          <select 
            value={currentPlan}
            onChange={(e: any) => setCurrentPlan(e.target.value)}
            className="bg-white/10 border border-white/10 text-xs font-bold rounded-lg px-3 py-2 outline-none text-emerald-400"
          >
            <option value="starter">Mode: Starter</option>
            <option value="growth">Mode: Growth</option>
            <option value="pro">Mode: Pro Elite</option>
          </select>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 flex flex-col gap-6">
        
        {/* 📊 TIER 1: BASIC STATS (Unlocked for all) */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0A0A0A] p-5 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full" />
            <TrendingUp className="w-5 h-5 mb-3 text-zinc-400" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Total Revenue</p>
            <h2 className="text-2xl font-black tracking-tighter mt-1 text-white">₹{totalRevenue.toLocaleString('en-IN')}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0A0A0A] p-5 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden">
            <ShoppingBag className="w-5 h-5 mb-3 text-emerald-400" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Items Sold</p>
            <h2 className="text-2xl font-black tracking-tighter mt-1 text-white">{totalSales}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#0A0A0A] p-5 rounded-[2rem] border border-white/5 shadow-xl">
            <Eye className="w-5 h-5 mb-3 text-blue-400" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Store Scans</p>
            <h2 className="text-2xl font-black tracking-tighter mt-1 text-white">{totalScans}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#0A0A0A] p-5 rounded-[2rem] border border-white/5 shadow-xl">
            <Zap className="w-5 h-5 mb-3 text-amber-400" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Conversion</p>
            <h2 className="text-2xl font-black tracking-tighter mt-1 text-white">{conversionRate}%</h2>
          </motion.div>
        </div>

        {/* ⚠️ TIER 2: LOST REVENUE & DROP-OFFS (Growth & Pro) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="relative bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
          
          {currentPlan === 'starter' && <LockedOverlay title="Revenue Radar" planRequired="Growth Plan" price="3,999" />}

          <div className={currentPlan === 'starter' ? 'opacity-20 blur-md pointer-events-none select-none' : ''}>
            <div className="flex flex-col mb-6 bg-red-500/5 p-5 rounded-3xl border border-red-500/20 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-500/10 blur-3xl rounded-full" />
              <p className="text-[10px] uppercase tracking-widest text-red-400 font-black flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3 h-3" /> Money Leaving Store
              </p>
              <h3 className="text-zinc-400 font-bold text-sm">Estimated Revenue Lost</h3>
              <h2 className="text-5xl font-black tracking-tighter text-white mt-1">₹{lostRevenue.toLocaleString('en-IN')}</h2>
              <p className="text-xs text-zinc-500 font-bold mt-3 leading-relaxed">Customers scanned these items but walked out without buying.</p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black tracking-tight text-white">High Drop-off Products</h3>
              {/* ACTION TRIGGER */}
              <button className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Percent className="w-3 h-3" /> Auto-Discount
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {dropoffProducts.map((product, i) => (
                <div key={i} className="bg-[#111] p-3 rounded-2xl border border-white/5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl overflow-hidden shrink-0 border border-white/5">
                    {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-white">{product.name || 'Unnamed'}</h4>
                    <p className="text-[11px] font-bold text-red-400 mt-1">{product.scan_count} Scans • 0 Sales</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 👑 TIER 3: VIP CHURN & AI COMMAND CENTER (Pro Elite Only) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="relative bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
          
          {(currentPlan === 'starter' || currentPlan === 'growth') && <LockedOverlay title="AI Consumer Engine" planRequired="Pro Elite" price="5,999" />}

          <div className={(currentPlan === 'starter' || currentPlan === 'growth') ? 'opacity-20 blur-md pointer-events-none select-none' : ''}>
            
            {/* VIP CHURN MODULE */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border border-amber-500/30 bg-amber-500/10">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white">VIP Churn Radar</h3>
                    <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Predictive Intelligence</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#111] p-4 rounded-2xl border border-white/5">
                <p className="text-sm font-bold text-white leading-relaxed">
                  <span className="text-amber-400 font-black">12 Premium Customers</span> haven't visited in 30 days. Estimated potential loss: <span className="text-red-400">₹45,000</span>.
                </p>
                {/* ACTION TRIGGER */}
                <button className="mt-4 w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 transition-colors">
                  <MessageCircle className="w-4 h-4 text-emerald-400" /> Send "Miss You" Discount via WhatsApp
                </button>
              </div>
            </div>

            <div className="border-t border-white/5 w-full my-6" />

            {/* AI ANALYST MODULE */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center border border-indigo-500/30 bg-indigo-500/10">
                  <ShieldAlert className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">Deep Analyst AI</h3>
                  <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Live Anomaly Detection</p>
                </div>
              </div>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {aiAlerts.length > 0 ? aiAlerts.map((alert, i) => (
                <div key={i} className="bg-gradient-to-r from-indigo-500/10 to-transparent p-4 rounded-2xl border-l-2 border-indigo-500 border-y border-r border-white/5">
                  <h4 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                    <Crosshair className="w-3 h-3 text-indigo-400" /> {alert.title}
                  </h4>
                  <p className="text-xs font-bold text-zinc-400 leading-relaxed pl-5">{alert.description}</p>
                </div>
              )) : (
                <div className="bg-[#111] p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-xs font-bold text-zinc-500">System is secure. No anomalies detected.</p>
                </div>
              )}
            </div>

          </div>
        </motion.div>

      </main>
    </div>
  );
}
