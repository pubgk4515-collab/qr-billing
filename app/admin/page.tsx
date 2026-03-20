'use client';

import { useEffect, useState } from 'react';
import { getStoreData } from '../actions/adminActions';
import { LayoutDashboard, Box, QrCode, PackagePlus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [data, setData] = useState<any>({ products: [], qrTags: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const response = await getStoreData();
      if (response.success) {
        setData({ products: response.products, qrTags: response.qrTags });
      } else {
        alert("🛑 Error loading admin data: " + response.message);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-600">
        <Loader2 className="animate-spin w-10 h-10 mb-4" />
        <p className="font-medium">Opening Mission Control...</p>
      </div>
    );
  }

  // Stats calculation
  const totalProducts = data.products.length;
  const activeQRs = data.qrTags.filter((tag: any) => tag.status === 'active').length;
  const freeQRs = data.qrTags.filter((tag: any) => tag.status === 'free').length;

  // Animation variants (Premium feel)
  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 font-sans selection:bg-zinc-800">
      
      {/* 🚀 Sleek Header */}
      <header className="bg-zinc-950/80 backdrop-blur-md p-6 sticky top-0 z-20 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-zinc-500" /> Control Panel
            </h1>
            <p className="text-zinc-500 font-medium mt-1">Real-time Store Overview</p>
          </div>
          {/* Future: Add new product button here */}
        </div>
      </header>

      <motion.div 
        className="max-w-7xl mx-auto p-6 mt-6"
        variants={containerVars} initial="hidden" animate="visible"
      >
        
        {/* 📊 STATS CARDS (Symbiote Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1: Total Products */}
          <motion.div variants={itemVars} whileHover={{ y: -3 }} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800/80 shadow-[0_10px_40px_rgba(0,0,0,0.3)] group">
            <div className="flex justify-between items-center mb-5">
              <p className="text-zinc-500 font-semibold text-sm uppercase tracking-wider">Total Inventory</p>
              <Box className="w-6 h-6 text-zinc-700 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-6xl font-extrabold text-blue-400 tracking-tighter">{totalProducts}</p>
            <p className="text-zinc-600 mt-2 font-medium">Distinct clothing items</p>
          </motion.div>

          {/* Card 2: Active QRs */}
          <motion.div variants={itemVars} whileHover={{ y: -3 }} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800/80 shadow-[0_10px_40px_rgba(0,0,0,0.3)] group">
            <div className="flex justify-between items-center mb-5">
              <p className="text-zinc-500 font-semibold text-sm uppercase tracking-wider">Scannable items</p>
              <QrCode className="w-6 h-6 text-zinc-700 group-hover:text-green-400 transition-colors" />
            </div>
            <p className="text-6xl font-extrabold text-green-400 tracking-tighter">{activeQRs}</p>
            <p className="text-zinc-600 mt-2 font-medium">Currently tagged & ready</p>
          </motion.div>

          {/* Card 3: Free QRs */}
          <motion.div variants={itemVars} whileHover={{ y: -3 }} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800/80 shadow-[0_10px_40px_rgba(0,0,0,0.3)] group">
            <div className="flex justify-between items-center mb-5">
              <p className="text-zinc-500 font-semibold text-sm uppercase tracking-wider">Tags Available</p>
              <PackagePlus className="w-6 h-6 text-zinc-700 group-hover:text-orange-400 transition-colors" />
            </div>
            <p className="text-6xl font-extrabold text-orange-400 tracking-tighter">{freeQRs}</p>
            <p className="text-zinc-600 mt-2 font-medium">Waiting to be linked</p>
          </motion.div>
        </div>

        {/* 📑 INVENTORY TABLE (Dark & Minimal) */}
        <motion.div variants={itemVars} className="bg-zinc-900 rounded-3xl border border-zinc-800/80 shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white tracking-tight">QR Tags Status</h2>
            {/* Future: Add search/filter here */}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-950/50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-5 font-semibold">Tag ID</th>
                  <th className="p-5 font-semibold">Status</th>
                  <th className="p-5 font-semibold">Linked Product</th>
                  <th className="p-5 font-semibold text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.qrTags.map((tag: any) => (
                  <tr key={tag.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-5 font-bold text-white text-lg tracking-tight">{tag.id}</td>
                    <td className="p-5">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1.5 ${
                        tag.status === 'active' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tag.status === 'active' ? 'bg-green-400' : 'bg-orange-400'}`}></span>
                        {tag.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-5 text-zinc-300 font-medium text-lg">
                      {tag.products ? (
                        tag.products.name
                      ) : (
                        <span className="text-zinc-600 italic">Empty Tag</span>
                      )}
                    </td>
                    <td className="p-5 text-right font-black text-white text-lg tracking-tight">
                        {tag.products ? `₹${tag.products.price}` : <span className="text-zinc-700">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </motion.div>
    </main>
  );
}