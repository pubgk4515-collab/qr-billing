'use client';

import { useState, useEffect, use, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Hash, Package, CheckCircle, Clock, X, ArrowLeft, 
  Loader2, QrCode, Trash2, Edit2, Download, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';

export default function InventoryPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // --- STATE MANAGEMENT ---
  const [storeData, setStoreData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // UI States
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals States
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Focus Binding State (Kis tag pe item link karna hai)
  const [selectedTagItem, setSelectedTagItem] = useState<any>(null);
  const [bindingTagId, setBindingTagId] = useState<string | null>(null);

  // New/Edit Product States
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // --- 1. THE RELATIONAL FETCH ---
  useEffect(() => {
    if (!safeStoreSlug) return;
    async function fetchInitialData() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (store) {
          setStoreData(store);
          fetchRealInventory(store.id);
        }
      } catch (err) { console.error(err); }
    }
    fetchInitialData();
  }, [safeStoreSlug]);

  const fetchRealInventory = async (storeId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('qr_tags')
      .select(`id, status, product_id, products ( id, name, price, size, image_url )`)
      .eq('store_id', storeId)
      .order('id', { ascending: true });
    
    if (data) setInventory(data);
    else if (error) console.error("Real fetch error:", error);
    setLoading(false);
  };

  const uploadImage = async (file: File) => {
    if (!storeData) return null;
    try {
      setUploadProgress(10);
      const fileExt = file.name.split('.').pop();
      const fileName = `${safeStoreSlug}_item_${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      setUploadProgress(100);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading:', error);
      setUploadProgress(0);
      return null;
    }
  };

  // --- 2. GENERATE TAGS ---
  const handleGenerateTags = async () => {
    if (generateCount <= 0 || !storeData) return;
    setActionLoading(true);
    try {
      let highestNum = 0;
      if (inventory.length > 0) {
        const lastTag = inventory[inventory.length - 1].id;
        highestNum = parseInt(lastTag.replace('TAG', '')) || 0;
      }

      const newTags = [];
      for (let i = 1; i <= generateCount; i++) {
        const newNum = highestNum + i;
        const formattedTag = `TAG${String(newNum).padStart(3, '0')}`;
        newTags.push({ id: formattedTag, store_id: storeData.id, status: 'free', product_id: null });
      }

      const { error } = await supabase.from('qr_tags').insert(newTags);
      if (error) throw error;

      await fetchRealInventory(storeData.id);
      setIsGenerateModalOpen(false);
      setGenerateCount(10);
    } catch (err) { alert("Error generating tags."); console.error(err); } 
    finally { setActionLoading(false); }
  };

  // --- 3. TARGETED / LOWEST BINDER ---
  const handleAddProduct = async () => {
    if (!newItemName || !newItemPrice || !storeData) return alert("Pehle details bhariye!");
    
    let targetTagToBind: any = null;

    if (bindingTagId) {
      // Agar direct card se link dabaya hai
      targetTagToBind = inventory.find(i => i.id === bindingTagId);
    } else {
      // Agar main Add button dabaya hai toh lowest free dhoondo
      const freeTags = inventory.filter(item => item.status === 'free');
      if (freeTags.length === 0) return alert("Koi Free Tag bacha nahi hai! Naye generate karein.");
      targetTagToBind = freeTags; 
    }

    if (!targetTagToBind) return alert("Tag nahi mila!");

    setActionLoading(true);
    try {
      // Products table me naya kapda dalo
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
      const newProduct: any = newProductData;

      // qr_tags update karo (is se SOLD bhi wapas ACTIVE ho jayega)
      const { error: tagError } = await supabase
        .from('qr_tags')
        .update({
          product_id: newProduct.id,
          status: 'active'
        })
        .eq('id', targetTagToBind.id);

      if (tagError) throw tagError;

      await fetchRealInventory(storeData.id);
      setIsAddModalOpen(false);
      setNewItemName('');
      setNewItemPrice('');
      setBindingTagId(null); // Reset
    } catch (err) { alert("Error adding product."); console.error(err); } 
    finally { setActionLoading(false); }
  };

  // --- EDIT PRODUCT ---
  const handleEditProduct = async () => {
    if (!selectedTagItem?.products || !storeData) return;
    setActionLoading(true);
    try {
      let imageUrl = selectedTagItem.products.image_url;
      const file = fileInputRef.current?.files?.[0];
      if (file) imageUrl = await uploadImage(file); 

      const { error } = await supabase.from('products').update({ name: editName, price: Number(editPrice), image_url: imageUrl }).eq('id', selectedTagItem.product_id);
      if (error) throw error;

      await fetchRealInventory(storeData.id);
      setIsEditModalOpen(false);
      setSelectedTagItem(null);
    } catch (error) { alert("Error editing product."); console.error(error); } 
    finally { setActionLoading(false); setUploadProgress(0); }
  };

  const handleUnbindItem = async (tagId: string) => {
    if(!confirm("Kya aap is product ko hatana chahte hain? Tag wapas Free ho jayega.")) return;
    try {
      await supabase.from('qr_tags').update({ product_id: null, status: 'free' }).eq('id', tagId);
      fetchRealInventory(storeData?.id);
    } catch (error) { console.error(error); }
  };

  const handleDownloadQr = () => {
    if (!qrRef.current || !selectedTagItem) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png', 1.0);
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${selectedTagItem.id}_HighRes.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const openQrModal = (item: any) => { setSelectedTagItem(item); setIsQrModalOpen(true); };
  const openEditModal = (item: any) => {
    setSelectedTagItem(item);
    setEditName(item.products?.name || '');
    setEditPrice(item.products?.price || '');
    setIsEditModalOpen(true);
  };

  const openAddModalForSpecificTag = (tagId: string) => {
    setBindingTagId(tagId);
    setIsAddModalOpen(true);
  };

  const totalTags = inventory.length;
  const activeTags = inventory.filter(i => i.status === 'active').length;
  const freeTagsCount = inventory.filter(i => i.status === 'free' || i.status === 'sold').length; // Sold is practically free

  const filteredInventory = inventory.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = item.id.toLowerCase().includes(searchLower) || (item.products?.name && item.products.name.toLowerCase().includes(searchLower));
    const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 font-sans relative">
      <header className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/${safeStoreSlug}`} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><ArrowLeft className="w-5 h-5 text-zinc-300" /></Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">Inventory</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Manage Tags & Stock</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Tags', value: totalTags, icon: Hash, color: 'text-white' },
            { label: 'Active Items', value: activeTags, icon: CheckCircle, color: 'text-emerald-500' },
            { label: 'Free Tags', value: freeTagsCount, icon: Clock, color: 'text-amber-500' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-[#0A0A0A] border border-white/5 p-5 rounded-[1.5rem] flex flex-col gap-1 shadow-lg">
              <stat.icon className={`w-5 h-5 mb-2 ${stat.color}`} />
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{stat.label}</p>
              <h2 className="text-3xl font-black tracking-tighter">{stat.value}</h2>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setIsGenerateModalOpen(true)} className="bg-[#111] border border-white/5 hover:border-emerald-500/30 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-[1.2rem] flex items-center justify-center group-hover:scale-110 transition-transform"><QrCode className="w-7 h-7 text-emerald-500" /></div>
            <div className="text-center">
              <span className="text-sm font-black block">Generate Tags</span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1 block">Bulk Create ID</span>
            </div>
          </button>
          <button onClick={() => { setBindingTagId(null); setIsAddModalOpen(true); }} className="bg-white text-black p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all hover:bg-zinc-200 active:scale-95 shadow-xl">
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
              <button key={f} onClick={() => setActiveFilter(f)} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredInventory.map((item) => (
              <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={`relative overflow-hidden p-6 rounded-[2rem] border transition-all ${item.status === 'free' ? 'border-dashed border-white/10 bg-transparent' : item.status === 'sold' ? 'border-white/5 bg-[#0a0a0a]' : 'border-white/10 bg-[#111] shadow-xl'}`}>
                
                {/* Image sirf Active pe dikhegi, Sold pe nahi */}
                {item.status === 'active' && (
                    item.products?.image_url ? (
                        <img src={item.products.image_url} alt="Item" className="absolute right-[-20px] top-[-20px] w-48 h-48 rounded-full object-cover opacity-10" />
                    ) : (
                        <div className="absolute right-[-10px] top-[-10px] p-4 opacity-5"><Package className="w-32 h-32" /></div>
                    )
                )}
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <span className={`text-[11px] font-black tracking-widest uppercase ${item.status === 'active' ? 'text-emerald-500' : item.status === 'sold' ? 'text-red-500' : 'text-amber-500'}`}>{item.id}</span>
                    <h3 className={`text-xl font-black tracking-tight mt-1 ${item.status === 'sold' ? 'text-zinc-500 line-through' : ''}`}>
                      {item.status !== 'free' ? item.products?.name : 'Empty Tag'}
                    </h3>
                  </div>
                  
                  {/* Action Buttons sirf Active pe */}
                  {item.status === 'active' && (
                    <div className="flex gap-1">
                      <button onClick={() => openQrModal(item)} className="p-2 bg-white/5 text-zinc-400 rounded-lg hover:bg-white/10 transition-colors"><QrCode className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openEditModal(item)} className="p-2 bg-white/5 text-zinc-400 rounded-lg hover:bg-white/10 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleUnbindItem(item.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between relative z-10">
                  {item.status === 'active' ? (
                    <>
                      <div className="text-2xl font-black">₹{item.products?.price}</div>
                      <div className="text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest bg-emerald-500/10 text-emerald-400">ACTIVE</div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1">
                        {item.status === 'sold' && <div className="w-fit text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-red-500/10 text-red-400">SOLD</div>}
                        <span className="text-xs text-zinc-600 font-bold">{item.status === 'sold' ? 'Tag ready to reuse' : 'Ready to bind'}</span>
                      </div>
                      
                      {/* 🔥 THE MAGIC RE-LINK BUTTON FOR SOLD & FREE */}
                      <button onClick={() => openAddModalForSpecificTag(item.id)} className="px-5 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">
                        Link Item
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* --- ADD PRODUCT MODAL --- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 p-8 relative min-h-[400px]">
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
              <div className="w-16 h-16 bg-[#111] rounded-[1.2rem] flex items-center justify-center mb-6"><Plus className="w-8 h-8 text-white" /></div>
              
              <h2 className="text-2xl font-black mb-2">
                {bindingTagId ? `Link to ${bindingTagId}` : 'Add New Product'}
              </h2>
              <p className="text-zinc-500 text-sm mb-6">
                {bindingTagId ? 'Ye product is specific tag se jud jayega.' : 'Ye product automatically sabse chhote Free Tag se jud jayega.'}
              </p>
              
              <div className="flex flex-col gap-4 mb-8">
                 <input type="text" placeholder="Product Name (e.g. Linen Shirt)" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 px-5 font-bold focus:outline-none focus:border-white/30" />
                 <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-black">₹</span>
                   <input type="number" placeholder="Price" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-10 pr-5 font-bold focus:outline-none focus:border-white/30" />
                 </div>
              </div>

              <button onClick={handleAddProduct} disabled={actionLoading} className="w-full bg-white text-black font-black py-5 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Save & Bind Tag'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GENERATE TAG MODAL & EDIT MODAL & QR MODAL REMAINS THE SAME AS BEFORE */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 p-8 relative">
              <button onClick={() => setIsGenerateModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
              <div className="w-16 h-16 bg-[#111] rounded-[1.2rem] flex items-center justify-center mb-6"><QrCode className="w-8 h-8 text-emerald-500" /></div>
              <h2 className="text-2xl font-black mb-2">Generate Tags</h2>
              <p className="text-zinc-500 text-sm mb-6">Kitne naye khali tags database mein create karne hain?</p>
              <div className="flex items-center gap-4 mb-8">
                 <button onClick={() => setGenerateCount(Math.max(1, generateCount - 5))} className="w-14 h-14 bg-[#111] rounded-2xl text-xl font-black">-</button>
                 <div className="flex-1 text-center text-4xl font-black">{generateCount}</div>
                 <button onClick={() => setGenerateCount(generateCount + 5)} className="w-14 h-14 bg-[#111] rounded-2xl text-xl font-black">+</button>
              </div>
              <button onClick={handleGenerateTags} disabled={actionLoading} className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Generate Now'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQrModalOpen && selectedTagItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#111] border border-white/10 p-8 rounded-[3rem] shadow-3xl text-center relative flex flex-col items-center">
              <button onClick={() => { setIsQrModalOpen(false); setSelectedTagItem(null); }} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
              <div ref={qrRef} className="p-4 bg-white rounded-3xl mb-6 shadow-xl">
                 <QRCodeCanvas value={`https://${store_slug}.vercel.app/p/${selectedTagItem.id}`} size={256} bgColor={"#ffffff"} fgColor={"#000000"} level={"H"} includeMargin={false} />
              </div>
              <span className="text-4xl font-black tracking-tighter text-emerald-400">{selectedTagItem.id}</span>
              <p className="text-zinc-500 text-sm mt-1 mb-6 font-bold uppercase tracking-widest">{selectedTagItem.products?.name || 'Empty Tag'}</p>
              <button onClick={handleDownloadQr} className="px-8 py-4 bg-white text-black rounded-2xl font-black flex items-center gap-2 active:scale-95 transition-all">
                <Download className="w-5 h-5" /> Download High-Res PNG
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && selectedTagItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 p-8 relative">
              <button onClick={() => { setIsEditModalOpen(false); setSelectedTagItem(null); setUploadProgress(0); }} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full z-10"><X className="w-5 h-5 text-zinc-400" /></button>
              <div className="w-full flex items-center gap-4 mb-6">
                 {selectedTagItem.products?.image_url ? (
                    <img src={selectedTagItem.products.image_url} alt="Image" className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                 ) : (
                    <div className="w-16 h-16 bg-[#111] rounded-2xl flex items-center justify-center border border-white/10"><ImageIcon className="w-8 h-8 text-zinc-600" /></div>
                 )}
                 <div>
                   <h2 className="text-2xl font-black leading-tight">Edit <span className="text-emerald-400">{selectedTagItem.id}</span></h2>
                   <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">Link to {selectedTagItem.products?.name}</p>
                 </div>
              </div>
              <div className="flex flex-col gap-4 mb-8">
                 <input type="text" placeholder="Product Name" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-4 px-5 font-bold focus:outline-none focus:border-white/30" />
                 <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-black">₹</span>
                   <input type="number" placeholder="Price" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-4 pl-10 pr-5 font-bold focus:outline-none focus:border-white/30" />
                 </div>
                 <div className="border-2 border-dashed border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500/30 group">
                   <ImageIcon className="w-8 h-8 text-zinc-600 group-hover:text-emerald-500 mb-2 transition-colors" />
                   <p className="text-xs text-zinc-500 font-bold group-hover:text-white mb-3">Upload new image</p>
                   <input type="file" ref={fileInputRef} accept="image/*" className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-white file:text-black hover:file:bg-zinc-200 cursor-pointer" />
                   {uploadProgress > 0 && (
                     <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                        <motion.div animate={{ width: `${uploadProgress}%` }} className="h-full bg-emerald-500" />
                     </div>
                   )}
                 </div>
              </div>
              <button onClick={handleEditProduct} disabled={actionLoading} className="w-full bg-white text-black font-black py-5 rounded-2xl flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 transition-transform shadow-xl">
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
