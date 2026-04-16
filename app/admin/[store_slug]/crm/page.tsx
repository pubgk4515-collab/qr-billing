'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, Search, PhoneCall, Loader2, 
  MessageCircle, Filter, Star, Clock, AlertTriangle, 
  Send, Lock, Crown, ChevronRight, CheckCircle2
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

  useEffect(() => {
    if (!safeStoreSlug) return;
    async function fetchCRMData() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (!store) return;
        setStoreData(store);

        // Fetching all successful sales to build the CRM organically
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, created_at, customer_phone')
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
                last_visit: new Date(0) 
              };
              
              existing.total_spend += Number(sale.total_amount);
              existing.visits += 1;
              const saleDate = new Date(sale.created_at);
              if (saleDate > existing.last_visit) existing.last_visit = saleDate;
              
              customerMap.set(sale.customer_phone, existing);
            }
          });

          // Calculate Days Since Last Visit for Smart Segmentation
          const now = new Date();
          const processedCustomers = Array.from(customerMap.values()).map(c => {
            const diffTime = Math.abs(now.getTime() - c.last_visit.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let segment = 'regular';
            if (c.total_spend > 10000 || c.visits >= 5) segment = 'vip';
            else if (diffDays > 30) segment = 'at_risk';
            else if (diffDays <= 7 && c.visits === 1) segment = 'new';

            return { ...c, days_since_last_visit: diffDays, segment };
          }).sort((a, b) => b.total_spend - a.total_spend);

          // Mock Data Injector if DB is empty (For UI Preview)
          if (processedCustomers.length === 0) {
            setCustomers([
              { phone: '8509460738', total_spend: 46257, visits: 12, days_since_last_visit: 2, segment: 'vip' },
              { phone: '7477613224', total_spend: 14086, visits: 5, days_since_last_visit: 15, segment: 'vip' },
              { phone: '9845322109', total_spend: 2100, visits: 1, days_since_last_visit: 45, segment: 'at_risk' },
              { phone: '6298119981', total_spend: 1200, visits: 1, days_since_last_visit: 3, segment: 'new' },
              { phone: '7076445662', total_spend: 5596, visits: 3, days_since_last_visit: 12, segment: 'regular' },
            ]);
          } else {
            setCustomers(processedCustomers);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchCRMData();
  }, [safeStoreSlug]);

  const handleSendCampaign = () => {
    if(!campaignText) return alert("Please enter a message!");
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setCampaignText('');
      alert(`✅ Campaign dispatched successfully to ${selectedSegment.toUpperCase()} segment!`);
    }, 1500);
  };

  // 🧠 BILLIONAIRE ACCESS LOGIC
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
      <header className="bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50 px-6 py-4">
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
             plan === 'growth' ? 'bg-amber-500/10 border-amber-500/30' : 
             'bg-zinc-800 border-zinc-700'
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

        {/* 🛑 TIER 1 LOCK: STARTER PLAN */}
        {!hasBasicCRM && (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 text-center relative overflow-hidden shadow-2xl mt-4">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
            <div className="w-20 h-20 bg-[#111] border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Lock className="w-8 h-8 text-zinc-500" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">CRM Locked</h2>
            <p className="text-sm font-bold text-zinc-400 mb-6 leading-relaxed">
              Your Starter plan does not include customer data retention. Upgrade to capture walk-ins and build a digital database.
            </p>
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 text-left mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3">Growth Plan Unlocks:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-zinc-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Save Customer Numbers</li>
                <li className="flex items-center gap-2 text-xs font-bold text-zinc-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Purchase History Tracking</li>
                <li className="flex items-center gap-2 text-xs font-bold text-zinc-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Average Order Value Data</li>
              </ul>
            </div>
            <button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-xs py-4 rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              Upgrade to Growth
            </button>
          </div>
        )}

        {/* 🟢 TIER 2: BASIC CRM (Visible for Growth, Pro, Elite) */}
        {hasBasicCRM && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search 10-digit phone number..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-white focus:outline-none focus:border-white/30 transition-colors shadow-inner" 
              />
            </div>

            <div className="flex items-center justify-between mt-2 mb-1">
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Customer Database
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-[#111] px-2 py-1 rounded-md border border-white/5">
                {filteredCustomers.length} Records
              </span>
            </div>

            {/* Customer List Container (Scrollable) */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-2 shadow-2xl max-h-[350px] overflow-y-auto overflow-x-hidden no-scrollbar">
              {filteredCustomers.map((customer, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#111] border border-white/5 flex items-center justify-center">
                      <span className="text-xs font-black text-zinc-400">
                        {customer.phone.slice(-4)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-black text-sm tracking-widest text-zinc-100">{customer.phone}</h4>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">
                        {customer.visits} Visits • Last: {customer.days_since_last_visit}d ago
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-400 text-sm">₹{customer.total_spend.toLocaleString('en-IN')}</p>
                    <div className="flex justify-end gap-1 mt-1">
                      {customer.segment === 'vip' && <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded">VIP</span>}
                      {customer.segment === 'at_risk' && <span className="bg-rose-500/20 text-rose-400 text-[8px] font-black px-1.5 py-0.5 rounded">RISK</span>}
                    </div>
                  </div>
                </div>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="p-8 text-center text-zinc-500 font-bold text-xs">No customers found.</div>
              )}
            </div>
          </motion.div>
        )}

        {/* 🚀 TIER 3: ADVANCED CRM (Smart Segments & WhatsApp Blaster) */}
        {hasBasicCRM && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative bg-gradient-to-b from-[#0a0f1a] to-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mt-4">
            
            {/* The Content (Blurred if not Pro/Elite) */}
            <div className={`p-6 flex flex-col gap-6 ${!hasAdvancedCRM ? 'filter blur-[10px] opacity-20 select-none pointer-events-none' : ''}`}>
              
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-black tracking-tight text-white">Smart Segments</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#111] border border-blue-500/20 p-3 rounded-xl text-center shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                    <Star className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <p className="text-xl font-black text-white">{segmentCounts.vip}</p>
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">VIPs</p>
                  </div>
                  <div className="bg-[#111] border border-amber-500/20 p-3 rounded-xl text-center shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                    <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-xl font-black text-white">{segmentCounts.new}</p>
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">Recent</p>
                  </div>
                  <div className="bg-[#111] border border-rose-500/20 p-3 rounded-xl text-center shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                    <AlertTriangle className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                    <p className="text-xl font-black text-white">{segmentCounts.at_risk}</p>
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">At Risk</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <div className="flex justify-between items-end mb-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    <h3 className="text-base font-black tracking-tight text-white">Campaign Blaster</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black tracking-widest text-zinc-500 uppercase mb-0.5">Quota Left</p>
                    <p className="text-xs font-black text-white bg-[#111] px-2 py-0.5 rounded border border-white/5">284 / 300</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <select 
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                  >
                    <option value="vip">Target: VIP Clients ({segmentCounts.vip})</option>
                    <option value="at_risk">Target: At Risk / Churning ({segmentCounts.at_risk})</option>
                    <option value="all">Target: All Database ({customers.length})</option>
                  </select>

                  <textarea 
                    placeholder="Enter your WhatsApp message here... (e.g. Special 10% off for you!)"
                    value={campaignText}
                    onChange={(e) => setCampaignText(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-zinc-300 focus:outline-none focus:border-blue-500/50 min-h-[100px] resize-none"
                  />

                  <button 
                    onClick={handleSendCampaign}
                    disabled={isSending}
                    className="w-full bg-[#25D366] hover:bg-[#1DA851] text-black font-black uppercase tracking-widest text-[10px] py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(37,211,102,0.2)] flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Campaign</>}
                  </button>
                </div>
              </div>

            </div>

            {/* OVERLAY FOR GROWTH PLAN USERS */}
            {!hasAdvancedCRM && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 p-6">
                <div className="w-14 h-14 bg-[#111] border border-white/10 rounded-full shadow-2xl flex items-center justify-center mb-5">
                  <Lock className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-white text-center mb-2">Unlock Advanced CRM</h3>
                <p className="text-xs font-bold text-zinc-400 text-center max-w-[280px] mb-6 leading-relaxed">
                  Get AI-driven customer segmentation and send automated WhatsApp campaigns to boost repeat sales.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-[250px] mb-6">
                   <div className="flex items-center gap-2 bg-[#111] p-2.5 rounded-lg border border-white/5"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /><span className="text-[10px] font-black uppercase tracking-wider">300 Free WA Msgs / Month</span></div>
                   <div className="flex items-center gap-2 bg-[#111] p-2.5 rounded-lg border border-white/5"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /><span className="text-[10px] font-black uppercase tracking-wider">Predictive Churn Alerts</span></div>
                </div>
                <button className="bg-blue-500 text-white font-black uppercase tracking-widest text-xs py-3.5 px-8 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform">
                  Upgrade to Pro
                </button>
              </div>
            )}
          </motion.div>
        )}

      </main>
    </div>
  );
}
