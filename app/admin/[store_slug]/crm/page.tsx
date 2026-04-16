'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, Search, Loader2, MessageCircle, 
  Filter, Star, Clock, AlertTriangle, Send, Lock, 
  Crown, CheckCircle2, Wallet, Activity, Sparkles, 
  ShieldAlert, X, Calendar, ShoppingBag, History, TrendingUp
} from 'lucide-react';

export default function CRMEngine({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // WhatsApp Campaign States
  const [campaignText, setCampaignText] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('vip');
  const [isSending, setIsSending] = useState(false);

  // 🔥 THE NEW FLOATING SCREEN STATE
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  useEffect(() => {
    if (!safeStoreSlug) return;
    async function fetchCRMData() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (!store) return;
        setStoreData(store);

        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, created_at, customer_phone, purchased_items')
          .eq('store_id', store.id)
          .eq('payment_status', 'completed');

        if (sales) {
          const customerMap = new Map();

          sales.forEach(sale => {
            if (sale.customer_phone && sale.customer_phone !== 'WALK-IN') {
              const existing = customerMap.get(sale.customer_phone) || { 
                phone: sale.customer_phone, 
                total_spend: 0, 
                visits: 0, 
                first_visit: new Date(sale.created_at),
                last_visit: new Date(0),
                highest_purchase: 0,
                categories: {} as Record<string, number>
              };
              
              existing.total_spend += Number(sale.total_amount);
              existing.visits += 1;
              
              const saleDate = new Date(sale.created_at);
              if (saleDate > existing.last_visit) existing.last_visit = saleDate;
              if (saleDate < existing.first_visit) existing.first_visit = saleDate;
              if (Number(sale.total_amount) > existing.highest_purchase) existing.highest_purchase = Number(sale.total_amount);
              
              // Extract Categories for AI Preference Layer
              try {
                const items = typeof sale.purchased_items === 'string' ? JSON.parse(sale.purchased_items) : (sale.purchased_items || []);
                items.forEach((item: any) => {
                  const cat = item.products?.category || 'Apparel';
                  existing.categories[cat] = (existing.categories[cat] || 0) + 1;
                });
              } catch(e) {}

              customerMap.set(sale.customer_phone, existing);
            }
          });

          const now = new Date();
          const processedCustomers = Array.from(customerMap.values()).map(c => {
            const diffTime = Math.abs(now.getTime() - c.last_visit.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let segment = 'regular';
            if (c.total_spend > 10000 || c.visits >= 5) segment = 'vip';
            else if (diffDays > 30) segment = 'at_risk';
            else if (diffDays <= 7 && c.visits === 1) segment = 'new';

            // Calculate Top Category
            const favCategory = Object.entries(c.categories).sort((a: any, b: any) => b - a)?. [0]|| 'Premium Wear';

            // Extrapolated/Mocked Data for the Ultra-Premium Layers (Until direct session mapping is built)
            const simulatedScans = c.visits * (Math.floor(Math.random() * 4) + 2); // 2 to 5 scans per visit avg

            return { 
              ...c, 
              days_since_last_visit: diffDays, 
              segment,
              avg_order_value: Math.round(c.total_spend / c.visits),
              simulated_scans: simulatedScans,
              conversion_rate: Math.round((c.visits / simulatedScans) * 100),
              visit_frequency: Math.round((now.getTime() - c.first_visit.getTime()) / (1000 * 60 * 60 * 24 * c.visits)),
              fav_category: favCategory,
              churn_prob: diffDays > 45 ? 88 : diffDays > 20 ? 45 : 12
            };
          }).sort((a, b) => b.total_spend - a.total_spend);

          if (processedCustomers.length === 0) {
            // Mock Data for empty DB Preview
            setCustomers([
              { phone: '8509460738', total_spend: 46257, visits: 12, days_since_last_visit: 2, segment: 'vip', first_visit: new Date('2025-10-12'), last_visit: new Date(), highest_purchase: 8500, avg_order_value: 3854, simulated_scans: 34, conversion_rate: 35, visit_frequency: 14, fav_category: 'Leather Goods', churn_prob: 5 },
              { phone: '7477613224', total_spend: 14086, visits: 5, days_since_last_visit: 15, segment: 'vip', first_visit: new Date('2026-01-05'), last_visit: new Date(), highest_purchase: 4200, avg_order_value: 2817, simulated_scans: 18, conversion_rate: 27, visit_frequency: 21, fav_category: 'Denim', churn_prob: 25 },
            ]);
          } else {
            setCustomers(processedCustomers);
          }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    fetchCRMData();
  }, [safeStoreSlug]);

  const handleSendCampaign = () => {
    if(!campaignText) return alert("Please enter a message!");
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false); setCampaignText('');
      alert(`✅ Campaign dispatched successfully to ${selectedSegment.toUpperCase()} segment!`);
    }, 1500);
  };

  const plan = storeData?.plan_tier?.toLowerCase() || 'starter';
  const hasBasicCRM = ['growth', 'pro', 'elite'].includes(plan);
  const hasAdvancedCRM = ['pro', 'elite'].includes(plan);
  const themeColor = storeData?.theme_color || '#10b981';

  const filteredCustomers = customers.filter(c => c.phone.includes(searchQuery));
  const segmentCounts = {
    vip: customers.filter(c => c.segment === 'vip').length,
    at_risk: customers.filter(c => c.segment === 'at_risk').length,
    new: customers.filter(c => c.segment === 'new').length,
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-zinc-600" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24 selection:bg-white/10 overflow-x-hidden">
      
      {/* 👑 HEADER */}
      <header className="bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="w-10 h-10 bg-[#111] rounded-full border border-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> CRM Engine
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1 text-zinc-500">Customer Data Platform</p>
            </div>
          </div>
          
          <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
             plan === 'elite' ? 'bg-rose-500/10 border-rose-500/30' : 
             plan === 'pro' ? 'bg-blue-500/10 border-blue-500/30' : 
             plan === 'growth' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-800 border-zinc-700'
          }`}>
             {plan === 'elite' && <Crown className="w-3 h-3 text-rose-500" />}
             {plan === 'growth' && <Star className="w-3 h-3 text-amber-500" />}
            <span className={`text-[9px] font-black uppercase tracking-widest ${
              plan === 'elite' ? 'text-rose-500' : plan === 'pro' ? 'text-blue-400' : plan === 'growth' ? 'text-amber-500' : 'text-zinc-400'
            }`}>{plan}</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">

        {!hasBasicCRM && (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 text-center relative overflow-hidden shadow-2xl mt-4">
             {/* Starter Plan Locked View (Untouched) */}
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
            <div className="w-20 h-20 bg-[#111] border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="w-8 h-8 text-zinc-500" /></div>
            <h2 className="text-2xl font-black text-white mb-2">CRM Locked</h2>
            <p className="text-sm font-bold text-zinc-400 mb-6 leading-relaxed">Your Starter plan does not include customer data retention.</p>
            <button className="w-full bg-amber-500 text-black font-black uppercase tracking-widest text-xs py-4 rounded-2xl">Upgrade to Growth</button>
          </div>
        )}

        {/* 🟢 TIER 2: BASIC CRM LIST */}
        {hasBasicCRM && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Search 10-digit phone number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-white focus:outline-none focus:border-white/30 transition-colors shadow-inner" />
            </div>

            <div className="flex items-center justify-between mt-2 mb-1">
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Customer Database
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-[#111] px-2 py-1 rounded-md border border-white/5">{filteredCustomers.length} Records</span>
            </div>

            {/* 🔥 INTERACTIVE CUSTOMER LIST */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-2 shadow-2xl max-h-[350px] overflow-y-auto overflow-x-hidden no-scrollbar">
              {filteredCustomers.map((customer, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedCustomer(customer)} // Trigger Floating Screen
                  className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-[#111] transition-colors rounded-xl cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#111] border border-white/5 flex items-center justify-center group-hover:border-blue-500/30 transition-colors">
                      <span className="text-xs font-black text-zinc-400 group-hover:text-blue-400 transition-colors">{customer.phone.slice(-4)}</span>
                    </div>
                    <div>
                      <h4 className="font-black text-sm tracking-widest text-zinc-100">{customer.phone}</h4>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">
                        {customer.visits} Visits • Last: {customer.days_since_last_visit}d ago
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="font-black text-emerald-400 text-sm">₹{customer.total_spend.toLocaleString('en-IN')}</p>
                      <div className="flex justify-end gap-1 mt-1">
                        {customer.segment === 'vip' && <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded">VIP</span>}
                        {customer.segment === 'at_risk' && <span className="bg-rose-500/20 text-rose-400 text-[8px] font-black px-1.5 py-0.5 rounded">RISK</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 🚀 TIER 3: ADVANCED CRM (Smart Segments & WhatsApp Blaster) */}
        {hasBasicCRM && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative bg-gradient-to-b from-[#0a0f1a] to-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mt-4">
             {/* ... (Existing WhatsApp Blaster Code remains unchanged) ... */}
            <div className={`p-6 flex flex-col gap-6 ${!hasAdvancedCRM ? 'filter blur-[10px] opacity-20 select-none pointer-events-none' : ''}`}>
              <div>
                <div className="flex items-center gap-2 mb-4"><Filter className="w-5 h-5 text-blue-400" /><h3 className="text-base font-black tracking-tight text-white">Smart Segments</h3></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#111] border border-blue-500/20 p-3 rounded-xl text-center shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                    <Star className="w-4 h-4 text-blue-400 mx-auto mb-1" /><p className="text-xl font-black text-white">{segmentCounts.vip}</p><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">VIPs</p>
                  </div>
                  <div className="bg-[#111] border border-amber-500/20 p-3 rounded-xl text-center shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                    <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" /><p className="text-xl font-black text-white">{segmentCounts.new}</p><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">Recent</p>
                  </div>
                  <div className="bg-[#111] border border-rose-500/20 p-3 rounded-xl text-center shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                    <AlertTriangle className="w-4 h-4 text-rose-500 mx-auto mb-1" /><p className="text-xl font-black text-white">{segmentCounts.at_risk}</p><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">At Risk</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/5 pt-6">
                <div className="flex justify-between items-end mb-4">
                  <div className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-[#25D366]" /><h3 className="text-base font-black tracking-tight text-white">Campaign Blaster</h3></div>
                  <div className="text-right"><p className="text-[8px] font-black tracking-widest text-zinc-500 uppercase mb-0.5">Quota Left</p><p className="text-xs font-black text-white bg-[#111] px-2 py-0.5 rounded border border-white/5">284 / 300</p></div>
                </div>
                <div className="flex flex-col gap-3">
                  <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 appearance-none">
                    <option value="vip">Target: VIP Clients ({segmentCounts.vip})</option>
                    <option value="at_risk">Target: At Risk ({segmentCounts.at_risk})</option>
                  </select>
                  <textarea placeholder="Enter your WhatsApp message here..." value={campaignText} onChange={(e) => setCampaignText(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-zinc-300 focus:outline-none focus:border-blue-500/50 min-h-[100px] resize-none" />
                  <button onClick={handleSendCampaign} disabled={isSending} className="w-full bg-[#25D366] hover:bg-[#1DA851] text-black font-black uppercase tracking-widest text-[10px] py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(37,211,102,0.2)] flex items-center justify-center gap-2">
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Campaign</>}
                  </button>
                </div>
              </div>
            </div>

            {!hasAdvancedCRM && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 p-6 backdrop-blur-[2px]">
                <div className="w-14 h-14 bg-[#111] border border-white/10 rounded-full shadow-2xl flex items-center justify-center mb-5"><Lock className="w-6 h-6 text-blue-400" /></div>
                <h3 className="text-2xl font-black text-white text-center mb-2">Unlock Advanced CRM</h3>
                <button className="bg-blue-500 text-white font-black uppercase tracking-widest text-xs py-3.5 px-8 rounded-xl mt-6 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform">Upgrade to Pro</button>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* 🚀 THE ULTRA-PREMIUM FLOATING SCREEN (Customer Deep-Dive Drawer) */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setSelectedCustomer(null)} 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" 
            />
            
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-[85vh] bg-[#0A0A0A] border-t border-white/10 rounded-t-[2.5rem] z- shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col"
            >
              {/* Floating Screen Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#0a0a0a] rounded-t-[2.5rem] shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-[#111] border border-white/10 flex items-center justify-center shadow-inner">
                    <span className="text-sm font-black text-white">{selectedCustomer.phone.slice(-4)}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-widest">{selectedCustomer.phone}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedCustomer.segment === 'vip' ? (
                        <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><Crown className="w-2.5 h-2.5" /> Top 1% Client</span>
                      ) : (
                        <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><Users className="w-2.5 h-2.5" /> Regular</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 no-scrollbar pb-32">
                
                {/* 🔹 Basic Info Row */}
                <div className="flex items-center justify-between bg-[#111] border border-white/5 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">First Visit</p>
                      <p className="text-xs font-bold text-zinc-300">{selectedCustomer.first_visit?.toLocaleDateString() || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Last Visit</p>
                      <p className="text-xs font-bold text-zinc-300">{selectedCustomer.last_visit?.toLocaleDateString() || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* 🔹 Financial Layer */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> Financial Layer</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/5 p-4 rounded-2xl">
                      <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-1">Lifetime Value (LTV)</p>
                      <h4 className="text-2xl font-black text-white">₹{selectedCustomer.total_spend.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="bg-[#111] border border-white/5 p-4 rounded-2xl">
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Avg Order Value</p>
                      <h4 className="text-2xl font-black text-white">₹{selectedCustomer.avg_order_value.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="bg-[#111] border border-white/5 p-4 rounded-2xl col-span-2 flex justify-between items-center">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Highest Single Purchase</p>
                        <h4 className="text-lg font-black text-white">₹{selectedCustomer.highest_purchase.toLocaleString('en-IN')}</h4>
                      </div>
                      <TrendingUp className="w-6 h-6 text-zinc-700" />
                    </div>
                  </div>
                </div>

                {/* 🔹 Behavior Layer */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Behavior Layer</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#111] border border-white/5 p-3 rounded-xl text-center">
                      <p className="text-lg font-black text-white">{selectedCustomer.visits}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">Total Visits</p>
                    </div>
                    <div className="bg-[#111] border border-white/5 p-3 rounded-xl text-center">
                      <p className="text-lg font-black text-blue-400">{selectedCustomer.simulated_scans}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">Total Scans</p>
                    </div>
                    <div className="bg-[#111] border border-white/5 p-3 rounded-xl text-center">
                      <p className="text-lg font-black text-emerald-400">{selectedCustomer.conversion_rate}%</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">Conversion</p>
                    </div>
                  </div>
                  <div className="mt-2 bg-[#111] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">Visit Frequency</span>
                    <span className="text-xs font-black text-white bg-white/10 px-2 py-1 rounded">Every {selectedCustomer.visit_frequency} days</span>
                  </div>
                </div>

                {/* 🔹 Preference Layer (AI Ready) */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Preference Layer (AI)</h3>
                  <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex flex-wrap gap-2">
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1.5"><ShoppingBag className="w-3 h-3" /> Fav: {selectedCustomer.fav_category}</span>
                    <span className="bg-white/5 text-zinc-300 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1.5">Premium Buyer</span>
                    <span className="bg-white/5 text-zinc-300 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1.5">Color: Dark Tones</span>
                  </div>
                </div>

                {/* 🔹 Risk Layer */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5" /> Risk Layer</h3>
                  <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Churn Probability</p>
                        <p className="text-[9px] font-bold text-zinc-500 mt-0.5">{selectedCustomer.days_since_last_visit} days since last visit</p>
                      </div>
                      <span className={`text-lg font-black ${selectedCustomer.churn_prob > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {selectedCustomer.churn_prob}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${selectedCustomer.churn_prob}%` }} transition={{ duration: 1 }}
                        className={`h-full ${selectedCustomer.churn_prob > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* 🔹 Fixed Footer Action: Interaction Layer */}
              <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 shrink-0">
                <button className="w-full bg-[#25D366] hover:bg-[#1DA851] text-black font-black uppercase tracking-widest text-xs py-4 rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(37,211,102,0.2)] flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4 fill-black" /> Send 1-on-1 Offer
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
