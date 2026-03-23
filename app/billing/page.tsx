'use client';

import { useState, useEffect, useRef } from 'react';
import { getProductByTag, processCheckout } from '../actions/billingActions';
import { ShoppingBag, Trash2, CreditCard, Loader2, XCircle, QrCode, X, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

type ViewState = 'CART_VIEW' | 'SCANNING' | 'PRODUCT_SHOWCASE';

export default function BillingPage() {
  const [viewState, setViewState] = useState<ViewState>('CART_VIEW');
  const [cart, setCart] = useState<any[]>([]);
  const [scannedData, setScannedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isProcessingScan = useRef(false);

  // LOAD CART FROM LOCALSTORAGE
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
                    image_url: item.image_url
                }
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
          image_url: item.products?.image_url
      }));
      localStorage.setItem('premium_cart', JSON.stringify(storageFormat));
  };

  // SCANNER LOGIC WITH DOM CHECK
  useEffect(() => {
    if (viewState === 'SCANNING') {
        // Delay ensures the 'premium-scanner' div is in the DOM
        const timer = setTimeout(() => {
            if (!scannerRef.current) {
                const scanner = new Html5QrcodeScanner(
                    "premium-scanner",
                    { 
                      fps: 10, 
                      qrbox: { width: 250, height: 250 }, 
                      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                      aspectRatio: 1.0,
                    },
                    false
                );
                scanner.render(handleScanSuccess, () => {});
                scannerRef.current = scanner;
            }
        }, 100);
        return () => clearTimeout(timer);
    } else if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
    }
  }, [viewState]);

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
    
    const formattedTag = decodedText.trim().toUpperCase();
    if (cart.some(item => item.id === formattedTag)) {
        showError(`${formattedTag} pehle se bag mein hai!`);
        setViewState('CART_VIEW');
        isProcessingScan.current = false;
        return;
    }

    setLoading(true);
    const res = await getProductByTag(formattedTag);
    if (res.success) {
        setScannedData({ scannedProduct: res.tag, relatedProducts: res.relatedProducts });
        setViewState('PRODUCT_SHOWCASE'); 
    } else {
        showError(res.message || "Scan failed!");
        setViewState('CART_VIEW');
    }
    setLoading(false);
    isProcessingScan.current = false;
  };

  const showError = (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
  };

  const addToCart = () => {
    if (scannedData) {
        const updatedCart = [...cart, scannedData.scannedProduct];
        setCart(updatedCart);
        syncToStorage(updatedCart);
        setScannedData(null);
        setViewState('CART_VIEW');
    }
  };

  const removeFromCart = (tagId: string) => {
      const updatedCart = cart.filter(item => item.id !== tagId);
      setCart(updatedCart);
      syncToStorage(updatedCart);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    const res = await processCheckout(cart.map(item => item.id));
    if (res.success) {
        alert(`✅ Sale Completed! Amount: ₹${totalAmount}`);
        setCart([]); 
        localStorage.removeItem('premium_cart');
        setViewState('CART_VIEW');
    } else { showError(res.message); }
    setIsCheckingOut(false);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.products?.price || 0), 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-48 overflow-hidden">
      
      <AnimatePresence>
          {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-6 left-1/2 -translate-x-1/2 z- bg-red-500/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full border border-red-400 shadow-2xl flex items-center gap-2">
                  <XCircle className="w-5 h-5" /> {errorMsg}
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {viewState === 'CART_VIEW' && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col">
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
                            <p className="font-medium text-zinc-400 text-center">Bag is empty.<br/>Tap the scanner to add items.</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="bg-zinc-900/80 backdrop-blur-sm p-4 rounded-[2rem] border border-zinc-800 flex items-center justify-between shadow-xl">
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
                                    <button onClick={() => removeFromCart(item.id)} className="p-3 text-zinc-500 hover:text-red-400 bg-zinc-950 rounded-xl transition-colors"><Trash2 className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        )}

        {viewState === 'SCANNING' && (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z- bg-black flex flex-col items-center justify-center">
                <button onClick={() => setViewState('CART_VIEW')} className="absolute top-12 right-6 p-4 bg-zinc-900 rounded-full text-white z-50 border border-zinc-700">
                    <X className="w-6 h-6" />
                </button>
                <div id="premium-scanner" className="w-full max-w-md aspect-square rounded-[3rem] overflow-hidden"></div>
            </motion.div>
        )}

        {viewState === 'PRODUCT_SHOWCASE' && scannedData && (
            <motion.div key="showcase" initial={{ y: "100%" }} animate={{ y: 0 }} className="fixed inset-0 z- bg-zinc-950 flex flex-col p-6">
                <div className="flex-1 relative rounded-[3rem] overflow-hidden bg-zinc-900">
                    <img src={scannedData.scannedProduct.products?.image_url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-8 left-8">
                        <h2 className="text-4xl font-black text-white">{scannedData.scannedProduct.products?.name}</h2>
                        <p className="text-2xl font-bold text-emerald-400">₹{scannedData.scannedProduct.products?.price}</p>
                    </div>
                </div>
                <button onClick={addToCart} className="w-full bg-emerald-500 text-black font-black text-xl py-5 rounded-[2rem] mt-6 shadow-lg shadow-emerald-500/20">Confirm Add to Bag</button>
            </motion.div>
        )}
      </AnimatePresence>

      {viewState === 'CART_VIEW' && (
          <div className="fixed bottom-0 left-0 w-full p-6 z-50">
              <div className="max-w-md mx-auto relative h-24">
                  {/* FLOAT QR BUTTON HIGHER */}
                  <button 
                    onClick={() => setViewState('SCANNING')} 
                    className="absolute left-1/2 -translate-x-1/2 -top-12 bg-emerald-500 text-black p-6 rounded-full shadow-[0_15px_40px_rgba(16,185,129,0.4)] border-4 border-zinc-950 z- hover:scale-110 active:scale-95 transition-transform"
                  >
                      <QrCode className="w-10 h-10" />
                  </button>

                  <div className="w-full h-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl">
                      <div className="pl-4">
                          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Grand Total</p>
                          <p className="text-2xl font-black text-white">₹{totalAmount}</p>
                      </div>
                      <button onClick={handleCheckout} disabled={cart.length === 0 || isCheckingOut} className="bg-white text-black px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-2 active:scale-95 transition-all">
                          {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin"/> : <CreditCard className="w-5 h-5" />}
                          Buy
                      </button>
                  </div>
              </div>
          </div>
      )}
    </main>
  );
}
