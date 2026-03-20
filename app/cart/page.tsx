'use client';

import { useEffect, useState } from 'react';
import { getCartItems, removeFromCart } from '../actions/cartActions';
import { ShoppingBag, Trash2, MessageCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const STORE_WHATSAPP_NUMBER = "919876543210"; 

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const response = await getCartItems(sessionId);
    
    if (response.success && response.data) {
      setItems(response.data);
      let sum = 0;
      response.data.forEach((item: any) => {
        if (item.products && item.products.price) sum += item.products.price;
      });
      setTotal(sum);
    }
    setLoading(false);
  };

  const handleDelete = async (cartId: string) => {
    // UI se turant hatao (Smooth animation ke liye)
    const newItems = items.filter(item => item.id !== cartId);
    setItems(newItems);
    
    // Total update karo
    let sum = 0;
    newItems.forEach((item: any) => {
      if (item.products && item.products.price) sum += item.products.price;
    });
    setTotal(sum);

    // Database se hatao
    await removeFromCart(cartId);
  };

  const handleCheckout = () => {
    let message = `🛍️ *New Order Request*\n\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.products?.name} - ₹${item.products?.price}\n`;
    });
    message += `\n*Total Amount:* ₹${total}\n\n`;
    message += `Customer is waiting at the counter.`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-zinc-500 mb-4"></div>
        <p>Loading your bag...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-24 font-sans selection:bg-zinc-800">
      
      {/* Sleek Header */}
      <header className="bg-zinc-950/80 backdrop-blur-md p-5 text-center sticky top-0 z-20 border-b border-zinc-900">
        <h1 className="font-bold text-lg tracking-tight flex items-center justify-center gap-2">
          <ShoppingBag className="w-5 h-5" /> Shopping Bag
        </h1>
      </header>

      <div className="max-w-md mx-auto p-4 mt-2">
        {items.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center p-12 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 mt-10"
          >
            <ShoppingBag className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <h2 className="text-xl font-bold text-zinc-300 mb-2">Your bag is empty</h2>
            <p className="text-zinc-500 text-sm">Scan a QR code to add items.</p>
          </motion.div>
        ) : (
          <>
            {/* Animated Items List */}
            <div className="space-y-3 mb-8">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -50 }} // Delete hone par left slide hoga
                    className="flex items-center p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800 backdrop-blur-sm"
                  >
                    {/* Smart Image (No Broken Icons) */}
                    <div className="w-20 h-20 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                      {item.products?.image_url ? (
                        <img 
                          src={item.products.image_url} 
                          alt="product" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : null}
                      <AlertCircle className="w-6 h-6 text-zinc-600 absolute -z-10" />
                    </div>

                    <div className="ml-4 flex-1">
                      <h3 className="font-bold text-zinc-200">{item.products?.name}</h3>
                      <p className="text-zinc-400 font-medium mt-1">₹{item.products?.price}</p>
                    </div>

                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Premium Sticky Checkout Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-900 p-4 pb-8 z-20">
              <div className="max-w-md mx-auto">
                <div className="flex justify-between items-end mb-4 px-2">
                  <span className="text-zinc-400 font-medium text-sm uppercase tracking-wider">Total Amount</span>
                  <span className="text-3xl font-bold text-white tracking-tight">₹{total}</span>
                </div>
                
                <motion.button 
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCheckout}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  <MessageCircle className="w-6 h-6" /> Checkout via WhatsApp
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
