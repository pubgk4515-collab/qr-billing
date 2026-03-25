'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { getProductByTag, processCheckout, checkPaymentStatus } from '../actions/billingActions';
import { 
  ShoppingBag, Trash2, CreditCard, Loader2, XCircle, QrCode, X, 
  CheckCircle2, Smartphone, Banknote, MessageCircle, Send 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

type ViewState = 'CART_VIEW' | 'SCANNING' | 'PRODUCT_SHOWCASE';
type PaymentStep = 'SELECT_METHOD' | 'ONLINE_PAY' | 'AWAITING_APPROVAL' | 'ONLINE_SUCCESS' | 'OFFLINE_INPUT' | 'OFFLINE_SUCCESS';

export default function BillingPage() {
  const [viewState, setViewState] = useState<ViewState>('CART_VIEW');
  const [cart, setCart] = useState<any[]>([]);
  const [scannedData, setScannedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('SELECT_METHOD');
  const [customerPhone, setCustomerPhone] = useState('');
  const [currentCartId, setCurrentCartId] = useState('');

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

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    if (window.navigator?.vibrate) window.navigator.vibrate(50);

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (e) {
        console.error('Camera stop failed', e);
      }
    }

    let tagId = decodedText.trim();
    if (tagId.includes('/q/')) {
      tagId = tagId.split('/q/').pop() || tagId;
    } else if (tagId.includes('/')) {
      tagId = tagId.split('/').pop() || tagId;
    }
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
      if (res && res.success && res.data) {
        setScannedData({ 
          scannedProduct: res.data.tag, 
          relatedProducts: res.data.relatedProducts || [] 
        });
        setTimeout(() => setViewState('PRODUCT_SHOWCASE'), 200);
      } else {
        showError(res?.message || `Tag ${formattedTag} not found.`);
        setViewState('CART_VIEW');
      }
    } catch (err) {
      showError('Server error.');
      setViewState('CART_VIEW');
    } finally {
      setLoading(false);
      isProcessingScan.current = false;
    }
  }, [cart, showError]);

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
              (text) => handleScanSuccess(text),
              () => {} 
            );
          } catch (err) {
            showError('Camera failed. Check permissions.');
            setViewState('CART_VIEW');
          }
        }, 100);
      }
    } else {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {}).finally(() => { scannerRef.current = null; });
      }
    }
  }, [viewState, handleScanSuccess, showError]);

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

  const totalAmount = cart.reduce((sum, item) => sum + (item.products?.price || 0), 0);

    // --- NEW PAYMENT LOGIC ---
  const openPaymentModal = () => {
    // Sirf tabhi naya ID banao jab pehle se na ho
    if (!currentCartId) {
      setCurrentCartId(`CART-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    setPaymentStep('SELECT_METHOD');
    setShowPaymentModal(true);
  };


  const closeAndResetModal = () => {
    setShowPaymentModal(false);
    setTimeout(() => {
      setCart([]);
      localStorage.removeItem('premium_cart');
      setCustomerPhone('');
      setViewState('CART_VIEW');
    }, 300);
  };

  const executeDatabaseCheckout = async (paymentMethod: string, onSuccessCallback: () => void) => {
    setIsCheckingOut(true);
    try {
      const cartDetails = {
        cartId: currentCartId,
        paymentMethod: paymentMethod,
        customerPhone: customerPhone || 'ONLINE_USER',
        items: cart
      };
      
      const res = await processCheckout(cart.map(item => item.id), cartDetails);
      if (res && res.success) {
        onSuccessCallback();
      } else {
        showError(res?.message || 'Checkout failed in database.');
      }
    } catch (err) {
      showError('System error during checkout.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleOfflineSubmit = () => {
    if (customerPhone.length < 10) {
      showError('Please enter a valid phone number');
      return;
    }
    executeDatabaseCheckout('OFFLINE', () => setPaymentStep('OFFLINE_SUCCESS'));
  };

  const requestWhatsAppBill = () => {
    const storeNumber = "919876543210"; // Isko baad me real store owner ke number se replace kar dena
    const text = encodeURIComponent(`Hi, I just paid for ${currentCartId}. Please send my bill.`);
    window.open(`https://wa.me/${storeNumber}?text=${text}`, '_blank');
    closeAndResetModal();
  };

  const dispatchWhatsAppBill = () => {
    showSuccess(`Receipt sent to +91 ${customerPhone} via WhatsApp!`);
    closeAndResetModal();
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Toast Notifications */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full border border-red-400 shadow-2xl flex items-center gap-2">
            <XCircle className="w-5 h-5" /> {errorMsg}
          </motion.div>
        )}
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full border border-emerald-400 shadow-2xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* CART VIEW */}
        {viewState === 'CART_VIEW' && (
          <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col pb-36">
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
                      <button onClick={() => removeFromCart(item.id, item.products?.name)} className="p-3 text-zinc-500 hover:text-red-400 bg-zinc-950 rounded-xl transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* SCANNER VIEW */}
        {viewState === 'SCANNING' && (
           <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
             <button onClick={() => setViewState('CART_VIEW')} className="absolute top-12 right-6 p-4 bg-zinc-900 rounded-full text-white z-50 border border-zinc-700 hover:bg-zinc-800 transition">
               <X className="w-6 h-6" />
             </button>
             <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl bg-zinc-900">
               <div id={containerId} ref={scannerCallbackRef} className="w-full h-full" style={{ minHeight: '300px' }}></div>
               <div className="absolute inset-0 border-[2px] border-emerald-500/30 rounded-3xl pointer-events-none"></div>
             </div>
             <p className="mt-6 text-zinc-400 text-sm">Align QR code within the frame</p>
           </motion.div>
        )}

        {/* PRODUCT SHOWCASE VIEW */}
        {viewState === 'PRODUCT_SHOWCASE' && scannedData && (
          <motion.div key="showcase" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-0 z-50 bg-zinc-950 flex flex-col p-6">
            <div className="flex-1 relative rounded-3xl overflow-hidden bg-zinc-900">
              {scannedData.scannedProduct.products?.image_url ? (
                <img src={scannedData.scannedProduct.products.image_url} className="w-full h-full object-cover" alt={scannedData.scannedProduct.products.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">No image available</div>
              )}
              <div className="absolute bottom-8 left-8 bg-black/50 backdrop-blur-sm p-4 rounded-2xl">
                <h2 className="text-4xl font-black text-white">{scannedData.scannedProduct.products?.name}</h2>
                <p className="text-2xl font-bold text-emerald-400">₹{scannedData.scannedProduct.products?.price}</p>
              </div>
            </div>
            <button onClick={addToCart} className="w-full bg-emerald-500 text-black font-black text-xl py-5 rounded-2xl mt-6 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95">
              Confirm Add to Bag
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM CHECKOUT BAR */}
      {viewState === 'CART_VIEW' && (
        <div className="fixed bottom-0 left-0 w-full p-6 z-40">
          <div className="max-w-md mx-auto">
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl flex items-center justify-between shadow-2xl">
              <button onClick={() => setViewState('SCANNING')} className="bg-emerald-500 text-black p-4 rounded-full hover:scale-110 active:scale-95 transition-transform shadow-lg">
                <QrCode className="w-6 h-6" />
              </button>
              <div className="text-center">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Grand Total</p>
                <p className="text-2xl font-black text-white">₹{totalAmount}</p>
              </div>
              <button 
                onClick={openPaymentModal} 
                disabled={cart.length === 0} 
                className="bg-white text-black px-6 py-3 rounded-xl font-black flex items-center gap-2 disabled:opacity-50 hover:bg-gray-100 transition active:scale-95"
              >
                <CreditCard className="w-5 h-5" /> Buy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM FLOATING PAYMENT MODAL */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-8"
          >
            <motion.div 
              initial={{ y: '100%', scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: '100%', scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-zinc-800/50">
                <div>
                  <h3 className="text-xl font-black text-white">Checkout</h3>
                  <p className="text-sm text-zinc-400 font-medium">Cart ID: <span className="text-emerald-400">{currentCartId}</span></p>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - Dynamic Steps */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  
                  {/* STEP 1: SELECT PAYMENT METHOD */}
                  {paymentStep === 'SELECT_METHOD' && (
                    <motion.div key="select" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                      <p className="text-center text-zinc-400 font-medium mb-6">Select payment method for <span className="text-white font-bold">₹{totalAmount}</span></p>
                      
                      <button onClick={() => setPaymentStep('ONLINE_PAY')} className="w-full bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between hover:border-emerald-500/50 transition group">
                        <div className="flex items-center gap-4">
                          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400 group-hover:scale-110 transition"><Smartphone className="w-6 h-6" /></div>
                          <div className="text-left"><p className="font-bold text-white text-lg">Online / UPI</p><p className="text-sm text-zinc-500">Scan & Pay via phone</p></div>
                        </div>
                      </button>

                      <button onClick={() => setPaymentStep('OFFLINE_INPUT')} className="w-full bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between hover:border-blue-500/50 transition group">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400 group-hover:scale-110 transition"><Banknote className="w-6 h-6" /></div>
                          <div className="text-left"><p className="font-bold text-white text-lg">Cash / Offline</p><p className="text-sm text-zinc-500">Manual counter payment</p></div>
                        </div>
                      </button>
                    </motion.div>
                  )}

                  {/* STEP 2A: ONLINE PAYMENT PROCESSING (UPDATED) */}
                  {paymentStep === 'ONLINE_PAY' && (
                    <motion.div key="online_pay" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center py-4">
                      <div className="bg-white p-3 rounded-2xl mb-6 shadow-lg flex items-center justify-center">
                        {/* Real UPI QR Code */}
                        <QRCode 
                          value={`upi://pay?pa=merchant@ybl&pn=SME%20Garment%20Store&am=${totalAmount}&cu=INR&tn=${currentCartId}`} 
                          size={180} 
                        />
                      </div>
                      <p className="text-zinc-400 mb-6 text-center">Scan with any UPI App (GPay, PhonePe, Paytm)<br/><span className="text-white font-bold text-xl">₹{totalAmount}</span></p>
                      
                      {/* "I HAVE PAID" BUTTON */}
                      <button 
                        onClick={() => {
                          executeDatabaseCheckout('ONLINE', () => setPaymentStep('AWAITING_APPROVAL'));
                        }} 
                        disabled={isCheckingOut} 
                        className="w-full bg-emerald-500 text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition active:scale-95"
                      >
                        {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : "I have Paid via UPI"}
                      </button>
                    </motion.div>
                  )}

                  {/* STEP 2.5: AWAITING ADMIN APPROVAL (THE MAGIC FLOW) */}
                  {paymentStep === 'AWAITING_APPROVAL' && (
                    <motion.div key="awaiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-8 text-center">
                      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                        <Banknote className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-black text-white mb-2">Verifying Payment...</h2>
                      <p className="text-zinc-400 text-sm mb-4">Please wait while the store counter confirms your payment.</p>
                      
                      {/* Invisible Polling Component */}
                      <AutoStatusChecker 
                        cartId={currentCartId} 
                        onApproved={() => setPaymentStep('ONLINE_SUCCESS')} 
                      />
                    </motion.div>
                  )}

                  {/* STEP 3A: ONLINE SUCCESS & WHATSAPP */}
                  {paymentStep === 'ONLINE_SUCCESS' && (
                    <motion.div key="online_success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
                      <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h2 className="text-2xl font-black text-white mb-2">Payment Received!</h2>
                      <p className="text-zinc-400 mb-8">The checkout is complete and inventory is updated.</p>
                      
                      <button onClick={requestWhatsAppBill} className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/20 hover:bg-[#1ebd5a] transition">
                        <MessageCircle className="w-6 h-6" /> Get your bill on WhatsApp
                      </button>
                    </motion.div>
                  )}

                  {/* STEP 2B: OFFLINE MANAGER INPUT */}
                  {paymentStep === 'OFFLINE_INPUT' && (
                    <motion.div key="offline_input" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6 py-2">
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center">
                        <p className="text-zinc-400 text-sm">Amount to collect</p>
                        <p className="text-3xl font-black text-white">₹{totalAmount}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-400">Customer WhatsApp Number</label>
                        <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-emerald-500 transition">
                          <span className="px-4 py-4 text-zinc-500 font-bold bg-zinc-900">+91</span>
                          <input 
                            type="tel" 
                            maxLength={10}
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="98765 43210" 
                            className="w-full bg-transparent text-white font-bold px-4 outline-none"
                          />
                        </div>
                      </div>

                      <button onClick={handleOfflineSubmit} disabled={isCheckingOut || customerPhone.length < 10} className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition">
                        {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Send Receipt"}
                      </button>
                    </motion.div>
                  )}

                  {/* STEP 3B: OFFLINE SUCCESS */}
                  {paymentStep === 'OFFLINE_SUCCESS' && (
                    <motion.div key="offline_success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
                      <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6">
                        <Send className="w-10 h-10 ml-1" />
                      </div>
                      <h2 className="text-2xl font-black text-white mb-2">Sale Logged!</h2>
                      <p className="text-zinc-400 mb-8">Bill is ready to be dispatched to +91 {customerPhone}</p>
                      
                      <button onClick={dispatchWhatsAppBill} className="w-full bg-white text-black py-4 rounded-xl font-black flex items-center justify-center gap-3 transition">
                        Dispatch & Close
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// YEH COMPONENT BILLING PAGE KE BAHAR, FILE KE BOTTOM ME RAHEGA
function AutoStatusChecker({ cartId, onApproved }: { cartId: string, onApproved: () => void }) {
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await checkPaymentStatus(cartId);
      if (res.success && res.status === 'completed') {
        onApproved();
      }
    }, 3000); 

    return () => clearInterval(interval);
  }, [cartId, onApproved]);

  return null;
}
