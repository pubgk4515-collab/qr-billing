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
  const isProcessingScan = useRef(false); // 🔥 PREVENTS DOUBLE SCAN CRASHES

  useEffect(() => {
    if (viewState === 'SCANNING' && !scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
            "premium-scanner",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 }, 
              supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
              aspectRatio: 1.0,
              videoConstraints: { facingMode: "environment" }
            },
            false
        );
        scanner.render(handleScanSuccess, () => {});
        scannerRef.current = scanner;
    } else if (viewState !== 'SCANNING' && scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
    }
    return () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
            scannerRef.current = null;
        }
    };
  }, [viewState]);

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;

    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    
    if (scannerRef.current) {
        await scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
    }

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
        // Agar res.message nahi mila, toh default message dikha do
        showError(res.message || "Item scan karne mein problem aayi, wapas try karein!");
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
        setCart(prev => [...prev, scannedData.scannedProduct]);
        setScannedData(null);
        setViewState('CART_VIEW');
    }
  };

  const removeFromCart = (tagId: string) => setCart(cart.filter(item => item.id !== tagId));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    const res = await processCheckout(cart.map(item => item.id));
    
    if (res.success) {
        alert(`✅ Sale Completed! Amount: ₹${totalAmount}`);
        setCart([]); 
        setViewState('CART_VIEW');
    } else {
        showError(res.message);
    }
    setIsCheckingOut(false);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.products?.price || 0, 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-32 overflow-hidden">
      
      <AnimatePresence>
          {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-6 left-1/2 -translate-x-1/2 z- bg-red-500/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full border border-red-400 shadow-2xl flex items-center gap-2 whitespace-nowrap">
                  <XCircle className="w-5 h-5" /> {errorMsg}
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        
        {viewState === 'CART_VIEW' && (
            <motion.div key="cart" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="min-h-screen flex flex-col">
                <header className="px-6 pt-12 pb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-emerald-400" /> My Bag
                    </h1>
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">{cart.length} Items</span>
                </header>

                <div className="flex-1 px-6 space-y-4 overflow-y-auto pb-40">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 opacity-50">
                            <QrCode className="w-16 h-16 mb-4 text-zinc-600" />
                            <p className="font-medium text-zinc-400 text-center">Bag is empty.<br/>Tap the scanner to add items.</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={item.id} className="bg-zinc-900/80 backdrop-blur-sm p-4 rounded-[2rem] border border-zinc-800 flex items-center justify-between shadow-xl">
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
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>
        )}

        {viewState === 'SCANNING' && (
            <motion.div key="scan" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
                <button onClick={() => setViewState('CART_VIEW')} className="absolute top-12 right-6 p-4 bg-zinc-900/80 backdrop-blur-md rounded-full text-white z-50 border border-zinc-700">
                    <X className="w-6 h-6" />
                </button>
                
                <div className="text-center absolute top-32 z-50 w-full">
                    <h2 className="text-2xl font-black text-white mb-2">Scan Garment Tag</h2>
                    <p className="text-emerald-400 text-sm font-bold flex items-center justify-center gap-2"><Zap className="w-4 h-4 animate-pulse"/> Point camera at QR Code</p>
                </div>

                <div className="w-full max-w-sm overflow-hidden rounded-[3rem] border-4 border-emerald-500/30 shadow-[0_0_80px_rgba(16,185,129,0.2)]">
                    <div id="premium-scanner" className="w-full h-full bg-zinc-900 min-h-[300px]"></div>
                </div>
                {loading && <Loader2 className="absolute bottom-32 w-10 h-10 text-emerald-500 animate-spin" />}
            </motion.div>
        )}

        {viewState === 'PRODUCT_SHOWCASE' && scannedData && (
            <motion.div key="showcase" initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
                
                <div className="relative h-[45vh] w-full bg-zinc-900 rounded-b-[3rem] overflow-hidden shadow-2xl">
                    {scannedData.scannedProduct.products?.image_url ? (
                        <img src={scannedData.scannedProduct.products.image_url} alt="Garment" className="w-full h-full object-cover opacity-80" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900"><ShoppingBag className="w-20 h-20 text-zinc-800"/></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
                    
                    <button onClick={() => setViewState('SCANNING')} className="absolute top-12 left-6 p-4 bg-black/40 backdrop-blur-xl rounded-full text-white border border-white/10">
                        <X className="w-6 h-6" />
                    </button>
                    
                    <div className="absolute bottom-6 left-6 right-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">{scannedData.scannedProduct.id}</p>
                                <h1 className="text-4xl font-black text-white leading-tight">{scannedData.scannedProduct.products?.name}</h1>
                            </div>
                            <h2 className="text-3xl font-black text-white">₹{scannedData.scannedProduct.products?.price}</h2>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <button onClick={addToCart} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xl py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all active:scale-95">
                        <CheckCircle2 className="w-7 h-7" /> Add to Bag
                    </button>
                </div>

                {scannedData.relatedProducts?.length > 0 && (
                    <div className="mt-2 flex-1">
                        <h3 className="px-6 text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Complete The Look</h3>
                        <div className="flex gap-4 overflow-x-auto px-6 pb-6 snap-x hide-scrollbar">
                            {scannedData.relatedProducts.map((related: any) => (
                                <div key={related.id} onClick={() => showError(`Scan ${related.name}'s tag to add!`)} className="snap-start shrink-0 w-36 bg-zinc-900/50 p-3 rounded-3xl border border-zinc-800 cursor-pointer active:scale-95 transition-transform">
                                    <div className="w-full h-36 bg-zinc-950 rounded-2xl mb-3 overflow-hidden">
                                        {related.image_url && <img src={related.image_url} alt="match" className="w-full h-full object-cover" />}
                                    </div>
                                    <h4 className="font-bold text-white text-sm truncate">{related.name}</h4>
                                    <p className="text-emerald-400 font-bold text-sm">₹{related.price}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
          {viewState === 'CART_VIEW' && (
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 w-full p-6 z-40">
                  <div className="max-w-md mx-auto relative bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl">
                      
                      <div className="pl-4">
                          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Grand Total</p>
                          <p className="text-2xl font-black text-white">₹{totalAmount}</p>
                      </div>

                      <button onClick={() => setViewState('SCANNING')} className="absolute left-1/2 -translate-x-1/2 -top-8 bg-emerald-500 text-black p-5 rounded-full shadow-[0_0_40px_rgba(16,185,129,0.4)] border-4 border-zinc-950 hover:scale-110 transition-transform active:scale-95">
                          <QrCode className="w-8 h-8" />
                      </button>

                      <button onClick={handleCheckout} disabled={cart.length === 0 || isCheckingOut} className="bg-white text-black px-6 py-4 rounded-[1.5rem] font-black flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                          {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin"/> : <CreditCard className="w-5 h-5" />}
                          Buy
                      </button>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <style jsx global>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </main>
  );
}