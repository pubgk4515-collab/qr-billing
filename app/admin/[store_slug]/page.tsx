'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, CheckCircle2, Loader2, Package, QrCode, Smartphone, 
  Zap, Trash2, Clock, Lock, KeyRound, MessageCircle, Send, Plus 
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  const [storeData, setStoreData] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- Auth States ---
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // --- Manual Checkout States ---
  const [scannedItems, setScannedItems] = useState<any[]>([]); 
  const [customerPhone, setCustomerPhone] = useState('');
  const [manualTagId, setManualTagId] = useState(''); // New state for manual input

  // --- Digital Bill Requests State ---
  // Ye dummy state hai, future me aap isko Supabase ke kisi 'bill_requests' table se fetch kar sakte hain
  const [billRequests, setBillRequests] = useState<any[]>([]); 

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // 1. FETCH STORE DATA & CHECK AUTH STATUS
  useEffect(() => {
    if (!safeStoreSlug) return;
    
    async function fetchInitialData() {
      try {
        const { data: store } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', safeStoreSlug)
          .single();
          
        if (store) {
          setStoreData(store);
          
          const savedAuth = localStorage.getItem(`admin_auth_${safeStoreSlug}`);
          if (savedAuth === 'true') {
            setIsAuthed(true);
            fetchLiveQueue(store.id); 
          }
        }
      } catch (err) { 
        console.error(err); 
      } finally { 
        setAuthChecking(false);
        setLoading(false); 
      }
    }
    fetchInitialData();
  }, [safeStoreSlug]);

  // 2. LIVE QUEUE POLLING (Only runs if authenticated)
  const fetchLiveQueue = async (storeId: string) => {
    if (!isAuthed) return;
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .eq('payment_status', 'pending') 
      .order('created_at', { ascending: false });
      
    if (data) setPendingOrders(data);
  };

  useEffect(() => {
    if (!storeData?.id || !isAuthed) return;
    const interval = setInterval(() => fetchLiveQueue(storeData.id), 3000); 
    return () => clearInterval(interval);
  }, [storeData?.id, isAuthed]);

  // --- Functions ---
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (storeData && pinInput === storeData.admin_pin) {
      localStorage.setItem(`admin_auth_${safeStoreSlug}`, 'true');
      setIsAuthed(true);
      fetchLiveQueue(storeData.id);
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  // --- QUICK CHECKOUT ADD ITEMS LOGIC ---
  const handleScanItem = async () => {
    // Ye pehle jaisa dummy scan hai (Aap isme In-App scanner logic add kar sakte hain)
    const newItem = { id: Date.now(), tag: `TAG00${scannedItems.length + 1}`, name: "Scanned Item", price: 999 };
    setScannedItems(prev => [newItem, ...prev]);
  };

  const handleManualTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTagId.trim()) return;

    // Yahan aap Supabase se real product fetch karne ka logic laga sakte hain.
    // Abhi ke liye main isko ek dummy item me convert karke list me daal raha hu.
    const tagUpper = manualTagId.trim().toUpperCase();
    const newItem = { id: Date.now(), tag: tagUpper, name: "Manual Added Item", price: 599 }; // Dummy data
    
    setScannedItems(prev => [newItem, ...prev]);
    setManualTagId(''); // Clear input after adding
  };

  const handleCreateManualBill = async () => {
    if (scannedItems.length === 0) return alert("Pehle item add karein!");
    setLoading(true);
    
    const totalAmount = scannedItems.reduce((acc, item) => acc + item.price, 0);
    const cartId = `CART${Math.floor(1000 + Math.random() * 9000)}`;

    const { error } = await supabase.from('sales').insert({
      cart_id: cartId,
      store_id: storeData.id,
      total_amount: totalAmount,
      items_count: scannedItems.length,
      payment_status: 'completed',
      payment_method: 'CASH',
      customer_phone: customerPhone,
      purchased_items: scannedItems
    });

    if (!error) {
      alert("Bill Generated Successfully!");
      setScannedItems([]);
      setCustomerPhone('');
    } else {
       alert("Error creating bill.");
    }
    setLoading(false);
  };

  const handleApprovePayment = async (orderId: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== orderId));
    await supabase.from('sales').update({ payment_status: 'completed' }).eq('id', orderId);
  };

  const themeColor = storeData?.theme_color || '#10b981';

  // ⏳ LOADING SCREEN
  if (loading || authChecking) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} /></div>;

  // 🔐 LOCK SCREEN (IF NOT AUTHENTICATED)
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="w-full max-w-xs bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 opacity-50" style={{ backgroundColor: themeColor }} />
          
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border border-white/5" style={{ backgroundColor: `${themeColor}15` }}>
            <Lock className="w-8 h-8" style={{ color: themeColor }} />
          </div>
          
          <h1 className="text-2xl font-black tracking-tight mb-2">Admin Access</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-8">{storeData?.store_name}</p>

          <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="password" 
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 4-Digit PIN"
                autoFocus
                className={`w-full bg-[#111] border ${pinError ? 'border-red-500' : 'border-white/10'} rounded-2xl py-4 pl-12 pr-4 text-center text-lg tracking-[0.5em] font-black focus:outline-none transition-all`}
              />
            </div>
            
            {pinError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 font-bold">Incorrect PIN</motion.p>}
            
            <button 
              type="submit"
              disabled={pinInput.length !== 4}
              className="w-full py-4 rounded-2xl font-black text-black mt-2 disabled:opacity-50 transition-all active:scale-95 shadow-xl"
              style={{ backgroundColor: themeColor }}
            >
              Unlock Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 🔓 MAIN DASHBOARD (IF AUTHENTICATED)
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-16">
      
      {/* HEADER */}
      <header className="bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10" style={{ backgroundColor: `${themeColor}15` }}>
            <Store className="w-5 h-5" style={{ color: themeColor }} />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-none">{storeData?.store_name}</h1>
            <p className="text-[9px] text-zinc-500 uppercase font-bold mt-1 tracking-widest">Command Center</p>
          </div>
        </div>
        <Link href={`/admin/${safeStoreSlug}/inventory`} className="px-4 py-2 bg-[#111] border border-white/10 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-white/5 transition-colors">
          <Package className="w-4 h-4" style={{ color: themeColor }} /> Inventory
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-10">

        {/* 1. 🔴 LIVE ACTION QUEUE (MOVED TO TOP) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black tracking-tight">Live Queue</h2>
            <span className="text-xs font-bold bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-zinc-400">{pendingOrders.length} Waiting</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {pendingOrders.length === 0 ? (
                 <div className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center opacity-50">
                    <Clock className="w-10 h-10 text-zinc-600 mb-3" />
                    <p className="font-bold text-zinc-400">Queue is empty</p>
                    <p className="text-xs text-zinc-600 mt-1">New online carts will appear here.</p>
                 </div>
              ) : (
                pendingOrders.map((order) => (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative group shadow-lg"
                  >
                    <div className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full animate-pulse" style={{ backgroundColor: themeColor }} />
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                         <span className={`text-[9px] font-black px-2 py-0.5 rounded tracking-widest ${order.payment_method === 'ONLINE' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>{order.payment_method}</span>
                         <span className="text-xs text-zinc-400 font-mono font-bold">{order.customer_phone}</span>
                      </div>
                      <h3 className="text-3xl font-black tracking-tighter text-white">{order.cart_id}</h3>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-1">{order.items_count} items • Waiting for approval</p>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-8 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Total</p>
                        <p className="text-2xl font-black flex items-center gap-1">₹{order.total_amount}</p>
                      </div>
                      <button 
                        onClick={() => handleApprovePayment(order.id)} 
                        className="px-8 py-4 rounded-2xl font-black text-black active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]" 
                        style={{ backgroundColor: themeColor }}
                      >
                        Approve
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 2. 🟢 DIGITAL BILL REQUESTS (NEW NOTIFICATION BLOCK) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#25D366]" /> Bill Requests
            </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {billRequests.length === 0 ? (
              <div className="bg-[#0A0A0A] border border-white/5 rounded-[1.5rem] p-6 text-center opacity-50 flex items-center justify-center gap-3">
                 <p className="text-xs font-bold text-zinc-500">No pending digital bill requests</p>
              </div>
            ) : (
              // Map through real bill requests here
              billRequests.map((request, idx) => (
                <div key={idx} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-md">
                   <div>
                     <p className="text-sm font-black text-white">{request.cart_id}</p>
                     <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">{request.phone}</p>
                   </div>
                   <button className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-[#25D366]/20 transition-all">
                     <Send className="w-3 h-3" /> Send PDF
                   </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. 📋 QUICK CHECKOUT (MOVED TO BOTTOM, WITH MANUAL ADD) */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col h-[550px] shadow-2xl mt-4">
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap" style={{ color: themeColor }}>
              <Zap className="w-4 h-4" /> Quick Checkout
            </h3>
            
            {/* Action Buttons: Scan OR Manual Tag Input */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <button onClick={handleScanItem} className="w-full sm:w-auto px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all">
                <QrCode className="w-4 h-4" /> Scan
              </button>
              <div className="text-zinc-600 text-xs font-black uppercase hidden sm:block">OR</div>
              <form onSubmit={handleManualTagSubmit} className="flex w-full sm:w-auto relative">
                <input 
                  type="text" 
                  value={manualTagId} 
                  onChange={(e) => setManualTagId(e.target.value)} 
                  placeholder="Enter TAG ID..." 
                  className="w-full sm:w-40 bg-[#111] border border-white/10 rounded-l-xl py-3 pl-4 pr-2 text-xs font-bold uppercase focus:outline-none focus:border-white/30"
                />
                <button type="submit" className="px-3 bg-white text-black rounded-r-xl font-black active:scale-95 transition-all flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Scanned Items List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-[#050505]/50">
            <AnimatePresence>
              {scannedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <Package className="w-12 h-12 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Cart is Empty</p>
                </div>
              ) : (
                scannedItems.map((item) => (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#111] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase">{item.tag}</p>
                      <p className="font-bold text-sm">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-black text-lg">₹{item.price}</p>
                      <button onClick={() => setScannedItems(prev => prev.filter(i => i.id !== item.id))} className="text-red-500/50 hover:text-red-500 bg-red-500/10 p-2 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Checkout Footer */}
          <div className="p-6 bg-[#0A0A0A] border-t border-white/5 flex flex-col gap-4">
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="tel" placeholder="Customer Phone Number (Optional)" 
                value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#111] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-white/20 font-bold"
              />
            </div>
            <button 
              onClick={handleCreateManualBill}
              className="w-full bg-white text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl disabled:opacity-50"
              disabled={scannedItems.length === 0}
            >
              <CheckCircle2 className="w-5 h-5" /> Generate Cash Bill (₹{scannedItems.reduce((a, b) => a + b.price, 0)})
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
