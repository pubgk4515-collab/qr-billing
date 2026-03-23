'use client';

import { useState, useEffect, useRef } from 'react';
import { getProductByTag, processCheckout } from '../actions/billingActions';
// 🛠️ Yahan Hash aur Sparkles add kar diye gaye hain
import { ShoppingBag, Search, Trash2, CreditCard, Loader2, Plus, Box, XCircle, QrCode, X, ChevronRight, Zap, Hash, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'; 

type ViewState = 'INIT' | 'SCANNING' | 'ITEM_DETECTED' | 'VIEW_CART';

export default function BillingPage() {
  const [viewState, setViewState] = useState<ViewState>('INIT'); 
  const [tagInput, setTagInput] = useState('');
  const [scannedProductData, setScannedProductData] = useState<any>(null); 
  const [cart, setCart] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null); 
  const scannerContainerId = "mobile-scanner-container"; 

  useEffect(() => {
    if (viewState === 'SCANNING' && !scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
            scannerContainerId,
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 }, 
              supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], 
              aspectRatio: 1.0, 
              videoConstraints: {
                facingMode: "environment" 
              }
            },
            false
        );
        scanner.render(handleScanSuccess, handleScanError);
        scannerRef.current = scanner;
    } else if (viewState !== 'SCANNING' && scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Error clearing scanner", err));
        scannerRef.current = null;
    }

    return () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Error unmounting scanner", err));
            scannerRef.current = null;
        }
    };
  }, [viewState]);

  const handleScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) {
        await scannerRef.current.clear().catch(err => console.error(err));
        scannerRef.current = null;
    }

    const formattedTag = decodedText.trim().toUpperCase();

    if (cart.some(item => item.id === formattedTag)) {
        setErrorMsg(`${formattedTag} pehle se cart mein hai!`);
        setTimeout(() => setErrorMsg(''), 3000);
        setViewState('VIEW_CART');
        return;
    }

    setLoading(true);
    setErrorMsg('');
    
    const res = await getProductByTag(formattedTag);
    
    if (res.success) {
        setScannedProductData({
            scannedProduct: res.tag,
            relatedProducts: res.relatedProducts
        });
        setViewState('ITEM_DETECTED'); 
    } else {
        setErrorMsg(res.message);
        setTimeout(() => setErrorMsg(''), 3000);
        setViewState('INIT'); 
    }
    setLoading(false);
  };

  const handleScanError = (errorMessage: string) => {
  };

  const addToCart = (product: any, isRelated: boolean = false) => {
    setCart(prev => [...prev, product]);
    if (!isRelated) {
        setViewState('VIEW_CART');
        setScannedProductData(null); 
    } else {
        setViewState('VIEW_CART');
        setScannedProductData(null);
    }
  };

  const removeFromCart = (tagId: string) => {
    setCart(cart.filter(item => item.id !== tagId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    
    const tagIds = cart.map(item => item.id);
    const res = await processCheckout(tagIds);
    
    if (res.success) {
        alert(`✅ Sale Completed Successfully!\nTotal: ₹${totalAmount}\n(Receipt feature coming soon)`);
        setCart([]); 
        setViewState('INIT'); 
    } else {
        alert("🛑 Checkout Error: " + res.message);
    }
    setIsCheckingOut(false);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.products.price, 0);

  const renderProductImage = (imageUrl: string | null, size: number = 14) => {
      if (imageUrl) {
          return <img src={imageUrl} alt="product" className={`w-${size} h-${size} object-cover rounded-xl border border-zinc-800`} />
      }
      return (
          <div className={`w-${size} h-${size} bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center`}>
              <Box className="w-6 h-6 text-zinc-700" />
          </div>
      )
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 pb-20 relative overflow-x-hidden">
      
      <header className="bg-zinc-950/80 backdrop-blur-md px-6 py-5 sticky top-0 z-50 border-b border-zinc-900">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-emerald-500" /> RC Bag
          </h1>
          {cart.length > 0 && (
             <span className="bg-emerald-500/10 text-emerald-400 font-black text-xs px-3.5 py-1.5 rounded-full border border-emerald-500/20 shadow-inner">
                 Total: ₹{totalAmount}
             </span>
          )}
        </div>
      </header>

      <AnimatePresence>
          {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white font-black text-sm px-6 py-3 rounded-xl border border-red-700 shadow-2xl flex items-center gap-2 whitespace-nowrap">
                  <XCircle className="w-5 h-5" /> {errorMsg}
              </motion.div>
          )}
      </AnimatePresence>

      <div className="max-w-xl mx-auto px-6 pt-8 pb-32">
        <AnimatePresence mode="wait">
            
            {(viewState === 'INIT' || viewState === 'VIEW_CART') && (
                <motion.div key="cart_view" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
                    
                    {cart.length === 0 && viewState === 'INIT' && (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-inner">
                             <Box className="w-16 h-16 mb-4 text-zinc-700 opacity-20" />
                             <h2 className="text-xl font-bold text-white mb-2">Bag is khali</h2>
                             <p className="text-zinc-500 max-w-sm mb-12">Start your premium shopping journey. Scan the smart tag on any product to link it to your bag.</p>
                             <motion.div initial={{ rotate: 360, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.5 }} className='p-6 bg-emerald-500 text-black rounded-3xl shadow-lg'>
                                <QrCode className='w-12 h-12'/>
                             </motion.div>
                        </div>
                    )}

                    {cart.length > 0 && (
                        <div className="space-y-4">
                            {cart.map((item, index) => (
                                <motion.div 
                                    key={`${item.id}_${index}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        {renderProductImage(item.products.image_url)}
                                        <div>
                                            <h3 className="font-bold text-white leading-tight">{item.products.name}</h3>
                                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"><Hash className='w-3 h-3'/>{item.id}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-5">
                                        <p className="text-xl font-black text-white">₹{item.products.price}</p>
                                        <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 hover:bg-red-500/10 p-2.5 rounded-xl transition-colors">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {viewState === 'SCANNING' && (
                <motion.div key="scanning_view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex flex-col p-6 overflow-hidden">
                    <header className='flex items-center justify-between mb-8'>
                        <h2 className='text-2xl font-black text-white tracking-tighter flex items-center gap-2'><QrCode className='w-6 h-6 text-emerald-400'/> Scan Tag</h2>
                        <button onClick={() => setViewState(cart.length > 0 ? 'VIEW_CART' : 'INIT')} className='bg-zinc-800 p-3 rounded-xl hover:bg-zinc-700 transition-colors'>
                            <X className='w-6 h-6 text-white'/>
                        </button>
                    </header>
                    
                    <div className='flex-1 flex items-center justify-center'>
                       <div id={scannerContainerId} className="w-full max-w-sm rounded-3xl overflow-hidden border-4 border-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.1)]"></div>
                    </div>

                    <div className='absolute bottom-16 left-1/2 -translate-x-1/2 text-center w-full max-w-xs px-6 bg-emerald-950/20 backdrop-blur-md p-4 rounded-full border border-emerald-900'>
                        <motion.p animate={{ opacity: [0.5, 1, 0.5]}} transition={{ repeat: Infinity, duration: 1.5 }} className='text-emerald-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2 justify-center'>
                           <Zap className='w-4 h-4 animate-pulse'/> Waiting for code in frame...
                        </motion.p>
                    </div>
                </motion.div>
            )}

            {viewState === 'ITEM_DETECTED' && scannedProductData && (
                <motion.div key="detected_view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-10">
                    
                    <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
                        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"><Hash className='w-3 h-3'/>{scannedProductData.scannedProduct.id} Detected</h3>
                        
                        <div className="flex items-center gap-6 mb-8">
                             {renderProductImage(scannedProductData.scannedProduct.products.image_url, 20)}
                             <div className='flex-1'>
                                <h2 className="text-3xl font-black text-white tracking-tighter mb-2 leading-none">{scannedProductData.scannedProduct.products.name}</h2>
                                <p className="text-3xl font-bold text-emerald-400 tracking-tighter">₹{scannedProductData.scannedProduct.products.price}</p>
                             </div>
                        </div>

                        <button 
                            onClick={() => addToCart(scannedProductData.scannedProduct)}
                            className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                        >
                            <ShoppingBag className="w-6 h-6" />
                            Add to Bag
                        </button>
                    </div>

                    {scannedProductData.relatedProducts.length > 0 && (
                        <div className='bg-zinc-900 rounded-[2.5rem] border border-zinc-800 p-6 shadow-2xl'>
                            <h2 className='text-lg font-black text-white mb-6 flex items-center gap-2'><Sparkles className='w-5 h-5 text-emerald-400'/> Best Matches (Thumbnails)</h2>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {scannedProductData.relatedProducts.map((related: any) => (
                                    <div key={related.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {renderProductImage(related.image_url, 10)} 
                                            <div>
                                                <h4 className="font-bold text-white text-xs leading-snug">{related.name}</h4>
                                                <p className="text-zinc-500 font-bold text-xs tracking-tight">₹{related.price}</p>
                                            </div>
                                        </div>
                                        
                                        <button 
                                          onClick={() => {
                                            alert(`Bhai MVP limit: Is item (${related.name}) ka tag scan karo tabhi ye bag mein link hoga.`);
                                          }} 
                                          className="text-zinc-600 hover:text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-lg transition-colors"
                                        >
                                            <QrCode className="w-4 h-4" /> 
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <footer className="fixed bottom-0 left-0 w-full p-6 z-40 pointer-events-none">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4 pointer-events-auto">
              
              {(viewState === 'INIT' || viewState === 'VIEW_CART') && (
                <div className='w-full flex justify-center'>
                    <motion.button 
                        whileHover={{ scale: 1.05, y: -5 }} 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setViewState('SCANNING')}
                        className="bg-emerald-500 text-black p-6 rounded-full shadow-[0_0_50px_rgba(16,185,129,0.3)] border-4 border-black group"
                    >
                        <QrCode className="w-10 h-10 group-hover:scale-110 transition-transform" />
                    </motion.button>
                </div>
              )}

              {cart.length > 0 && viewState === 'VIEW_CART' && (
                <div className='fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-sm px-6'>
                    <button 
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 text-xl shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                    >
                        {isCheckingOut ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard className="w-6 h-6 text-emerald-600" />}
                        {isCheckingOut ? 'Processing...' : `Buy ₹${totalAmount}`}
                    </button>
                </div>
              )}
          </div>
      </footer>

    </main>
  );
}