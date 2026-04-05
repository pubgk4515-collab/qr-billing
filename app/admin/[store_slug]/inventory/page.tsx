'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, Hash, Package, CheckCircle, 
  Clock, Zap, ChevronRight, LayoutGrid, ListFilter,
  PlusSquare, ArrowLeft, MoreVertical, Trash2
} from 'lucide-react';
import Link from 'next/link';

export default function InventoryPage({ params }: { params: any }) {
  const [activeFilter, setActiveFilter] = useState('all'); // all, active, free
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. STATS (Big & Clear for 40+ Users)
  const stats = [
    { label: 'Total Tags', value: '150', icon: Hash, color: '#ffffff' },
    { label: 'Active Items', value: '84', icon: CheckCircle, color: '#10b981' },
    { label: 'Free Tags', value: '66', icon: Clock, color: '#f59e0b' },
  ];

  // 2. MOCK DATA (Testing ke liye premium cards)
  const inventoryItems = [
    { id: 1, tag: 'TAG001', name: 'Premium Linen Shirt', price: '1,499', status: 'active', category: 'Shirts' },
    { id: 2, tag: 'TAG002', name: 'Cotton Chinos', price: '2,199', status: 'active', category: 'Trousers' },
    { id: 3, tag: 'TAG003', name: '', price: '', status: 'free', category: '' }, // Khali Tag
    { id: 4, tag: 'TAG004', name: 'Summer Polo T-Shirt', price: '899', status: 'active', category: 'T-Shirts' },
    { id: 5, tag: 'TAG005', name: '', price: '', status: 'free', category: '' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20 font-sans">
      
      {/* 👑 HEADER */}
      <header className="bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-30 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="../" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Inventory</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Manage Tags & Stock</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
              <PlusSquare className="w-5 h-5 text-emerald-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* 📊 1. TAG STATS CARDS */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-[#0A0A0A] border border-white/5 p-4 rounded-[1.5rem] flex flex-col gap-1 shadow-xl">
              <stat.icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{stat.label}</p>
              <h2 className="text-2xl font-black tracking-tighter">{stat.value}</h2>
            </div>
          ))}
        </div>

        {/* ⚡ 2. QUICK ACTIONS (Bulk Generation & Add) */}
        <div className="grid grid-cols-2 gap-4">
          <button className="bg-[#111] border border-white/5 hover:border-emerald-500/50 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all group">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <QrCode className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="text-center">
              <span className="text-xs font-black block">Generate Free Tags</span>
              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Bulk Create ID</span>
            </div>
          </button>

          <button className="bg-white text-black p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all hover:bg-zinc-200 active:scale-95 shadow-[0_15px_40px_rgba(255,255,255,0.1)]">
            <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <span className="text-xs font-black block">Add Product</span>
              <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Bind to Lowest ID</span>
            </div>
          </button>
        </div>

        {/* 🔍 5. SEARCH & FILTER BAR */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" placeholder="Search Tag or Item..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-white/20"
            />
          </div>
          
          <div className="flex gap-2">
            {['all', 'active', 'free'].map((f) => (
              <button 
                key={f} onClick={() => setActiveFilter(f)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-white text-black' : 'bg-white/5 text-zinc-500 border border-white/5'}`}
              >
                {f} Tags
              </button>
            ))}
          </div>
        </div>

        {/* 📦 PREMIUM TAG CARDS VIEW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {inventoryItems.map((item) => (
              <motion.div 
                key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`relative overflow-hidden p-5 rounded-[2rem] border transition-all ${item.status === 'free' ? 'border-dashed border-white/10 bg-transparent' : 'border-white/10 bg-[#0A0A0A] shadow-2xl'}`}
              >
                {item.status === 'active' && (
                  <div className="absolute right-0 top-0 p-4 opacity-20"><Package className="w-16 h-16" /></div>
                )}
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">ID: {item.tag}</span>
                    <h3 className="text-lg font-black tracking-tight">{item.status === 'active' ? item.name : 'Unassigned Tag'}</h3>
                  </div>
                  <button className="p-2 text-zinc-600"><MoreVertical className="w-5 h-5" /></button>
                </div>

                <div className="flex items-center justify-between relative z-10">
                  {item.status === 'active' ? (
                    <>
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4 text-zinc-500" />
                        <span className="text-xl font-black">{item.price}</span>
                      </div>
                      <div className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">Active Stock</div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-zinc-600 font-bold italic">Ready for assignment...</span>
                      <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Link Product</button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </main>

      {/* 4. ADD IN BULK (Floating Mini Button) */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
        <ListFilter className="w-6 h-6" />
      </button>

    </div>
  );
}

// Icon for Tag generation (since Lucide doesn't have a direct 'TagPlus')
function QrCode(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
  )
}

function IndianRupee(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
  )
}
