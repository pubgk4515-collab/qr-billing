'use client';

import { useState, useEffect, use, useRef, useLayoutEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Hash, Package, CheckCircle, Clock, X, ArrowLeft,
  Loader2, QrCode, Trash2, Edit2, Download, Image as ImageIcon,
  BarChart3, Settings, Printer, Moon, Sun
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

/* ── Theme helpers ── */
const THEME_KEY = 'qrebill-theme';

function getSystemTheme(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadThemeFromStorage(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light') return false;
  if (stored === 'dark') return true;
  return getSystemTheme();
}

function applyThemeClass(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export default function InventoryPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  const [isDark, setIsDark] = useState(loadThemeFromStorage);

  useLayoutEffect(() => {
    applyThemeClass(isDark);
  }, [isDark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(THEME_KEY)) setIsDark(e.matches);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  // --- STATE MANAGEMENT ---
  const [storeData, setStoreData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [themeColor, setThemeColor] = useState('#10b981');

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printStart, setPrintStart] = useState<number | ''>('');
  const [printEnd, setPrintEnd] = useState<number | ''>('');

  const [selectedTagItem, setSelectedTagItem] = useState<any>(null);
  const [bindingTagId, setBindingTagId] = useState<string | null>(null);

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemSize, setNewItemSize] = useState('');
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const [uploadProgress, setUploadProgress] = useState(0);
  const [addUploadProgress, setAddUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // --- FETCH & REFRESH ---
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
    const interval = setInterval(() => { fetchRealInventory(storeData.id, true); }, 3000);
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
    else if (error) console.error("Fetch error:", error);
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
      console.error('Upload error:', error);
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
    } catch (err) { console.error("Generate error:", err); alert("Error generating tags."); }
    finally { setActionLoading(false); }
  };

  const handleAddProduct = async () => {
    if (!newItemName || !newItemPrice || !storeData) return alert("Please fill in the details.");
    let targetTagToBind: any = null;
    if (bindingTagId) {
      targetTagToBind = inventory.find(i => i.id === bindingTagId);
    } else {
      const freeTags = inventory.filter(item => item.status === 'free');
      if (freeTags.length === 0) return alert("No free tags available!");
      freeTags.sort((a, b) => {
        const numA = parseInt(a.id.replace('TAG', ''), 10) || 0;
        const numB = parseInt(b.id.replace('TAG', ''), 10) || 0;
        return numA - numB;
      });
      targetTagToBind = freeTags;
    }
    if (!targetTagToBind) return alert("Tag not found!");
    setActionLoading(true);
    try {
      let imageUrl = null;
      const file = addFileInputRef.current?.files?.[0];
      if (file) imageUrl = await uploadImage(file, setAddUploadProgress);
      const { data: newProductData } = await supabase
        .from('products')
        .insert({ name: newItemName, price: Number(newItemPrice), store_id: storeData.id, size: newItemSize || 'Free Size', image_url: imageUrl })
        .select().single();
      await supabase.from('qr_tags')
        .update({ product_id: newProductData.id, status: 'active' })
        .eq('id', targetTagToBind.id)
        .eq('store_id', storeData.id);
      await fetchRealInventory(storeData.id, true);
      setIsAddModalOpen(false);
      setNewItemName(''); setNewItemPrice(''); setNewItemSize('');
      setAddUploadProgress(0); setBindingTagId(null);
    } catch (err) { console.error("Add error:", err); alert("Error adding product."); }
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
    } catch (error) { console.error("Edit error:", error); alert("Error editing product."); }
    finally { setActionLoading(false); setUploadProgress(0); }
  };

  const handleUnbindItem = async (tagId: string) => {
    if (!confirm("Remove this product? The tag will become free again.")) return;
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
      alert("Please enter a valid tag range.");
      return;
    }
    setIsPrintModalOpen(false);
    setTimeout(() => { window.print(); }, 500);
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

  const chunkedTags: any[][] = [];
  for (let i = 0; i < tagsToPrint.length; i += 16) {
    chunkedTags.push(tagsToPrint.slice(i, i + 16));
  }

  // ═══ REACTIVE THEME ═══
  const theme = {
    bg: isDark ? 'bg-[#000000]' : 'bg-white',
    surface: isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]',
    card: isDark ? 'bg-[#111]' : 'bg-white',
    cardAlt: isDark ? 'bg-[#0D0D0D]' : 'bg-[#F5F5F5]',
    border: isDark ? 'border-white/5' : 'border-black/5',
    borderLight: isDark ? 'border-white/10' : 'border-black/10',
    borderDashed: isDark ? 'border-white/10' : 'border-black/10',
    text: isDark ? 'text-white' : 'text-black',
    textMuted: isDark ? 'text-zinc-400' : 'text-[#555555]',
    textFaint: isDark ? 'text-zinc-600' : 'text-[#999999]',
    divider: isDark ? 'bg-white/5' : 'bg-black/5',
    input: isDark
      ? 'bg-[#111] border-white/10 focus:border-white/30'
      : 'bg-[#F2F2F7] border-black/10 focus:border-black/30',
    placeholder: isDark ? 'placeholder:text-zinc-500' : 'placeholder:text-zinc-400',
    primaryBtn: isDark
      ? 'bg-white text-black hover:bg-gray-100'
      : 'bg-black text-white hover:bg-gray-800',
    secondaryBtn: isDark
      ? 'bg-white/5 hover:bg-white/10 text-white'
      : 'bg-black/5 hover:bg-black/10 text-black',
    secondaryBtnText: isDark ? 'text-white' : 'text-black',
    nav: isDark
      ? 'bg-black/80 border-white/5 backdrop-blur-2xl'
      : 'bg-white/80 border-black/5 backdrop-blur-2xl',
  };

  const pressable = 'active:scale-95 transition-transform duration-100';
  const inputClass = `w-full py-3 px-4 text-sm font-medium rounded-xl border ${theme.input} ${theme.placeholder} transition-colors focus:outline-none`;

  if (loading) return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} />
    </div>
  );

  return (
    <>
      <div className={`min-h-screen ${theme.bg} ${theme.text} pb-24 font-sans relative print:hidden ${inter.variable}`}
        style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      >
        {/* HEADER */}
        <header className={`sticky top-0 z-30 px-6 py-3 border-b ${theme.nav}`}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/admin/${safeStoreSlug}`)}
                className={`p-2 rounded-full transition-colors ${theme.secondaryBtn}`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                >
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="font-semibold text-sm tracking-tight leading-none">Inventory</h1>
                  <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Tags & Stock</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-full transition-all duration-200 ${theme.secondaryBtn} ${pressable}`}
                aria-label="Toggle theme"
              >
                <AnimatePresence mode="wait">
                  {isDark ? (
                    <motion.div key="sun" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
                      <Sun className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <motion.div key="moon" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.2 }}>
                      <Moon className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
              <button
                onClick={() => router.push(`/admin/${safeStoreSlug}/inventory/worker-mode`)}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${theme.primaryBtn}`}
              >
                <Package className="w-3.5 h-3.5 hidden sm:block" /> Bulk Add
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10 mt-4">
          {/* STATS ROW */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Tags', value: totalTags, icon: Hash, color: '#ffffff' },
              { label: 'Active', value: activeTags, icon: CheckCircle, color: themeColor },
              { label: 'Free Tags', value: freeTagsCount, icon: Clock, color: '#f59e0b' },
            ].map((stat, idx) => (
              <div key={idx} className={`${theme.card} border ${theme.border} p-4 sm:p-5 rounded-[2.5rem] flex flex-col gap-1`}>
                <stat.icon className="w-5 h-5 mb-1" style={{ color: stat.color }} />
                <p className={`text-[9px] sm:text-[10px] uppercase font-semibold tracking-widest ${theme.textMuted}`}>{stat.label}</p>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{stat.value}</h2>
              </div>
            ))}
          </div>

          {/* QUICK ACTIONS */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className={`${theme.card} border ${theme.border} py-5 px-2 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all ${pressable} hover:border-white/20`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
                <QrCode className="w-5 h-5" style={{ color: themeColor }} />
              </div>
              <span className="text-xs font-semibold text-center leading-tight">Generate</span>
            </button>
            <button
              onClick={() => { setBindingTagId(null); setIsAddModalOpen(true); }}
              className={`py-5 px-2 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all ${pressable} ${theme.primaryBtn}`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/10">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-center leading-tight">Add Item</span>
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className={`${theme.card} border ${theme.border} py-5 px-2 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all ${pressable} hover:border-white/20`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${themeColor}10` }}>
                <Printer className="w-5 h-5" style={{ color: themeColor }} />
              </div>
              <span className="text-xs font-semibold text-center leading-tight">Print PDF</span>
            </button>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by Tag or Name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium border ${theme.input} ${theme.placeholder} focus:outline-none`}
              />
            </div>
            <div className={`flex gap-2 p-1.5 rounded-2xl border ${theme.border} overflow-x-auto`}>
              {['all', 'active', 'in_cart', 'sold', 'free'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`flex-1 min-w-[65px] py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${
                    activeFilter === f
                      ? theme.primaryBtn + ' shadow-sm'
                      : `${theme.textMuted} hover:${theme.text}`
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* INVENTORY LIST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredInventory.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className={`group relative p-5 rounded-[2.5rem] border overflow-hidden transition-all duration-300 ${
                    (item.status === 'free' || item.status === 'sold')
                      ? `border-dashed ${theme.borderDashed} bg-transparent`
                      : item.status === 'in_cart'
                      ? `border-amber-500/20 ${theme.card}`
                      : `${theme.card} ${theme.borderLight}`
                  }`}
                >
                  {/* 🖼️ THE PHYSICAL IMAGE LAYER - Full Card Width */}
                  {(item.status === 'active' || item.status === 'in_cart') ? (
                    item.products?.image_url ? (
                      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[2.5rem]">
                        
                        {/* Core Image with depth transforms & smooth hover interaction */}
                        <img
                          src={item.products.image_url}
                          alt=""
                          className="w-full h-full object-cover opacity-[0.45] group-hover:opacity-[0.50] transform scale-[1.06] translate-x-[6px] group-hover:scale-110 transition-all duration-[400ms] ease-out"
                        />

                        {/* Inner Shadow for realistic physical depth inside the card */}
                        <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.25)] pointer-events-none" />

                        {/* Text Separation Gradient (Seamless ultra-smooth blend) */}
                        <div 
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: isDark 
                              ? 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.3) 55%, transparent 75%)'
                              : 'linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 35%, rgba(255,255,255,0.3) 55%, transparent 75%)'
                          }}
                        />

                        {/* Natural Status Overlays */}
                        {item.status === 'active' && <div className="absolute inset-0 bg-emerald-500/5 mix-blend-overlay" />}
                        {item.status === 'in_cart' && <div className="absolute inset-0 bg-amber-500/[0.05] mix-blend-overlay" />}
                        
                      </div>
                    ) : (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full flex items-center justify-center opacity-5 z-0 pointer-events-none">
                        <Package className="w-16 h-16" />
                      </div>
                    )
                  ) : (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center opacity-10 z-0 pointer-events-none">
                      <QrCode className="w-8 h-8 text-white" />
                    </div>
                  )}

                  {/* 🎮 CONTENT LAYER (Locked to Z-10 to prevent unclickable buttons) */}
                  <div className="relative z-10 flex flex-col h-full">
                    {/* Top: Tag ID + Actions */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span
                          className={`text-[11px] font-semibold tracking-widest uppercase ${
                            item.status === 'active'
                              ? 'text-emerald-400'
                              : item.status === 'in_cart'
                              ? 'text-amber-400'
                              : theme.textFaint
                          }`}
                          style={item.status === 'active' ? { color: themeColor } : {}}
                        >
                          {item.id}
                        </span>
                        <h3 className="text-lg font-semibold tracking-tight mt-0.5">
                          {(item.status === 'active' || item.status === 'in_cart')
                            ? item.products?.name
                            : 'Empty Tag'}
                        </h3>
                      </div>
                      <div className="flex gap-1.5 relative z-20">
                        <button
                          onClick={() => openQrModal(item)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${pressable} ${theme.secondaryBtn} border ${theme.borderLight}`}
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {(item.status === 'active' || item.status === 'in_cart') && (
                          <>
                            <button
                              onClick={() => openEditModal(item)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${pressable} ${theme.secondaryBtn} border ${theme.borderLight}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleUnbindItem(item.id)}
                              className="w-10 h-10 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center hover:bg-red-500/20 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Price + Status / Action */}
                    <div className="flex items-center justify-between mt-auto relative z-20">
                      {(item.status === 'active' || item.status === 'in_cart') ? (
                        <>
                          <div className="text-2xl font-semibold">₹{item.products?.price}</div>
                          {item.status === 'in_cart' ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 backdrop-blur-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-400">In Bag</span>
                            </div>
                          ) : (
                            <div
                              className="text-[9px] font-semibold px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md"
                              style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                            >
                              Active
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <span className={`text-xs font-medium ${theme.textFaint}`}>Ready to bind</span>
                          <button
                            onClick={() => openAddModalForSpecificTag(item.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${pressable} ${theme.primaryBtn}`}
                          >
                            Link Item
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </main>

        {/* FLOATING BUTTONS */}
        <div className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-40 flex flex-col items-end gap-3">
          <button
            onClick={() => router.push(`/admin/${safeStoreSlug}/analytics`)}
            className="px-4 py-3 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ backgroundColor: themeColor, color: '#000' }}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:block">Analytics</span>
          </button>
          <button
            onClick={() => router.push(`/admin/${safeStoreSlug}`)}
            className={`px-4 py-3 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg border ${theme.card} ${theme.borderLight}`}
          >
            <Settings className="w-4 h-4" style={{ color: themeColor }} />
            <span className={`text-xs font-semibold hidden sm:block ${theme.textMuted}`}>Dashboard</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE SHEET */}
      <div className="hidden print:flex bg-white w-full text-black justify-center">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            html, body { height: auto !important; overflow: visible !important; margin: 0; padding: 0; }
            @page { margin: 0.2in; }
          }
        ` }} />
        <div className="w-full max-w-[8.27in]">
          {chunkedTags.map((pageTags, pageIndex) => (
            <div key={pageIndex} className="pt-2 pb-2 flex flex-wrap justify-center content-start gap-2" style={{ pageBreakAfter: 'always', breakAfter: 'page', minHeight: '100vh' }}>
              {pageTags.map((item) => (
                <div key={item.id} className="flex flex-col items-center justify-center border border-dashed border-gray-400 p-1 break-inside-avoid" style={{ width: '1.8in', height: '2.1in' }}>
                  <QRCodeCanvas value={`${window.location.origin}/${safeStoreSlug}/${item.id}`} size={130} bgColor={"#ffffff"} fgColor={"#000000"} level={"M"} includeMargin={false} />
                  <span className="mt-1.5 text-[11px] font-black tracking-widest uppercase text-black leading-none">{item.id}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={`w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto ${theme.surface} ${theme.borderLight}`}
            >
              <button onClick={() => { setIsAddModalOpen(false); setAddUploadProgress(0); }} className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-10 ${theme.secondaryBtn}`}>
                <X className="w-5 h-5" />
              </button>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${theme.card}`}>
                <Plus className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-semibold mb-1">{bindingTagId ? `Link to ${bindingTagId}` : 'Add Product'}</h2>
              <p className={`text-sm mb-6 ${theme.textMuted}`}>This product will attach to the empty tag.</p>
              <div className="flex flex-col gap-4 mb-6">
                <input type="text" placeholder="Product Name" value={newItemName} onChange={e => setNewItemName(e.target.value)} className={inputClass} />
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">₹</span>
                    <input type="number" placeholder="Price" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className={`${inputClass} pl-8`} />
                  </div>
                  <div className="flex-1">
                    <input type="text" placeholder="Size" value={newItemSize} onChange={e => setNewItemSize(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${theme.borderDashed} hover:border-white/30`}>
                  <ImageIcon className={`w-8 h-8 mb-2 ${theme.textFaint}`} />
                  <p className={`text-xs font-medium mb-3 ${theme.textMuted}`}>Upload a photo</p>
                  <input type="file" ref={addFileInputRef} accept="image/*" className={`text-xs ${theme.textMuted} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-black cursor-pointer`} />
                  {addUploadProgress > 0 && (
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                      <motion.div animate={{ width: `${addUploadProgress}%` }} className="h-full" style={{ backgroundColor: themeColor }} />
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleAddProduct} disabled={actionLoading} className={`w-full py-4 rounded-2xl font-semibold flex justify-center items-center gap-2 ${pressable} disabled:opacity-50 ${theme.primaryBtn}`}>
                {actionLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save & Bind Tag'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGenerateModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={`w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border p-6 sm:p-8 relative ${theme.surface} ${theme.borderLight}`}
            >
              <button onClick={() => setIsGenerateModalOpen(false)} className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${theme.secondaryBtn}`}>
                <X className="w-5 h-5" />
              </button>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${theme.card}`}>
                <QrCode className="w-7 h-7" style={{ color: themeColor }} />
              </div>
              <h2 className="text-2xl font-semibold mb-1">Generate Tags</h2>
              <p className={`text-sm mb-6 ${theme.textMuted}`}>How many new empty tags to create?</p>
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setGenerateCount(Math.max(1, generateCount - 5))} className={`w-14 h-14 rounded-2xl text-xl font-semibold transition-colors ${theme.secondaryBtn}`}>-</button>
                <div className="flex-1 text-center text-4xl font-semibold">{generateCount}</div>
                <button onClick={() => setGenerateCount(generateCount + 5)} className={`w-14 h-14 rounded-2xl text-xl font-semibold transition-colors ${theme.secondaryBtn}`}>+</button>
              </div>
              <button onClick={handleGenerateTags} disabled={actionLoading} className="w-full py-4 rounded-2xl font-semibold flex justify-center items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                style={{ backgroundColor: themeColor, color: '#000' }}
              >
                {actionLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Generate Now'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPrintModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={`w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border p-6 sm:p-8 relative ${theme.surface} ${theme.borderLight}`}
            >
              <button onClick={() => setIsPrintModalOpen(false)} className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${theme.secondaryBtn}`}>
                <X className="w-5 h-5" />
              </button>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${theme.card} border ${theme.borderLight}`}>
                <Printer className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-semibold mb-1">Print Tags</h2>
              <p className={`text-sm mb-6 ${theme.textMuted}`}>Enter tag range to generate PDF.</p>
              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-[10px] uppercase tracking-widest">TAG</span>
                  <input type="number" placeholder="1" value={printStart} onChange={e => setPrintStart(Number(e.target.value) || '')}
                    className={`w-full rounded-2xl py-3 pl-12 pr-4 text-center font-semibold border ${theme.input} focus:outline-none`} />
                </div>
                <span className={`text-xs font-semibold uppercase tracking-widest ${theme.textFaint}`}>TO</span>
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-[10px] uppercase tracking-widest">TAG</span>
                  <input type="number" placeholder="100" value={printEnd} onChange={e => setPrintEnd(Number(e.target.value) || '')}
                    className={`w-full rounded-2xl py-3 pl-12 pr-4 text-center font-semibold border ${theme.input} focus:outline-none`} />
                </div>
              </div>
              <button onClick={triggerPrintAction} className={`w-full py-4 rounded-2xl font-semibold flex justify-center items-center gap-2 ${pressable} ${theme.primaryBtn}`}>
                <Printer className="w-5 h-5" /> Generate & Print
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQrModalOpen && selectedTagItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className={`border p-8 rounded-[2.5rem] text-center relative flex flex-col items-center ${theme.card} ${theme.borderLight}`}
            >
              <button onClick={() => { setIsQrModalOpen(false); setSelectedTagItem(null); }} className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${theme.secondaryBtn}`}>
                <X className="w-5 h-5" />
              </button>
              <div ref={qrRef} className="p-4 bg-white rounded-3xl mb-6 shadow-lg">
                <QRCodeCanvas value={`${window.location.origin}/${safeStoreSlug}/${selectedTagItem.id}`} size={256} bgColor={"#ffffff"} fgColor={"#000000"} level={"H"} includeMargin={false} />
              </div>
              <span className="text-3xl font-semibold tracking-tight" style={{ color: themeColor }}>{selectedTagItem.id}</span>
              <p className={`text-sm mt-1 mb-6 font-medium uppercase tracking-widest ${theme.textMuted}`}>{selectedTagItem.products?.name || 'Empty Tag'}</p>
              <button onClick={handleDownloadQr} className={`px-8 py-4 rounded-2xl font-semibold flex items-center gap-2 ${pressable} ${theme.primaryBtn}`}>
                <Download className="w-5 h-5" /> Download PNG
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && selectedTagItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={`w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border p-6 sm:p-8 relative ${theme.surface} ${theme.borderLight}`}
            >
              <button onClick={() => { setIsEditModalOpen(false); setSelectedTagItem(null); setUploadProgress(0); }} className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-10 ${theme.secondaryBtn}`}>
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4 mb-6">
                {selectedTagItem.products?.image_url ? (
                  <img src={selectedTagItem.products.image_url} alt="Item" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                ) : (
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${theme.card} ${theme.borderLight}`}>
                    <ImageIcon className={`w-7 h-7 ${theme.textFaint}`} />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold leading-tight">Edit <span style={{ color: themeColor }}>{selectedTagItem.id}</span></h2>
                  <p className={`text-xs uppercase tracking-widest font-medium ${theme.textMuted}`}>{selectedTagItem.products?.name}</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 mb-6">
                <input type="text" placeholder="Product Name" value={editName} onChange={e => setEditName(e.target.value)} className={inputClass} />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">₹</span>
                  <input type="number" placeholder="Price" value={editPrice} onChange={e => setEditPrice(e.target.value)} className={`${inputClass} pl-8`} />
                </div>
                <div className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${theme.borderDashed} hover:border-white/30`}>
                  <ImageIcon className={`w-8 h-8 mb-2 ${theme.textFaint}`} />
                  <p className={`text-xs font-medium mb-3 ${theme.textMuted}`}>Upload new image</p>
                  <input type="file" ref={fileInputRef} accept="image/*" className={`text-xs ${theme.textMuted} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-black cursor-pointer`} />
                  {uploadProgress > 0 && (
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                      <motion.div animate={{ width: `${uploadProgress}%` }} className="h-full" style={{ backgroundColor: themeColor }} />
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleEditProduct} disabled={actionLoading} className={`w-full py-4 rounded-2xl font-semibold flex justify-center items-center gap-2 ${pressable} disabled:opacity-50 ${theme.primaryBtn}`}>
                {actionLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save Changes'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
