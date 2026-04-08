'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, Trash2, QrCode, CreditCard, Store, ChevronLeft, X, ShieldCheck, Smartphone, CheckCircle2, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

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
  
  // 🔥 NEW: Premium Custom Alert State
  const [customAlert, setCustomAlert] = useState<{title: string, message: string, isError: boolean} | null>(null);

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  useEffect(() => {
    if (!safeStoreSlug) return;

    async function loadCartAndStore() {
      try {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id, store_name, logo_url, theme_color, upi_id') 
          .ilike('slug', safeStoreSlug)
          .single();

        if (storeError || !store) {
          console.error("Store not found");
          setLoading(false);
          return;
        }
        setStoreData(store);

        const cartKey = `cart_${safeStoreSlug}`;
        const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setCartItems(savedCart);

      } catch (err: any) {
        console.error("Error loading cart:", err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCartAndStore();
  }, [safeStoreSlug]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode;

    if (isScannerOpen) {
      setTimeout(() => {
        html5QrCode = new Html5Qrcode("reader");
        
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 }, disableFlip: false },
          (decodedText: string) => {
            const scannedTag = decodeURIComponent(decodedText.split('/').pop() || '').toUpperCase().trim(); 
            if (scannedTag) {
              const cartKey = `cart_${safeStoreSlug}`;
              const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
              const isDuplicate = currentCart.some((item: any) => item.tag_id === scannedTag);

              if (isDuplicate) {
                setIsScannerOpen(false); 
                setDuplicateTag(scannedTag);
                return; 
              }

              html5QrCode.stop().then(() => {
                setIsScannerOpen(false);
                router.push(`/${safeStoreSlug}/${scannedTag}`);
              });
            }
          },
          (errorMessage: any) => { /* Ignore background noise */ }
        ).catch((err: any) => {
          console.error("Camera error:", err);
        });
      }, 100);
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScannerOpen, safeStoreSlug, router]);

  const handleRemoveItem = async (tagIdToRemove: string) => {
    const cartKey = `cart_${safeStoreSlug}`;
    const updatedCart = cartItems.filter(item => item.tag_id !== tagIdToRemove);
    setCartItems(updatedCart);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));

    if (storeData?.id) {
      try {
        await supabase.from('qr_tags')
          .update({ status: 'active' })
          .eq('id', tagIdToRemove)
          .eq('store_id', storeData.id); 
      } catch (err) {
        console.error("Failed to release tag", err);
      }
    }
  };

  const handleCheckoutClick = () => {
    setCartId(`CART${Math.floor(1000 + Math.random() * 9000)}`);
    setCheckoutStep('whatsapp');
    setIsCheckoutOpen(true);
  };

  const handleWhatsappSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (whatsappNumber.length < 10) {
      setCustomAlert({ title: 'Invalid Input', message: 'Please enter a valid 10-digit mobile number.', isError: true });
      return;
    }
    setCheckoutStep('payment');
  };

  const handlePaymentSelection = async (method: 'online' | 'offline') => {
    if (method === 'online') {
      if (!storeData?.upi_id) {
        setCustomAlert({ title: 'Not Available', message: 'Online payment is currently not setup for this store.', isError: true });
        return;
      }
      const upiId = storeData.upi_id; 
      const amount = calculateTotal();
      const upiUrl = `upi://pay?pa=${upiId}&pn=${storeData?.store_name}&am=${amount}&cu=INR&tn=Bill-${cartId}`;
      window.location.href = upiUrl;
    }
    
    setCheckoutStep('polling');

    try {
      const purchasedItemsJson = cartItems.map(item => ({
        id: item.tag_id,
        products: { id: item.product_id, name: item.name, price: item.price, image_url: item.image_url }
      }));

      const { error } = await supabase.from('sales').insert({
        cart_id: cartId,
        store_id: storeData.id,
        total_amount: calculateTotal(),
        items_count: cartItems.length,
        payment_status: 'pending', 
        payment_method: method.toUpperCase(),
        customer_phone: whatsappNumber,
        purchased_items: purchasedItemsJson
      });

      if (error) throw error;

      const checkPaymentStatus = setInterval(async () => {
        const { data: saleData } = await supabase
          .from('sales')
          .select('payment_status')
          .eq('cart_id', cartId)
          .single();

        if (saleData?.payment_status === 'completed') {
          // 🟢 ACCEPTED
          clearInterval(checkPaymentStatus);

          const purchasedTagIds = cartItems.map(item => item.tag_id);
          if (purchasedTagIds.length > 0) {
            await supabase.from('qr_tags')
              .update({ status: 'sold' })
              .in('id', purchasedTagIds)
              .eq('store_id', storeData.id); 
          }
          
          localStorage.removeItem(`cart_${safeStoreSlug}`);
          setIsCheckoutOpen(false); 
          router.push(`/${safeStoreSlug}/success/${cartId}`);

        } else if (saleData?.payment_status === 'rejected') {
          // 🔴 REJECTED
          clearInterval(checkPaymentStatus);
          setCustomAlert({
            title: 'Payment Rejected',
            message: 'Your payment request was rejected by the store counter. You can try again.',
            isError: true
          });
          // 🔥 THE BUG FIX: Generate a NEW Cart ID so the next attempt doesn't crash the database!
          setCartId(`CART${Math.floor(1000 + Math.random() * 9000)}`);
          setCheckoutStep('payment'); 
        }
      }, 2000); 

    } catch (error) {
      console.error("Order creation failed:", error);
      setCustomAlert({ title: 'Network Error', message: 'Failed to process checkout. Please try again.', isError: true });
      setCheckoutStep('payment'); 
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (Number(item.price) || 0), 0);
  };

  const themeColor = storeData?.theme_color || '#10b981';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="w-8 h-8 text-zinc-600" />
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col relative font-sans selection:bg-white/10 pb-40">
      
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between"
      >
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>

        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          {storeData?.logo_url ? (
            <img src={storeData.logo_url} alt="logo" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <Store className="w-4 h-4" style={{ color: themeColor }} />
          )}
          <span className="text-sm font-bold tracking-[0.15em] uppercase text-zinc-200">
            {storeData?.store_name || 'Premium Store'}
          </span>
        </div>

        <div className="text-[10px] font-mono tracking-widest text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          {cartItems.length} {cartItems.length === 1 ? 'ITEM' : 'ITEMS'}
        </div>
      </motion.header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="px-6 pt-10 pb-6"
      >
        <h1 className="text-5xl leading-none font-black tracking-tighter">
          My Bag<span style={{ color: themeColor }}>.</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-3 font-medium">Review your items before secure checkout.</p>
      </motion.div>

      <div className="px-6 flex flex-col gap-5">
        <AnimatePresence>
          {cartItems.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center mt-12 p-10 bg-white/[0.02] rounded-[2rem] border border-white/5"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.05)]" style={{ backgroundColor: `${themeColor}15` }}>
                <ShoppingBag className="w-8 h-8" style={{ color: themeColor }} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">Your bag is empty</h2>
              <p className="text-sm text-zinc-500 mb-8">Scan a product's QR code in the store to add it to your bag.</p>
              
              <button 
                onClick={() => setIsScannerOpen(true)}
                className="px-8 py-4 rounded-full font-black text-black flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
                style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${themeColor}` }}
              >
                <QrCode className="w-5 h-5" strokeWidth={2.5} />
                Scan Product
              </button>
            </motion.div>
          ) : (
            cartItems.map((item, index) => (
              <motion.div 
                key={item.tag_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
                className="flex items-center p-3 bg-[#111] rounded-[1.5rem] border border-white/5 gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden group"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

                <div className="w-20 h-24 bg-black rounded-[1rem] overflow-hidden shrink-0 border border-white/10 relative">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <ShoppingBag className="w-6 h-6 text-zinc-700" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-lg leading-tight mb-1">{item.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">{item.tag_id}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 pr-2">
                  <p className="font-black text-xl tracking-tight">₹{item.price}</p>
                  <button 
                    onClick={() => handleRemoveItem(item.tag_id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {cartItems.length > 0 && !isCheckoutOpen && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
          className="fixed bottom-6 left-4 right-4 z-40"
        >
          <div className="bg-[#161616]/95 backdrop-blur-2xl border border-white/10 p-3 rounded-[2.5rem] flex items-center justify-between shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)]">
            
            <button 
              onClick={() => setIsScannerOpen(true)} 
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-inner hover:scale-105 active:scale-95 transition-all"
              style={{ backgroundColor: themeColor }}
            >
              <QrCode className="w-7 h-7 text-black" strokeWidth={2.5} />
            </button>
            
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-0.5">Grand Total</span>
              <span className="text-2xl font-black text-white leading-none tracking-tight">₹{calculateTotal()}</span>
            </div>
            
            <button 
              onClick={handleCheckoutClick}
              className="bg-white text-black font-black text-base px-7 py-4 rounded-[1.8rem] flex items-center justify-center gap-2 shadow-lg hover:bg-zinc-200 active:scale-95 transition-all"
            >
              <CreditCard className="w-5 h-5" /> Buy
            </button>
            
          </div>
        </motion.div>
      )}

      {/* 📸 SCANNER MODAL */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => setIsScannerOpen(false)}
              className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white z-50"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-sm aspect-square rounded-[2rem] overflow-hidden border-2 border-dashed border-white/20 relative">
              <div id="reader" className="w-full h-full bg-[#111]"></div>
              <div className="absolute inset-10 border-2 border-white/10 rounded-2xl pointer-events-none animate-pulse"></div>
            </div>
            
            <p className="mt-8 text-zinc-400 font-mono text-xs tracking-widest uppercase">
              Align QR Code inside the frame
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚨 DUPLICATE ALERT MODAL */}
      <AnimatePresence>
        {duplicateTag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z- bg-black/70 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-xs shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 relative">
                <ShoppingBag className="w-10 h-10 text-white" />
                <div className="absolute top-12 right-12 rounded-full w-6 h-6 flex items-center justify-center border-4 border-[#111]" style={{ backgroundColor: themeColor }}>
                  <ShieldCheck className="w-3 h-3 text-black" />
                </div>
              </div>

              <h3 className="text-2xl font-black mb-2 tracking-tight text-white">Already in Bag</h3>
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                Item <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">{duplicateTag}</span> is already added to your cart.
              </p>

              <button
                onClick={() => setDuplicateTag(null)}
                className="w-full py-4 rounded-full font-black text-black bg-white hover:bg-zinc-200 active:scale-95 transition-all shadow-lg"
              >
                Okay, Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚨 CUSTOM PREMIUM ALERT MODAL */}
      <AnimatePresence>
        {customAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z- bg-black/70 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-xs shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border ${customAlert.isError ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-white/5 border-white/10 text-white'}`}>
                {customAlert.isError ? <AlertCircle className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
              </div>

              <h3 className="text-2xl font-black mb-2 tracking-tight text-white">{customAlert.title}</h3>
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed">{customAlert.message}</p>

              <button
                onClick={() => setCustomAlert(null)}
                className="w-full py-4 rounded-full font-black text-black bg-white hover:bg-zinc-200 active:scale-95 transition-all shadow-lg"
              >
                Okay
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 ULTRA PREMIUM FLOATING CHECKOUT DRAWER */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => checkoutStep !== 'polling' && setIsCheckoutOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
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
                        type="tel" 
                        maxLength={10}
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="WhatsApp Number"
                        className="w-full bg-[#141414] border border-white/10 rounded-2xl py-4 pl-14 pr-4 font-black text-lg focus:outline-none focus:ring-2 transition-all placeholder:font-medium placeholder:text-zinc-600"
                        style={{ outlineColor: themeColor, borderColor: themeColor }}
                        autoFocus
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={whatsappNumber.length !== 10}
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
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/5">
                          💵
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-lg text-zinc-300">Pay at Counter</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Cash / Card</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: REAL POLLING WITH CART ID */}
              {checkoutStep === 'polling' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-4">
                  <div className="relative w-24 h-24 flex items-center justify-center mb-5">
                    <motion.div 
                      animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }} 
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: themeColor }}
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="relative z-10 w-16 h-16 bg-[#111] border border-white/10 rounded-full flex items-center justify-center shadow-2xl"
                    >
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-black mb-1">Processing Order</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">Waiting for counter approval...</p>
                  
                  {/* Cart ID Box */}
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

    </main>
  );
}
