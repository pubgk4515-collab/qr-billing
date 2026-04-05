'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Hash, Package, CheckCircle, 
  Clock, X, ArrowLeft, Loader2, QrCode, Trash2
} from 'lucide-react';
import Link from 'next/link';

export default function InventoryPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // --- STATE MANAGEMENT ---
  const [storeData, setStoreData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]); // Ye ab qr_tags aur products ka mix hoga
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // UI States
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // --- 1. THE RELATIONAL FETCH ---
  useEffect(() => {
    if (!safeStoreSlug) return;
    async function fetchStoreAndInventory() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (store) {
          setStoreData(store);
          fetchInventory(store.id);
        }
      } catch (err) { console.error(err); }
    }
    fetchStoreAndInventory();
  }, [safeStoreSlug]);

  const fetchInventory = async (storeId: string) => {
    // 💡 MAGIC QUERY: qr_tags aur products ko ek sath join karke laayega
    const { data, error } = await supabase
      .from('qr_tags')
      .select(`
        id,
        status,
        product_id,
        products ( id, name, price, size )
      `)
      .eq('store_id', storeId)
      .order('id', { ascending: true }); // TAG001, TAG002 line se aayenge
    
    if (data) setInventory(data);
    setLoading(false);
  };

  // --- 2. THE TAG GENERATOR ALGORITHM ---
  const handleGenerateTags = async () => {
    if (generateCount <= 0 || !storeData) return;
    setActionLoading(true);

    try {
      // Find highest existing tag number (e.g. from 'TAG045' get 45)
      let highestNum = 0;
      if (inventory.length > 0) {
        const lastTag = inventory[inventory.length - 1].id;
        highestNum = parseInt(lastTag.replace('TAG', '')) || 0;
      }

      const newTags = [];
      for (let i = 1; i <= generateCount; i++) {
        const newNum = highestNum + i;
        const formattedTag = `TAG${String(newNum).padStart(3, '0')}`;
        newTags.push({
          id: formattedTag, // Table me PK text hai
          store_id: storeData.id,
          status: 'free',
          product_id: null
        });
      }

      // Bulk Insert into qr_tags
      const { error } = await supabase.from('qr_tags').insert(newTags);
      if (error) throw error;

      await fetchInventory(storeData.id);
      setIsGenerateModalOpen(false);
      setGenerateCount(10);
    } catch (err) {
      alert("Error generating tags.");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

    // --- 3. THE ENTERPRISE LOWEST-ID BINDER ---
  const handleAddProduct = async () => {
    if (!newItemName || !newItemPrice || !storeData) return alert("Pehle details bhariye!");
    
    const freeTags = inventory.filter(item => item.status === 'free');
    if (freeTags.length === 0) return alert("Koi Free Tag bacha nahi hai! Pehle naye tags generate karein.");

    setActionLoading(true);
    try {
      // 🚀 FIX: TypeScript ko bata diya ki ye list nahi hai
      const lowestFreeTag: any = freeTags; 

      // STEP A: Products table me naya kapda dalo
      const { data: newProductData, error: productError } = await supabase
        .from('products')
        .insert({
          name: newItemName,
          price: Number(newItemPrice),
          store_id: storeData.id,
          size: 'Free Size' 
        })
        .select()
        .single();

      if (productError || !newProductData) throw productError;

      // 🚀 FIX: Naye product ko bhi 'any' mark kar diya
      const newProduct: any = newProductData;

      // STEP B: qr_tags table me us kapde ki ID bind kar do
      const { error: tagError } = await supabase
        .from('qr_tags')
        .update({
          product_id: newProduct.id,
          status: 'active'
        })
        .eq('id', lowestFreeTag.id);

      if (tagError) throw tagError;

      await fetchInventory(storeData.id);
      setIsAddModalOpen(false);
      setNewItemName('');
      setNewItemPrice('');
    } catch (err) {
      alert("Error adding product.");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };


  // --- 4. UNBIND ITEM (Trash Button) ---
  const handleUnbindItem = async (tagId: string) => {
    if(!confirm("Kya aap is product ko hatana chahte hain? Tag wapas Free ho jayega.")) return;
    try {
      // Product delete nahi kar rahe (history ke liye), bas tag se connection tod rahe hain
      await supabase.from('qr_tags').update({ product_id: null, status: 'free' }).eq('id', tagId);
      fetchInventory(storeData?.id);
    } catch (error) { console.error(error); }
  };

  // --- UI FILTERS ---
  const totalTags = inventory.length;
  const activeTags = inventory.filter(i => i.status === 'active' || i.status === 'sold').length; // Assuming sold is also not free
  const freeTagsCount = inventory.filter(i => i.status === 'free').length;

  const filteredInventory = inventory.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = item.id.toLowerCase().includes(searchLower) || 
                          (item.products?.name && item.products.name.toLowerCase().includes(searchLower));
    
    const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 font-sans relative">
      <header className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/${safeStoreSlug}`} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">Inventory</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Manage Tags & Stock</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-[1.5rem] flex flex-col gap-1 shadow-lg">
            <Hash className="w-5 h-5 mb-2 text-white" />
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Total Tags</p>
            <h2 className="text-3xl font-black tracking-tighter">{totalTags}</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-[1.5rem] flex flex-col gap-1 shadow-lg">
            <CheckCircle className="w-5 h-5 mb-2 text-emerald-500" />
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Active Items</p>
            <h2 className="text-3xl font-black tracking-tighter">{activeTags}</h2>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-[1.5rem] flex flex-col gap-1 shadow-lg">
            <Clock className="w-5 h-5 mb-2 text-amber-500" />
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Free Tags</p>
            <h2 className="text-3xl font-black tracking-tighter">{freeTagsCount}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setIsGenerateModalOpen(true)} className="bg-[#111] border border-white/5 hover:border-emerald-500/30 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-[1.2rem] flex items-center justify-center"><QrCode className="w-7 h-7 text-emerald-500" /></div>
            <div className="text-center">
              <span className="text-sm font-black block">Generate Tags</span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1 block">Bulk Create ID</span>
            </div>
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-black p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all hover:bg-zinc-200 active:scale-95 shadow-xl">
            <div className="w-14 h-14 bg-black/5 rounded-[1.2rem] flex items-center justify-center"><Plus className="w-8 h-8" /></div>
            <div className="text-center">
              <span className="text-sm font-black block">Add Product</span>
              <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest mt-1 block">Bind to Lowest ID</span>
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-4 mt-2">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input type="text" placeholder="Search by Tag or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-base font-bold focus:outline-none focus:border-white/20" />
          </div>
          <div className="flex gap-2 bg-[#0A0A0A] p-1.5 rounded-2xl border border-white/5">
            {['all', 'active', 'free', 'sold'].map((f) => (
              <button key={f} onClick={() => setActiveFilter(f)} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredInventory.length === 0 && !loading && <p className="text-center col-span-full py-10 text-zinc-500 font-bold uppercase tracking-widest text-xs">No tags found.</p>}
            
            {filteredInventory.map((item) => (
              <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={`relative overflow-hidden p-6 rounded-[2rem] border transition-all ${item.status === 'free' ? 'border-dashed border-white/10 bg-transparent' : 'border-white/10 bg-[#111] shadow-xl'}`}>
                
                {item.status !== 'free' && <div className="absolute right-[-10px] top-[-10px] p-4 opacity-5"><Package className="w-32 h-32" /></div>}
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <span className={`text-[11px] font-black tracking-widest uppercase ${item.status === 'active' ? 'text-emerald-500' : item.status === 'sold' ? 'text-red-500' : 'text-amber-500'}`}>
                      {item.id}
                    </span>
                    <h3 className="text-xl font-black tracking-tight mt-1">{item.status !== 'free' ? item.products?.name : 'Empty Tag'}</h3>
                  </div>
                  {item.status === 'active' && (
                    <button onClick={() => handleUnbindItem(item.id)} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>

                <div className="flex items-center justify-between relative z-10">
                  {item.status !== 'free' ? (
                    <>
                      <div className="text-2xl font-black">₹{item.products?.price}</div>
                      <div className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${item.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {item.status}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-zinc-600 font-bold">Ready to use</span>
                      <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] text-white font-black uppercase tracking-widest transition-all">Link Item</button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* --- MODAL 1: GENERATE TAGS --- */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 p-8 relative">
              <button onClick={() => setIsGenerateModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
              <div className="w-16 h-16 bg-[#111] rounded-[1.2rem] flex items-center justify-center mb-6"><QrCode className="w-8 h-8 text-emerald-500" /></div>
              <h2 className="text-2xl font-black mb-2">Generate Tags</h2>
              <p className="text-zinc-500 text-sm mb-6">Kitne naye khali tags database mein create karne hain?</p>
              
              <div className="flex items-center gap-4 mb-8">
                 <button onClick={() => setGenerateCount(Math.max(1, generateCount - 5))} className="w-14 h-14 bg-[#111] rounded-2xl text-xl font-black">-</button>
                 <div className="flex-1 text-center text-4xl font-black">{generateCount}</div>
                 <button onClick={() => setGenerateCount(generateCount + 5)} className="w-14 h-14 bg-[#111] rounded-2xl text-xl font-black">+</button>
              </div>

              <button onClick={handleGenerateTags} disabled={actionLoading} className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-transform">
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Generate Now'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: ADD PRODUCT --- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 p-8 relative">
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
              <div className="w-16 h-16 bg-[#111] rounded-[1.2rem] flex items-center justify-center mb-6"><Plus className="w-8 h-8 text-white" /></div>
              <h2 className="text-2xl font-black mb-2">Add New Product</h2>
              <p className="text-zinc-500 text-sm mb-6">Ye product automatically sabse chhote Free Tag se jud jayega.</p>
              
              <div className="flex flex-col gap-4 mb-8">
                 <input type="text" placeholder="Product Name (e.g. Linen Shirt)" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 px-5 font-bold focus:outline-none focus:border-white/30" />
                 <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-black">₹</span>
                   <input type="number" placeholder="Price" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-10 pr-5 font-bold focus:outline-none focus:border-white/30" />
                 </div>
              </div>

              <button onClick={handleAddProduct} disabled={actionLoading} className="w-full bg-white text-black font-black py-5 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-transform">
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Save & Bind Tag'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
