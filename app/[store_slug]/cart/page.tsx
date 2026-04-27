'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, Trash2, QrCode, CreditCard, Store, ChevronLeft, X, ShieldCheck, Smartphone, CheckCircle2, Send, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

// ⚙️ THE GOD LEVEL DISCOUNT ENGINE
function calculateGodLevelDiscount(signals: { productScans: number; productSales: number; daysInInventory: number; isNewCustomer: boolean; cartValue: number; isSlowHour: boolean; }) {
  let score = 0;
  const conversionRate = signals.productScans === 0 ? 1 : signals.productSales / signals.productScans;
  
  if (signals.productScans > 3 && signals.productSales === 0) score += 4;
  else if (conversionRate < 0.2) score += 3;
  else if (conversionRate > 0.5) score -= 3;

  if (signals.daysInInventory > 60) score += 3;
  else if (signals.daysInInventory > 30) score += 1;

  if (signals.isNewCustomer) score += 2;

  if (signals.cartValue > 10000) score -= 2;
  if (signals.isSlowHour) score += 1;

  if (conversionRate >= 0.7 && signals.productSales > 5) {
    return { shouldShow: false, score, offeredDiscount: 0, message: "Fast moving item." };
  }

  const pickWeighted = (options: { value: number; weight: number }[]) => {
    const totalWeight = options.reduce((acc, curr) => acc + curr.weight, 0);
    let random = Math.random() * totalWeight;
    for (const option of options) {
      if (random < option.weight) return option.value;
      random -= option.weight;
    }
    return options[0].value;
  };

  let offeredDiscount = 0;
  let shouldShow = false;

  if (score <= 2) {
    shouldShow = false;
  } else if (score >= 3 && score <= 5) {
    shouldShow = true;
    offeredDiscount = pickWeighted([{ value: 5, weight: 60 }, { value: 8, weight: 30 }, { value: 10, weight: 10 }]);
  } else if (score >= 6 && score <= 8) {
    shouldShow = true;
    offeredDiscount = pickWeighted([{ value: 12, weight: 60 }, { value: 15, weight: 30 }, { value: 20, weight: 10 }]);
  } else if (score >= 9) {
    shouldShow = true;
    offeredDiscount = pickWeighted([{ value: 25, weight: 60 }, { value: 30, weight: 30 }, { value: 35, weight: 10 }]);
  }

  return { shouldShow, score, offeredDiscount };
}


export default function CartPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'whatsapp' | 'payment' | 'polling'>('whatsapp');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [cartId, setCartId] = useState('');
  
  const [duplicateTag, setDuplicateTag] = useState<string | null>(null);
  const [customAlert, setCustomAlert] = useState<{title: string, message: string, isError: boolean} | null>(null);

  // 🎲 PREMIUM DISCOUNT DRAWER STATES
  const [discountData, setDiscountData] = useState<{shouldShow: boolean, offeredDiscount: number} | null>(null);
  const [isDiscountDrawerOpen, setIsDiscountDrawerOpen] = useState(false);
  const [discountState, setDiscountState] = useState<'initial' | 'spinning' | 'revealed' | 'animating_firecracker' | 'applied'>('initial');
  const [tickerValue, setTickerValue] = useState<number>(0);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // Helper for Haptic Feedback
  const triggerHaptic = (pattern: number | number[] = 50) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  useEffect(() => {
    if (!safeStoreSlug) return;

    async function loadCartAndStore() {
      try {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*') 
          .ilike('slug', safeStoreSlug)
          .single();

        if (storeError || !store) return;
        setStoreData(store);

        const cartKey = `cart_${safeStoreSlug}`;
        const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setCartItems(savedCart);

        if (savedCart.length > 0) {
          const productIds = savedCart.map((i: any) => i.product_id);
          const { data: liveProducts, error } = await supabase.from('products').select('id, scan_count, created_at').in('id', productIds);
        if (error) {
        console.error(error);
        }

          let maxScans = 0;
          let oldestDays = 0;

          if (liveProducts && liveProducts.length > 0) {
            liveProducts.forEach(p => {
              if (p.scan_count && p.scan_count > maxScans) maxScans = p.scan_count;
              if (p.created_at) {
                const days = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
                if (days > oldestDays) oldestDays = days;
              }
            });
          }

          const isNewCustomer = localStorage.getItem('has_bought_before') !== 'true';
          const currentHour = new Date().getHours();
          const isSlowHour = currentHour < 12 || (currentHour >= 14 && currentHour <= 17);
          const rawCartValue = savedCart.reduce((total: number, item: any) => total + (Number(item.price) || 0), 0);

          const engineResult = calculateGodLevelDiscount({
            productScans: maxScans, productSales: 0, daysInInventory: oldestDays, isNewCustomer, cartValue: rawCartValue, isSlowHour
          });

          if (engineResult.shouldShow && engineResult.offeredDiscount > 0) {
            setDiscountData(engineResult);
          }
        }
      } catch (err) { } finally { setLoading(false); }
    }

    loadCartAndStore();
    return () => { if (spinIntervalRef.current) clearInterval(spinIntervalRef.current); };
  }, [safeStoreSlug]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    if (isScannerOpen) {
      setTimeout(() => {
        html5QrCode = new Html5Qrcode("reader");
        html5QrCode.start(
          { facingMode: "environment" }, { fps: 15, qrbox: { width: 250, height: 250 }, disableFlip: false },
          (decodedText: string) => {
            const scannedTag = decodeURIComponent(decodedText.split('/').pop() || '').toUpperCase().trim(); 
            if (scannedTag) {
              const cartKey = `cart_${safeStoreSlug}`;
              const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
              if (currentCart.some((item: any) => item.tag_id === scannedTag)) {
                setIsScannerOpen(false); setDuplicateTag(scannedTag); return; 
              }
              html5QrCode.stop().then(() => { setIsScannerOpen(false); router.push(`/${safeStoreSlug}/${scannedTag}`); });
            }
          }, () => { }
        ).catch(console.error);
      }, 100);
    }
    return () => { if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(console.error); };
  }, [isScannerOpen, safeStoreSlug, router]);

  const handleRemoveItem = async (tagIdToRemove: string) => {
    const cartKey = `cart_${safeStoreSlug}`;
    const updatedCart = cartItems.filter(item => item.tag_id !== tagIdToRemove);
    setCartItems(updatedCart);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));

    if (updatedCart.length === 0) {
        setIsDiscountDrawerOpen(false);
        setDiscountState('initial');
    }

    if (storeData?.id) {
      try { await supabase.from('qr_tags').update({ status: 'active' }).eq('id', tagIdToRemove).eq('store_id', storeData.id); } catch (err) {}
    }
  };

  // 🔥 PROCEED LOGIC
  const handleProceedClick = () => {
    triggerHaptic(50);
    // If discount exists and hasn't been applied yet, open the premium drawer
    if (discountData?.shouldShow && discountState !== 'applied') {
        setIsDiscountDrawerOpen(true);
    } else {
        // Otherwise, skip directly to standard checkout
        handleCheckoutClick();
    }
  };

  const handleCheckoutClick = () => {
    triggerHaptic(50);
    setIsDiscountDrawerOpen(false);
    setCartId(`CART${Math.floor(1000 + Math.random() * 9000)}`);
    setCheckoutStep('whatsapp');
    setIsCheckoutOpen(true);
  };

  const handleWhatsappSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (whatsappNumber.length < 10) { setCustomAlert({ title: 'Invalid Input', message: 'Enter a valid 10-digit number.', isError: true }); return; }
    setCheckoutStep('payment');
  };

  const handlePaymentSelection = async (method: 'online' | 'offline') => {
    if (method === 'online') {
      if (!storeData?.upi_id) { setCustomAlert({ title: 'Not Available', message: 'Online payment not setup.', isError: true }); return; }
      const upiUrl = `upi://pay?pa=${storeData.upi_id}&pn=${storeData?.store_name || storeData?.name}&am=${calculateTotal()}&cu=INR&tn=Bill-${cartId}`;
      window.location.href = upiUrl;
    }
    
    setCheckoutStep('polling');
    try {
      const purchasedItemsJson = cartItems.map(item => ({ id: item.tag_id, products: { id: item.product_id, name: item.name, price: item.price, image_url: item.image_url } }));
      const { error } = await supabase.from('sales').insert({
        cart_id: cartId, store_id: storeData.id, total_amount: calculateTotal(), items_count: cartItems.length,
        payment_status: 'pending', payment_method: method.toUpperCase(), customer_phone: whatsappNumber, purchased_items: purchasedItemsJson
      });
      if (error) throw error;

      const checkPaymentStatus = setInterval(async () => {
        const { data: saleData } = await supabase.from('sales').select('payment_status').eq('cart_id', cartId).single();
        if (saleData?.payment_status === 'completed') {
          clearInterval(checkPaymentStatus);
          const purchasedTagIds = cartItems.map(item => item.tag_id);
          if (purchasedTagIds.length > 0) await supabase.from('qr_tags').update({ status: 'sold' }).in('id', purchasedTagIds).eq('store_id', storeData.id); 
          localStorage.removeItem(`cart_${safeStoreSlug}`);
          localStorage.setItem('has_bought_before', 'true'); 
          setIsCheckoutOpen(false); 
          router.push(`/${safeStoreSlug}/success/${cartId}`);
        } else if (saleData?.payment_status === 'rejected') {
          clearInterval(checkPaymentStatus);
          setCustomAlert({ title: 'Payment Rejected', message: 'Rejected by counter.', isError: true });
          setCartId(`CART${Math.floor(1000 + Math.random() * 9000)}`);
          setCheckoutStep('payment'); 
        }
      }, 2000); 
    } catch (error) {
      setCustomAlert({ title: 'Network Error', message: 'Failed to process.', isError: true });
      setCheckoutStep('payment'); 
    }
  };

  const getBaseTotal = () => cartItems.reduce((total, item) => total + (Number(item.price) || 0), 0);
  
  const calculateTotal = () => {
    const base = getBaseTotal();
    if (discountState === 'applied' && discountData) {
      return Math.floor(base * (1 - discountData.offeredDiscount / 100));
    }
    return base;
  };

  // 🎰 PREMIUM WHEEL ANIMATION CHOREOGRAPHY
  const startPremiumSpin = () => {
    triggerHaptic(50);
    setDiscountState('spinning');
    let ticks = 0;
    const tickOptions =[5, 8, 10, 12, 15, 20, 25, 30]; // Possible discount values for visual effect
    
    spinIntervalRef.current = setInterval(() => {
      setTickerValue(tickOptions[Math.floor(Math.random() * tickOptions.length)]);
      triggerHaptic(10); // Light tick haptic
      ticks++;
      
      if (ticks > 20) { // 2 Seconds of spinning
        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        setTickerValue(discountData?.offeredDiscount || 0);
        setDiscountState('revealed');
        triggerHaptic(); // Success pattern

        // Wait 1 second, then launch firecracker
        setTimeout(() => {
            setDiscountState('animating_firecracker');
            
            // Wait for flight (0.6s), then apply to bill
            setTimeout(() => {
                triggerHaptic(100); // Hit impact
                setDiscountState('applied');
            }, 600); 
        }, 1000);
      }
    }, 100);
  };

  const themeColor = storeData?.theme_color || '#10b981';
  const displayName = storeData?.store_name || storeData?.name || 'Premium Store';
  const displayInitials = displayName.split(' ').filter(Boolean).map((w: string) => w).join('').substring(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 className="w-8 h-8 text-zinc-600" /></motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col relative font-sans selection:bg-white/10 pb-40">
      
      <motion.header 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between"
      >
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>

        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          {storeData?.logo_url ? (
            <img src={storeData.logo_url} alt="logo" className="w-6 h-6 rounded-full object-cover border border-white/10" />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-zinc-800 text-[10px] font-black text-white border border-white/10">{displayInitials}</div>
          )}
          <span className="text-sm font-bold tracking-[0.15em] uppercase text-zinc-200">{displayName}</span>
        </div>

        <div className="text-[10px] font-mono tracking-widest text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          {cartItems.length} {cartItems.length === 1 ? 'ITEM' : 'ITEMS'}
        </div>
      </motion.header>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }} className="px-6 pt-10 pb-6">
        <h1 className="text-5xl leading-none font-black tracking-tighter">My Bag<span style={{ color: themeColor }}>.</span></h1>
        <p className="text-sm text-zinc-500 mt-3 font-medium">Review your items before secure checkout.</p>
      </motion.div>

      <div className="px-6 flex flex-col gap-4">
        <AnimatePresence>
          {cartItems.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center mt-12 p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.05)]" style={{ backgroundColor: `${themeColor}15` }}>
                <ShoppingBag className="w-8 h-8" style={{ color: themeColor }} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">Your bag is empty</h2>
              <p className="text-sm text-zinc-500 mb-8">Scan a product's QR code in the store to add it to your bag.</p>
              <button onClick={() => setIsScannerOpen(true)} className="px-8 py-4 rounded-full font-black text-black flex items-center gap-3 hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${themeColor}` }}>
                <QrCode className="w-5 h-5" strokeWidth={2.5} /> Scan Product
              </button>
            </motion.div>
          ) : (
            cartItems.map((item, index) => (
              <motion.div key={item.tag_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }} transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }} className="flex items-center p-3 bg-[#111] rounded-[1.5rem] border border-white/5 gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                <div className="w-20 h-24 bg-black rounded-[1rem] overflow-hidden shrink-0 border border-white/10 relative">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-900"><ShoppingBag className="w-6 h-6 text-zinc-700" /></div>}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-lg leading-tight mb-1">{item.name}</h3>
                  <div className="flex items-center gap-2"><span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">{item.tag_id}</span></div>
                </div>
                <div className="flex flex-col items-end gap-3 pr-2">
                  <p className="font-black text-xl tracking-tight">₹{item.price}</p>
                  <button onClick={() => handleRemoveItem(item.tag_id)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"><Trash2 className="w-4 h-4" /></button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* 🚀 FIXED BOTTOM BAR - PROCEED TO PREMIUM CHECKOUT */}
      {cartItems.length > 0 && !isCheckoutOpen && !isDiscountDrawerOpen && (
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, type: "spring", bounce: 0.3 }} className="fixed bottom-6 left-4 right-4 z-40">
          <div className="bg-[#161616]/95 backdrop-blur-2xl border border-white/10 p-3 rounded-[2.5rem] flex items-center justify-between shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <button onClick={() => setIsScannerOpen(true)} className="w-16 h-16 rounded-full flex items-center justify-center shadow-inner hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: themeColor }}>
              <QrCode className="w-7 h-7 text-black" strokeWidth={2.5} />
            </button>
            <div className="flex flex-col items-center justify-center px-4">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-0.5">Grand Total</span>
              <span className="text-2xl font-black text-white leading-none tracking-tight">₹{calculateTotal()}</span>
            </div>
            <button 
              onClick={handleProceedClick}
              className="bg-white text-black font-black text-base px-6 py-4 rounded-[1.8rem] flex items-center justify-center gap-2 shadow-lg hover:bg-zinc-200 active:scale-95 transition-all"
            >
              Proceed <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* 🎰 PREMIUM FLOATING UI (DISCOUNT SPINNER DRAWER) */}
      <AnimatePresence>
        {isDiscountDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {}} // Disabled click outside to prevent accidental close during spin
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-white/10 rounded-t-[3rem] shadow-[0_-30px_80px_rgba(0,0,0,0.9)] flex flex-col items-center pt-8 pb-10 px-6 overflow-hidden"
            >
              {/* Close Button (Hidden if spinning/animating) */}
              {(discountState === 'initial' || discountState === 'applied') && (
                  <button onClick={() => setIsDiscountDrawerOpen(false)} className="absolute top-6 right-6 p-3 bg-white/5 rounded-full text-white z-50 active:scale-90 transition-all">
                    <X className="w-5 h-5" />
                  </button>
              )}

              {/* Top: The Wheel / Ticker */}
              <div className="relative w-40 h-40 flex items-center justify-center mb-10 mt-6">
                {/* Neon Glow Ring */}
                <motion.div 
                  animate={discountState === 'spinning' ? { rotate: 360, scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border border-dashed border-white/20"
                  style={{ boxShadow: discountState !== 'initial' ? `0 0 50px ${themeColor}40` : 'none' }}
                />
                
                <div className="absolute inset-2 bg-[#111] rounded-full border border-white/5 flex items-center justify-center shadow-inner overflow-hidden">
                    {discountState === 'initial' ? (
                        <Sparkles className="w-12 h-12" style={{ color: themeColor }} />
                    ) : (
                        <div className="flex items-center gap-1 font-mono text-4xl font-black tracking-tighter" style={{ color: discountState === 'applied' ? themeColor : 'white' }}>
                            <motion.div animate={discountState === 'spinning' ? { y: [0, -20, 20, 0] } : {}} transition={{ duration: 0.1, repeat: Infinity }}>
                                {tickerValue}
                            </motion.div>
                            <span className="text-2xl">%</span>
                        </div>
                    )}
                </div>

                {/* 💥 THE FIRECRACKER PARTICLE */}
                <AnimatePresence>
                  {discountState === 'animating_firecracker' && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: 150, scale: [1, 1.5, 0.5] }}
                      transition={{ duration: 0.6, ease: "anticipate" }}
                      className="absolute z-50 font-black text-4xl whitespace-nowrap"
                      style={{ color: themeColor, textShadow: `0 0 20px ${themeColor}` }}
                    >
                      -{discountData?.offeredDiscount}% OFF
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Middle: Title & Action */}
              <div className="text-center w-full mb-10 h-16 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                      {discountState === 'initial' && (
                          <motion.div key="initial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                              <h3 className="text-2xl font-black mb-1">Mystery Offer</h3>
                              <p className="text-xs text-zinc-400">Spin the wheel to reveal your discount.</p>
                          </motion.div>
                      )}
                      {(discountState === 'spinning' || discountState === 'revealed' || discountState === 'animating_firecracker') && (
                          <motion.div key="spinning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                              <h3 className="text-2xl font-black mb-1" style={{ color: themeColor }}>Calculating...</h3>
                              <p className="text-xs text-zinc-400">Locking in the best price for you.</p>
                          </motion.div>
                      )}
                      {discountState === 'applied' && (
                          <motion.div key="applied" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                              <h3 className="text-2xl font-black mb-1 text-white">Offer Applied!</h3>
                              <p className="text-xs text-zinc-400">You saved {discountData?.offeredDiscount}% on your entire bag.</p>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>

              {/* Bottom: The Bill & Primary Action */}
              <div className="w-full bg-[#111] rounded-[2rem] p-6 border border-white/5 relative overflow-hidden flex items-center justify-between shadow-inner">
                 
                 {/* Bill Section */}
                 <div className="flex flex-col relative z-10">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Total Bill</span>
                    <div className="flex items-end gap-3">
                        <AnimatePresence>
                            {discountState === 'applied' && (
                                <motion.span 
                                    initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} 
                                    className="text-xl font-medium text-zinc-600 line-through decoration-red-500/50"
                                >
                                    ₹{getBaseTotal()}
                                </motion.span>
                            )}
                        </AnimatePresence>
                        <motion.span 
                            animate={discountState === 'applied' ? { scale: [1, 1.2, 1], color: [themeColor, '#ffffff'] } : {}}
                            transition={{ duration: 0.5 }}
                            className="text-4xl font-black tracking-tight leading-none"
                        >
                            ₹{calculateTotal()}
                        </motion.span>
                    </div>
                 </div>

                 {/* Action Button Section */}
                 <div className="relative z-10">
                     <AnimatePresence mode="wait">
                         {discountState === 'initial' && (
                             <motion.button 
                                key="btn-spin"
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                onClick={startPremiumSpin}
                                className="px-8 py-5 rounded-2xl font-black text-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-all"
                                style={{ backgroundColor: themeColor }}
                             >
                                SPIN
                             </motion.button>
                         )}
                         {(discountState === 'spinning' || discountState === 'revealed' || discountState === 'animating_firecracker') && (
                             <motion.div key="btn-wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-8 py-5">
                                 <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                             </motion.div>
                         )}
                         {discountState === 'applied' && (
                             <motion.button 
                                key="btn-pay"
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                onClick={handleCheckoutClick}
                                className="px-8 py-5 rounded-2xl font-black text-black bg-white shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                             >
                                PAY <CreditCard className="w-5 h-5" />
                             </motion.button>
                         )}
                     </AnimatePresence>
                 </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🚀 ORIGINAL CHECKOUT DRAWER (WHATSAPP -> PAYMENT) */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => checkoutStep !== 'polling' && setIsCheckoutOpen(false)}
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-white/10 rounded-t-[2.5rem] p-6 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-8" />

              {/* STEP 1: WHATSAPP */}
              {checkoutStep === 'whatsapp' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${themeColor}1A`, color: themeColor }}>
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">Contact Details</h3>
                      <p className="text-xs text-zinc-400">To receive your digital bill & updates</p>
                    </div>
                  </div>

                  <form onSubmit={handleWhatsappSubmit} className="flex flex-col gap-4">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">+91</span>
                      <input 
                        type="tel" maxLength={10} value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="WhatsApp Number"
                        className="w-full bg-[#141414] border border-white/10 rounded-2xl py-4 pl-14 pr-4 font-black text-lg focus:outline-none focus:ring-2 transition-all placeholder:font-medium placeholder:text-zinc-600"
                        style={{ outlineColor: themeColor, borderColor: themeColor }}
                        autoFocus
                      />
                    </div>
                    <button 
                      type="submit" disabled={whatsappNumber.length !== 10}
                      className="w-full py-4 rounded-2xl font-black text-black flex justify-center items-center gap-2 mt-2 disabled:opacity-50 transition-all"
                      style={{ backgroundColor: themeColor, boxShadow: whatsappNumber.length === 10 ? `0 10px 30px -10px ${themeColor}` : 'none' }}
                    >
                      Continue <Send className="w-4 h-4" />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* STEP 2: PAYMENT */}
              {checkoutStep === 'payment' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <h3 className="text-xl font-black mb-1">Choose Payment Mode</h3>
                  <p className="text-xs text-zinc-400 mb-6">Amount to pay: <strong className="text-white">₹{calculateTotal()}</strong></p>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => handlePaymentSelection('online')}
                      className="w-full p-4 bg-gradient-to-r from-[#111] to-[#1a1a1a] border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/5 active:scale-95 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: themeColor }} />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shadow-inner">
                          <svg viewBox="0 0 24 24" className="w-full h-full text-black"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                        </div>
                        <div className="text-left">
                          <h4 className="font-black text-lg">Pay Online</h4>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">GPay, PhonePe, Paytm</p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: themeColor }} />
                    </button>

                    <button 
                      onClick={() => handlePaymentSelection('offline')}
                      className="w-full p-4 bg-[#141414] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 active:scale-95 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/5">💵</div>
                        <div className="text-left">
                          <h4 className="font-bold text-lg text-zinc-300">Pay at Counter</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Cash / Card</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: POLLING */}
              {checkoutStep === 'polling' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-4">
                  <div className="relative w-24 h-24 flex items-center justify-center mb-5">
                    <motion.div animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} className="absolute inset-0 rounded-full" style={{ backgroundColor: themeColor }} />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="relative z-10 w-16 h-16 bg-[#111] border border-white/10 rounded-full flex items-center justify-center shadow-2xl">
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-black mb-1">Processing Order</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">Waiting for counter approval...</p>
                  
                  <div className="bg-[#141414] border border-white/5 w-full rounded-2xl py-4 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: themeColor, opacity: 0.5 }} />
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Show this ID at counter</span>
                    <span className="text-3xl font-black tracking-widest text-white font-mono">{cartId}</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODALS: SCANNER & ALERTS */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
            <button onClick={() => setIsScannerOpen(false)} className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white z-50"><X className="w-6 h-6" /></button>
            <div className="w-full max-w-sm aspect-square rounded-[2rem] overflow-hidden border-2 border-dashed border-white/20 relative">
              <div id="reader" className="w-full h-full bg-[#111]"></div>
              <div className="absolute inset-10 border-2 border-white/10 rounded-2xl pointer-events-none animate-pulse"></div>
            </div>
            <p className="mt-8 text-zinc-400 font-mono text-xs tracking-widest uppercase">Align QR Code inside the frame</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {duplicateTag && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-xs shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-col items-center text-center relative overflow-hidden">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 relative">
                <ShoppingBag className="w-10 h-10 text-white" />
                <div className="absolute top-12 right-12 rounded-full w-6 h-6 flex items-center justify-center border-4 border-[#111]" style={{ backgroundColor: themeColor }}><ShieldCheck className="w-3 h-3 text-black" /></div>
              </div>
              <h3 className="text-2xl font-black mb-2 tracking-tight text-white">Already in Bag</h3>
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed">Item <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">{duplicateTag}</span> is already added to your cart.</p>
              <button onClick={() => setDuplicateTag(null)} className="w-full py-4 rounded-full font-black text-black bg-white hover:bg-zinc-200 active:scale-95 transition-all shadow-lg">Okay, Got it</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {customAlert && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-xs shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-col items-center text-center relative overflow-hidden">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border ${customAlert.isError ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-white/5 border-white/10 text-white'}`}>
                {customAlert.isError ? <AlertCircle className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
              </div>
              <h3 className="text-2xl font-black mb-2 tracking-tight text-white">{customAlert.title}</h3>
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed">{customAlert.message}</p>
              <button onClick={() => setCustomAlert(null)} className="w-full py-4 rounded-full font-black text-black bg-white hover:bg-zinc-200 active:scale-95 transition-all shadow-lg">Okay</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
