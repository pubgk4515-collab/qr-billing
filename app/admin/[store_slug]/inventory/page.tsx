'use client';

import { useState, useEffect, use, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Hash, Package, CheckCircle, Clock, X, ArrowLeft, 
  Loader2, QrCode, Trash2, Edit2, Download, Image as ImageIcon,
  BarChart3, Settings, Printer 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

export default function InventoryPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // --- STATE MANAGEMENT ---
  const [storeData, setStoreData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [themeColor, setThemeColor] = useState('#10b981'); 
  
  // UI States
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals States
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Print Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printStart, setPrintStart] = useState<number | ''>('');
  const [printEnd, setPrintEnd] = useState<number | ''>('');

  // Focus Binding State
  const [selectedTagItem, setSelectedTagItem] = useState<any>(null);
  const [bindingTagId, setBindingTagId] = useState<string | null>(null);

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemSize, setNewItemSize] = useState(''); // 🔥 NEW SIZE STATE
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  
  const [uploadProgress, setUploadProgress] = useState(0); 
  const [addUploadProgress, setAddUploadProgress] = useState(0); 
  
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const addFileInputRef = useRef<HTMLInputElement>(null); 
  const qrRef = useRef<HTMLDivElement>(null);

  // --- THE RELATIONAL FETCH & SILENT REFRESHER ---
  useEffect(() => {
    if (!safeStoreSlug) return;
    async function fetchInitialData() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (store) {
          setStoreData(store);
          setThemeColor(store.theme_color || '#10b981');
          fetchRealInventory(store.id, false);
        }
      } catch (err) { console.error(err); }
    }
    fetchInitialData();
  }, [safeStoreSlug]);

  useEffect(() => {
    if (!storeData) return;
    const interval = setInterval(() => {
      fetchRealInventory(storeData.id, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [storeData]);

  const fetchRealInventory = async (storeId: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    const { data, error } = await supabase
      .from('qr_tags')
      .select(`id, status, product_id, products ( id, name, price, size, image_url )`)
      .eq('store_id', storeId)
      .order('id', { ascending: true });
    
    if (data) setInventory(data);
    else if (error) console.error("Real fetch error:", error);
    if (!isSilent) setLoading(false);
  };

  const uploadImage = async (file: File, setProgress: (val: number) => void) => {
    if (!storeData) return null;
    try {
      setProgress(10);
      const fileExt = file.name.split('.').pop();
      const fileName = `${safeStoreSlug}_item_${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      setProgress(100);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading:', error);
      setProgress(0);
      return null;
    }
  };

  // --- ACTIONS ---
  const handleGenerateTags = async () => {
    if (generateCount <= 0 || !storeData) return;
    setActionLoading(true);
    try {
      let highestNum = 0;
      if (inventory.length > 0) {
        const numbers = inventory.map(item => parseInt(item.id.replace('TAG', '')) || 0);
        highestNum = Math.max(...numbers, 0);
      }
      const newTags = [];
      for (let i = 1; i <= generateCount; i++) {
        const newNum = highestNum + i;
        const formattedTag = `TAG${String(newNum).padStart(3, '0')}`;
        newTags.push({ id: formattedTag, store_id: storeData.id, status: 'free', product_id: null });
      }
      await supabase.from('qr_tags').insert(newTags);
      await fetchRealInventory(storeData.id, true);
      setIsGenerateModalOpen(false);
      setGenerateCount(10);
    } catch (err) { alert("Error generating tags."); } 
    finally { setActionLoading(false); }
  };

  const handleAddProduct = async () => {
    if (!newItemName || !newItemPrice || !storeData) return alert("Pehle details bhariye!");
    
    let targetTagToBind: any = null;
    
    if (bindingTagId) {
      targetTagToBind = inventory.find(i => i.id === bindingTagId);
    } else {
      // 🔥 FIX: Find the absolute lowest available free tag
      const freeTags = inventory.filter(item => item.status === 'free');
      if (freeTags.length === 0) return alert("Koi Free Tag bacha nahi hai!");
      
      // Sort numerically to ensure TAG001 comes before TAG010
      freeTags.sort((a, b) => {
        const numA = parseInt(a.id.replace('TAG', ''), 10) || 0;
        const numB = parseInt(b.id.replace('TAG', ''), 10) || 0;
        return numA - numB;
      });
      
      targetTagToBind = freeTags; 
    }
    
    if (!targetTagToBind) return alert("Tag nahi mila!");

    setActionLoading(true);
    try {
      let imageUrl = null;
      const file = addFileInputRef.current?.files?.[0]; 
      if (file) imageUrl = await uploadImage(file, setAddUploadProgress);

      const { data: newProductData } = await supabase
        .from('products')
        // 🔥 FIX: Injecting the new Size parameter here
        .insert({ 
          name: newItemName, 
          price: Number(newItemPrice), 
          store_id: storeData.id, 
          size: newItemSize || 'Free Size', 
          image_url: imageUrl 
        })
        .select().single();

      await supabase.from('qr_tags')
        .update({ product_id: newProductData.id, status: 'active' })
        .eq('id', targetTagToBind.id)
        .eq('store_id', storeData.id);

      await fetchRealInventory(storeData.id, true);
      setIsAddModalOpen(false);
      setNewItemName(''); 
      setNewItemPrice(''); 
      setNewItemSize(''); // Reset Size
      setAddUploadProgress(0); 
      setBindingTagId(null); 
    } catch (err) { alert("Error adding product."); } 
    finally { setActionLoading(false); }
  };

  const handleEditProduct = async () => {
    if (!selectedTagItem?.products || !storeData) return;
    setActionLoading(true);
    try {
      let imageUrl = selectedTagItem.products.image_url;
      const file = fileInputRef.current?.files?.[0]; 
      if (file) imageUrl = await uploadImage(file, setUploadProgress); 

      await supabase.from('products')
        .update({ name: editName, price: Number(editPrice), image_url: imageUrl })
        .eq('id', selectedTagItem.product_id)
        .eq('store_id', storeData.id);
      
      await fetchRealInventory(storeData.id, true);
      setIsEditModalOpen(false);
      setSelectedTagItem(null);
    } catch (error) { alert("Error editing product."); } 
    finally { setActionLoading(false); setUploadProgress(0); }
  };

  const handleUnbindItem = async (tagId: string) => {
    if(!confirm("Are you sure you want to remove this product? The tag will become free again.")) return;
    try {
      await supabase.from('qr_tags')
        .update({ product_id: null, status: 'free' })
        .eq('id', tagId)
        .eq('store_id', storeData.id);

      fetchRealInventory(storeData?.id, true);
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

  const triggerPrintAction = () => {
    if (!printStart || !printEnd || printStart > printEnd) {
      alert("Please enter a valid tag range (e.g., 1 to 100).");
      return;
    }
    setIsPrintModalOpen(false);
    setTimeout(() => {
      window.print();
    }, 500); 
  };

  const openQrModal = (item: any) => { setSelectedTagItem(item); setIsQrModalOpen(true); };
  const openEditModal = (item: any) => { setSelectedTagItem(item); setEditName(item.products?.name || ''); setEditPrice(item.products?.price || ''); setIsEditModalOpen(true); };
  const openAddModalForSpecificTag = (tagId: string) => { setBindingTagId(tagId); setIsAddModalOpen(true); };

  const totalTags = inventory.length;
  const activeTags = inventory.filter(i => i.status === 'active').length;
  const freeTagsCount = inventory.filter(i => i.status === 'free' || i.status === 'sold').length; 

  const filteredInventory = inventory.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = item.id.toLowerCase().includes(searchLower) || (item.products?.name && item.products.name.toLowerCase().includes(searchLower));
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'in_cart') return matchesSearch && item.status === 'in_cart';
    return matchesSearch && item.status === activeFilter;
  });

  const tagsToPrint = inventory.filter(item => {
    if (!printStart || !printEnd) return true; 
    const num = parseInt(item.id.replace('TAG', ''), 10);
    return num >= printStart && num <= printEnd;
  });

  const chunkedTags = [];
  for (let i = 0; i < tagsToPrint.length; i += 16) {
    chunkedTags.push(tagsToPrint.slice(i, i + 16));
  }

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} /></div>;

  return (
    <>
      {/* 💻 MAIN UI (Hides when printing) */}
      <div className="min-h-screen bg-[#050505] text-white pb-32 font-sans relative print:hidden">
        
        {/* 👑 TOP NAV BAR */}
        <header className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 px-6 py-5">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/admin/${safeStoreSlug}`} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5 text-zinc-300" />
              </Link>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none">Inventory</h1>
                <p className="text-[10px] uppercase tracking-widest font-bold mt-1" style={{ color: themeColor }}>Manage Tags & Stock</p>
              </div>
            </div>
            
            <button 
              onClick={() => router.push(`/admin/${safeStoreSlug}/inventory/worker-mode`)}
              className="px-4 py-2.5 bg-white text-black rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-zinc-200 flex items-center gap-2"
            >
              <Package className="w-4 h-4 hidden sm:block" /> Bulk Add
            </button>
          </div>
        </header>

        {/* 🚀 FLOATING ADMIN & ANALYTICS BUTTONS */}
        <div className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-50 flex flex-col items-end gap-3">
          <button 
            onClick={() => router.push(`/admin/${safeStoreSlug}/analytics`)} 
            className="p-3 sm:px-5 sm:py-3.5 rounded-[1.25rem] flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95 group" 
            style={{ backgroundColor: themeColor, color: '#fff' }}
          >
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[11px] font-black uppercase tracking-widest hidden sm:block">Analytics</span>
          </button>
          <button 
            onClick={() => router.push(`/admin/${safeStoreSlug}`)} 
            className="p-3 sm:px-5 sm:py-3.5 bg-[#111] rounded-[1.25rem] flex items-center gap-3 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95 group"
          >
             <Settings className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: themeColor }} />
             <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300 hidden sm:block">Admin</span>
          </button>
        </div>

        <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8 mt-4">
          
          {/* STATS ROW */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Tags', value: totalTags, icon: Hash, color: '#ffffff' },
              { label: 'Active', value: activeTags, icon: CheckCircle, color: themeColor },
              { label: 'Free Tags', value: freeTagsCount, icon: Clock, color: '#f59e0b' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-[#0A0A0A] border border-white/5 p-4 sm:p-5 rounded-[1.5rem] flex flex-col gap-1 shadow-lg">
                <stat.icon className="w-5 h-5 mb-2" style={{ color: stat.color }} />
                <p className="text-[8px] sm:text-[9px] text-zinc-500 uppercase font-black tracking-widest">{stat.label}</p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">{stat.value}</h2>
              </div>
            ))}
          </div>

          {/* QUICK ACTIONS */}
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setIsGenerateModalOpen(true)} className="bg-[#111] border border-white/5 hover:border-white/20 py-4 px-2 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group shadow-lg">
              <div className="w-10 h-10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: `${themeColor}1A` }}>
                <QrCode className="w-5 h-5" style={{ color: themeColor }} />
              </div>
              <span className="text-xs font-black block text-center leading-tight">Generate</span>
            </button>
            
            <button onClick={() => { setBindingTagId(null); setIsAddModalOpen(true); }} className="bg-white text-black py-4 px-2 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all hover:bg-zinc-200 active:scale-95 shadow-xl">
              <div className="w-10 h-10 bg-black/5 rounded-[1rem] flex items-center justify-center"><Plus className="w-5 h-5" /></div>
              <span className="text-xs font-black block text-center leading-tight">Add Item</span>
            </button>

            <button onClick={() => setIsPrintModalOpen(true)} className="bg-[#111] border border-white/5 hover:border-white/20 py-4 px-2 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group shadow-lg">
              <div className="w-10 h-10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform bg-zinc-800">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-black block text-white text-center leading-tight">Print PDF</span>
            </button>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input type="text" placeholder="Search by Tag or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-base font-bold focus:outline-none focus:border-white/20" />
            </div>
            
            <div className="flex flex-wrap gap-2 bg-[#0A0A0A] p-1.5 rounded-2xl border border-white/5 overflow-x-auto">
              {['all', 'active', 'in_cart', 'sold', 'free'].map((f) => (
                <button key={f} onClick={() => setActiveFilter(f)} className={`flex-1 min-w-[70px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}>
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* INVENTORY LIST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredInventory.map((item) => (
                <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
                  className={`relative overflow-hidden p-6 rounded-[2.5rem] border transition-all ${
                    (item.status === 'free' || item.status === 'sold') ? 'border-dashed border-white/10 bg-transparent' : 
                    item.status === 'in_cart' ? 'border-amber-500/30 bg-[#111] shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 
                    'border-white/10 bg-[#111] shadow-xl'
                  }`}
                >
                  
                  {/* Background Image/Icon Overlay */}
                  {(item.status === 'active' || item.status === 'in_cart') && (
                      item.products?.image_url ? (
                          <img src={item.products.image_url} alt="Item" className="absolute right-[-20px] top-[-20px] w-48 h-48 rounded-full object-cover opacity-30 mix-blend-lighten" />
                      ) : (
                          <div className="absolute right-[-10px] top-[-10px] p-4 opacity-5"><Package className="w-32 h-32" /></div>
                      )
                  )}
                  
                  {/* 🔝 TOP HEADER SECTION */}
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                      <span className={`text-[11px] font-black tracking-widest uppercase ${
                        item.status === 'active' ? 'text emerald-500' : 
                        item.status === 'in_cart' ? 'text-amber-500' :
                        'text-zinc-500'
                      }`} style={item.status === 'active' ? { color: themeColor } : {}}>
                        {item.id}
                      </span>
                      <h3 className="text-xl font-black tracking-tight mt-1">
                        {(item.status === 'active' || item.status === 'in_cart') ? item.products?.name : 'Empty Tag'}
                      </h3>
                    </div>
                    
                    {/* Action Buttons Area */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openQrModal(item)} 
                        className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/15 hover:border-white/30 transition-all active:scale-90 shadow-2xl group"
                      >
                        <QrCode className="w-5 h-5 text-zinc-300 group-hover:text-white group-hover:scale-110 transition-all" />
                      </button>

                      {(item.status === 'active' || item.status === 'in_cart') && (
                        <>
                          <button onClick={() => openEditModal(item)} className="w-12 h-12 bg-white/5 backdrop-blur-md border border-white/10 text-zinc-300 rounded-full flex items-center justify-center hover:bg-white/15 transition-all"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleUnbindItem(item.id)} className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM ROW */}
                  <div className="flex items-center justify-between relative z-10">
                    {(item.status === 'active' || item.status === 'in_cart') ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="text-2xl font-black">₹{item.products?.price}</div>
                        {item.status === 'in_cart' ? (
                           <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                             <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">In Bag</span>
                           </div>
                        ) : (
                           <div className="text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest" style={{ backgroundColor: `${themeColor}1A`, color: themeColor }}>
                             ACTIVE
                           </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-zinc-600 font-bold tracking-tight">Ready to bind</span>
                        </div>
                        <button onClick={() => openAddModalForSpecificTag(item.id)} className="px-6 py-3 bg-white text-black hover:bg-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95">
                          Link Item
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* 🖨️ THE HIDDEN PRINTABLE A4 SHEET */}
      <div className="hidden print:flex bg-white w-full text-black justify-center">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            html, body { height: auto !important; overflow: visible !important; margin: 0; padding: 0; }
            @page { margin: 0.2in; } 
          }
        `}} />

        <div className="w-full max-w-[8.27in]"> 
          {chunkedTags.map((pageTags, pageIndex) => (
            <div key={pageIndex} className="pt-2 pb-2 flex flex-wrap justify-center content-start gap-2" style={{ pageBreakAfter: 'always', breakAfter: 'page', minHeight: '100vh' }}>
              {pageTags.map((item) => (
                <div 
                  key={item.id} 
                  className="flex flex-col items-center justify-center border border-dashed border-gray-400 p-1 break-inside-avoid" 
                  style={{ width: '1.8in', height: '2.1in' }} 
                >
                  <QRCodeCanvas 
                    value={`${window.location.origin}/${safeStoreSlug}/${item.id}`} 
                    size={130} 
                    bgColor={"#ffffff"} 
                    fgColor={"#000000"} 
                    level={"M"} 
                    includeMargin={false} 
                  />
                  <span className="mt-1.5 text-[11px] font-black tracking-widest uppercase text-black leading-none">
                    {item.id}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* --- MODALS --- */}
      {/* 1. ADD PRODUCT MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 p-8 relative min-h-[400px]">
              <button onClick={() => { setIsAddModalOpen(false); setAddUploadProgress(0); }} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full z-10"><X className="w-5 h-5 text-zinc-400" /></button>
              <div className="w-16 h-16 bg-[#111] rounded-[1.2rem] flex items-center justify-center mb-6"><Plus className="w-8 h-8 text-white" /></div>
              
              <h2 className="text-2xl font-black mb-2">
                {bindingTagId ? `Link to ${bindingTagId}` : 'Add New Product'}
              </h2>
              <p className="text-zinc-500 text-sm mb-6">This product will attach to the empty tag.</p>
              
              <div className="flex flex-col gap-4 mb-8">
                 <input type="text" placeholder="Product Name (e.g. Linen Shirt)" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-4 px-5 font-bold focus:outline-none focus:border-white/30" />
                 
                 {/* 🔥 NEW SIZE AND PRICE ROW */}
                 <div className="flex gap-4">
                   <div className="flex-1 relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-black">₹</span>
                     <input type="number" placeholder="Price" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-4 pl-10 pr-5 font-bold focus:outline-none focus:border-white/30" />
                   </div>
                   <div className="flex-1">
                     <input type="text" placeholder="Size (e.g. XL, 32)" value={newItemSize} onChange={e => setNewItemSize(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-4 px-4 font-bold focus:outline-none focus:border-white/30" />
                   </div>
                 </div>

                 <div className="border-2 border-dashed border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-white/30 group transition-colors">
                   <ImageIcon className="w-8 h-8 text-zinc-600 group-hover:text-white mb-2 transition-colors" />
                   <p className="text-xs text-zinc-500 font-bold group-hover:text-white mb-3">Upload a photo</p>
                   <input type="file" ref={addFileInputRef} accept="image/*" className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-white file:text-black hover:file:bg-zinc-200 cursor-pointer" />
                   {addUploadProgress > 0 && (
                     <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                        <motion.div animate={{ width: `${addUploadProgress}%` }} className="h-full" style={{ backgroundColor: themeColor }} />
                     </div>
                   )}
                 </div>
              </div>

              <button onClick={handleAddProduct} disabled={actionLoading} className="w-full bg-white text-black font-black py-5 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-transform disabled:opacity-50 shadow-xl">
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Save & Bind Tag'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. GENERATE TAG MODAL */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 p-8 relative">
              <button onClick={() => setIsGenerateModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
              <div className="w-16 h-16 bg-[#111] rounded-[1.2rem] flex items-center justify-center mb-6">
                <QrCode className="w-8 h-8" style={{ color: themeColor }} />
              </div>
              <h2 className="text-2xl font-black mb-2">Generate Tags</h2>
              <p className="text-zinc-500 text-sm mb-6">Kitne naye khali tags database mein create karne hain?</p>
              <div className="flex items-center gap-4 mb-8">
                 <button onClick={() => setGenerateCount(Math.max(1, generateCount - 5))} className="w-14 h-14 bg-[#111] rounded-2xl text-xl font-black">-</button>
                 <div className="flex-1 text-center text-4xl font-black">{generateCount}</div>
                 <button onClick={() => setGenerateCount(generateCount + 5)} className="w-14 h-14 bg-[#111] rounded-2xl text-xl font-black">+</button>
              </div>
              <button onClick={handleGenerateTags} disabled={actionLoading} className="w-full text-black font-black py-5 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-transform disabled:opacity-50" style={{ backgroundColor: themeColor }}>
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Generate Now'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. RANGE-BASED PRINT TAG MODAL */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="bg-[#0A0A0A] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 p-8 relative">
              <button onClick={() => setIsPrintModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
              
              <div className="w-16 h-16 bg-[#111] rounded-[1.2rem] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                <Printer className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-black mb-2 tracking-tight">Print PDF Tags</h2>
              <p className="text-zinc-500 text-sm mb-6 leading-relaxed">Kaunse tags ka PDF print karna hai? Yaha range enter karein.</p>
              
              <div className="flex items-center gap-3 mb-8">
                 <div className="flex-1 relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-[10px] uppercase tracking-widest">TAG</span>
                   <input 
                     type="number" 
                     placeholder="1" 
                     value={printStart} 
                     onChange={e => setPrintStart(Number(e.target.value) || '')} 
                     className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-center font-black focus:outline-none focus:border-white/30 transition-colors" 
                   />
                 </div>
                 <span className="text-zinc-600 font-black text-xs uppercase tracking-widest">TO</span>
                 <div className="flex-1 relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-[10px] uppercase tracking-widest">TAG</span>
                   <input 
                     type="number" 
                     placeholder="100" 
                     value={printEnd} 
                     onChange={e => setPrintEnd(Number(e.target.value) || '')} 
                     className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-center font-black focus:outline-none focus:border-white/30 transition-colors" 
                   />
                 </div>
              </div>

              <button 
                onClick={triggerPrintAction} 
                className="w-full bg-white text-black font-black py-5 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:bg-zinc-200"
              >
                <Printer className="w-5 h-5" /> Generate & Print
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. QR DOWNLOAD MODAL */}
      <AnimatePresence>
        {isQrModalOpen && selectedTagItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#111] border border-white/10 p-8 rounded-[3rem] shadow-3xl text-center relative flex flex-col items-center">
              <button onClick={() => { setIsQrModalOpen(false); setSelectedTagItem(null); }} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
              <div ref={qrRef} className="p-4 bg-white rounded-3xl mb-6 shadow-xl">
                 <QRCodeCanvas value={`${window.location.origin}/${safeStoreSlug}/${selectedTagItem.id}`} size={256} bgColor={"#ffffff"} fgColor={"#000000"} level={"H"} includeMargin={false} />
              </div>
              <span className="text-4xl font-black tracking-tighter" style={{ color: themeColor }}>{selectedTagItem.id}</span>
              <p className="text-zinc-500 text-sm mt-1 mb-6 font-bold uppercase tracking-widest">{selectedTagItem.products?.name || 'Empty Tag'}</p>
              <button onClick={handleDownloadQr} className="px-8 py-4 bg-white text-black rounded-2xl font-black flex items-center gap-2 active:scale-95 transition-all">
                <Download className="w-5 h-5" /> Download High-Res PNG
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. EDIT PRODUCT MODAL */}
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
                   <h2 className="text-2xl font-black leading-tight">Edit <span style={{ color: themeColor }}>{selectedTagItem.id}</span></h2>
                   <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">Link to {selectedTagItem.products?.name}</p>
                 </div>
              </div>
              <div className="flex flex-col gap-4 mb-8">
                 <input type="text" placeholder="Product Name" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-4 px-5 font-bold focus:outline-none focus:border-white/30" />
                 <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-black">₹</span>
                   <input type="number" placeholder="Price" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-4 pl-10 pr-5 font-bold focus:outline-none focus:border-white/30" />
                 </div>
                 <div className="border-2 border-dashed border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-white/30 group">
                   <ImageIcon className="w-8 h-8 text-zinc-600 group-hover:text-white mb-2 transition-colors" />
                   <p className="text-xs text-zinc-500 font-bold group-hover:text-white mb-3">Upload new image</p>
                   <input type="file" ref={fileInputRef} accept="image/*" className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-white file:text-black hover:file:bg-zinc-200 cursor-pointer" />
                   {uploadProgress > 0 && (
                     <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                        <motion.div animate={{ width: `${uploadProgress}%` }} className="h-full" style={{ backgroundColor: themeColor }} />
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

    </>
  );
}
