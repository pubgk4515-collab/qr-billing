'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, Search, Loader2, MessageCircle, 
  Filter, Star, Clock, AlertTriangle, Send, Lock, 
  Crown, CheckCircle2, Wallet, Activity, Sparkles, 
  ShieldAlert, X, Calendar, ShoppingBag, History, TrendingUp
} from 'lucide-react';

// 🔥 Added proper TypeScript definitions
type Customer = {
  phone: string;
  total_spend: number;
  visits: number;
  first_visit: Date;
  last_visit: Date;
  highest_purchase: number;
  categories: Record<string, number>;
  days_since_last_visit: number;
  segment: string;
  avg_order_value: number;
  simulated_scans: number;
  conversion_rate: number;
  visit_frequency: number;
  fav_category: string;
  churn_prob: number;
};

type CartItem = {
  product_id?: string;
  products?: {
    id: string;
    category?: string;
  };
};

// 🔥 Fixed use(params) instability
export default function CRMEngine() {
  const router = useRouter();
  const params = useParams();
  
  const store_slug = params?.store_slug as string || '';
  const safeStoreSlug = decodeURIComponent(store_slug).toLowerCase().trim();


  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  
  // 🔥 Fixed type safety
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // WhatsApp Campaign States
  const [campaignText, setCampaignText] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('vip');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // PREVIEW MODAL STATES
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // FLOATING SCREEN STATE
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // NEURAL INSIGHTS STATES
  const defaultInsights = [
    {
      id: 'dummy1', type: 'anchor', title: 'The Anchor Effect',
      desc: 'Customers scanning the ₹2,999 Black Jacket rarely buy it, but 68% buy the ₹1,499 Denim right after.',
      actionLabel: 'System Action', actionText: 'The jacket is a decoy. Move it to the front of the Denim rack.',
      color: 'emerald', icon: TrendingUp
    },
    {
      id: 'dummy2', type: 'predictive', title: 'Predictive Trigger',
      desc: 'VIPs who buy Leather Shoes typically return for matching belts around Day 45.',
      actionLabel: 'Target Identified', actionText: '8 clients are at Day 43 today.',
      color: 'blue', icon: History, hasButton: true
    },
    {
      id: 'dummy3', type: 'cluster', title: 'Abandonment Cluster',
      desc: '12 recent drop-offs for the Red Hoodie share a preference for Slim Fit styles.',
      actionLabel: 'Root Cause', actionText: 'Current Regular fit clashes with audience preference.',
      color: 'rose', icon: AlertTriangle
    }
  ];
  const [neuralInsights, setNeuralInsights] = useState<any[]>(defaultInsights);

    useEffect(() => {
    if (!safeStoreSlug) {
      setLoading(false); 
      return;
    }
    
    async function fetchCRMData() {
      try {
        const { data: store } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', safeStoreSlug)
          .single();
          
        if (!store) {
          setLoading(false);
          return;
        }
        setStoreData(store);


        const { data: products } = await supabase.from('products').select('*').eq('store_id', store.id);

        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, created_at, customer_phone, purchased_items')
          .eq('store_id', store.id)
          .eq('payment_status', 'completed');

        if (sales) {
          const customerMap = new Map();
          const productSalesCount = new Map();
          const crossSellMap = new Map(); 

          sales.forEach(sale => {
            let items: CartItem[] = [];
            
            // 🔥 Fixed Unsafe JSON Parse
            try { 
              items = typeof sale.purchased_items === 'string' ? JSON.parse(sale.purchased_items) : (sale.purchased_items || []); 
            } catch (e) {
              console.warn('Invalid purchased_items JSON', sale.purchased_items);
            }
            
            items.forEach((item, idx) => {
              const pId = item.products?.id || item.product_id;
              
              // 🔥 Fixed Potential Crash (Undefined Guards)
              if (!pId) return;

              productSalesCount.set(pId, (productSalesCount.get(pId) || 0) + 1);
              
              if (items.length > 1) {
                items.forEach((otherItem, oIdx) => {
                  if (idx !== oIdx) {
                    const otherId = otherItem.products?.id || otherItem.product_id;
                    
                    // 🔥 Fixed Cross-sell map pollution
                    if (!otherId) return;

                    const pair = [pId, otherId].sort().join('-');
                    crossSellMap.set(pair, (crossSellMap.get(pair) || 0) + 1);
                  }
                });
              }
            });

            if (sale.customer_phone && sale.customer_phone !== 'WALK-IN') {
              const existing = customerMap.get(sale.customer_phone) || { 
                phone: sale.customer_phone, total_spend: 0, visits: 0, 
                first_visit: new Date(sale.created_at), last_visit: new Date(0),
                highest_purchase: 0, categories: {} as Record<string, number>
              };
              existing.total_spend += Number(sale.total_amount);
              existing.visits += 1;
              const saleDate = new Date(sale.created_at);
              if (saleDate > existing.last_visit) existing.last_visit = saleDate;
              if (saleDate < existing.first_visit) existing.first_visit = saleDate;
              if (Number(sale.total_amount) > existing.highest_purchase) existing.highest_purchase = Number(sale.total_amount);
              
              items.forEach(item => {
                const cat = item.products?.category || 'Apparel';
                existing.categories[cat] = (existing.categories[cat] || 0) + 1;
              });
              customerMap.set(sale.customer_phone, existing);
            }
          });

          const now = new Date();
          const processedCustomers: Customer[] = Array.from(customerMap.values()).map(c => {
            const diffTime = Math.abs(now.getTime() - c.last_visit.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let segment = 'regular';
            if (c.total_spend > 10000 || c.visits >= 5) segment = 'vip';
            else if (diffDays > 30) segment = 'at_risk';
            else if (diffDays <= 7 && c.visits === 1) segment = 'new';

            const favCategory = Object.entries(c.categories ?? {}).sort(([, a], [, b]) => Number(b) - Number(a))[0]?.[0] ?? 'Premium Wear';
            const simulatedScans = c.visits * (Math.floor(Math.random() * 4) + 2); 

            return { 
              ...c, 
              days_since_last_visit: diffDays, 
              segment,
              avg_order_value: c.visits ? Math.round(c.total_spend / c.visits) : 0,
              simulated_scans: simulatedScans,
              // 🔥 Fixed Divide by zero risks
              conversion_rate: simulatedScans ? Math.round((c.visits / simulatedScans) * 100) : 0,
              visit_frequency: c.visits ? Math.round((now.getTime() - c.first_visit.getTime()) / (1000 * 60 * 60 * 24 * c.visits)) : 1,
              fav_category: favCategory,
              churn_prob: diffDays > 45 ? 88 : diffDays > 20 ? 45 : 12
            };
          }).sort((a, b) => b.total_spend - a.total_spend);

          // REAL NEURAL INSIGHTS GENERATION
          const realInsights = [];
          const leakedProduct = products?.find(p => (p.scan_count || 0) > (productSalesCount.get(p.id) || 0) * 5 && p.scan_count > 10);
          if (leakedProduct) {
            realInsights.push({
              id: 'real_anchor', type: 'anchor', title: 'The Anchor Effect',
              desc: `${leakedProduct.name} has very high scans but low conversion. It's acting as a decoy.`,
              actionLabel: 'System Action', actionText: 'Place higher-margin products next to it.',
              color: 'emerald', icon: TrendingUp
            });
          }

          const atRiskCount = processedCustomers.filter(c => c.days_since_last_visit > 30 && c.total_spend > 5000).length;
          if (atRiskCount > 0) {
            realInsights.push({
              id: 'real_risk', type: 'risk', title: 'Retention Alert',
              desc: `${atRiskCount} VIP customers are showing high churn probability (30+ days absence).`,
              actionLabel: 'Target Identified', actionText: 'Ready for a personalized win-back campaign.',
              color: 'rose', icon: AlertTriangle, hasButton: true
            });
          }

          setNeuralInsights(realInsights.length > 0 ? realInsights : defaultInsights);

          if (processedCustomers.length === 0) {
            setCustomers([
              { phone: '8509460738', total_spend: 46257, visits: 12, days_since_last_visit: 2, segment: 'vip', first_visit: new Date('2025-10-12'), last_visit: new Date(), highest_purchase: 8500, avg_order_value: 3854, simulated_scans: 34, conversion_rate: 35, visit_frequency: 14, fav_category: 'Leather Goods', churn_prob: 5, categories: {} },
              { phone: '7477613224', total_spend: 14086, visits: 5, days_since_last_visit: 15, segment: 'vip', first_visit: new Date('2026-01-05'), last_visit: new Date(), highest_purchase: 4200, avg_order_value: 2817, simulated_scans: 18, conversion_rate: 27, visit_frequency: 21, fav_category: 'Denim', churn_prob: 25, categories: {} },
            ]);
          } else {
            setCustomers(processedCustomers);
          }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }

    fetchCRMData();
  }, [safeStoreSlug]);

  const plan = storeData?.plan_tier?.toLowerCase() || 'starter';
  const hasBasicCRM = ['growth', 'pro', 'elite'].includes(plan);
  const hasAdvancedCRM = ['pro', 'elite'].includes(plan);
  
  const filteredCustomers = customers.filter(c => c.phone.includes(searchQuery));
  const segmentCounts = {
    vip: customers.filter(c => c.segment === 'vip').length,
    at_risk: customers.filter(c => c.segment === 'at_risk').length,
    new: customers.filter(c => c.segment === 'new').length,
    all: customers.length
  };

  const handleSimulateCampaign = () => {
    if (!campaignText) return alert("Please enter a campaign message!");
    setIsSimulating(true);

    setTimeout(() => {
      const targetCustomers =
        selectedSegment === 'vip' ? customers.filter(c => c.segment === 'vip')
          : selectedSegment === 'at_risk' ? customers.filter(c => c.segment === 'at_risk')
          : customers;

      const targetCount = targetCustomers.length;
      const skipped = Math.floor(targetCount * 0.15);
      const finalReach = Math.max(0, targetCount - skipped);

      const sampleCustomers = targetCustomers.slice(0, 2);
      const previewSamples = sampleCustomers.map((c, i) => ({
        phone: c?.phone || 'N/A',
        text: i === 0
            ? `Hi! We noticed you love ${c.fav_category || 'Premium Wear'}. ${campaignText} Come visit us!`
            : `Hey there! Our ${c.fav_category || 'collection'} just got updated. ${campaignText} Special offer inside!`,
      }));

      if (previewSamples.length === 0) {
        previewSamples.push({ phone: 'N/A', text: `Your campaign message: "${campaignText}"` });
      }

      setPreviewData({
        total_audience: targetCount,
        skipped_by_rules: skipped,
        final_reach: finalReach,
        preview_samples: previewSamples,
      });

      setIsSimulating(false);
      setIsPreviewModalOpen(true);
    }, 1200);
  };

  const handleLaunchCampaign = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsPreviewModalOpen(false);
      setCampaignText('');
      alert("🚀 Campaign Launched Successfully!");
    }, 2000);
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-zinc-600" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24 selection:bg-white/10 overflow-x-hidden">
      
      {/* 👑 HEADER */}
      <header className="bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-40 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-10 h-10 bg-[#111] rounded-full border border-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> CRM Engine
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1 text-zinc-500">Customer Platform</p>
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
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 text-center relative overflow-hidden shadow-2xl mt-2">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
            <div className="w-20 h-20 bg-[#111] border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="w-8 h-8 text-zinc-500" /></div>
            <h2 className="text-2xl font-black text-white mb-2">CRM Locked</h2>
            <p className="text-sm font-bold text-zinc-400 mb-6 leading-relaxed">Your Starter plan does not include customer data retention.</p>
            <button className="w-full bg-amber-500 text-black font-black uppercase tracking-widest text-xs py-4 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">Upgrade to Growth</button>
          </div>
        )}

        {/* 🟢 TIER 2: BASIC CRM LIST */}
        {hasBasicCRM && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            
            {/* Mobile-Optimized Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search phone number..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-white focus:outline-none focus:border-white/30 transition-colors shadow-inner" 
              />
            </div>

            <div className="flex items-center justify-between mt-1 mb-1">
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Customer Database
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-[#111] px-2 py-1 rounded-md border border-white/5">{filteredCustomers.length} Records</span>
            </div>

            {/* Mobile-Optimized List */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-2 shadow-2xl max-h-[400px] overflow-y-auto overflow-x-hidden no-scrollbar">
              {filteredCustomers.map((customer, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedCustomer(customer)}
                  className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 active:bg-[#111] transition-colors rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#111] border border-white/5 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-zinc-400">{customer.phone.slice(-4)}</span>
                    </div>
                    <div>
                      <h4 className="font-black text-[13px] tracking-widest text-zinc-100">{customer.phone}</h4>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">
                        {customer.visits} Visits • {customer.days_since_last_visit}d ago
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-400 text-[13px]">₹{customer.total_spend.toLocaleString('en-IN')}</p>
                    <div className="flex justify-end gap-1 mt-1">
                      {customer.segment === 'vip' && <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded">VIP</span>}
                      {customer.segment === 'at_risk' && <span className="bg-rose-500/20 text-rose-400 text-[8px] font-black px-1.5 py-0.5 rounded">RISK</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 🚀 TIER 3: ADVANCED CRM */}
        {hasBasicCRM && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative bg-gradient-to-b from-[#0a0f1a] to-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mt-2">
            <div className={`pt-6 pb-6 flex flex-col gap-6 ${!hasAdvancedCRM ? 'filter blur-[10px] opacity-20 select-none pointer-events-none' : ''}`}>
              
              {/* 🧠 MOBILE OPTIMIZED NEURAL INSIGHTS (Edge-to-Edge Scroll) */}
              <div>
                <div className="flex items-center justify-between mb-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                    </div>
                    <h3 className="text-base font-black tracking-tight text-white">Neural Insights</h3>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 flex items-center gap-1 animate-pulse">
                    <Activity className="w-3 h-3" /> AI Active
                  </span>
                </div>

                {/* THE EDGE BLEED SCROLL FIX */}
                <div className="flex overflow-x-auto gap-4 pb-6 px-6 -mx-6 no-scrollbar snap-x snap-mandatory">
                  {neuralInsights.map((insight, idx) => {
                    const Icon = insight.icon;
                    const colorStyles = {
                      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'text-emerald-500' },
                      rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'text-rose-500' },
                      blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'text-blue-500' },
                    }[insight.color as string] || { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'text-purple-500' };

                    return (
                      <div key={insight.id} className={`w-[82vw] max-w-[320px] shrink-0 snap-center bg-gradient-to-br from-[#111] to-[#050505] border border-white/5 p-5 rounded-[1.5rem] relative overflow-hidden group ${idx === 0 ? 'ml-6' : ''} ${idx === neuralInsights.length - 1 ? 'mr-6' : ''}`}>
                        <div className={`absolute -right-4 -top-4 w-20 h-20 ${colorStyles.bg} rounded-full blur-2xl`} />
                        <div className="flex items-center gap-2 mb-3 relative z-10">
                          <Icon className={`w-4 h-4 ${colorStyles.text}`} />
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{insight.title}</p>
                        </div>
                        <h4 className="text-[13px] font-bold text-white leading-relaxed mb-4 relative z-10">
                          {insight.desc}
                        </h4>
                        <div className="bg-[#0a0a0a] border border-white/5 p-3 rounded-xl relative z-10 flex items-center justify-between">
                          <div>
                            <p className={`text-[8px] font-black uppercase tracking-widest ${colorStyles.border} mb-1`}>{insight.actionLabel}</p>
                            <p className="text-[11px] font-bold text-zinc-300">{insight.actionText}</p>
                          </div>
                          {insight.hasButton && (
                            <button className="bg-blue-500/10 active:bg-blue-500/20 border border-blue-500/30 text-blue-400 p-2.5 rounded-lg transition-colors shrink-0 ml-2">
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-6">
                <div className="flex items-center gap-2 mb-4"><Filter className="w-4 h-4 text-blue-400" /><h3 className="text-base font-black tracking-tight text-white">Smart Segments</h3></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#111] border border-blue-500/20 p-3 rounded-xl text-center">
                    <Star className="w-4 h-4 text-blue-400 mx-auto mb-1" /><p className="text-lg font-black text-white">{segmentCounts.vip}</p><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">VIPs</p>
                  </div>
                  <div className="bg-[#111] border border-amber-500/20 p-3 rounded-xl text-center">
                    <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" /><p className="text-lg font-black text-white">{segmentCounts.new}</p><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Recent</p>
                  </div>
                  <div className="bg-[#111] border border-rose-500/20 p-3 rounded-xl text-center">
                    <AlertTriangle className="w-4 h-4 text-rose-500 mx-auto mb-1" /><p className="text-lg font-black text-white">{segmentCounts.at_risk}</p><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">At Risk</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-white/5 pt-6 px-6">
                <div className="flex justify-between items-end mb-4">
                  <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-[#25D366]" /><h3 className="text-base font-black tracking-tight text-white">Campaign Blaster</h3></div>
                  <div className="text-right"><p className="text-[8px] font-black tracking-widest text-zinc-500 uppercase mb-0.5">Quota Left</p><p className="text-[10px] font-black text-white bg-[#111] px-2 py-1 rounded border border-white/5">284 / 300</p></div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-3.5 px-4 text-[13px] font-bold text-white focus:outline-none focus:border-blue-500/50 appearance-none">
                    <option value="vip">Target: VIP Clients ({segmentCounts.vip})</option>
                    <option value="at_risk">Target: At Risk / Churning ({segmentCounts.at_risk})</option>
                    <option value="all">Target: All Database ({segmentCounts.all})</option>
                  </select>
                  
                  <textarea 
                    placeholder="Enter your WhatsApp message here..." 
                    value={campaignText} 
                    onChange={(e) => setCampaignText(e.target.value)} 
                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3.5 px-4 text-[13px] font-bold text-zinc-300 focus:outline-none focus:border-blue-500/50 min-h-[120px] resize-none" 
                  />
                  
                  <button 
                    onClick={handleSimulateCampaign} 
                    disabled={isSimulating} 
                    className="w-full bg-[#25D366] hover:bg-[#1DA851] text-black font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(37,211,102,0.2)] flex items-center justify-center gap-2 disabled:opacity-70 mt-1"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Preview Campaign</>}
                  </button>
                </div>
              </div>
            </div>

            {!hasAdvancedCRM && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
                <div className="w-16 h-16 bg-[#111] border border-white/10 rounded-full shadow-2xl flex items-center justify-center mb-5"><Lock className="w-6 h-6 text-blue-400" /></div>
                <h3 className="text-2xl font-black text-white text-center mb-2">Unlock Advanced CRM</h3>
                <button className="bg-blue-500 text-white font-black uppercase tracking-widest text-[11px] py-4 px-8 rounded-xl mt-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 transition-transform">Upgrade to Pro</button>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* 🚀 THE NATIVE iOS/ONE UI FLOATING SCREEN */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setSelectedCustomer(null)} 
              className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
              style={{ zIndex: 999 }} 
            />
            
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto h-[92vh] bg-[#050505] border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-10px_50px_rgba(0,0,0,0.8)] flex flex-col"
              style={{ zIndex: 1000 }}
            >
              {/* Native Drag Handle */}
              <div className="w-full flex justify-center pt-4 pb-2 shrink-0">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>

              {/* Floating Screen Header */}
              <div className="flex items-center justify-between px-6 pb-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#111] border border-white/10 flex items-center justify-center shadow-inner">
                    <span className="text-sm font-black text-zinc-400">{selectedCustomer.phone.slice(-4)}</span>
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
                <button onClick={() => setSelectedCustomer(null)} className="p-2.5 bg-[#111] rounded-full active:bg-white/10 transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 no-scrollbar pb-32">
                
                {/* 🔹 Basic Info */}
                <div className="flex items-center justify-between bg-[#111] border border-white/5 p-4 rounded-[1.2rem]">
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
                      <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-1">Lifetime Value</p>
                      <h4 className="text-2xl font-black text-white">₹{selectedCustomer.total_spend.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="bg-[#111] border border-white/5 p-4 rounded-2xl">
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Avg Order Value</p>
                      <h4 className="text-2xl font-black text-white">₹{selectedCustomer.avg_order_value.toLocaleString('en-IN')}</h4>
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
                </div>

                {/* 🔹 Preference Layer */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Preference AI</h3>
                  <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex flex-wrap gap-2">
                    <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1.5"><ShoppingBag className="w-3 h-3" /> {selectedCustomer.fav_category}</span>
                    <span className="bg-white/5 text-zinc-300 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider">Premium Buyer</span>
                  </div>
                </div>

                {/* 🔹 Risk Layer */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5" /> Risk Layer</h3>
                  <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Churn Probability</p>
                        <p className="text-[9px] font-bold text-zinc-500 mt-0.5">{selectedCustomer.days_since_last_visit} days absent</p>
                      </div>
                      <span className={`text-lg font-black ${selectedCustomer.churn_prob > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {selectedCustomer.churn_prob}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${selectedCustomer.churn_prob}%` }} transition={{ duration: 1 }} className={`h-full ${selectedCustomer.churn_prob > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 🔹 Fixed Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#050505]/90 backdrop-blur-xl border-t border-white/10 shrink-0 pb-safe">
                <button className="w-full bg-[#25D366] active:bg-[#1DA851] text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,211,102,0.2)] flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4 fill-black" /> Direct Offer
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🚀 MOBILE OPTIMIZED CAMPAIGN PREVIEW MODAL */}
      <AnimatePresence>
        {isPreviewModalOpen && previewData && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" style={{ zIndex: 1001 }} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(37,211,102,0.15)] overflow-hidden flex flex-col"
              style={{ zIndex: 1002 }}
            >
              <div className="p-4 border-b border-white/5 bg-[#111] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/20">
                    <Send className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <h3 className="text-base font-black tracking-tight text-white">Preview</h3>
                </div>
                <button onClick={() => setIsPreviewModalOpen(false)} className="p-2 bg-white/5 rounded-full active:bg-white/10"><X className="w-4 h-4 text-zinc-400" /></button>
              </div>

              <div className="p-4 bg-gradient-to-b from-[#111] to-[#0a0a0a]">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="bg-[#050505] border border-white/5 p-3 rounded-xl text-center">
                    <p className="text-lg font-black text-white">{previewData.total_audience}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">Audience</p>
                  </div>
                  <div className="bg-[#050505] border border-emerald-500/10 p-3 rounded-xl text-center">
                    <p className="text-lg font-black text-emerald-400">{previewData.skipped_by_rules}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500/70 mt-1">Skipped</p>
                  </div>
                  <div className="bg-[#050505] border border-blue-500/20 p-3 rounded-xl text-center">
                    <p className="text-lg font-black text-blue-400">{previewData.final_reach}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-blue-500/70 mt-1">Reach</p>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className="flex flex-col gap-2">
                  {previewData.preview_samples.map((sample: any, idx: number) => (
                    <div key={idx} className="bg-[#111] border border-white/5 p-3 rounded-xl relative">
                      <p className="text-[9px] font-black text-zinc-500 mb-1">To: {sample.phone}</p>
                      <p className="text-[11px] font-bold text-zinc-300 leading-relaxed">"{sample.text}"</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
                <div className="flex gap-3">
                  <button onClick={() => setIsPreviewModalOpen(false)} className="flex-1 py-3.5 rounded-xl border border-white/10 text-white text-[11px] font-black uppercase tracking-widest active:bg-white/5">
                    Cancel
                  </button>
                  <button onClick={handleLaunchCampaign} disabled={isSending} className="flex-1 bg-[#25D366] active:bg-[#1DA851] text-black py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>🚀 Launch</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
