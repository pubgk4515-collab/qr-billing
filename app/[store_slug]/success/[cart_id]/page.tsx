'use client';

import { use, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, MapPin, Instagram, Facebook, Youtube, 
  MessageCircle, ArrowRight, Loader2, Clock 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'; // Path verify kar lena (4 levels deep if needed)

export default function SuccessPage({ params }: { params: Promise<{ store_slug: string, cart_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug, cart_id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  
  // 🔥 THE NEW STATE: Default is 'pending' (Waiting for approval)
  const [orderStatus, setOrderStatus] = useState<string>('pending'); 

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();
  const safeCartId = decodeURIComponent(cart_id || '').toUpperCase().trim();

  // 1. Fetch Store Info (Only Once)
  useEffect(() => {
    if (!safeStoreSlug) return;
    async function fetchStore() {
      try {
        const { data } = await supabase
          .from('stores')
          .select('store_name, theme_color, whatsapp_number')
          .ilike('slug', safeStoreSlug)
          .single();
        if (data) setStoreData(data);
      } catch (err) {
        console.error("Error fetching store:", err);
      }
    }
    fetchStore();
  }, [safeStoreSlug]);

  // 2. 🔥 SILENT LIVE POLLING: Check if Admin Approved it
  useEffect(() => {
    if (!safeCartId) return;

    const checkOrderStatus = async () => {
      try {
        // Apne table ka naam 'carts' ya 'orders' jo bhi ho, wo yahan daalein
        const { data, error } = await supabase
          .from('carts') 
          .select('status')
          .eq('id', safeCartId)
          .single();

        if (data) {
          setOrderStatus(data.status);
          
          // Agar Admin ne approve kar diya hai, toh cart khaali kardo
          if (data.status === 'approved' || data.status === 'completed') {
             localStorage.removeItem(`cart_${safeStoreSlug}`);
          }
        }
      } catch (err) {
        console.error("Cart sync error:", err);
      } finally {
        setLoading(false); // Pehli baar check hote hi loading hata do
      }
    };

    checkOrderStatus(); // Pehli baar turant run karo
    
    // Har 2 second mein database se current status poocho
    const intervalId = setInterval(checkOrderStatus, 2000); 

    return () => clearInterval(intervalId); // Memory leak bachane ke liye
  }, [safeCartId, safeStoreSlug]);

  // Dynamic values
  const themeColor = storeData?.theme_color || '#10b981'; 
  const storePhone = storeData?.whatsapp_number || "8509460738"; 

  const handleWhatsAppBill = () => {
    const text = encodeURIComponent(`Hi! Please generate my digital bill for order ${safeCartId} at ${storeData?.store_name || 'your store'}.`);
    window.open(`https://wa.me/91${storePhone}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Connecting to Counter</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      
      {/* 🌟 Dynamic Background Glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 blur-[120px] rounded-full pointer-events-none opacity-20 transition-colors duration-1000" 
        style={{ backgroundColor: orderStatus === 'pending' ? '#ef4444' : themeColor }} // Red while waiting, Theme color on success
      />

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          
          {/* =========================================
              STATE 1: WAITING FOR APPROVAL 
              ========================================= */}
          {orderStatus === 'pending' ? (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center text-center mt-10"
            >
               {/* Pulsing Clock Icon */}
               <div className="relative mb-8">
                 <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                   <Clock className="w-10 h-10 text-red-500" />
                 </div>
                 {/* Outer pulse ring */}
                 <motion.div 
                   animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                   transition={{ repeat: Infinity, duration: 2 }}
                   className="absolute inset-0 border-2 border-red-500/30 rounded-full"
                 />
               </div>

               <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Waiting for approval</h1>
               <p className="text-sm text-zinc-400 mb-10 max-w-[280px] leading-relaxed">
                 Please show this Cart ID at the billing counter to verify your items.
               </p>

               {/* Cart ID Box */}
               <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full shadow-2xl mb-12 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                 <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-2">CART ID</p>
                 <p className="text-4xl font-black text-white tracking-tighter">{safeCartId}</p>
               </div>

               <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                 Do not press back or close this app
               </p>
            </motion.div>
          ) : 
          
          /* =========================================
             STATE 2: SUCCESS / PAYMENT DONE 
             ========================================= */
          (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full"
            >
              {/* Main Success Card */}
              <div className="bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-6">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-2 shadow-2xl"
                  style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}40` }}
                >
                  <CheckCircle2 className="w-12 h-12" style={{ color: themeColor }} />
                </motion.div>

                <h1 className="text-4xl font-black text-white mb-3 tracking-tighter leading-none">Payment Done!</h1>
                <p className="text-zinc-400 mb-8 text-sm font-medium">Thank you for shopping at <span className="font-black text-white">{storeData?.store_name || 'our store'}</span>.</p>
                
                <div className="bg-black/50 rounded-[2rem] p-5 mb-8 border border-white/5 shadow-inner">
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">Order ID</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{safeCartId}</p>
                </div>

                {/* WhatsApp Bill Button */}
                <button 
                  onClick={handleWhatsAppBill}
                  className="w-full bg-[#25D366] text-black font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_rgba(37,211,102,0.3)] flex items-center justify-center gap-3 text-lg"
                >
                  <MessageCircle className="w-6 h-6" />
                  Get VIP Digital Bill
                </button>
              </div>

              {/* Marketing / Retention Links */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <p className="text-center text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 mt-8">Connect With Us</p>
                
                <SocialButton icon={<MapPin className="w-5 h-5 text-red-400" />} label="Rate us on Google Maps" color="hover:border-red-500/30 hover:bg-red-500/10" delay={0.4} />
                <SocialButton icon={<Instagram className="w-5 h-5 text-pink-400" />} label="Follow on Instagram" color="hover:border-pink-500/30 hover:bg-pink-500/10" delay={0.5} />
                <SocialButton icon={<Facebook className="w-5 h-5 text-blue-400" />} label="Join our Facebook VIPs" color="hover:border-blue-500/30 hover:bg-blue-500/10" delay={0.6} />
                <SocialButton icon={<Youtube className="w-5 h-5 text-red-500" />} label="Subscribe on YouTube" color="hover:border-red-600/30 hover:bg-red-600/10" delay={0.7} />
              </motion.div>
              
              {/* Back to Home Button */}
              <motion.button 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
                onClick={() => router.push(`/${safeStoreSlug}/cart`)}
                className="w-full mt-8 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors py-3"
              >
                Start a new session
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
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
      className={`w-full bg-[#111] border border-white/5 p-4 rounded-2xl flex items-center justify-between group transition-all active:scale-95 ${color}`}
    >
      <div className="flex items-center gap-4">
        <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 shadow-inner">{icon}</div>
        <span className="font-black text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
      </div>
      <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-transform group-hover:translate-x-1" />
    </motion.button>
  );
}
