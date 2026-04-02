'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ShoppingBag, ArrowRight, Loader2, 
  ShieldCheck, CreditCard, Banknote, Smartphone, X, ScanLine 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { processCheckout, checkPaymentStatus } from '../../actions/billingActions';

export default function CartPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  
  // Checkout States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('ONLINE'); 
  const [phone, setPhone] = useState('');
  
  // Success / Waiting & Scanner States
  const [generatedCartId, setGeneratedCartId] = useState('');
  const [isWaitingForAdmin, setIsWaitingForAdmin] = useState(false);
  const [isScanning, setIsScanning] = useState(false); // 🔥 Naya Scanner State

  useEffect(() => {
    async function fetchStoreAndCart() {
      try {
        const { data: store, error } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color')
          .eq('slug', store_slug)
          .single();

        if (error || !store) throw new Error('Store not found');
        setStoreData(store);

        const cartKey = `cart_${store_slug}`;
        const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setCartItems(savedCart);
      } catch (err) {
        console.error("Error loading cart:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStoreAndCart();
  }, [store_slug]);

  // 🗑️ Remove Item
  const removeItem = (tagId: string) => {
    const updatedCart = cartItems.filter(item => item.tag_id !== tagId);
    setCartItems(updatedCart);
    localStorage.setItem(`cart_${store_slug}`, JSON.stringify(updatedCart));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const totalItems = cartItems.length;

  // 🚀 Final Checkout Handler
  const handleConfirmOrder = async () => {
    if (paymentMethod === 'ONLINE' && phone.length !== 10) {
      return alert("Please enter a valid 10-digit phone number for online receipt.");
    }

    setIsProcessing(true);
    const cartId = `CART-${Math.floor(1000 + Math.random() * 9000)}`;
    const tagIds = cartItems.map(item => item.tag_id);

    const res = await processCheckout(tagIds, {
      cartId,
      paymentMethod,
      customerPhone: phone || 'WALK-IN',
      store_slug
    });

    if (res.success) {
      localStorage.removeItem(`cart_${store_slug}`);
      setCartItems([]);
      setGeneratedCartId(cartId);
      setIsWaitingForAdmin(true);
      setShowCheckoutModal(false);
    } else {
      alert("Error: " + res.message);
    }
    setIsProcessing(false);
  };

  // 🔄 POLLING: Check Admin Approval automatically
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWaitingForAdmin && generatedCartId) {
      interval = setInterval(async () => {
        const res = await checkPaymentStatus(generatedCartId);
        if (res.success && res.status === 'completed') {
          clearInterval(interval);
          router.push(`/bill/${generatedCartId}`);
        }
      }, 3000); 
    }
    return () => clearInterval(interval);
  }, [isWaitingForAdmin, generatedCartId, router]);


  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Loading Bag</p>
      </div>
    );
  }

  // 🕒 WAITING SCREEN (Shown after checkout)
  if (isWaitingForAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 relative">
          <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
          <ShieldCheck className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-black mb-2">Awaiting Confirmation</h1>
        <p className="text-zinc-400 text-sm mb-8">Please show this Cart ID at the billing counter.</p>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl w-full max-w-sm mb-8">
          <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-1">Your Cart ID</p>
          <p className="text-4xl font-mono font-black tracking-widest" style={{ color: storeData?.theme_color || '#10b981' }}>
            {generatedCartId.replace('CART-', '')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col relative font-sans selection:bg-white/20">
      
      {/* 👑 PREMIUM BRANDED HEADER - FIXED AT TOP */}
      <header 
        className="fixed top-0 left-0 right-0 px-5 py-4 flex items-center gap-3 z-40 shadow-2xl backdrop-blur-md" 
        style={{ 
          backgroundColor: storeData?.theme_color ? `${storeData.theme_color}e6` : 'rgba(24, 24, 27, 0.9)' // Added opacity for blur
        }}
      >
        {storeData?.logo_url ? (
          <img src={storeData.logo_url} alt="logo" className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg" />
        ) : (
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold shadow-inner">
            {storeData?.store_name?.charAt(0) || 'S'}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-black leading-tight text-white">{storeData?.store_name}</h1>
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/70 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Secure Checkout
          </p>
        </div>
        <div className="bg-black/40 px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold shadow-inner">
          {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
        </div>
      </header>

      {/* 🛍️ CART ITEMS (Added pt-24 to offset the fixed header) */}
      <div className="flex-1 p-5 pt-24 pb-40 flex flex-col gap-4">
        <h2 className="text-2xl font-black mb-2">My Bag</h2>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4 mt-10">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5"><ShoppingBag className="w-10 h-10 opacity-50" /></div>
            <div className="text-center"><h3 className="text-white font-bold text-lg">Your bag is empty</h3></div>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.tag_id} className="bg-zinc-900/60 border border-white/10 p-3 rounded-2xl flex gap-4 items-center relative overflow-hidden shadow-lg">
                <div className="w-20 h-24 bg-black rounded-xl overflow-hidden flex-shrink-0 border border-white/5">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-zinc-700" /></div>}
                </div>
                <div className="flex-1 flex flex-col justify-between h-full py-1">
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-white line-clamp-2 pr-6">{item.name}</h3>
                    <div className="mt-1.5"><span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-300 uppercase">Size: {item.size}</span></div>
                  </div>
                  <p className="text-emerald-400 font-black text-lg mt-2">₹{item.price}</p>
                </div>
                <button onClick={() => removeItem(item.tag_id)} className="absolute top-3 right-3 p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔥 NEW PREMIUM FLOATING DOCK (Merged UI) */}
      {!showCheckoutModal && !isScanning && (
        <div className="fixed bottom-6 left-4 right-4 z-40 max-w-md mx-auto">
          <div className="bg-zinc-900/90 backdrop-blur-3xl border border-white/10 p-2 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
            
            {/* 1. Grand Total */}
            <div className="pl-5 flex flex-col justify-center min-w-[80px]">
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-0.5">Total</p>
              <p className="text-xl font-black text-white leading-none tracking-tight">₹{subtotal}</p>
            </div>
            
            <div className="flex items-center gap-2 pr-1">
              {/* 2. QR Scan Button */}
              <button 
                onClick={() => setIsScanning(true)}
                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/5 shadow-inner"
              >
                <ScanLine className="w-5 h-5 text-white" />
              </button>

              {/* 3. Checkout Button */}
              <button 
                onClick={() => {
                  if(cartItems.length > 0) setShowCheckoutModal(true);
                  else alert("Bag is empty! Scan items first.");
                }}
                style={{ backgroundColor: storeData?.theme_color || '#10b981', color: '#000' }}
                className={`h-12 px-6 rounded-full font-black flex items-center justify-center gap-2 transition-all shadow-xl ${cartItems.length === 0 ? 'opacity-50 grayscale' : 'hover:opacity-90 active:scale-95'}`}
              >
                Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📷 FUTURISTIC SCANNER UI MODAL */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z- bg-black flex flex-col"
          >
            {/* Scanner Header */}
            <div className="flex justify-between items-center p-6 relative z-10">
              <h3 className="text-white font-bold tracking-widest uppercase text-sm">Scan QR Code</h3>
              <button onClick={() => setIsScanning(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Viewfinder Area */}
            <div className="flex-1 flex items-center justify-center p-8 relative">
              <div className="absolute inset-0 bg-zinc-900/40" /> {/* Dark overlay outside scanner */}
              
              <div className="relative w-64 h-64 border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] z-10 flex items-center justify-center bg-transparent">
                
                {/* 4 Corner Markers */}
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-[2rem]" style={{ borderColor: storeData?.theme_color || '#10b981' }} />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-[2rem]" style={{ borderColor: storeData?.theme_color || '#10b981' }} />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-[2rem]" style={{ borderColor: storeData?.theme_color || '#10b981' }} />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-[2rem]" style={{ borderColor: storeData?.theme_color || '#10b981' }} />
                
                {/* Animated Laser Line */}
                <motion.div 
                  animate={{ y: [-110, 110, -110] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="w-[90%] h-1 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                  style={{ backgroundColor: storeData?.theme_color || '#10b981' }}
                />
              </div>
            </div>

            {/* Scanner Footer */}
            <div className="p-8 pb-12 text-center z-10 bg-gradient-to-t from-black to-transparent">
              <ScanLine className="w-8 h-8 text-white/50 mx-auto mb-4" />
              <p className="text-zinc-400 text-sm max-w-[250px] mx-auto leading-relaxed">
                Point your camera at the physical QR tag on the product to add it to your bag.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💳 CHECKOUT MODAL (Slides up) */}
      <AnimatePresence>
        {showCheckoutModal && (
          <div className="fixed inset-0 z- flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center sm:p-6">
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-zinc-950 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] border-t sm:border border-white/10 p-6 shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <h3 className="text-xl font-black flex items-center gap-2"><CreditCard className="w-5 h-5"/> Complete Payment</h3>
                <button onClick={() => setShowCheckoutModal(false)} className="text-zinc-500 hover:text-white bg-white/5 p-2 rounded-full"><X className="w-4 h-4"/></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">WhatsApp Number (For Bill)</label>
                  <div className="flex bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-colors">
                    <span className="px-4 py-4 text-zinc-500 font-bold bg-white/5">+91</span>
                    <input type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="Enter 10 digits" className="w-full bg-transparent text-white font-bold px-4 outline-none placeholder:text-zinc-700" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPaymentMethod('ONLINE')} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'ONLINE' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/5 bg-zinc-900 text-zinc-500'}`}>
                      <Smartphone className="w-6 h-6" /> <span className="text-xs font-bold">UPI / Scan</span>
                    </button>
                    <button onClick={() => setPaymentMethod('OFFLINE')} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'OFFLINE' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/5 bg-zinc-900 text-zinc-500'}`}>
                      <Banknote className="w-6 h-6" /> <span className="text-xs font-bold">Cash at Counter</span>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleConfirmOrder}
                  disabled={isProcessing}
                  style={{ backgroundColor: storeData?.theme_color || '#10b981', color: '#000' }}
                  className="w-full font-black py-4 rounded-2xl flex justify-center items-center gap-2 mt-4 shadow-xl disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Pay ₹{subtotal} & Generate Bill</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </main>
  );
}
