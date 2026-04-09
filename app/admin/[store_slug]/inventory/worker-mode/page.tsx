'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { ArrowLeft, Share2, CheckCircle2, Smartphone, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkerControlPanel({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [workerLink, setWorkerLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [deviceStats, setDeviceStats] = useState<any[]>([]);

  useEffect(() => {
    if (!safeStoreSlug) return;

    async function fetchData() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (store) {
          setStoreData(store);
          setWorkerLink(`${window.location.origin}/${safeStoreSlug}/worker`);

          const { data: products } = await supabase
            .from('products')
            .select('added_by_device')
            .eq('store_id', store.id)
            .not('added_by_device', 'is', null);

          if (products) {
            const stats: any = {};
            products.forEach((p: any) => {
              const device = p.added_by_device || 'Unknown Device';
              stats[device] = (stats[device] || 0) + 1;
            });

            const sortedStats = Object.keys(stats)
              .map(key => ({ device: key, count: stats[key] }))
              .sort((a, b) => b.count - a.count);

            setDeviceStats(sortedStats);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const interval = setInterval(() => {
      if (storeData) fetchData();
    }, 5000);
    return () => clearInterval(interval);

  }, [safeStoreSlug, storeData?.id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${storeData?.store_name || 'Store'} Worker Terminal`,
          text: 'Add items to the inventory using this secure link:',
          url: workerLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback for PC/Desktop users
      navigator.clipboard.writeText(workerLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const themeColor = storeData?.theme_color || '#10b981';

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24 selection:bg-white/10">
      
      {/* HEADER */}
      <header className="bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => router.push(`/admin/${safeStoreSlug}/inventory`)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-300" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none">Worker Terminal</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold mt-1 text-zinc-500">Live Device Tracking</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* 🔗 LINK SECTION */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-2">Worker Invite Link</p>
          <div className="w-full bg-[#111] border border-white/10 rounded-[1.5rem] p-4 flex items-center justify-between shadow-xl">
             <div className="overflow-hidden flex-1 text-left mr-4">
               <p className="text-sm font-bold text-white truncate">{workerLink}</p>
             </div>
             
             {/* SMART SHARE BUTTON */}
             <button onClick={handleShare} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-colors active:scale-95 shrink-0">
               <AnimatePresence mode="wait">
                 {copied ? (
                   <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                     <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                   </motion.div>
                 ) : (
                   <motion.div key="share" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                     <Share2 className="w-5 h-5 text-zinc-300" />
                   </motion.div>
                 )}
               </AnimatePresence>
             </button>
          </div>
        </div>

        {/* 📊 LIVE TRACKING TABLE */}
        <div>
          <div className="flex items-center justify-between mb-4 ml-2 pr-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Live Worker Activity
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Live Sync</span>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 p-5 border-b border-white/5 bg-[#111]/50 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <div className="col-span-3">Device Model</div>
              <div className="col-span-1 text-right">Items Added</div>
            </div>

            {/* Table Body */}
            <div className="flex flex-col">
              {deviceStats.length > 0 ? (
                deviceStats.map((stat, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    key={idx} 
                    className="grid grid-cols-4 gap-4 p-5 border-b border-white/5 last:border-0 items-center hover:bg-white/5 transition-colors"
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4 text-zinc-400" />
                      </div>
                      <span className="font-bold text-sm text-white truncate">{stat.device}</span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-black" style={{ backgroundColor: `${themeColor}20`, color: themeColor }}>
                        {stat.count}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-10 text-center flex flex-col items-center justify-center text-zinc-500">
                  <Smartphone className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">No activity yet</p>
                  <p className="text-[10px] mt-1 opacity-50">Items added by workers will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
