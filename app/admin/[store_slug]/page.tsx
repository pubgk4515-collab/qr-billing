'use client';

import { use, useEffect, useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  CheckCircle2,
  Loader2,
  Package,
  QrCode,
  Smartphone,
  Zap,
  Trash2,
  Clock,
  MessageCircle,
  Send,
  Plus,
  X,
  Eye,
  XCircle,
  Image as ImageIcon,
  Moon,
  Sun,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Html5Qrcode } from 'html5-qrcode';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

/* ── Theme helpers (identical to landing page) ── */
const THEME_KEY = 'qrebill-theme';

function getSystemTheme(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadThemeFromStorage(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light') return false;
  if (stored === 'dark') return true;
  return getSystemTheme();
}

function applyThemeClass(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export default function AdminDashboard({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;

  const [isDark, setIsDark] = useState(loadThemeFromStorage);

  useLayoutEffect(() => {
    applyThemeClass(isDark);
  }, [isDark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const [storeData, setStoreData] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [manualTagId, setManualTagId] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [itemFetching, setItemFetching] = useState(false);

  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [billRequests, setBillRequests] = useState<any[]>([]);
  const [manualApproveCartId, setManualApproveCartId] = useState('');
  const [manualBillCartId, setManualBillCartId] = useState('');
  const [manualBillPhone, setManualBillPhone] = useState('');

  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // ── AUTH & DATA FETCHING (unchanged) ──
  useEffect(() => {
    if (!safeStoreSlug) return;
    async function verifyAndLoad() {
      try {
        const activeSession = localStorage.getItem('active_admin_session');
        if (activeSession !== safeStoreSlug) {
          router.push('/');
          return;
        }
        setIsAuthed(true);
        const { data: store } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', safeStoreSlug)
          .single();
        if (store) {
          setStoreData(store);
          fetchLiveQueue(store.id);
          fetchBillRequests(store.id);
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Initialization Error:', err);
        router.push('/');
      } finally {
        setAuthChecking(false);
        setLoading(false);
      }
    }
    verifyAndLoad();
  }, [safeStoreSlug, router]);

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

  const fetchBillRequests = async (storeId: string) => {
    if (!isAuthed) return;
    const { data } = await supabase
      .from('bill_requests')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (data) setBillRequests(data);
  };

  useEffect(() => {
    if (!storeData?.id || !isAuthed) return;
    const interval = setInterval(() => {
      fetchLiveQueue(storeData.id);
      fetchBillRequests(storeData.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [storeData?.id, isAuthed]);

  // ── BUSINESS LOGIC (unchanged) ──
  const processScannedTag = async (tagId: string) => {
    if (!tagId) return;
    const tagUpper = tagId.trim().toUpperCase();
    if (scannedItems.some(item => item.tag === tagUpper)) {
      alert('Item already in cart.');
      return;
    }
    setItemFetching(true);
    try {
      const { data, error } = await supabase
        .from('qr_tags')
        .select(`id, status, products ( id, name, price )`)
        .eq('id', tagUpper)
        .eq('store_id', storeData.id)
        .single();
      if (error || !data || !data.products) {
        alert('Invalid tag.');
        return;
      }
      if (data.status === 'sold') {
        alert('Item already sold.');
        return;
      }
      const productInfo: any = Array.isArray(data.products) ? data.products : data.products;
      setScannedItems(prev => [
        { id: Date.now(), tag: data.id, name: productInfo.name, price: productInfo.price, product_id: productInfo.id },
        ...prev,
      ]);
  } catch (err) {
    console.error('Scan error:', err);
      alert('Network error.');
    } finally {
      setItemFetching(false);
    }
  };

  const handleManualTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTagId.trim()) return;
    await processScannedTag(manualTagId);
    setManualTagId('');
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    if (isScannerOpen) {
      setTimeout(() => {
        html5QrCode = new Html5Qrcode('admin-reader');
        html5QrCode
          .start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            async (decodedText: string) => {
              const scannedTag = decodeURIComponent(decodedText.split('/').pop() || '').toUpperCase().trim();
              if (scannedTag) {
                html5QrCode.pause();
                await processScannedTag(scannedTag);
                html5QrCode.stop().then(() => setIsScannerOpen(false)).catch(console.error);
              }
            },
            () => {},
          )
          .catch(console.error);
      }, 100);
    }
    return () => {
      if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(console.error);
    };
  }, [isScannerOpen]);

  const handleCreateManualBill = async () => {
    if (scannedItems.length === 0) return alert('Add at least one item.');
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
      purchased_items: scannedItems,
    });
    if (!error) {
      const tagIdsToFree = scannedItems.map((item: any) => item.tag);
      await supabase.from('qr_tags').update({ status: 'free', product_id: null }).in('id', tagIdsToFree);
      alert('Invoice generated.');
      setScannedItems([]);
      setCustomerPhone('');
    } else {
      alert('Transaction failed.');
    }
    setLoading(false);
  };

  const handleApprovePayment = async (order: any) => {
    setPendingOrders(prev => prev.filter(o => o.id !== order.id));
    try {
      await supabase.from('sales').update({ payment_status: 'completed' }).eq('id', order.id);
      if (order.purchased_items && Array.isArray(order.purchased_items)) {
        const tagIdsToFree = order.purchased_items.map((item: any) => item.id);
        if (tagIdsToFree.length > 0) {
          await supabase.from('qr_tags').update({ status: 'free', product_id: null }).in('id', tagIdsToFree);
        }
      }
      setIsViewModalOpen(false);
      setViewingOrder(null);
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  const handleRejectOrder = async (order: any) => {
    if (!confirm(`Reject ${order.cart_id}?`)) return;
    setPendingOrders(prev => prev.filter(o => o.id !== order.id));
    try {
      await supabase.from('sales').update({ payment_status: 'rejected' }).eq('id', order.id);
      if (order.purchased_items && Array.isArray(order.purchased_items)) {
        const tagIdsToRevert = order.purchased_items.map((item: any) => item.id);
        if (tagIdsToRevert.length > 0) {
          await supabase.from('qr_tags').update({ status: 'active' }).in('id', tagIdsToRevert);
        }
      }
    } catch (err) {
      console.error('Rejection error:', err);
    }
  };

  const handleDispatchBill = async (request: any) => {
    setBillRequests(prev => prev.filter(r => r.id !== request.id));
    const storeName = storeData?.store_name || 'our store';
    const billUrl = `${window.location.origin}/${safeStoreSlug}/bill/${request.cart_id}`;
    const message = encodeURIComponent(
      `Hi! Thank you for shopping at ${storeName}. Your digital bill: \n\n${billUrl}`,
    );
    let phone = request.customer_phone.replace(/\D/g, '');
    if (phone.length === 10) phone = `91${phone}`;
    const waLink = `https://wa.me/${phone}?text=${message}`;
    try {
      await supabase.from('bill_requests').update({ status: 'completed' }).eq('id', request.id);
      window.open(waLink, '_blank');
    } catch (err) {
      console.error('Dispatch error:', err);
    }
  };

  const handleManualApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualApproveCartId.trim()) return;
    const targetCartId = manualApproveCartId.trim().toUpperCase();
    try {
      const { data: order, error } = await supabase
        .from('sales')
        .select('*')
        .eq('cart_id', targetCartId)
        .eq('store_id', storeData.id)
        .single();
      if (error || !order) {
        alert('Order not found.');
        return;
      }
      if (order.payment_status === 'completed') {
        alert('Already approved.');
        setManualApproveCartId('');
        return;
      }
      await handleApprovePayment(order);
      setManualApproveCartId('');
      alert(`Approved ${targetCartId}!`);
  } catch (err) {
    console.error('Approval error:', err);
      alert('Error approving.');
    }
  };

  const handleManualBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBillCartId.trim() || manualBillPhone.length < 10) {
      alert('Enter valid CART ID and phone.');
      return;
    }
    const targetCartId = manualBillCartId.trim().toUpperCase();
    let phone = manualBillPhone.replace(/\D/g, '');
    if (phone.length === 10) phone = `91${phone}`;
    const storeName = storeData?.store_name || 'our store';
    const billUrl = `${window.location.origin}/${safeStoreSlug}/bill/${targetCartId}`;
    const message = encodeURIComponent(
      `Hi! Thank you for shopping at ${storeName}. Your digital bill: \n\n${billUrl}`,
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setManualBillCartId('');
    setManualBillPhone('');
  };

  const themeColor = storeData?.theme_color || '#10b981';

  // ═══ REACTIVE THEME (LIGHT MODE FIXED) ═══
  const theme = {
    bg: isDark ? 'bg-[#000000]' : 'bg-white',                                     // main bg
    surface: isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]',                            // section bg
    card: isDark ? 'bg-[#111]' : 'bg-white',
    cardAlt: isDark ? 'bg-[#0D0D0D]' : 'bg-[#F5F5F5]',
    border: isDark ? 'border-white/5' : 'border-black/5',
    borderLight: isDark ? 'border-white/10' : 'border-black/10',
    text: isDark ? 'text-white' : 'text-black',
    textMuted: isDark ? 'text-zinc-400' : 'text-[#555555]',
    textFaint: isDark ? 'text-zinc-600' : 'text-[#999999]',
    divider: isDark ? 'bg-white/5' : 'bg-black/5',
    input: isDark
      ? 'bg-[#111] border-white/10 focus:border-white/30'
      : 'bg-[#F2F2F7] border-black/10 focus:border-black/30',
    placeholder: isDark ? 'placeholder:text-zinc-500' : 'placeholder:text-zinc-400',
    primaryBtn: isDark
      ? 'bg-white text-black hover:bg-gray-100'
      : 'bg-black text-white hover:bg-gray-800',
    secondaryBtn: isDark
      ? 'bg-white/5 hover:bg-white/10 text-white'
      : 'bg-black/5 hover:bg-black/10 text-black',
    nav: isDark
      ? 'bg-black/80 border-white/5 backdrop-blur-2xl'
      : 'bg-white/80 border-black/5 backdrop-blur-2xl',
    scannerBg: isDark ? 'bg-[#050505]' : 'bg-white',
  };

  const pressable = 'active:scale-95 transition-transform duration-100';

  if (loading || authChecking)
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
      </div>
    );
  if (!isAuthed) return null;

  /* ── Common input class ── */
  const inputClass = `w-full py-2.5 px-4 text-sm font-medium rounded-xl border ${theme.input} ${theme.placeholder} transition-colors focus:outline-none`;

  return (
    <div
      className={`min-h-screen ${theme.bg} ${theme.text} font-sans pb-16 relative ${inter.variable}`}
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      {/* HEADER */}
      <header className={`sticky top-0 z-40 px-6 py-3 border-b ${theme.nav}`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className={`p-2 rounded-full transition-colors ${theme.secondaryBtn}`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
              >
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-semibold text-sm tracking-tight leading-none">
                  {storeData?.store_name}
                </h1>
                <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Dashboard</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full transition-all duration-200 ${theme.secondaryBtn} ${pressable}`}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div
                    key="sun"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <Link
              href={`/admin/${safeStoreSlug}/inventory`}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${theme.secondaryBtn}`}
            >
              <Package className="w-3.5 h-3.5" style={{ color: themeColor }} />
              Inventory
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-16">
        {/* 1. ACTIVE CARTS */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Active Carts</h2>
              <p className={`text-sm mt-1 ${theme.textMuted}`}>
                {pendingOrders.length} waiting for approval
              </p>
            </div>
            <form onSubmit={handleManualApproveSubmit} className="flex w-full sm:w-auto">
              <input
                type="text"
                placeholder="Enter CART ID…"
                value={manualApproveCartId}
                onChange={(e) => setManualApproveCartId(e.target.value.toUpperCase())}
                className={`w-full sm:w-48 py-2.5 pl-4 pr-2 text-sm font-medium rounded-l-xl border ${theme.input} ${theme.placeholder} focus:outline-none`}
              />
              <button
                type="submit"
                disabled={!manualApproveCartId}
                className={`px-4 text-sm font-semibold rounded-r-xl transition-all disabled:opacity-50 ${theme.primaryBtn}`}
              >
                Approve
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {pendingOrders.length === 0 ? (
                <div
                  className={`${theme.cardAlt} border ${theme.border} rounded-[2rem] p-10 flex flex-col items-center justify-center text-center opacity-60`}
                >
                  <Clock className="w-8 h-8 text-zinc-500 mb-3" />
                  <p className="font-medium text-zinc-400">No active carts</p>
                  <p className="text-sm text-zinc-500 mt-1">Incoming scans will appear here.</p>
                </div>
              ) : (
                pendingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`${theme.card} border ${theme.borderLight} rounded-[2rem] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative group`}
                  >
                    <div
                      className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                      style={{ backgroundColor: themeColor }}
                    />
                    <div className="pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            order.payment_method === 'ONLINE'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {order.payment_method}
                        </span>
                        <span className="text-sm text-zinc-400 font-medium">
                          {order.customer_phone}
                        </span>
                      </div>
                      <h3 className="text-2xl font-semibold tracking-tight">{order.cart_id}</h3>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        {order.items_count} items · Pending Approval
                      </p>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                          Total
                        </p>
                        <p className="text-xl font-semibold">₹{order.total_amount}</p>
                      </div>
                      <button
                        onClick={() => {
                          setViewingOrder(order);
                          setIsViewModalOpen(true);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${theme.secondaryBtn} flex items-center gap-2`}
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button
                        onClick={() => handleRejectOrder(order)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center gap-2`}
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 2. DISPATCH CENTER – input group width fixed */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Dispatch Center</h2>
            <p className={`text-sm mt-1 ${theme.textMuted}`}>Digital bill delivery</p>
          </div>

          {/* Manual dispatch inputs – full width, matching card grid */}
          <form onSubmit={handleManualBillSubmit} className="w-full mb-6">
  <div className={`flex w-full rounded-[2rem] border ${theme.borderLight} overflow-hidden ${theme.card}`}>
    
    <input
      type="text"
      placeholder="CART ID"
      value={manualBillCartId}
      onChange={(e) => setManualBillCartId(e.target.value.toUpperCase())}
      className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium bg-transparent focus:outline-none ${theme.placeholder}`}
    />

    <div className={`w-px ${theme.divider}`} />

    <input
      type="tel"
      maxLength={10}
      placeholder="Phone"
      value={manualBillPhone}
      onChange={(e) => setManualBillPhone(e.target.value.replace(/\D/g, ''))}
      className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium bg-transparent focus:outline-none ${theme.placeholder}`}
    />

    <button
      type="submit"
      disabled={!manualBillCartId || manualBillPhone.length < 10}
      className="px-5 flex items-center justify-center transition-all disabled:opacity-50"
      style={{
        backgroundColor: `${themeColor}15`,
        color: themeColor,
      }}
    >
      <Send className="w-4 h-4" />
    </button>
    
  </div>
</form>

          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence>
              {billRequests.length === 0 ? (
                <div
                  className={`${theme.cardAlt} border ${theme.border} rounded-2xl p-6 text-center opacity-60`}
                >
                  <p className="text-sm font-medium text-zinc-500">No pending dispatches.</p>
                </div>
              ) : (
                billRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`${theme.card} border ${theme.border} rounded-xl p-4 flex items-center justify-between`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{request.cart_id}</p>
                      <p className="text-xs text-zinc-500 font-medium">
                        {request.customer_phone}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDispatchBill(request)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-all flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" /> Send Bill
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 3. CHECKOUT CONSOLE */}
        <section
          className={`${theme.cardAlt} border ${theme.borderLight} rounded-[2.5rem] overflow-hidden flex flex-col h-[550px] relative`}
        >
          <AnimatePresence>
            {itemFetching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-[2.5rem]"
              >
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={`p-5 border-b ${theme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: themeColor }} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Checkout Console</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsScannerOpen(true)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme.secondaryBtn} flex items-center justify-center gap-2`}
              >
                <QrCode className="w-4 h-4" /> Scan Tag
              </button>
              <span className="text-xs font-medium text-zinc-500 hidden sm:block">or</span>
              <form onSubmit={handleManualTagSubmit} className="flex w-full sm:w-auto">
                <input
                  type="text"
                  value={manualTagId}
                  onChange={(e) => setManualTagId(e.target.value)}
                  placeholder="Tag ID…"
                  className={`w-full sm:w-36 py-2.5 pl-4 pr-2 text-sm font-medium uppercase rounded-l-xl border border-r-0 ${theme.input} ${theme.placeholder} focus:outline-none placeholder:normal-case placeholder:font-normal`}
                />
                <button
                  type="submit"
                  disabled={itemFetching || !manualTagId}
                  className="px-3 rounded-r-xl bg-white text-black font-semibold active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          <div
            className={`flex-1 overflow-y-auto p-4 flex flex-col gap-2 ${
              isDark ? 'bg-[#050505]/50' : 'bg-gray-50'
            }`}
          >
            <AnimatePresence>
              {scannedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <Package className="w-12 h-12 mb-2" />
                  <p className="text-xs font-semibold uppercase tracking-widest">
                    Cart is empty
                  </p>
                </div>
              ) : (
                scannedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`${theme.card} border ${theme.border} p-4 rounded-2xl flex items-center justify-between`}
                  >
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase">
                        {item.tag}
                      </p>
                      <p className="font-medium text-sm">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-lg">₹{item.price}</p>
                      <button
                        onClick={() => setScannedItems(prev => prev.filter(i => i.id !== item.id))}
                        className="text-red-400 hover:text-red-300 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className={`p-5 border-t ${theme.border} flex flex-col gap-4`}>
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="tel"
                placeholder="Customer phone (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                className={`w-full py-3 pl-12 pr-4 text-sm font-medium rounded-xl border ${theme.input} ${theme.placeholder} focus:outline-none`}
              />
            </div>
            <button
              onClick={handleCreateManualBill}
              disabled={scannedItems.length === 0}
              className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
              style={{ backgroundColor: themeColor, color: '#000' }}
            >
              <CheckCircle2 className="w-5 h-5" />
              Checkout (₹{scannedItems.reduce((a, b) => a + b.price, 0)})
            </button>
          </div>
        </section>
      </main>

      {/* VIEW ORDER DETAILS MODAL (unchanged, but with consistent input/button classes) */}
      <AnimatePresence>
        {isViewModalOpen && viewingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-6"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`${theme.surface} w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border ${theme.borderLight} p-6 sm:p-8 relative max-h-[90vh] flex flex-col`}
            >
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewingOrder(null);
                }}
                className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${theme.secondaryBtn}`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className={`mb-6 pb-6 border-b ${theme.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-5 h-5" style={{ color: themeColor }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                    Order Details
                  </span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight mt-2 mb-1">
                  {viewingOrder.cart_id}
                </h2>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      viewingOrder.payment_method === 'ONLINE'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {viewingOrder.payment_method}
                  </span>
                  <span className="text-sm text-zinc-500 font-medium">
                    {viewingOrder.customer_phone || 'No phone'}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 mb-6 flex flex-col gap-3">
                {viewingOrder.purchased_items &&
                  viewingOrder.purchased_items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className={`${theme.card} border ${theme.border} rounded-2xl p-3 flex items-center gap-4`}
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                        {item.products?.image_url ? (
                          <img
                            src={item.products.image_url}
                            alt={item.products?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <ImageIcon className="w-5 h-5 text-zinc-700" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm leading-tight mb-1">
                          {item.products?.name || 'Item'}
                        </h4>
                        <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                          {item.id}
                        </span>
                      </div>
                      <div className="font-semibold text-lg">₹{item.products?.price}</div>
                    </div>
                  ))}
              </div>

              <div className={`pt-6 border-t ${theme.border} mt-auto`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-500 font-medium text-sm">Grand Total</span>
                  <span className="text-2xl font-semibold">₹{viewingOrder.total_amount}</span>
                </div>
                <button
                  onClick={() => handleApprovePayment(viewingOrder)}
                  className="w-full py-4 rounded-2xl font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 text-black"
                  style={{ backgroundColor: themeColor }}
                >
                  <CheckCircle2 className="w-5 h-5" /> Approve & Complete Sale
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCANNER MODAL (unchanged) */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 ${theme.scannerBg}`}
          >
            <div className="w-full max-w-sm aspect-square rounded-[2rem] overflow-hidden border-2 border-dashed border-white/20 relative">
              <div id="admin-reader" className="w-full h-full bg-[#111]"></div>
              <div className="absolute inset-10 border-2 border-white/10 rounded-2xl pointer-events-none animate-pulse" />
            </div>
            <p className="mt-8 text-zinc-400 font-medium text-sm tracking-wide text-center">
              Position the QR code within the frame
            </p>
            <button
              onClick={() => setIsScannerOpen(false)}
              className="mt-10 px-8 py-3 bg-white/10 text-white rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-white/20 active:scale-95 transition-all border border-white/5"
            >
              <X className="w-4 h-4" /> Cancel Scan
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}