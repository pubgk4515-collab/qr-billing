// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, KeyRound, Search, Banknote, ShoppingCart, PackageSearch, 
  ArrowRight, CheckCircle2, Loader2, Send, X, Plus, ShoppingBag, 
  MessageCircle
} from 'lucide-react';

import { 
  getOrderByCartId, 
  approvePayment, 
  getTagForPOS, 
  completePOSCheckout 
} from '../actions/adminActions';
import { getSaleByCartId } from '../actions/billingActions';

export default function AdminDashboard() {
  const router = useRouter();
  
  // 🔐 Auth State
  const [isLocked, setIsLocked] = useState(true);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  const CORRECT_PIN = '7788';

  // 🏦 Verify Payment State
  const [searchCartNumber, setSearchCartNumber] = useState('');
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🛍️ Manual POS State
  const [manualTagId, setManualTagId] = useState('');
  const [posCart, setPosCart] = useState<any[]>([]);
  const [posPhone, setPosPhone] = useState('');
  const [isProcessingPos, setIsProcessingPos] = useState(false);

    // Quick WhatsApp Bill States
  const [quickCartId, setQuickCartId] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [isSendingQuickBill, setIsSendingQuickBill] = useState(false);


  useEffect(() => {
    if (sessionStorage.getItem('admin_unlocked') === 'true') {
      setIsLocked(false);
    }
  }, []);

    const handleQuickSendBill = async () => {
    // 1. Basic check
    if (!quickCartId || quickPhone.length !== 10) {
      alert("Please enter a valid Cart ID and 10-digit phone number.");
      return;
    }
    
    setIsSendingQuickBill(true);
    try {
      // 2. Database me verify karo (Taaki fake/galat link na jaye)
      // Note: Make sure getSaleByCartId is imported at the top from your actions file!
      const res = await getSaleByCartId(`CART-${quickCartId.replace('CART-', '')}`); 
      
      if (res.success && res.data) {
        // 3. CART FOUND! WhatsApp link generate karo
        const billUrl = `${window.location.origin}/bill/${res.data.cart_id}`;
        const text = encodeURIComponent(`Thank you for shopping at SME Premium Store! 🛍️✨\n\nHere is your digital receipt for Order ${res.data.cart_id}:\n${billUrl}\n\nVisit again!`);
        
        window.open(`https://wa.me/91${quickPhone}?text=${text}`, '_blank');
        
        // 4. Input fields saaf kar do agle customer ke liye
        setQuickCartId('');
        setQuickPhone('');
      } else {
        alert(`❌ Cart ID ${quickCartId} not found in database! Please check again.`);
      }
    } catch (err) {
      alert("Error verifying Cart ID.");
    } finally {
      setIsSendingQuickBill(false);
    }
  };


  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinEntry === CORRECT_PIN) {
      sessionStorage.setItem('admin_unlocked', 'true');
      setIsLocked(false);
    } else {
      setPinError(true);
      setPinEntry('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  // --- PAYMENT VERIFICATION LOGIC ---
  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCartNumber) return;
    setIsSearchingOrder(true);
    setFoundOrder(null);
    
    // Auto-add "CART-" before checking database
    const fullCartId = `CART-${searchCartNumber.trim()}`;
    const res = await getOrderByCartId(fullCartId);
    
    if (res.success && res.data) setFoundOrder(res.data);
    else alert(res.message || 'Order not found');
    setIsSearchingOrder(false);
  };

  const handleApprovePayment = async () => {
    if (!foundOrder) return;
    setIsSubmitting(true);
    const res = await approvePayment(foundOrder.cart_id);
    if (res.success) {
      setFoundOrder({ ...foundOrder, payment_status: 'completed' });
    } else {
      alert('Error: ' + res.message);
    }
    setIsSubmitting(false);
  };

  const dispatchBillLink = () => {
    if (!foundOrder) return;
    const billUrl = `${window.location.origin}/bill/${foundOrder.cart_id}`;
    const text = encodeURIComponent(`Hello! Thank you for shopping with us 🎉\n\nHere is your official digital bill for order ${foundOrder.cart_id}:\n${billUrl}\n\nPlease visit again!`);
    window.open(`https://wa.me/91${foundOrder.customer_phone}?text=${text}`, '_blank');
  };

  // --- MANUAL POS LOGIC ---
  const handleAddManualTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTagId) return;
    
    const tagUpper = manualTagId.toUpperCase();
    if (posCart.find(item => item.id === tagUpper)) {
      alert('This item is already in the cart!');
      setManualTagId('');
      return;
    }

    setIsProcessingPos(true);
    const res = await getTagForPOS(tagUpper);
    
    if (res.success && res.data) {
      setPosCart([...posCart, res.data]);
    } else {
      alert(res.message);
    }
    
    setManualTagId('');
    setIsProcessingPos(false);
  };

  const handlePOSCheckout = async () => {
    if (posCart.length === 0) return;
    setIsProcessingPos(true);
    
    const res = await completePOSCheckout(posCart, posPhone);
    if (res.success) {
      alert(`✅ Checkout Successful! Order ID: ${res.cartId}`);
      window.open(`${window.location.origin}/bill/${res.cartId}`, '_blank');
      setPosCart([]);
      setPosPhone('');
    } else {
      alert('❌ Error during checkout: ' + res.message);
    }
    setIsProcessingPos(false);
  };

  const posTotal = posCart.reduce((sum, item) => sum + (item.products?.price || 0), 0);

  // 🔒 Lock Screen
  if (isLocked) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full" />
          <div className="relative z-10 flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
              <Lock className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black text-white">Owner Terminal</h1>
            <p className="text-zinc-400 text-sm mt-1">Enter passcode to access dashboard</p>
          </div>
          <form onSubmit={handleUnlock} className="relative z-10 space-y-5">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input type="password" maxLength={4} value={pinEntry} onChange={e => setPinEntry(e.target.value)} placeholder="••••" className="w-full bg-zinc-900 border border-white/10 focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 text-center text-2xl font-black tracking-[0.5em] text-white outline-none transition-all" autoFocus />
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">Unlock</button>
          </form>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-4 sm:p-8 pb-24">
      <header className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Command Center</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage payments & manual checkouts</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => router.push('/admin/inventory')} className="flex-1 sm:flex-none px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2">
            <PackageSearch className="w-4 h-4" /> Go to Inventory
          </button>
          <button onClick={() => { sessionStorage.removeItem('admin_unlocked'); setIsLocked(true); }} className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-all">
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMN 1: ONLINE PAYMENT VERIFICATION */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-blue-900/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
            
            <h2 className="text-2xl font-black mb-2 flex items-center gap-3 relative z-10">
              <Banknote className="w-6 h-6 text-blue-400" /> Verify Online Order
            </h2>
            <p className="text-zinc-400 text-sm mb-6 relative z-10">Approve payments for customers who scanned QR codes.</p>

            <form onSubmit={handleSearchOrder} className="flex gap-2 mb-6 relative z-10 group">
              <div className="relative flex-1">
                {/* Visual prefix - unselectable and positioned over the padding */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono font-bold pointer-events-none group-focus-within:text-blue-400 transition-colors">
                  CART-
                </div>
                {/* Actual input */}
                <input 
                  type="text" 
                  maxLength={4} 
                  value={searchCartNumber} 
                  onChange={e => setSearchCartNumber(e.target.value.replace(/[^0-9]/g, ''))} 
                  placeholder="XXXX" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-[4.5rem] pr-4 text-white font-mono uppercase outline-none focus:border-blue-500 transition-all" 
                />
              </div>
              <button type="submit" disabled={isSearchingOrder || !searchCartNumber} className="bg-blue-500 text-white px-6 rounded-xl font-bold hover:bg-blue-400 disabled:opacity-50 transition-all flex items-center justify-center">
                {isSearchingOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find'}
              </button>
            </form>

            <AnimatePresence>
              {foundOrder && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 border border-white/10 rounded-2xl p-5 relative z-10">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Amount</p>
                      <p className="text-3xl font-black text-white">₹{foundOrder.total_amount}</p>
                    </div>
                    <div className="text-right">
                      {foundOrder.payment_status === 'awaiting_approval' ? (
                        <span className="text-orange-400 font-bold bg-orange-500/10 px-3 py-1.5 rounded-full text-xs animate-pulse border border-orange-500/20">Pending</span>
                      ) : (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full text-xs border border-emerald-500/20">Completed</span>
                      )}
                    </div>
                  </div>

                                    <div className="mb-4">
                    <p className="text-sm text-zinc-400">
                      <span className="font-bold text-white">Phone:</span>{' '}
                      {/* 🔥 FIX: Handling both 'phone' and 'customer_phone' safely + WALK-IN */}
                      {(foundOrder.customer_phone || foundOrder.phone) && (foundOrder.customer_phone || foundOrder.phone) !== 'WALK-IN' 
                        ? `+91 ${foundOrder.customer_phone || foundOrder.phone}` 
                        : <span className="text-zinc-500 italic">Walk-in Customer (No Phone)</span>}
                    </p>
                  </div>

                  {/* 🔥 ITEMS LIST SECTION (IMAGES, PRICE, QUANTITY) */}
                  {foundOrder.purchased_items && foundOrder.purchased_items.length > 0 && (
                    <div className="mt-2 border-t border-white/10 pt-4 mb-6">
                      <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest mb-3">
                        Scanned Items ({foundOrder.items_count || foundOrder.purchased_items.length})
                      </p>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {foundOrder.purchased_items.map((item: any, idx: number) => {
                          const product = item.products || item; // Safe extract
                          return (
                            <div key={idx} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                              {/* Product Image */}
                              {product.image_url ? (
                                <img src={product.image_url} alt="product" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/5">
                                  <span className="text-zinc-500 text-[10px] uppercase font-bold">No Img</span>
                                </div>
                              )}
                              
                              {/* Name & Tag */}
                              <div className="flex-1">
                                <p className="font-bold text-white text-sm line-clamp-1">{product.name || 'Unknown Item'}</p>
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Tag: {item.id}</p>
                              </div>
                              
                              {/* Price & Qty */}
                              <div className="text-right">
                                <p className="font-bold text-emerald-400 text-sm">₹{product.price || 0}</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">Qty: 1</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {foundOrder.payment_status === 'awaiting_approval' && (
                    <button onClick={handleApprovePayment} disabled={isSubmitting} className="w-full bg-emerald-500 text-black font-black py-4 rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Approve Payment
                    </button>
                  )}

                  {foundOrder.payment_status === 'completed' && foundOrder.payment_method === 'OFFLINE' && (
                                <button 
              onClick={handleQuickSendBill}
              disabled={isSendingQuickBill || quickPhone.length < 10 || !quickCartId}
              className="w-full md:w-auto bg-[#25D366] text-black px-6 py-3 rounded-xl font-black hover:bg-[#1ebd5a] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSendingQuickBill ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Send
            </button>

                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

                {/* 🚀 QUICK WHATSAPP DISPATCH (NEW SECTION) */}
        <div className="bg-gradient-to-r from-[#25D366]/10 to-transparent border border-[#25D366]/20 rounded-3xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-[#25D366]/5">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-[#25D366]/20 p-3 rounded-2xl">
              <MessageCircle className="w-6 h-6 text-[#25D366]" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">Quick Send Bill</h3>
              <p className="text-zinc-400 text-xs">Dispatch to any number</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="CART-XXXX" 
                value={quickCartId}
                onChange={e => setQuickCartId(e.target.value.toUpperCase().replace(/\s/g, ''))}
                className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm w-full md:w-32 outline-none focus:border-[#25D366] transition-colors" 
              />
              <div className="flex bg-black/50 border border-white/10 rounded-xl overflow-hidden focus-within:border-[#25D366] transition-colors w-full md:w-44">
                <span className="px-3 py-3 text-zinc-500 font-bold bg-white/5">+91</span>
                <input 
                  type="tel" 
                  placeholder="Number" 
                  maxLength={10}
                  value={quickPhone}
                  onChange={e => setQuickPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent text-white font-bold px-3 outline-none"
                />
              </div>
            </div>
            <button 
              onClick={() => {
                if(quickPhone.length === 10 && quickCartId) {
                  // Direct magic link generation!
                  const billUrl = `${window.location.origin}/bill/${quickCartId}`;
                  const text = encodeURIComponent(`Thank you for your purchase! 🛍️✨\nHere is your premium digital receipt for Order ${quickCartId}:\n\n${billUrl}`);
                  window.open(`https://wa.me/91${quickPhone}?text=${text}`, '_blank');
                  setQuickCartId('');
                  setQuickPhone('');
                } else {
                  alert('Please enter a valid CART ID and 10-digit phone number.');
                }
              }}
              className="bg-[#25D366] text-black px-6 py-3 rounded-xl font-black hover:bg-[#1ebd5a] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" /> Send
            </button>
          </div>
        </div>


        {/* COLUMN 2: MANUAL POS COUNTER */}
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-emerald-400" /> Manual POS
            </h2>
            <p className="text-zinc-400 text-sm mb-6">Create cart for walk-in customers without phones.</p>

            <form onSubmit={handleAddManualTag} className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="text" value={manualTagId} onChange={e => setManualTagId(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="Enter Tag ID (e.g. TAG001)" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-mono uppercase outline-none focus:border-emerald-500 transition-all" />
              </div>
              <button type="submit" disabled={!manualTagId || isProcessingPos} className="bg-emerald-500 text-black px-6 rounded-xl font-bold hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center justify-center">
                {isProcessingPos ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>

            <div className="bg-black/40 rounded-2xl border border-white/5 min-h-[200px] p-4 flex flex-col">
              {posCart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm font-bold">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-2">
                  {posCart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors">
                      {/* Product Image */}
                      {item.products?.image_url ? (
                        <img 
                          src={item.products.image_url} 
                          alt="img" 
                          className="w-12 h-12 rounded-lg object-cover border border-white/10" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/10">
                          <ShoppingBag className="w-5 h-5 text-zinc-500" />
                        </div>
                      )}

                      {/* Product Details */}
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm leading-tight">{item.products?.name}</p>
                        <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{item.id}</p>
                      </div>

                      {/* Price and Action */}
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-emerald-400 text-sm">₹{item.products?.price}</p>
                        <button 
                          onClick={() => setPosCart(posCart.filter(i => i.id !== item.id))} 
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-zinc-400 font-bold">Total Bill</p>
                  <p className="text-3xl font-black text-white">₹{posTotal}</p>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Customer Phone (Optional)" 
                  value={posPhone}
                  onChange={e => setPosPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={10}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500 transition-all"
                />

                <button 
                  onClick={handlePOSCheckout}
                  disabled={posCart.length === 0 || isProcessingPos} 
                  className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingPos ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Checkout & Generate Bill <ArrowRight className="w-5 h-5" /></>}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
