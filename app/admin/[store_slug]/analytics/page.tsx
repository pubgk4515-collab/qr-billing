'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BarChart3, Eye, ShoppingBag, 
  TrendingUp, AlertTriangle, Activity, Loader2,
  Lock, Zap, Users, Clock, MapPin, Crown, Target
} from 'lucide-react';

export default function StoreAnalytics({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // DEV MODE: Plan Switcher (starter, growth, pro)
  const [currentPlan, setCurrentPlan] = useState<'starter' | 'growth' | 'pro'>('pro');

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  
  // Advanced Analytics States
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [lostRevenue, setLostRevenue] = useState(0);
  
  // CRM States (Repeat vs New)
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [repeatCustomers, setRepeatCustomers] = useState(0);
  
  const [dropoffProducts, setDropoffProducts] = useState<any[]>([]);
  const [peakHour, setPeakHour] = useState('N/A');

  useEffect(() => {
    if (!safeStoreSlug) return;

    async function fetchAnalytics() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (!store) return;
        setStoreData(store);

        // Fetch Sales & Extract CRM Data
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, items_count, customer_phone, created_at')
          .eq('store_id', store.id)
          .eq('payment_status', 'completed');

        let revenue = 0;
        let itemsSold = 0;
        const phoneMap = new Map<string, number>();
        const hourCounts = new Array(24).fill(0);

        if (sales) {
          sales.forEach(sale => {
            revenue += Number(sale.total_amount || 0);
            itemsSold += Number(sale.items_count || 0);
            
            // CRM Logic: Count frequencies of phone numbers
            if (sale.customer_phone) {
              const count = phoneMap.get(sale.customer_phone) || 0;
              phoneMap.set(sale.customer_phone, count + 1);
            }

            // Peak Hour Logic
            if (sale.created_at) {
              const hour = new Date(sale.created_at).getHours();
              hourCounts[hour]++;
            }
          });
        }
        
        setTotalRevenue(revenue);
        setTotalSales(itemsSold);
        
        setTotalCustomers(phoneMap.size);
        let repeat = 0;
        phoneMap.forEach(count => { if (count > 1) repeat++; });
        setRepeatCustomers(repeat);

        const maxHourIndex = hourCounts.indexOf(Math.max(...hourCounts));
        const ampm = maxHourIndex >= 12 ? 'PM' : 'AM';
        const formattedHour = maxHourIndex % 12 || 12;
        if (Math.max(...hourCounts) > 0) setPeakHour(`${formattedHour}:00 ${ampm}`);

        // Fetch Products for Velocity & Drop-off
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, scan_count, image_url')
          .eq('store_id', store.id);

        let scans = 0;
        let totalLostValue = 0;

        if (products) {
          products.forEach(p => {
            const productScans = Number(p.scan_count || 0);
            scans += productScans;
            // Sophisticated Loss Calculation: Scans minus baseline conversion
            const estimatedDropoffs = Math.max(0, productScans - Math.floor(itemsSold / products.length));
            totalLostValue += estimatedDropoffs * Number(p.price || 0);
          });
          
          setTotalScans(scans);
          setLostRevenue(totalLostValue);

          const sortedByScans = [...products].sort((a, b) => (b.scan_count || 0) - (a.scan_count || 0));
          setDropoffProducts(sortedByScans.slice(0, 3));
        }

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
  const repeatRate = totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(0) : '0';

  // --- Cinematic iOS 17 Paywall Component ---
  const LockedOverlay = ({ title, planRequired, price, icon: Icon }: any) => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-6 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-5 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)] backdrop-blur-md">
          <Icon className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-xs text-zinc-400 font-bold mb-8 px-4 leading-relaxed">This data is critical for scaling. Upgrade to the <span className="text-white">{planRequired} Plan</span> to dominate your market.</p>
        <button 
          className="px-8 py-4 rounded-full font-black text-sm text-black flex items-center gap-2 transition-transform active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-105"
          style={{ backgroundColor: themeColor }}
        >
          <Crown className="w-5 h-5" />
          Unlock for ₹{price}/mo
        </button>
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-[#000000] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} /></div>;

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans pb-32 selection:bg-white/10">
      
      {/* 👑 ONE UI 8.5 x IOS 17 HEADER */}
      <header className="bg-black/70 backdrop-blur-3xl border-b border-white/5 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-3 bg-[#111] rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter leading-none text-white">OS Radar</h1>
              <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mt-1">Live Store Metrics</span>
            </div>
          </div>
          
          <select 
            value={currentPlan}
            onChange={(e: any) => setCurrentPlan(e.target.value)}
            className="bg-[#111] border border-white/10 text-xs font-bold rounded-xl px-3 py-2 outline-none text-zinc-300 focus:border-white/30 transition-colors"
          >
            <option value="starter">Starter (₹1999)</option>
            <option value="growth">Growth (₹3999)</option>
            <option value="pro">Pro Elite (₹5999)</option>
          </select>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 flex flex-col gap-6">
        
        {/* 📊 TIER 1: CORE PULSE (Starter) */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0A0A0A] p-5 rounded-[2rem] border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
            <TrendingUp className="w-5 h-5 mb-4 text-zinc-400" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Gross Volume</p>
            <h2 className="text-3xl font-black tracking-tighter mt-1 text-white">₹{totalRevenue.toLocaleString('en-IN')}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-[#0A0A0A] p-5 rounded-[2rem] border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <Zap className="w-5 h-5 mb-4 text-emerald-400" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Conversion</p>
            <div className="flex items-end gap-1 mt-1">
              <h2 className="text-3xl font-black tracking-tighter text-white">{conversionRate}</h2>
              <span className="text-sm font-bold text-zinc-500 mb-1.5">%</span>
            </div>
          </motion.div>
        </div>

        {/* ⚠️ TIER 2: FOMO ENGINE - LOST REVENUE (Growth + Pro) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
          
          {currentPlan === 'starter' && (
            <LockedOverlay title="Revenue Leakage Radar" planRequired="Growth" price="3,999" icon={Target} />
          )}

          <div className={currentPlan === 'starter' ? 'opacity-20 blur-xl pointer-events-none' : ''}>
            <div className="flex flex-col mb-6 bg-[#1A0505] p-5 rounded-3xl border border-red-500/10 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-red-500/10 blur-3xl rounded-full" />
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <p className="text-[10px] uppercase tracking-widest text-red-400 font-black">Capital Bleed Detected</p>
              </div>
              <h3 className="text-zinc-400 font-bold text-sm">Value of Abandoned Carts</h3>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-white mt-1">₹{lostRevenue.toLocaleString('en-IN')}</h2>
            </div>

            <h3 className="text-base font-black tracking-tight mb-4 text-zinc-200">Products Abandoned Most Today</h3>
            <div className="flex flex-col gap-3">
              {dropoffProducts.map((product, i) => (
                <div key={i} className="bg-[#111] p-3 rounded-2xl border border-white/5 flex items-center gap-4 group">
                  <div className="w-14 h-14 bg-black rounded-xl overflow-hidden shrink-0 border border-white/5">
                    {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full bg-zinc-900" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-white">{product.name || 'Unnamed Product'}</h4>
                    <p className="text-xs font-bold text-red-400/80 mt-1">{product.scan_count} Scans • Abandoned</p>
                  </div>
                  <div className="text-right pr-2">
                    <p className="text-sm font-black text-white">₹{product.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 🧠 TIER 3: STORE INTELLIGENCE CRM & BEHAVIOR (Pro Elite) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
          
          {(currentPlan === 'starter' || currentPlan === 'growth') && (
            <LockedOverlay title="Behavioral CRM Engine" planRequired="Pro Elite" price="5,999" icon={Users} />
          )}

          <div className={(currentPlan === 'starter' || currentPlan === 'growth') ? 'opacity-20 blur-xl pointer-events-none' : ''}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white">Customer Loyalty Matrix</h3>
                <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">CRM Retention Data</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#111] p-4 rounded-3xl border border-white/5">
                <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500 mb-1">Total Walk-ins</p>
                <h3 className="text-2xl font-black text-white">{totalCustomers}</h3>
              </div>
              <div className="bg-[#111] p-4 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                  <div className="h-full bg-blue-500" style={{ width: `${repeatRate}%` }} />
                </div>
                <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500 mb-1">Repeat Rate</p>
                <h3 className="text-2xl font-black text-white">{repeatRate}%</h3>
              </div>
            </div>

            {/* PEAK HOUR HEATMAP WIDGET */}
            <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] p-5 rounded-3xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-black text-white">Store Peak Hour</h4>
              </div>
              <p className="text-xs text-zinc-400 font-bold mb-4">Maximum transaction density detected at:</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-black tracking-tighter text-amber-500">{peakHour}</h2>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Local Time</span>
              </div>
            </div>

          </div>
        </motion.div>

      </main>
    </div>
  );
}
