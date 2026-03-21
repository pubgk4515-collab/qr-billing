'use client';

import { useState } from 'react';
import { getProductByTag, processCheckout } from '../actions/billingActions';
import { ShoppingCart, Search, Trash2, CreditCard, Receipt, Loader2, Plus, Box, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BillingPage() {
  const [tagInput, setTagInput] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 🔍 Tag enter karte hi item dhoondo
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    const formattedTag = tagInput.trim().toUpperCase();

    // Check agar tag already cart mein hai (Har physical tag unique hota hai)
    if (cart.some(item => item.id === formattedTag)) {
        setErrorMsg(`${formattedTag} pehle se cart mein hai!`);
        setTagInput('');
        setTimeout(() => setErrorMsg(''), 3000);
        return;
    }

    setLoading(true);
    setErrorMsg('');
    
    const res = await getProductByTag(formattedTag);
    
    if (res.success) {
        // Item cart mein add karo
        setCart(prev => [...prev, res.tag]);
    } else {
        setErrorMsg(res.message);
        setTimeout(() => setErrorMsg(''), 3000);
    }
    
    setLoading(false);
    setTagInput(''); // Input box wapas khali kar do
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
        alert(`✅ Bill Generated Successfully!\nTotal Amount: ₹${totalAmount}`);
        setCart([]); // Cart khali karo naye customer ke liye
    } else {
        alert("🛑 Error: " + res.message);
    }
    setIsCheckingOut(false);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.products.price, 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 pb-20">
      
      {/* HEADER */}
      <header className="bg-zinc-950/80 backdrop-blur-md p-6 sticky top-0 z-20 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-emerald-500" /> Smart Point of Sale
          </h1>
          <div className="text-zinc-500 font-bold tracking-widest uppercase text-xs">
            Rampurhat Collection
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: SCANNER & CART ITEMS */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* SCANNER INPUT */}
            <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-emerald-500"/> Scan Product Tag</h2>
                
                <form onSubmit={handleScan} className="relative">
                    <input 
                        type="text" 
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Type TAG ID (e.g. TAG001) & Press Enter" 
                        autoFocus
                        className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-2xl py-5 pl-6 pr-16 text-xl font-black text-white outline-none transition-all uppercase placeholder:normal-case placeholder:font-medium placeholder:text-zinc-600 shadow-inner" 
                    />
                    <button type="submit" disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500 text-black p-3 rounded-xl hover:bg-emerald-400 transition-colors">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                    </button>
                </form>

                {errorMsg && (
                    <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 font-bold mt-4 flex items-center gap-2 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                        <XCircle className="w-5 h-5" /> {errorMsg}
                    </motion.p>
                )}
            </div>

            {/* CART LIST */}
            <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 bg-zinc-950/30">
                    <h2 className="text-xl font-black text-white flex items-center justify-between">
                        <span>Cart Items</span>
                        <span className="bg-zinc-800 text-white text-sm px-3 py-1 rounded-full">{cart.length}</span>
                    </h2>
                </div>
                
                <div className="p-6 space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                    <AnimatePresence>
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-zinc-600">
                                <Box className="w-12 h-12 mb-3 opacity-20" />
                                <p className="font-bold tracking-widest uppercase text-xs">Cart is empty</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <motion.div 
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, x: -20 }}
                                    className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-4 rounded-2xl group hover:border-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {item.products.image_url ? (
                                            <img src={item.products.image_url} alt="img" className="w-14 h-14 object-cover rounded-xl border border-zinc-800" />
                                        ) : (
                                            <div className="w-14 h-14 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center">
                                                <Box className="w-6 h-6 text-zinc-700" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-black text-lg text-white">{item.products.name}</h3>
                                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{item.id}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <p className="text-xl font-black text-white">₹{item.products.price}</p>
                                        <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 hover:bg-red-500/10 p-3 rounded-xl transition-colors">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: BILL SUMMARY */}
        <div className="lg:col-span-1">
            <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl sticky top-32">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-2"><Receipt className="w-6 h-6 text-zinc-400"/> Summary</h2>
                
                <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-zinc-400 font-medium">
                        <span>Items Total ({cart.length})</span>
                        <span className="text-white font-bold">₹{totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 font-medium">
                        <span>Discount</span>
                        <span className="text-emerald-500 font-bold">- ₹0</span>
                    </div>
                    <div className="h-px w-full bg-zinc-800 my-4" />
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-zinc-300">Grand Total</span>
                        <span className="text-4xl font-black text-white tracking-tighter">₹{totalAmount}</span>
                    </div>
                </div>

                <button 
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || isCheckingOut}
                    className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                >
                    {isCheckingOut ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard className="w-6 h-6" />}
                    {isCheckingOut ? 'Processing...' : 'Complete Sale'}
                </button>
            </div>
        </div>

      </div>
    </main>
  );
}