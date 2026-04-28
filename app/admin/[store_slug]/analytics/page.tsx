'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BarChart3, Eye, ShoppingBag, 
  TrendingUp, AlertTriangle, Zap, 
  Loader2, Maximize, Lock, Users, MessageCircle, 
  ArrowDownRight, Trash2, CheckCircle2, Lightbulb
} from 'lucide-react';

export default function PremiumStoreAnalytics({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  
  const [metrics, setMetrics] = useState({ revenue: 0, itemsSold: 0, totalViews: 0, totalAdds: 0, walkins: 0 });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [intelligentDropoffs, setIntelligentDropoffs] = useState<any[]>([]);
  const [sizeDistribution, setSizeDistribution] = useState<any[]>([]);
  const [vipCustomers, setVipCustomers] = useState<any[]>([]);

  // 🔒 PREMIUM TOGGLE (Connected to Super Admin God Mode)
  const isPremiumUser = storeData?.is_premium === true; 

  useEffect(() => {
    if (!safeStoreSlug) return;
    async function fetchPremiumIntelligence() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (!store) return;
        setStoreData(store);

        // 🔥 INTELLIGENCE UPGRADE: Fetching the entire funnel data
        const { data: products } = await supabase
            .from('products')
            .select('id, name, price, size, image_url, view_count, cart_add_count, cart_remove_count')
            .eq('store_id', store.id);

        let totalViews = 0;
        let totalAdds = 0;
        let productLookup = new Map();
        
        if (products) {
          products.forEach(p => { 
              totalViews += Number(p.view_count || 0); 
              totalAdds += Number(p.cart_add_count || 0);
              productLookup.set(p.id, p); 
          });
        }

        const { data: sales } = await supabase
            .from('sales')
            .select('total_amount, items_count, purchased_items, customer_phone')
            .eq('store_id', store.id)
            .eq('payment_status', 'completed');

        let totalRev = 0, totalSold = 0;
        let salesFrequency = new Map(); 
        let sizeTally: Record<string, number> = {};
        let customerData: Record<string, { total: number; visits: number }> = {}; 

        if (sales) {
          sales.forEach(sale => {
            totalRev += Number(sale.total_amount || 0);
            totalSold += Number(sale.items_count || 0);

            if (sale.customer_phone && sale.customer_phone !== 'WALK-IN') {
              if (!customerData[sale.customer_phone]) {
                customerData[sale.customer_phone] = { total: 0, visits: 0 };
              }
              customerData[sale.customer_phone].total += Number(sale.total_amount);
              customerData[sale.customer_phone].visits += 1;
            }

            let items: any[] = [];
            try { items = typeof sale.purchased_items === 'string' ? JSON.parse(sale.purchased_items) : (sale.purchased_items || []); } catch (e) {}

            items.forEach(item => {
              const pId = item.products?.id || item.product_id || item.id;
              if (pId) {
                salesFrequency.set(pId, (salesFrequency.get(pId) || 0) + 1);
                const pSize = item.products?.size || productLookup.get(pId)?.size;
                if (pSize) {
                  const cleanSize = pSize.toString().toUpperCase().trim();
                  sizeTally[cleanSize] = (sizeTally[cleanSize] || 0) + 1;
                }
              }
            });
          });
        }

        // 🧠 THE DIAGNOSTICS ENGINE (Bimari aur Ilaaj)
        let diagnostics: any[] = [];
        if (products) {
          products.forEach(p => {
              const views = Number(p.view_count || 0);
              const adds = Number(p.cart_add_count || 0);
              const removes = Number(p.cart_remove_count || 0);
              const sold = salesFrequency.get(p.id) || 0;

              // 🔴 Issue Type 1: Pricing Friction (High intent, high abandon)
              if (adds > 0 && (removes / adds) >= 0.4) {
                  diagnostics.push({
                      ...p, sold, type: 'pricing', 
                      title: 'Pricing Friction',
                      desc: 'High abandonment. Customers add this to bag but drop it at checkout.',
                      action: 'Trigger Discount',
                      severity: removes * 2 // Weighting for sorting
                  });
              }
              // 🟠 Issue Type 2: Low Appeal (High views, low/zero adds)
              else if (views > 3 && (adds / views) <= 0.2) {
                  diagnostics.push({
                      ...p, sold, type: 'design',
                      title: 'Low Appeal',
                      desc: 'Getting scanned frequently but not making it to the bag.',
                      action: 'Update Display',
                      severity: views 
                  });
              }
          });
          // Sort by severity and pick top 3 biggest issues
          diagnostics.sort((a, b) => b.severity - a.severity);
          setIntelligentDropoffs(diagnostics.slice(0, 3));
        }

        // Process VIPs
        const vips = Object.entries(customerData)
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([phone, data]) => ({ phone, total: data.total, visits: data.visits }));
          
        setVipCustomers(vips.length > 0 ? vips : [ 
          { phone: '8509460738', total: 46257, visits: 12 }, 
          { phone: '7477613224', total: 14086, visits: 5 }, 
          { phone: '98****2109', total: 8400, visits: 3 }, 
          { phone: '62****9981', total: 5200, visits: 2 } 
        ]);

        const topSellers = Array.from(salesFrequency.entries()).map(([id, count]) => ({ ...productLookup.get(id), sales_count: count }))
          .filter(p => p.name).sort((a, b) => b.sales_count - a.sales_count).slice(0, 4);

        const totalSizeCount = Object.values(sizeTally).reduce((a, b) => a + b, 0);
        const sizes = Object.entries(sizeTally).map(([size, count]) => ({ size: size === 'FREE SIZE' ? 'FS' : size, count, percentage: totalSizeCount > 0 ? ((count / totalSizeCount) * 100).toFixed(0) : '0' })).sort((a, b) => b.count - a.count);

        setMetrics({ 
          revenue: totalRev, 
          itemsSold: totalSold, 
          totalViews: totalViews, 
          totalAdds: totalAdds,
          walkins: sales ? sales.length : 0 
        });
        
        setTopProducts(topSellers);
        setSizeDistribution(sizes.length > 0 ? sizes : [{ size: 'M', percentage: '40', count: 0 }, { size: 'L', percentage: '30', count: 0 }, { size: 'XL', percentage: '20', count: 0 }]);

      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    fetchPremiumIntelligence();
  }, [safeStoreSlug]);

  const themeColor = storeData?.theme_color || '#10b981';
  const colors = [themeColor, '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const topSellersRevenue = topProducts.reduce((sum, p) => sum + ((Number(p.price) || 0) * (Number(p.sales_count) || 0)), 0);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-zinc-600" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24 selection:bg-white/10">
      
      {/* 👑 HEADER */}
      <header className="bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="w-10 h-10 bg-[#111] rounded-full border border-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: themeColor }} /> Analytics
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1 text-zinc-500">Retail Intelligence</p>
            </div>
          </div>
          
          <button className="bg-[#111] border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg active:scale-95 transition-transform">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-200">PRO</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-5">
        
        {/* 📊 1. HERO METRIC */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#0a1411] to-[#0a0a0a] p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.2em]">Net Revenue</p>
            <TrendingUp className="w-4 h-4 text-zinc-600" />
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-white">₹{metrics.revenue.toLocaleString('en-IN')}</h2>
        </motion.div>

        {/* 📊 2. THE FUNNEL GRID */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0a0a0a] p-4 rounded-[1.5rem] border border-white/5 flex flex-col items-center justify-center text-center">
            <Eye className="w-5 h-5 mb-3 text-blue-500" />
            <h2 className="text-3xl font-black tracking-tighter text-white leading-none">{metrics.totalViews}</h2>
            <p className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.1em] mt-2">QR Views</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#0a0a0a] p-4 rounded-[1.5rem] border border-white/5 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="w-5 h-5 mb-3 text-amber-500" />
            <h2 className="text-3xl font-black tracking-tighter text-white leading-none">{metrics.totalAdds}</h2>
            <p className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.1em] mt-2">Added to Bag</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#0a0a0a] p-4 rounded-[1.5rem] border border-white/5 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-5 h-5 mb-3" style={{ color: themeColor }} />
            <h2 className="text-3xl font-black tracking-tighter text-white leading-none">{metrics.itemsSold}</h2>
            <p className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.1em] mt-2">Items Sold</p>
          </motion.div>
        </div>

        {/* 🧠 3. THE DIAGNOSTICS ENGINE (Bimari aur Ilaaj) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="relative bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mt-2">
          
          <div className={`p-6 flex flex-col gap-4 ${!isPremiumUser ? 'filter blur-[12px] opacity-10 select-none pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3 mb-1">
              <Lightbulb className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-base font-black tracking-tight text-white">Actionable Insights</h3>
                <p className="text-[9px] uppercase tracking-[0.1em] text-zinc-500 font-bold mt-0.5">Diagnosing Funnel Drop-offs</p>
              </div>
            </div>

            {intelligentDropoffs.length > 0 ? intelligentDropoffs.map((product, i) => (
              <div key={i} className={`bg-[#111] p-4 rounded-2xl flex flex-col gap-4 relative overflow-hidden border ${product.type === 'pricing' ? 'border-red-500/10' : 'border-amber-500/10'}`}>
                
                {/* Background ambient glow based on severity */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[40px] opacity-20 pointer-events-none ${product.type === 'pricing' ? 'bg-red-500' : 'bg-amber-500'}`} />
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-14 h-16 bg-[#050505] rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-white/5">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover opacity-90" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-zinc-700" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-white line-clamp-1">{product.name || 'Unnamed'}</h4>
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${product.type === 'pricing' ? 'text-red-400' : 'text-amber-400'}`}>
                      <AlertTriangle className="w-3 h-3" /> {product.title}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-tight">
                        {product.desc}
                    </p>
                  </div>
                </div>

                {/* The Full Funnel X-Ray */}
                <div className="bg-[#050505] rounded-xl p-3 border border-white/5 relative z-10">
                  <p className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-3 text-center">Customer Journey</p>
                  <div className="flex items-center justify-between text-center px-1">
                    <div>
                      <Eye className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1.5" />
                      <p className="text-xs font-black text-white leading-none">{product.view_count}</p>
                    </div>
                    <div className="w-4 h-px bg-white/10" />
                    <div>
                       <ShoppingBag className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1.5" />
                       <p className="text-xs font-black text-white leading-none">{product.cart_add_count}</p>
                    </div>
                    <div className="w-4 h-px bg-white/10" />
                    <div>
                       <Trash2 className="w-3.5 h-3.5 text-red-500 mx-auto mb-1.5" />
                       <p className="text-xs font-black text-white leading-none">{product.cart_remove_count}</p>
                    </div>
                    <div className="w-4 h-px bg-white/10" />
                    <div>
                       <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1.5" />
                       <p className="text-xs font-black text-white leading-none">{product.sold}</p>
                    </div>
                  </div>
                </div>

                {/* ILAAJ (Actionable Advice) */}
                <div className={`py-2.5 px-3 rounded-lg flex items-center justify-between border relative z-10 ${product.type === 'pricing' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${product.type === 'pricing' ? 'text-red-400' : 'text-amber-400'}`}>Recommended Action:</span>
                    <span className="text-[11px] font-black text-white">{product.action}</span>
                </div>

              </div>
            )) : (
              <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No major leaks detected.</p>
              </div>
            )}
          </div>

           {!isPremiumUser && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
               <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-4 shadow-xl">
                 <Lock className="w-5 h-5 text-zinc-300" />
               </div>
               <h3 className="text-lg font-black text-white text-center mb-1">AI Diagnostics Locked</h3>
               <p className="text-[10px] font-bold text-zinc-400 text-center max-w-[220px] mb-5">
                 Let our engine tell you exactly why customers are abandoning specific items.
               </p>
               <button className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                 Upgrade to Pro
               </button>
            </div>
          )}
        </motion.div>

        {/* 🔒 4. THE HIGH-END VIP CUSTOMER CRM */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mt-2">
          
          <div className={`p-6 flex flex-col gap-4 ${!isPremiumUser ? 'filter blur-[12px] opacity-10 select-none pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-base font-black tracking-tight text-white">VIP Customer Vault</h3>
              </div>
            </div>

            {vipCustomers.slice(0, 3).map((vip, i) => (
              <div key={i} className="bg-[#111] p-4 rounded-2xl border border-white/5 flex flex-col gap-3 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center text-[10px] font-black text-zinc-400 border border-white/5">#{i + 1}</div>
                    <div>
                      <h4 className="font-black text-sm tracking-widest text-zinc-100">{vip.phone}</h4>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-blue-400 font-bold mt-0.5">Top {i===0 ? '1%' : '5%'} Client</p>
                    </div>
                  </div>
                  <button className="bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors border border-white/5">
                    <MessageCircle className="w-3.5 h-3.5 text-zinc-300" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 relative z-10">
                  <div>
                    <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Revenue</p>
                    <p className="text-xs font-black text-emerald-400 mt-0.5">₹{vip.total.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="border-l border-white/5 pl-2">
                    <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Visits</p>
                    <p className="text-xs font-black text-white mt-0.5">{vip.visits}</p>
                  </div>
                  <div className="border-l border-white/5 pl-2">
                    <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Avg Order</p>
                    <p className="text-xs font-black text-white mt-0.5">₹{Math.round(vip.total / vip.visits).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            ))}

            <button 
              onClick={() => router.push(`/admin/${safeStoreSlug}/crm`)}
              className="mt-2 w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              Open Full CRM Engine
            </button>
          </div>

          {!isPremiumUser && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 p-6">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-4 shadow-xl">
                <Lock className="w-5 h-5 text-zinc-300" />
              </div>
              <h3 className="text-xl font-black text-white text-center mb-2">Unlock CRM Data</h3>
              <p className="text-xs font-bold text-zinc-400 text-center max-w-[250px] mb-6">
                Discover your highest paying customers and connect with them directly.
              </p>
            </div>
          )}
        </motion.div>


        {/* 🏆 5. VELOCITY MATRIX */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="relative bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mt-2">
          
          <div className={`${!isPremiumUser ? 'filter blur-[8px] opacity-30 select-none pointer-events-none' : ''}`}>
            
            <div className="p-6 pb-4 relative z-20 bg-[#0a0a0a] border-b border-white/5">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> Velocity Matrix
                  </h3>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-zinc-500 font-bold mt-0.5">Top Performing Inventory</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] text-zinc-400 uppercase font-black tracking-widest mb-1">Bestseller Contribution</p>
                <h2 className="text-4xl font-black tracking-tighter text-white">₹{topSellersRevenue.toLocaleString('en-IN')}</h2>
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 gap-3">
              {topProducts.length > 0 ? topProducts.map((product, i) => (
                <div key={i} className="bg-[#111] p-3 rounded-[1.2rem] border border-white/5 relative group">
                  <div className="absolute top-2 right-2 text-[9px] font-black text-black bg-white px-1.5 py-0.5 rounded z-10">#{i+1}</div>
                  <div className="w-full aspect-square bg-[#050505] rounded-xl mb-3 overflow-hidden relative flex items-center justify-center">
                    {product.image_url ? (
                   <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                   <ShoppingBag className="w-6 h-6 text-zinc-800" />
                    )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                   <p className="absolute bottom-2 left-2 text-xs font-black text-white z-10">₹{product.price}</p>
                  </div>

                  <h4 className="font-bold text-[11px] text-zinc-300 line-clamp-1">{product.name || 'Unnamed'}</h4>
                  <p className="text-[9px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">{product.sales_count} Units Sold</p>
                </div>
              )) : (
                <div className="col-span-2 text-center py-6 border border-dashed border-white/10 rounded-2xl"><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Awaiting Data</p></div>
              )}
            </div>
          </div>

          {!isPremiumUser && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 p-6">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-4 shadow-xl">
                <Lock className="w-5 h-5 text-zinc-300" />
              </div>
              <h3 className="text-lg font-black text-white text-center mb-1">Unlock Product Insights</h3>
              <p className="text-[10px] font-bold text-zinc-400 text-center max-w-[200px] mb-5">
                See exactly which items are driving your highest revenue.
              </p>
              <button className="bg-amber-400/10 border border-amber-400/20 text-amber-400 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                Upgrade to Pro
              </button>
            </div>
          )}
        </motion.div>

        {/* 📐 6. DEMAND GEOMETRY */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden mt-2">
          <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-[40px] opacity-10" style={{ backgroundColor: '#3b82f6' }} />
          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2 relative z-10">
            <Maximize className="w-5 h-5 text-blue-400" /> Demand Geometry
          </h3>
          <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-bold mt-1 mb-6 relative z-10">Size Preference Distribution</p>
          <div className="flex h-8 rounded-xl overflow-hidden mb-5 border border-white/10 shadow-inner relative z-10">
            {sizeDistribution.map((item, idx) => (
              <motion.div key={idx} initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }} className="h-full relative group" style={{ backgroundColor: colors[idx % colors.length] }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 relative z-10">
            {sizeDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#111] px-3 py-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: colors[idx % colors.length], color: colors[idx % colors.length] }} /> 
                  <span className="text-xs font-bold text-zinc-300 uppercase">{item.size}</span>
                </div>
                <span className="text-xs font-black text-white">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </motion.div>

      </main>
    </div>
  );
}
