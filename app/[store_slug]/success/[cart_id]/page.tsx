'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, MapPin, Instagram, Facebook, Youtube, MessageCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'; // Adjust path if needed

export default function SuccessPage({ params }: { params: Promise<{ store_slug: string, cart_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug, cart_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  useEffect(() => {
    if (!safeStoreSlug) return;
    
    async function fetchStore() {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('store_name, theme_color, whatsapp_number') // Make sure whatsapp_number exists in DB
          .ilike('slug', safeStoreSlug)
          .single();
          
        if (data) setStoreData(data);
      } catch (err) {
        console.error("Error fetching store:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [safeStoreSlug]);

  // Dynamic values
  const themeColor = storeData?.theme_color || '#10b981'; // Default Emerald
  // Defaulting to your number if store hasn't set one yet
  const storePhone = storeData?.whatsapp_number || "8509460738"; 

  const handleWhatsAppBill = () => {
    const text = encodeURIComponent(`Hi! Please generate my digital bill for order ${cart_id} at ${storeData?.store_name || 'your store'}.`);
    window.open(`https://wa.me/${storePhone}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      {/* 🌟 Dynamic Background Glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 blur-[100px] rounded-full pointer-events-none opacity-20" 
        style={{ backgroundColor: themeColor }}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Main Success Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl mb-6">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-2"
            style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` }}
          >
            <CheckCircle2 className="w-12 h-12" style={{ color: themeColor }} />
          </motion.div>

          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Payment Done!</h1>
          <p className="text-zinc-400 mb-6">Thank you for shopping at <span className="font-bold text-white">{storeData?.store_name || 'our store'}</span>.</p>
          
          <div className="bg-black/30 rounded-2xl p-4 mb-8 border border-white/5">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Order ID</p>
            <p className="text-xl font-mono text-white font-bold">{cart_id}</p>
          </div>

          {/* WhatsApp Bill Button */}
          <button 
            onClick={handleWhatsAppBill}
            className="w-full bg-[#25D366] text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(37,211,102,0.2)] flex items-center justify-center gap-3 text-lg"
          >
            <MessageCircle className="w-6 h-6" />
            Get VIP Digital Bill
          </button>
        </div>

        {/* Marketing / Retention Links */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <p className="text-center text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Connect With Us</p>
          
          <SocialButton icon={<MapPin className="w-5 h-5 text-red-400" />} label="Rate us on Google Maps" color="hover:border-red-500/50 hover:bg-red-500/10" delay={0.5} />
          <SocialButton icon={<Instagram className="w-5 h-5 text-pink-400" />} label="Follow on Instagram" color="hover:border-pink-500/50 hover:bg-pink-500/10" delay={0.6} />
          <SocialButton icon={<Facebook className="w-5 h-5 text-blue-400" />} label="Join our Facebook VIPs" color="hover:border-blue-500/50 hover:bg-blue-500/10" delay={0.7} />
          <SocialButton icon={<Youtube className="w-5 h-5 text-red-500" />} label="Subscribe on YouTube" color="hover:border-red-600/50 hover:bg-red-600/10" delay={0.8} />
        </motion.div>
        
        {/* Back to Home Button */}
        <motion.button 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          onClick={() => router.push(`/${safeStoreSlug}/cart`)}
          className="w-full mt-6 text-sm font-bold text-zinc-500 hover:text-white transition-colors py-2"
        >
          Start a new session
        </motion.button>

      </motion.div>
    </div>
  );
}

// Reusable Social Button Component
function SocialButton({ icon, label, color, delay }: { icon: React.ReactNode, label: string, color: string, delay: number }) {
  return (
    <motion.button 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`w-full bg-white/5 border border-white/10 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between group transition-all ${color}`}
    >
      <div className="flex items-center gap-4">
        <div className="bg-black/40 p-2 rounded-xl border border-white/5">{icon}</div>
        <span className="font-bold text-zinc-300 group-hover:text-white transition-colors">{label}</span>
      </div>
      <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
    </motion.button>
  );
}
