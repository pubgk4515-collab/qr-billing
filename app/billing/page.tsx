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

  // 1. Sync Cart from localStorage on load
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

  // 2. Scanner Initialization logic
  useEffect(() => {
    if (viewState === 'SCANNING' && !scannerRef.current) {
        // Chhota delay taaki DOM element render ho jaye
        setTimeout(() => {
            const scanner = new Html5QrcodeScanner(
                "premium-scanner",
                { 
                  fps: 10, 
                  qrbox: { width: 250, height: 250 }, 
                  supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                  rememberLastUsedCamera: true,
                  aspectRatio: 1.0,
                },
                false
            );
            scanner.render(handleScanSuccess, (err) => { /* ignore */ });
            scannerRef.current = scanner;
        }, 100);
    } else if (viewState !== 'SCANNING' && scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
    }
  }, [viewState]);

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;

    if (window.navigator?.vibrate) window.navigator.vibrate(50);
    
    // Stop scanner immediately after success
    if (scannerRef.current) {
        await scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
    }

    const formattedTag = decodedText.trim().toUpperCase();

    // Check duplicate
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
        showError(res.message || "Invalid Tag!");
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

  const totalAmount = cart.reduce((sum, item) => sum + (item.products?.price || 0), 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-44 overflow-hidden">
      
      {/* Error Notifications */}
      <AnimatePresence>
          {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-6 left-1/2 -translate-x-1/2 z- bg-red-500/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full border border-red-400 shadow-2xl flex items-center gap-2">
                  <XCircle className="w-5 h-5" /> {errorMsg}
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        
        {/* VIEW 1: THE CART */}
        {viewState === 'CART_VIEW' && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
                <header className="px-6 pt-12 pb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-emerald-400" /> My Bag
                    </h1>
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">{cart.length} Items</span>
                </header>

                <div className="flex-1 px-6 space-y-4 overflow-y-auto">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-80 opacity-40">
                            <QrCode className="w-20 h-20 mb-4" />
                            <p className="text-center">Bag is empty.<br/>Scan a tag to add items.</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="bg-zinc-900/60 backdrop-blur-sm p-4 rounded-[2rem] border border-zinc-800/50 flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-4">
                                    <img src={item.products?.image_url} className="w-16 h-16 rounded-2xl object-cover" alt="product" />
                                    <div>
                                        <h3 className="font-bold text-white">{item.products?.name}</h3>
                                        <p className="text-zinc-500 text-xs font-bold uppercase">{item.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-lg font-black text-emerald-400">₹{item.products?.price}</p>
                                    <button onClick={() => removeFromCart(item.id)} className="p-3 bg-zinc-800 rounded-2xl text-zinc-500 hover:text-red-400">
                                        <Trash2 className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        )}

        {/* VIEW 2: THE SCANNER */}
        {viewState === 'SCANNING' && (
            <motion.div key="scan" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z- bg-black flex flex-col items-center justify-center p-6">
                <button onClick={() => setViewState('CART_VIEW')} className="absolute top-12 right-6 p-4 bg-zinc-900 rounded-full border border-zinc-800">
                    <X className="w-6 h-6" />
                </button>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-white">Scanning...</h2>
                    <p className="text-emerald-400 font-bold flex items-center gap-2"><Zap className="w-4 h-4 animate-pulse"/> Point at a garment tag</p>
                </div>
                <div className="w-full max-w-sm aspect-square overflow-hidden rounded-[3rem] border-4 border-emerald-500/20">
                    <div id="premium-scanner" className="w-full h-full bg-zinc-900"></div>
                </div>
            </motion.div>
        )}

        {/* VIEW 3: SCAN RESULT (Confirmation) */}
        {viewState === 'PRODUCT_SHOWCASE' && scannedData && (
            <motion.div key="showcase" initial={{ y: "100%" }} animate={{ y: 0 }} className="fixed inset-0 z- bg-zinc-950 flex flex-col p-6">
                <div className="flex-1 rounded-[3rem] overflow-hidden relative bg-zinc-900">
                    <img src={scannedData.scannedProduct.products?.image_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-8">
                        <h2 className="text-4xl font-black">{scannedData.scannedProduct.products?.name}</h2>
                        <p className="text-2xl font-bold text-emerald-400">₹{scannedData.scannedProduct.products?.price}</p>
                    </div>
                </div>
                <div className="py-6 flex gap-4">
                    <button onClick={() => setViewState('SCANNING')} className="flex-1 bg-zinc-800 py-5 rounded-[2rem] font-black">Cancel</button>
                    <button onClick={addToCart} className="flex- bg-emerald-500 text-black py-5 rounded-[2rem] font-black shadow-lg shadow-emerald-500/20">Confirm Add</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* FIXED BOTTOM NAVIGATION (Overlap Fixed) */}
      {viewState === 'CART_VIEW' && (
          <div className="fixed bottom-0 left-0 w-full p-6 z-">
              <div className="max-w-md mx-auto relative h-28 flex items-end">
                  
                  {/* Floating QR Button - Moved UP to avoid overlap */}
                  <button 
                    onClick={() => setViewState('SCANNING')}
                    className="absolute left-1/2 -translate-x-1/2 -top-6 bg-emerald-400 text-black p-6 rounded-full shadow-[0_15px_40px_rgba(52,211,153,0.4)] border-4 border-zinc-950 hover:scale-110 active:scale-95 transition-all z-"
                  >
                      <QrCode className="w-10 h-10" />
                  </button>

                  {/* Glass Checkout Bar */}
                  <div className="w-full bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 p-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl">
                      <div className="pl-4">
                          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Grand Total</p>
                          <p className="text-2xl font-black text-white">₹{totalAmount}</p>
                      </div>

                      <button className="bg-white text-black px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-2 hover:bg-zinc-200 transition-colors">
                          <CreditCard className="w-5 h-5" /> Buy
                      </button>
                  </div>
              </div>
          </div>
      )}

      <style jsx global>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </main>
  );
}
