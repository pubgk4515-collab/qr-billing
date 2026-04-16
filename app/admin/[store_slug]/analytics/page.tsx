'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, BarChart3, Eye, ShoppingBag, 
  TrendingUp, AlertTriangle, Users, Lock, 
  PhoneCall, Wallet, Activity
} from 'lucide-react';

export default function StoreAnalytics({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  
  // Intelligence States
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [lostRevenue, setLostRevenue] = useState(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [vipCustomers, setVipCustomers] = useState<any[]>([]);
  
  // MOCK: Toggle this to test "Pro" vs "Free" view
  const isPremiumUser = false; 

  useEffect(() => {
    if (!safeStoreSlug) return;

    async function fetchAdvancedIntelligence() {
      try {
        // 1. Get Store
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (!store) return;
        setStoreData(store);

        // 2. Fetch Store's Products (For Scans & Cart matching)
        const { data: products } = await supabase.from('products').select('id, name, price, scan_count, image_url').eq('store_id', store.id);
        
        let scans = 0;
        let productMap = new Map(); // Fast lookup
        if (products) {
          products.forEach(p => {
            scans += Number(p.scan_count || 0);
            productMap.set(p.id, p);
          });
          setTotalScans(scans);
          
          // Sort for Top Products
          const sorted = [...products].sort((a, b) => (b.scan_count || 0) - (a.scan_count || 0));
          setTopProducts(sorted.slice(0, 3));
        }

        // 3. Fetch Sales Data (TRUTH)
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, items_count, customer_phone, cart_id')
          .eq('store_id', store.id)
          .eq('payment_status', 'completed');

        let revenue = 0;
        let itemsSold = 0;
        let customerSpend: Record<string, number> = {};
        let purchasedCartIds = new Set();

        if (sales) {
          sales.forEach(sale => {
            revenue += Number(sale.total_amount || 0);
            itemsSold += Number(sale.items_count || 0);
            if (sale.cart_id) purchasedCartIds.add(sale.cart_id);
            
            // CRM Logic: Group by phone
            if (sale.customer_phone) {
              customerSpend[sale.customer_phone] = (customerSpend[sale.customer_phone] || 0) + Number(sale.total_amount);
            }
          });
        }
        setTotalRevenue(revenue);
        setTotalSales(itemsSold);

        // Extract Top VIPs
        const vips = Object.entries(customerSpend)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([phone, total]) => ({ phone, total }));
        setVipCustomers(vips);

        // 4. Fetch Cart Data (INTENT vs TRUTH = Lost Revenue)
        if (products && products.length > 0) {
          const productIds = products.map(p => p.id);
          const { data: cartItems } = await supabase
            .from('cart')
            .select('product_id, session_id')
            .in('product_id', productIds);

          if (cartItems) {
            let missedCash = 0;
            cartItems.forEach(item => {
              // If this cart session never made it to the 'sales' table, it's lost revenue!
              if (!purchasedCartIds.has(item.session_id)) {
                const p = productMap.get(item.product_id);
                if (p) missedCash += Number(p.price || 0);
              }
            });
            setLostRevenue(missedCash);
          }
        }

      } catch (err) {
        console.error("Analytics Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAdvancedIntelligence();
  }, [safeStoreSlug]);

  const themeColor = storeData?.theme_color || '#10b981';

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-emerald-500 animate-pulse font-black tracking-widest text-xs uppercase">Initializing OS...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24 selection:bg-white/10">
      
      {/* 👑 HEADER */}
      <header className="bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none flex items-center gap-2">
                <BarChart3 className="w-6 h-6" style={{ color: themeColor }} /> Pulse Engine
              </h1>
              <p className="text-[10px] uppercase tracking-widest font-bold mt-1 text-zinc-500">Retail Control Layer</p>
            </div>
          </div>
          {!isPremiumUser && (
            <button className="bg-white text-black px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <Lock className="w-3 h-3" /> Go Pro
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* 📊 THE TRUTH LAYER (Core Metrics) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0A0A0A] p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ backgroundColor: themeColor }} />
            <TrendingUp className="w-6 h-6 mb-4 text-white" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Net Revenue</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter mt-1">₹{totalRevenue.toLocaleString('en-IN')}</h2>
          </div>

          <div className="bg-red-500/5 p-6 rounded-[2rem] border border-red-500/10 shadow-xl relative overflow-hidden">
            <AlertTriangle className="w-6 h-6 mb-4 text-red-500" />
            <p className="text-[10px] text-red-500/70 uppercase font-black tracking-widest flex items-center gap-1">Lost Revenue <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /></p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter mt-1 text-red-500">₹{lostRevenue.toLocaleString('en-IN')}</h2>
            <p className="text-xs font-bold text-red-500/50 mt-2 leading-tight">Value of items scanned & added to bag but abandoned at checkout.</p>
          </div>
        </div>

        {/* 👥 THE CRM LAYER (VIP Customers - Addiction Engine) */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 bg-white/5">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">VIP Customer Vault</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Highest paying local clients</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 relative">
            {/* The Free View - Shows only top 1, blurs the rest */}
            {vipCustomers.map((vip, i) => {
              const isLocked = !isPremiumUser && i > 0;
              return (
                <div key={i} className={`bg-[#111] p-4 rounded-2xl border border-white/5 flex items-center justify-between ${isLocked ? 'opacity-30 blur-[2px] pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center font-black text-xs border border-white/10">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-widest">{vip.phone}</h4>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Top Spender</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-400">₹{vip.total.toLocaleString('en-IN')}</p>
                    <button className="text-[10px] uppercase tracking-widest font-bold text-white bg-white/10 px-3 py-1.5 rounded-full mt-2 flex items-center gap-1 hover:bg-white hover:text-black transition-colors">
                      <PhoneCall className="w-3 h-3" /> Connect
                    </button>
                  </div>
                </div>
              );
            })}

            {/* FOMO UPGRADE OVERLAY */}
            {!isPremiumUser && vipCustomers.length > 1 && (
              <div className="absolute inset-x-0 bottom-0 top-20 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 flex flex-col items-center justify-center text-center p-6 z-10">
                <Lock className="w-8 h-8 text-zinc-400 mb-3" />
                <h3 className="text-lg font-black mb-1">Unlock Full CRM Engine</h3>
                <p className="text-xs text-zinc-400 font-bold max-w-xs mb-4">You have {vipCustomers.length - 1} more high-paying customers hidden. Upgrade to send them targeted WhatsApp offers.</p>
                <button className="bg-white text-black px-6 py-3 rounded-full text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                  Upgrade to Elite Plan
                </button>
              </div>
            )}
            
            {vipCustomers.length === 0 && (
              <p className="text-xs text-zinc-500 font-bold text-center py-6">No customer data available yet.</p>
            )}
          </div>
        </div>

        {/* 🏆 THE INTENT LAYER (What people are scanning) */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-6 shadow-2xl">
           <h3 className="text-lg font-black tracking-tight mb-1">Market Intent Radar</h3>
           <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-6">Most Scanned Items vs Actual Sales</p>

           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topProducts.map((product, i) => (
              <div key={i} className="bg-[#111] p-4 rounded-2xl border border-white/5 relative">
                <div className="w-12 h-12 bg-black rounded-xl mb-3 overflow-hidden border border-white/10">
                   {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900" />}
                </div>
                <h4 className="font-bold text-sm text-white truncate">{product.name || 'Unnamed'}</h4>
                <div className="flex justify-between items-center mt-3 border-t border-white/5 pt-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Scans</p>
                    <p className="font-black text-blue-400">{product.scan_count || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Price</p>
                    <p className="font-black text-white">₹{product.price}</p>
                  </div>
                </div>
              </div>
            ))}
           </div>
        </div>

      </main>
    </div>
  );
}
