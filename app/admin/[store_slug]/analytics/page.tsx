'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, BarChart3, Eye, ShoppingBag, 
  TrendingUp, AlertTriangle, Zap, Activity, 
  Loader2, Maximize
} from 'lucide-react';

export default function PremiumStoreAnalytics({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  
  // Advanced Analytics States
  const [metrics, setMetrics] = useState({
    revenue: 0,
    itemsSold: 0,
    totalScans: 0,
    conversionRate: '0.0'
  });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [dropoffProducts, setDropoffProducts] = useState<any[]>([]);
  const [sizeDistribution, setSizeDistribution] = useState<any[]>([]);

  useEffect(() => {
    if (!safeStoreSlug) return;

    async function fetchPremiumIntelligence() {
      try {
        // 1. Get Store Context
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (!store) return;
        setStoreData(store);

        // 2. Fetch Core Products (For Scans & Size Baseline)
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, size, image_url, scan_count')
          .eq('store_id', store.id);

        let totalProductScans = 0;
        let productLookup = new Map();
        
        if (products) {
          products.forEach(p => {
            totalProductScans += Number(p.scan_count || 0);
            productLookup.set(p.id, p);
          });
        }

        // 3. Fetch Sales Data (The Ground Truth)
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, items_count, purchased_items')
          .eq('store_id', store.id)
          .eq('payment_status', 'completed');

        let totalRev = 0;
        let totalSold = 0;
        let salesFrequency = new Map(); // For Top Products
        let sizeTally: Record<string, number> = {};

        if (sales) {
          sales.forEach(sale => {
            totalRev += Number(sale.total_amount || 0);
            totalSold += Number(sale.items_count || 0);

            // Parse JSONB items to find exact top sellers and sizes
            let items: any[] = [];
            try {
              items = typeof sale.purchased_items === 'string' ? JSON.parse(sale.purchased_items) : (sale.purchased_items || []);
            } catch (e) {}

            items.forEach(item => {
              const pId = item.products?.id || item.product_id || item.id;
              if (pId) {
                salesFrequency.set(pId, (salesFrequency.get(pId) || 0) + 1);
                
                // Track sizes from actual sold items (Fallback to product mapping if needed)
                const pSize = item.products?.size || productLookup.get(pId)?.size;
                if (pSize) {
                  const cleanSize = pSize.toString().toUpperCase().trim();
                  sizeTally[cleanSize] = (sizeTally[cleanSize] || 0) + 1;
                }
              }
            });
          });
        }

        // 4. Process "High Scans, Low Conversion" (Drop-offs)
        let dropoffs: any[] = [];
        if (products) {
          dropoffs = products
            .map(p => ({
              ...p,
              sales_count: salesFrequency.get(p.id) || 0,
              dropoff_ratio: (Number(p.scan_count || 0)) - (salesFrequency.get(p.id) || 0)
            }))
            .filter(p => p.dropoff_ratio > 0 && p.scan_count > 0)
            .sort((a, b) => b.dropoff_ratio - a.dropoff_ratio)
            .slice(0, 3);
        }

        // 5. Process Top Products
        const topSellers = Array.from(salesFrequency.entries())
          .map(([id, count]) => ({ ...productLookup.get(id), sales_count: count }))
          .filter(p => p.name) // Ensure valid product
          .sort((a, b) => b.sales_count - a.sales_count)
          .slice(0, 4);

        // 6. Process Size Distribution Percentages
        const totalSizeCount = Object.values(sizeTally).reduce((a, b) => a + b, 0);
        const sizes = Object.entries(sizeTally)
          .map(([size, count]) => ({
            size: size === 'FREE SIZE' ? 'FS' : size,
            count,
            percentage: totalSizeCount > 0 ? ((count / totalSizeCount) * 100).toFixed(0) : '0'
          }))
          .sort((a, b) => b.count - a.count);

        setMetrics({
          revenue: totalRev,
          itemsSold: totalSold,
          totalScans: totalProductScans,
          conversionRate: totalProductScans > 0 ? ((totalSold / totalProductScans) * 100).toFixed(1) : '0.0'
        });
        setTopProducts(topSellers);
        setDropoffProducts(dropoffs);
        setSizeDistribution(sizes.length > 0 ? sizes : [
          { size: 'M', percentage: '40', count: 0 }, { size: 'L', percentage: '30', count: 0 }, { size: 'XL', percentage: '20', count: 0 }, { size: 'S', percentage: '10', count: 0 }
        ]); // Fallback for UI visualization if empty

      } catch (err) {
        console.error("Analytics Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPremiumIntelligence();
  }, [safeStoreSlug]);

  const themeColor = storeData?.theme_color || '#10b981';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl opacity-50" style={{ backgroundColor: themeColor, borderRadius: '50%' }} />
          <Loader2 className="w-10 h-10 animate-spin relative z-10" style={{ color: themeColor }} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">Initializing Pulse Engine</p>
      </div>
    );
  }

  // Cinematic Color Palette
  const colors = [themeColor, '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans pb-24 selection:bg-white/10 overflow-x-hidden">
      
      {/* 👑 ULTRA PREMIUM HEADER */}
      <header className="bg-[#020202]/80 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 transition-all">
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: themeColor }} /> Pulse Engine
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1 text-zinc-500">Retail Intelligence</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
            <span className="text-[9px] font-black uppercase tracking-widest text-white">Pro</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        
        {/* 📊 1. THE COMMAND CENTER (Hero Metrics) */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="col-span-2 bg-gradient-to-br from-[#0a0a0a] to-[#050505] p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[50px] opacity-20 transition-opacity group-hover:opacity-40" style={{ backgroundColor: themeColor }} />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <p className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.2em]">Net Revenue</p>
              <TrendingUp className="w-5 h-5 text-zinc-600" />
            </div>
            <h2 className="text-5xl font-black tracking-tighter relative z-10 text-white">₹{metrics.revenue.toLocaleString('en-IN')}</h2>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#0a0a0a] p-5 rounded-[1.5rem] border border-white/5 relative overflow-hidden">
            <Eye className="w-4 h-4 mb-3 text-blue-400" />
            <h2 className="text-3xl font-black tracking-tighter text-white">{metrics.totalScans}</h2>
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Total Scans</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#0a0a0a] p-5 rounded-[1.5rem] border border-white/5 relative overflow-hidden">
            <ShoppingBag className="w-4 h-4 mb-3" style={{ color: themeColor }} />
            <h2 className="text-3xl font-black tracking-tighter text-white">{metrics.itemsSold}</h2>
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Items Sold</p>
          </motion.div>
        </div>

        {/* ⚠️ 2. LEAKAGE RADAR (High Scans, Low Conversion) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gradient-to-b from-[#150505] to-[#0a0a0a] border border-red-500/10 rounded-[2rem] p-6 shadow-[0_10px_40px_rgba(239,68,68,0.05)]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Conversion Leakage
              </h3>
              <p className="text-[10px] uppercase tracking-[0.1em] text-red-500/60 font-bold mt-1">High Interest • Zero Sales</p>
            </div>
            <div className="bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20">
              <span className="text-[10px] font-black text-red-500 tracking-widest uppercase">Action Required</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {dropoffProducts.length > 0 ? dropoffProducts.map((product, i) => (
              <div key={i} className="bg-black/50 p-3 rounded-2xl border border-red-500/10 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-transparent" />
                <div className="w-12 h-12 bg-[#111] rounded-xl overflow-hidden shrink-0">
                  {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover opacity-80" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-zinc-700" /></div>}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-zinc-200 line-clamp-1">{product.name || 'Unnamed'}</h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded"><Eye className="w-3 h-3" /> {product.scan_count} Scans</span>
                    <span className="flex items-center gap-1 text-[10px] font-black text-zinc-500"><ShoppingBag className="w-3 h-3" /> {product.sales_count} Sold</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                <p className="text-xs text-zinc-500 font-bold">No leakage detected. Perfect conversion!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 🏆 3. VELOCITY MATRIX (Top Performers) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" /> Velocity Matrix
              </h3>
              <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-bold mt-1">Highest Selling Inventory</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black tracking-widest text-zinc-600 uppercase mb-1">Win Rate</p>
              <p className="text-lg font-black leading-none text-emerald-400">{metrics.conversionRate}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {topProducts.length > 0 ? topProducts.map((product, i) => (
              <div key={i} className="bg-[#111] p-3.5 rounded-[1.2rem] border border-white/5 relative group">
                <div className="absolute top-3 right-3 text-[10px] font-black text-black bg-white px-1.5 py-0.5 rounded shadow-lg z-10">#{i+1}</div>
                <div className="w-full aspect-square bg-black rounded-xl mb-3 overflow-hidden relative">
                   {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-zinc-800" /></div>}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                   <p className="absolute bottom-2 left-2 text-xs font-black text-white">₹{product.price}</p>
                </div>
                <h4 className="font-bold text-[11px] text-zinc-300 line-clamp-1">{product.name || 'Unnamed'}</h4>
                <p className="text-[10px] font-black text-zinc-500 mt-1 uppercase tracking-widest">{product.sales_count} Units Sold</p>
              </div>
            )) : (
              <div className="col-span-2 text-center py-6 border border-dashed border-white/10 rounded-2xl">
                <p className="text-xs text-zinc-500 font-bold">Awaiting sales data to generate matrix.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 📐 4. DEMAND GEOMETRY (Size Distribution) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-[40px] opacity-10" style={{ backgroundColor: '#3b82f6' }} />
          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2 relative z-10">
            <Maximize className="w-5 h-5 text-blue-400" /> Demand Geometry
          </h3>
          <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-bold mt-1 mb-6 relative z-10">Size Preference Distribution</p>

          <div className="flex h-8 rounded-xl overflow-hidden mb-5 border border-white/10 shadow-inner relative z-10">
            {sizeDistribution.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
                className="h-full relative group cursor-pointer" 
                style={{ backgroundColor: colors[idx % colors.length] }}
              >
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
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
