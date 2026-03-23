'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getProductByTag, processCheckout } from '../actions/billingActions';
import { ShoppingBag, Trash2, CreditCard, Loader2, XCircle, QrCode, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

type ViewState = 'CART_VIEW' | 'SCANNING' | 'PRODUCT_SHOWCASE';

export default function BillingPage() {
  const [viewState, setViewState] = useState<ViewState>('CART_VIEW');
  const [cart, setCart] = useState<any[]>([]);
  const [scannedData, setScannedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScan = useRef(false);
  const containerId = 'premium-scanner';

  // 🛡️ 1. Sync Memory (Local Storage)
  useEffect(() => {
    const savedCart = localStorage.getItem('premium_cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        const formattedCart = parsedCart.map((item: any) => ({
          id: item.tagId,
          products: {
            name: item.name,
            price: item.price,
            image_url: item.image_url,
          },
        }));
        setCart(formattedCart);
      } catch (e) { console.error(e); }
    }
  }, []);

  const syncToStorage = (updatedCart: any[]) => {
    const storageFormat = updatedCart.map(item => ({
      tagId: item.id,
      name: item.products?.name,
      price: item.products?.price,
      image_url: item.products?.image_url,
    }));
    localStorage.setItem('premium_cart', JSON.stringify(storageFormat));
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // 🛡️ 2. The Smart Scan Handler (Camera crash proof)
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    if (window.navigator?.vibrate) window.navigator.vibrate(50);

    // Stop camera safely BEFORE changing state to prevent Next.js crash
    if (scannerRef.current) {
        try {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
            scannerRef.current = null;
        } catch (e) { console.error("Camera stop failed", e); }
    }

    // Clean URL into a pure Tag ID
    let tagId = decodedText.trim();
    if (tagId.includes('/q/')) tagId = tagId.split('/q/').pop() || tagId;
    const formattedTag = tagId.toUpperCase();

    if (cart.some(item => item.id === formattedTag)) {
      showError(`${formattedTag} is already in your bag!`);
      setViewState('CART_VIEW');
      isProcessingScan.current = false;
      return;
    }

    setLoading(true);
    try {
      const res = await getProductByTag(formattedTag);
      if (res && res.success && res.tag) {
        setScannedData({ scannedProduct: res.tag, relatedProducts: res.relatedProducts || [] });
        
        // Small delay to ensure camera is fully unloaded from browser memory
        setTimeout(() => setViewState('PRODUCT_SHOWCASE'), 200);
      } else {
        showError(res?.message || `Tag ${formattedTag} not found.`);
        setViewState('CART_VIEW');
      }
    } catch (err) {
      showError('Server connection error.');
      setViewState('CART_VIEW');
    } finally {
      setLoading(false);
      isProcessingScan.current = false;
    }
  }, [cart]); 

  // 🛡️ 3. Bulletproof Scanner Initialization (Callback Ref)
  const scannerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null && viewState === 'SCANNING') {
      if (!scannerRef.current) {
        const html5QrCode = new Html5Qrcode(node.id);
        scannerRef.current = html5QrCode;

        setTimeout(async () => {
          try {
            await html5QrCode.start(
              { facingMode: 'environment' }, 
              { fps: 10, qrbox: { width: 250, height: 250 } },
              (text) => handleScanSuccess(text), // Trigger success handler
              () => {} 
            );
          } catch (err) {
            console.error('Camera error:', err);
            showError('Camera failed. Check permissions.');
            setViewState('CART_VIEW');
          }
        }, 150);
      }
    } else {
      if (scannerRef.current) {
        scannerRef.current.stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {})
          .finally(() => { scannerRef.current = null; });
      }
    }
  }, [viewState, handleScanSuccess]);

  // 🛡️ 4. Cart Logic
  const addToCart = () => {
    if (scannedData && scannedData.scannedProduct) {
      const updatedCart = [...cart, scannedData.scannedProduct];
      setCart(updatedCart);
      syncToStorage(updatedCart);
      setScannedData(null);
      setViewState('CART_VIEW');
      showSuccess(`${scannedData.scannedProduct.products?.name} added to bag!`);
    }
  };

  const removeFromCart = (tagId: string, productName: string) => {
    const updatedCart = cart.filter(item => item.id !== tagId);
    setCart(updatedCart);
    syncToStorage(updatedCart);
    showSuccess(`${productName} removed from bag`);
  };

  // 🛡️ 5. Checkout Logic
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      const res = await processCheckout(cart.map(item => item.id));
      if (res && res.success) {
        showSuccess(`✅ Sale completed! Total: ₹${totalAmount}`);
        setCart([]); // Clear state
        localStorage.removeItem('premium_cart'); // Clear browser memory
        setViewState('CART_VIEW');
      } else {
        showError(res?.message || 'Checkout failed.');
      }
    } catch (err) {
      showError('Checkout error. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.products?.price || 0), 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* TOASTS */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-6 left-1/2 -translate-x-1/2 z- bg-red-500/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full border border-red-400 shadow-2xl flex items-center gap-2">
            <XCircle className="w-5 h-5" /> {errorMsg}
          </motion.div>
        )}
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-6 left-1/2 -translate-x-1/2 z- bg-emerald-500/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full border border-emerald-400 shadow-2xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* VIEW 1: CART */}
        {viewState === 'CART_VIEW' && (
          <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col pb-36">
            <header className="px-6 pt-12 pb-6 flex items-center justify-between">
              <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-emerald-400" /> My Bag
              </h1>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">{cart.length} Items</span>
            </header>

            <div className="flex-1 px-6 space-y-4 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 opacity-50">
                  <QrCode className="w-16 h-16 mb-4 text-zinc-600" />
                  <p className="font-medium text-zinc-400 text-center">Bag is empty.<br />Tap the scanner to add items.</p>
                </div>
              ) : (
                cart.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-zinc-900/80 backdrop-blur-sm p-4 rounded-[2rem] border border-zinc-800 flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-700">
                        {item.products?.image_url && <img src={item.products.image_url} alt="img" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white leading-tight">{item.products?.name}</h3>
                        <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">{item.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-black">₹{item.products?.price}</p>
                      <button onClick={() => removeFromCart(item.id, item.products?.name)} className="p-3 text-zinc-500 hover:text-red-400 bg-zinc-950 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW 2: SCANNER */}
        {viewState === 'SCANNING' && (
          <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
            <button onClick={() => setViewState('CART_VIEW')} className="absolute top-12 right-6 p-4 bg-zinc-900 rounded-full text-white z-50 border border-zinc-700 hover:bg-zinc-800 transition">
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl bg-zinc-900">
              <div id={containerId} ref={scannerCallbackRef} className="w-full h-full" style={{ minHeight: '300px' }}></div>
              <div className="absolute inset-0 border-[2px] border-emerald-500/30 rounded-3xl pointer-events-none"></div>
            </div>
            {loading && <Loader2 className="absolute bottom-32 w-10 h-10 text-emerald-500 animate-spin" />}
            <p className="mt-6 text-zinc-400 text-sm">Align QR code within the frame</p>
          </motion.div>
        )}

        {/* VIEW 3: SHOWCASE */}
        {viewState === 'PRODUCT_SHOWCASE' && scannedData && (
          <motion.div key="showcase" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-0 z-50 bg-zinc-950 flex flex-col p-6">
            <div className="flex-1 relative rounded-3xl overflow-hidden bg-zinc-900">
              {scannedData.scannedProduct.products?.image_url ? (
                <img src={scannedData.scannedProduct.products.image_url} className="w-full h-full object-cover" alt="product" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-20 h-20 text-zinc-800"/></div>
              )}
              <div className="absolute bottom-8 left-8 bg-black/50 backdrop-blur-sm p-4 rounded-2xl">
                <h2 className="text-4xl font-black text-white">{scannedData.scannedProduct.products?.name}</h2>
                <p className="text-2xl font-bold text-emerald-400">₹{scannedData.scannedProduct.products?.price}</p>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
                <button onClick={() => setViewState('SCANNING')} className="flex-1 bg-zinc-800 text-white font-black text-lg py-5 rounded-2xl hover:bg-zinc-700 transition-all active:scale-95">Cancel</button>
                <button onClick={addToCart} className="flex- bg-emerald-500 text-black font-black text-xl py-5 rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95">
                  Confirm Add
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM CHECKOUT BAR */}
      {viewState === 'CART_VIEW' && (
        <div className="fixed bottom-0 left-0 w-full p-6 z-40">
          <div className="max-w-md mx-auto relative">
            {/* FLOATING SCAN BUTTON */}
            <button onClick={() => setViewState('SCANNING')} className="absolute left-1/2 -translate-x-1/2 -top-10 bg-emerald-500 text-black p-5 rounded-full hover:scale-110 active:scale-95 transition-transform shadow-[0_10px_40px_rgba(16,185,129,0.4)] border-[6px] border-zinc-950 z-50">
              <QrCode className="w-8 h-8" />
            </button>
            
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl relative z-40">
              <div className="pl-4">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Grand Total</p>
                <p className="text-2xl font-black text-white">₹{totalAmount}</p>
              </div>
              <button onClick={handleCheckout} disabled={cart.length === 0 || isCheckingOut} className="bg-white text-black px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition active:scale-95">
                {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                Buy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
