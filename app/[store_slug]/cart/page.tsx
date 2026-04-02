'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ShoppingBag, Loader2, ShieldCheck, CreditCard, 
  Banknote, Smartphone, X, ScanLine, ArrowLeft 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { processCheckout, checkPaymentStatus } from '../../actions/billingActions';

export default function CartPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  // 🔥 UNIVERSAL SAFE KEY (Prevents Bag Empty Bugs due to case mismatch)
  const safeStoreSlug = store_slug.toLowerCase();

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  
  // Modals & User Input States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); 
  const [phone, setPhone] = useState('');
  
  // Checkout & Scanner States
  const [generatedCartId, setGeneratedCartId] = useState('');
  const [isWaitingForAdmin, setIsWaitingForAdmin] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // 1. Fetch Store and Initial Cart Load
  useEffect(() => {
    async function fetchStoreAndCart() {
      try {
        const { data: store, error } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color')
          .ilike('slug', safeStoreSlug)
          .single();

        if (error || !store) throw new Error('Store not found');
        setStoreData(store);

        const cartKey = `cart_${safeStoreSlug}`;
        const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setCartItems(savedCart);
      } catch (err) {
        console.error("Error loading cart:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStoreAndCart();
  }, [safeStoreSlug]);

  // 2. Remove Item from Cart
  const removeItem = (tagId: string) => {
    const updatedCart = cartItems.filter(item => item.tag_id !== tagId);
    setCartItems(updatedCart);
    localStorage.setItem(`cart_${safeStoreSlug}`, JSON.stringify(updatedCart));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const totalItems = cartItems.length;

  // 3. Online/Offline Payment Flow
  const handlePaymentClick = async (method: 'ONLINE' | 'OFFLINE') => {
    if (phone.length > 0 && phone.length !== 10) {
      return alert("Please enter a valid 10-digit phone number.");
    }

    setIsProcessing(method);
    const cartId = `CART-${Math.floor(1000 + Math.random() * 9000)}`;
    const tagIds = cartItems.map(item => item.tag_id);

    const res = await processCheckout(tagIds, {
      cartId,
      paymentMethod: method,
      customerPhone: phone || 'WALK-IN',
      store_slug: safeStoreSlug
    });

    if (res.success) {
      // CART IS SAFELY KEPT IN LOCAL STORAGE HERE
      setGeneratedCartId(cartId);

      if (method === 'ONLINE') {
        const upiId = 'merchant@upi'; // Replace with DB logic later
        const storeName = encodeURIComponent(storeData?.store_name || 'Store');
        const upiLink = `upi://pay?pa=${upiId}&pn=${storeName}&am=${subtotal}&tr=${cartId}&cu=INR`;
        
        window.location.href = upiLink;

        setTimeout(() => {
          setIsWaitingForAdmin(true);
          setShowCheckoutModal(false);
        }, 1000);
      } else {
        setIsWaitingForAdmin(true);
        setShowCheckoutModal(false);
      }
    } else {
      alert("Error processing order: " + res.message);
    }
    setIsProcessing(null);
  };

  // 4. Live Polling for Admin Approval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWaitingForAdmin && generatedCartId) {
      interval = setInterval(async () => {
        const res = await checkPaymentStatus(generatedCartId);
        if (res.success && res.status === 'completed') {
          clearInterval(interval);
          
          // PAYMENT 100% COMPLETE: NOW WE DELETE THE CART
          localStorage.removeItem(`cart_${safeStoreSlug}`);
          setCartItems([]);
          
          router.push(`/bill/${generatedCartId}`);
        }
      }, 2500); 
    }
    return () => clearInterval(interval);
  }, [isWaitingForAdmin, generatedCartId, router, safeStoreSlug]);

  // 5. Cancel Payment Safety Net
  const handleCancelPayment = () => {
    setIsWaitingForAdmin(false);
    setGeneratedCartId('');
    setIsProcessing(null);
  };

  // UI - Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // UI - Awaiting Confirmation Screen
  if (isWaitingForAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 relative">
          <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
          <ShieldCheck className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-black mb-2">Awaiting Confirmation</h1>
        <p className="text-zinc-400 text-sm mb-8">Please complete payment in your UPI app, then show this ID at the counter.</p>
        
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl w-full max-w-sm mb-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
          <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-1">Your Cart ID</p>
          <p className="text-5xl font-mono font-black tracking-widest" style={{ color: storeData?.theme_color || '#10b981' }}>
            {generatedCartId.replace('CART-', '')}
          </p>
        </div>

        <button 
          onClick={handleCancelPayment}
          className="flex items-center gap-2 text-zinc-500 hover:text-white font-bold text-sm transition-colors border border-white/5 px-6 py-3 rounded-full hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Return to Bag
        </button>
      </div>
    );
  }

  // UI - Main Cart View
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col relative font-sans">
      {/* 👑 Fixed Header */}
      <header className="fixed top-0 left-0 right-0 px-5 py-4 flex items-center gap-3 z-40 shadow-2xl backdrop-blur-md" style={{ backgroundColor: storeData?.theme_color ? `${storeData.theme_color}e6` : 'rgba(24, 24, 27, 0.9)' }}>
        {storeData?.logo_url ? (
          <img src={storeData.logo_url} alt="logo" className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg" />
        ) : (
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold">{storeData?.store_name?.charAt(0) || 'S'}</div>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-black leading-tight text-white">{storeData?.store_name}</h1>
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/70 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Secure Checkout</p>
        </div>
      </header>

      {/* 🛍️ Cart Items Area */}
      <div className="flex-1 p-5 pt-24 pb-40 flex flex-col gap-4">
        <h2 className="text-2xl font-black mb-2">My Bag</h2>
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4 mt-10">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5"><ShoppingBag className="w-10 h-10 opacity-50" /></div>
            <h3 className="text-white font-bold text-lg">Your bag is empty</h3>
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
                <button onClick={() => removeItem(item.tag_id)} className="absolute top-3 right-3 p-2 bg-red-500/10 text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔥 MASSIVE FLOATING DOCK (Picsart Inspired) */}
      {cartItems.length > 0 && !showCheckoutModal && !isScanning && (
        <div className="fixed bottom-6 left-4 right-4 z-40 max-w-lg mx-auto">
          <div className="flex items-center gap-4 bg-transparent p-0">
            <button onClick={() => setIsScanning(true)} className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.8)] active:scale-95">
              <ScanLine className="w-8 h-8 text-white" />
            </button>
            <button onClick={() => setShowCheckoutModal(true)} style={{ backgroundColor: storeData?.theme_color || '#10b981', color: '#000' }} className="flex-1 h-20 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:opacity-95 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              <CreditCard className="w-6 h-6" /> Pay ₹{subtotal}
            </button>
          </div>
        </div>
      )}

      {/* 📷 FUTURISTIC SCANNER UI MODAL */}
      <AnimatePresence>
        {isScanning && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 z- bg-black flex flex-col">
            <div className="flex justify-between items-center p-6 relative z-10">
              <h3 className="text-white font-bold tracking-widest uppercase text-sm">Scan QR Code</h3>
              <button onClick={() => setIsScanning(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 relative">
              <div className="absolute inset-0 bg-zinc-900/40" />
              <div className="relative w-64 h-64 border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] z-10 flex items-center justify-center bg-transparent">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-[2rem]" style={{ borderColor: storeData?.theme_color || '#10b981' }} />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-[2rem]" style={{ borderColor: storeData?.theme_color || '#10b981' }} />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-[2rem]" style={{ borderColor: storeData?.theme_color || '#10b981' }} />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-[2rem]" style={{ borderColor: storeData?.theme_color || '#10b981' }} />
                <motion.div animate={{ y: [-110, 110, -110] }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} className="w-[90%] h-1 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]" style={{ backgroundColor: storeData?.theme_color || '#10b981' }} />
              </div>
            </div>
            <div className="p-8 pb-12 text-center z-10 bg-gradient-to-t from-black to-transparent">
              <ScanLine className="w-8 h-8 text-white/50 mx-auto mb-4" />
              <p className="text-zinc-400 text-sm max-w-[250px] mx-auto leading-relaxed">Point your camera at the physical QR tag on the product to add it to your bag.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💳 ONE-CLICK CHECKOUT MODAL */}
      <AnimatePresence>
        {showCheckoutModal && (
          <div className="fixed inset-0 z- flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center sm:p-6">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-zinc-950 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] border-t sm:border border-white/10 p-6 shadow-2xl relative">
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <h3 className="text-xl font-black flex items-center gap-2"><CreditCard className="w-5 h-5"/> Checkout</h3>
                <button onClick={() => setShowCheckoutModal(false)} className="text-zinc-500 hover:text-white bg-white/5 p-2 rounded-full"><X className="w-4 h-4"/></button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">WhatsApp Number (For Digital Bill)</label>
                  <div className="flex bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-colors">
                    <span className="px-4 py-4 text-zinc-500 font-bold bg-white/5">+91</span>
                    <input type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="Optional" className="w-full bg-transparent text-white font-bold px-4 outline-none placeholder:text-zinc-700" />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button 
                    onClick={() => handlePaymentClick('ONLINE')}
                    disabled={isProcessing !== null}
                    style={{ backgroundColor: storeData?.theme_color || '#10b981', color: '#000' }}
                    className="w-full h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] disabled:opacity-50"
                  >
                    {isProcessing === 'ONLINE' ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <><Smartphone className="w-6 h-6" /> Pay via UPI Apps</>
                    )}
                  </button>

                  <div className="relative py-2 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <span className="relative bg-zinc-950 px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                  </div>

                  <button 
                    onClick={() => handlePaymentClick('OFFLINE')}
                    disabled={isProcessing !== null}
                    className="w-full h-14 rounded-2xl font-bold bg-white/5 border border-white/10 text-white flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isProcessing === 'OFFLINE' ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : (
                      <><Banknote className="w-5 h-5 text-zinc-400" /> Pay Cash at Counter</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}