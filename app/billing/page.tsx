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

  // Load cart from localStorage
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
      } catch (e) {
        console.error(e);
      }
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

  // 🔥 Updated handleScanSuccess: stops camera cleanly before switching view
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    if (window.navigator?.vibrate) window.navigator.vibrate(50);

    // Step 1: Safely stop the camera to avoid crashes
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (e) {
        console.error('Camera stop failed', e);
      }
    }

    // Extract tag ID from URL if needed
    let tagId = decodedText.trim();
    if (tagId.includes('/q/')) {
      tagId = tagId.split('/q/').pop() || tagId;
    } else if (tagId.includes('/')) {
      tagId = tagId.split('/').pop() || tagId;
    }
    const formattedTag = tagId.toUpperCase();

    // Check duplicate in cart
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

        // Small delay to ensure camera resources are fully released
        setTimeout(() => {
          setViewState('PRODUCT_SHOWCASE');
        }, 200);
      } else {
        showError(res?.message || `Tag ${formattedTag} not found.`);
        setViewState('CART_VIEW');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showError('Server error.');
      setViewState('CART_VIEW');
    } finally {
      setLoading(false);
      isProcessingScan.current = false;
    }
  }, [cart, showError]);

  // 🎯 Callback ref – bulletproof scanner initializer
  const scannerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null && viewState === 'SCANNING') {
      if (!scannerRef.current) {
        const html5QrCode = new Html5Qrcode(node.id);
        scannerRef.current = html5QrCode;

        // Short delay to allow animations
        setTimeout(async () => {
          try {
            await html5QrCode.start(
              { facingMode: 'environment' }, // Back camera
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
              },
              (text) => {
                // Only call handleScanSuccess – no extra stop here
                handleScanSuccess(text);
              },
              () => {} // Ignore frame search errors
            );
          } catch (err) {
            console.error('Camera start error:', err);
            showError('Camera failed. Check permissions.');
            setViewState('CART_VIEW');
          }
        }, 100);
      }
    } else {
      // Cleanup when scanning view is closed
      if (scannerRef.current) {
        scannerRef.current.stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    }
  }, [viewState, handleScanSuccess, showError, setViewState]);

  const addToCart = () => {
    if (scannedData && scannedData.scannedProduct) {
      const updatedCart = [...cart, scannedData.scannedProduct];
      setCart(updatedCart);
      syncToStorage(updatedCart);
      setScannedData(null);
      setViewState('CART_VIEW');
      showSuccess(`${scannedData.scannedProduct.products?.name} added to bag!`);
    } else {
      showError('Product data missing. Please scan again.');
      setViewState('CART_VIEW');
    }
  };

  const removeFromCart = (tagId: string, productName: string) => {
    const updatedCart = cart.filter(item => item.id !== tagId);
    setCart(updatedCart);
    syncToStorage(updatedCart);
    showSuccess(`${productName} removed from bag`);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      const res = await processCheckout(cart.map(item => item.id));
      if (res && res.success) {
        showSuccess(`✅ Sale completed! Total: ₹${totalAmount}`);
        setCart([]);
        localStorage.removeItem('premium_cart');
        setViewState('CART_VIEW');
      } else {
        showError(res?.message || 'Checkout failed. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      showError('Checkout error. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.products?.price || 0), 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Toast notifications */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full border border-red-400 shadow-2xl flex items-center gap-2"
          >
            <XCircle className="w-5 h-5" /> {errorMsg}
          </motion.div>
        )}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full border border-emerald-400 shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {viewState === 'CART_VIEW' && (
          <motion.div
            key="cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col pb-36"
          >
            <header className="px-6 pt-12 pb-6 flex items-center justify-between">
              <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-emerald-400" /> My Bag
              </h1>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                {cart.length} Items
              </span>
            </header>

            <div className="flex-1 px-6 space-y-4 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 opacity-50">
                  <QrCode className="w-16 h-16 mb-4 text-zinc-600" />
                  <p className="font-medium text-zinc-400 text-center">
                    Bag is empty.<br />Tap the scanner to add items.
                  </p>
                </div>
              ) : (
                cart.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900/80 backdrop-blur-sm p-4 rounded-[2rem] border border-zinc-800 flex items-center justify-between shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-700">
                        {item.products?.image_url && (
                          <img src={item.products.image_url} alt="img" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white leading-tight">{item.products?.name}</h3>
                        <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">{item.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-black">₹{item.products?.price}</p>
                      <button
                        onClick={() => removeFromCart(item.id, item.products?.name)}
                        className="p-3 text-zinc-500 hover:text-red-400 bg-zinc-950 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {viewState === 'SCANNING' && (
          <motion.div
            key="scan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
          >
            <button
              onClick={() => setViewState('CART_VIEW')}
              className="absolute top-12 right-6 p-4 bg-zinc-900 rounded-full text-white z-50 border border-zinc-700 hover:bg-zinc-800 transition"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl bg-zinc-900">
              <div
                id={containerId}
                ref={scannerCallbackRef}
                className="w-full h-full"
                style={{ minHeight: '300px' }}
              ></div>
              <div className="absolute inset-0 border-[2px] border-emerald-500/30 rounded-3xl pointer-events-none"></div>
            </div>
            <p className="mt-6 text-zinc-400 text-sm">Align QR code within the frame</p>
          </motion.div>
        )}

        {viewState === 'PRODUCT_SHOWCASE' && scannedData && (
          <motion.div
            key="showcase"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-zinc-950 flex flex-col p-6"
          >
            <div className="flex-1 relative rounded-3xl overflow-hidden bg-zinc-900">
              {scannedData.scannedProduct.products?.image_url ? (
                <img
                  src={scannedData.scannedProduct.products.image_url}
                  className="w-full h-full object-cover"
                  alt={scannedData.scannedProduct.products.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                  No image available
                </div>
              )}
              <div className="absolute bottom-8 left-8 bg-black/50 backdrop-blur-sm p-4 rounded-2xl">
                <h2 className="text-4xl font-black text-white">{scannedData.scannedProduct.products?.name}</h2>
                <p className="text-2xl font-bold text-emerald-400">₹{scannedData.scannedProduct.products?.price}</p>
              </div>
            </div>
            <button
              onClick={addToCart}
              className="w-full bg-emerald-500 text-black font-black text-xl py-5 rounded-2xl mt-6 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95"
            >
              Confirm Add to Bag
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {viewState === 'CART_VIEW' && (
        <div className="fixed bottom-0 left-0 w-full p-6 z-40">
          <div className="max-w-md mx-auto">
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl flex items-center justify-between shadow-2xl">
              <button
                onClick={() => setViewState('SCANNING')}
                className="bg-emerald-500 text-black p-4 rounded-full hover:scale-110 active:scale-95 transition-transform shadow-lg"
              >
                <QrCode className="w-6 h-6" />
              </button>
              <div className="text-center">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Grand Total</p>
                <p className="text-2xl font-black text-white">₹{totalAmount}</p>
              </div>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isCheckingOut}
                className="bg-white text-black px-6 py-3 rounded-xl font-black flex items-center gap-2 disabled:opacity-50 hover:bg-gray-100 transition active:scale-95"
              >
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