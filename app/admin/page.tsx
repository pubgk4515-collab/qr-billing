// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, QrCode, ShoppingBag, PackagePlus, Loader2, Download, X, Link, ExternalLink,
  Link2, Unlink, Edit2, UploadCloud, Activity, ActivityIcon, Lock, KeyRound, Plus, Tag, Hash,
  CheckCircle2, AlertCircle, Search, Filter, Grid, List, Banknote, Send
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getStoreData,
  addNewItem,
  generateFreeTags,
  linkTagToProduct,
  unlinkTag,
  updateProduct,
  getOrderByCartId,
  approvePayment
} from '../actions/adminActions';
import { useRouter } from 'next/navigation';


type ViewMode = 'table' | 'grid';
type FilterType = 'all' | 'free' | 'active';

export default function AdminDashboard() {
  // 🔐 Lock State
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(true);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  const CORRECT_PIN = '7788'; // MVP hardcoded PIN

  // 📦 Data & UI State
  const [data, setData] = useState<{ products: any[]; qrTags: any[] }>({ products: [], qrTags: [] });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);


  // Modal & Interaction States
  const [selectedTag, setSelectedTag] = useState<any>(null);
  const [linkingTag, setLinkingTag] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFreeTagModalOpen, setIsFreeTagModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [searchCartId, setSearchCartId] = useState('');
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);

  // Form States
  const [newItem, setNewItem] = useState({ name: '', price: '', imageUrl: '' });
  const [editItem, setEditItem] = useState({ id: '', name: '', price: '', imageUrl: '' });
  const [freeTagCount, setFreeTagCount] = useState('5');

  // Check session storage for unlock status
  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('admin_unlocked');
    if (isUnlocked === 'true') {
      setIsLocked(false);
      loadData();
    }
  }, []);

  // Load fresh data from Supabase via server action (no caching)
  async function loadData() {
    setLoading(true);
    const response = await getStoreData();
    if (response.success) {
      // Ensure we always have arrays
      setData({
        products: response.products || [],
        qrTags: response.qrTags || []
      });
    } else {
      alert('❌ Error loading data: ' + response.message);
    }
    setLoading(false);
  }

  // 🔐 PIN unlock handler
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinEntry === CORRECT_PIN) {
      sessionStorage.setItem('admin_unlocked', 'true');
      setIsLocked(false);
      loadData();
    } else {
      setPinError(true);
      setPinEntry('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  // 🖼️ Image upload (data URL)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (isEdit) setEditItem({ ...editItem, imageUrl: dataUrl });
        else setNewItem({ ...newItem, imageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  // ➕ Add product
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return alert('Product name and price are required');
    setIsSubmitting(true);
    const res = await addNewItem(newItem.name, Number(newItem.price), newItem.imageUrl);
    if (res.success) {
      setNewItem({ name: '', price: '', imageUrl: '' });
      setIsAddModalOpen(false);
      loadData();
    } else {
      alert('Error adding product: ' + res.message);
    }
    setIsSubmitting(false);
  };

  // ✏️ Edit product
  const openEditModal = (tag: any) => {
    if (tag.products) {
      setEditItem({
        id: tag.products.id,
        name: tag.products.name,
        price: tag.products.price.toString(),
        imageUrl: tag.products.image_url || ''
      });
      setIsEditModalOpen(true);
    }
  };
  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await updateProduct(editItem.id, editItem.name, Number(editItem.price), editItem.imageUrl);
    if (res.success) {
      setIsEditModalOpen(false);
      loadData();
    } else {
      alert('Error updating product: ' + res.message);
    }
    setIsSubmitting(false);
  };

  // 🏷️ Generate free tags
  const handleGenerateFreeTags = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(freeTagCount);
    if (isNaN(count) || count < 1 || count > 50) return alert('Please enter a number between 1 and 50');
    setIsSubmitting(true);
    const res = await generateFreeTags(count);
    if (res.success) {
      setIsFreeTagModalOpen(false);
      loadData();
    } else {
      alert('Error generating tags: ' + res.message);
    }
    setIsSubmitting(false);
  };

  // 🔗 Link tag to product
  const handleManualLink = async (productId: string) => {
    if (!linkingTag) return;
    setIsSubmitting(true);
    const res = await linkTagToProduct(linkingTag.id, productId);
    if (res.success) {
      setLinkingTag(null);
      loadData();
    } else {
      alert('Error linking: ' + res.message);
    }
    setIsSubmitting(false);
  };

  // 🔓 Unlink tag (make free)
  const handleUnlink = async (tagId: string) => {
    if (!confirm(`Unlink tag ${tagId}? It will become free and available for new products.`)) return;
    setIsSubmitting(true);
    const res = await unlinkTag(tagId);
    if (res.success) loadData();
    else alert('Error unlinking: ' + res.message);
    setIsSubmitting(false);
  };

  // 📥 Download QR as PNG
  const downloadQR = (tagId: string) => {
    const svg = document.getElementById(`qr-${tagId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `QR_${tagId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

    // 👇 YEH 3 NAYE FUNCTIONS PASTE KAREIN
  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCartId) return;
    setIsSearchingOrder(true);
    setFoundOrder(null);
    const res = await getOrderByCartId(searchCartId.trim());
    if (res.success && res.data) {
      setFoundOrder(res.data);
    } else {
      alert(res.message || 'Order not found');
    }
    setIsSearchingOrder(false);
  };

  const handleApprovePayment = async () => {
    if (!foundOrder) return;
    setIsSubmitting(true);
    const res = await approvePayment(foundOrder.cart_id);
    if (res.success) {
      setFoundOrder({ ...foundOrder, payment_status: 'completed' });
      loadData(); // Data refresh taaki dashboard stats update ho jayein
    } else {
      alert('Error approving payment: ' + res.message);
    }
    setIsSubmitting(false);
  };

  const dispatchManualReceipt = () => {
    if (!foundOrder) return;
    const text = encodeURIComponent(`Hello! Here is your receipt for order ${foundOrder.cart_id}.\nAmount Paid: ₹${foundOrder.total_amount}\nItems: ${foundOrder.items_count}\n\nThank you for shopping with us!`);
    window.open(`https://wa.me/91${foundOrder.customer_phone}?text=${text}`, '_blank');
  };


  // 🔍 Filter & search logic
  const filteredTags = data.qrTags.filter(tag => {
    if (filter !== 'all' && tag.status !== filter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return tag.id.toLowerCase().includes(term) ||
             (tag.products?.name?.toLowerCase().includes(term));
    }
    return true;
  });

  // 📊 Quick stats
  const totalTags = data.qrTags.length;
  const soldTags = data.qrTags.filter(t => t.status === 'active').length;
  const freeTags = data.qrTags.filter(t => t.status === 'free').length;

    // 📊 Advanced Business Analytics
  // Note: Aapke database mein 'sold' items ka status 'active' ya 'sold' dono ho sakta hai
  const soldItemsList = data.qrTags.filter(t => t.status === 'active' || t.status === 'sold');
  
  // Total Revenue: Sold items ki price ka sum
  const totalRevenue = soldItemsList.reduce((sum, tag) => sum + (tag.products?.price || 0), 0);
  
  // Average Order Value (AOV)
  const averageOrderValue = soldItemsList.length > 0 ? Math.round(totalRevenue / soldItemsList.length) : 0;
  
  // Potential Revenue (Jo samaan abhi bika nahi hai uski total value)
  const unsoldItemsList = data.qrTags.filter(t => t.products && t.status !== 'active' && t.status !== 'sold');
  const potentialRevenue = unsoldItemsList.reduce((sum, tag) => sum + (tag.products?.price || 0), 0);
  
  // Mock Scans (Isse database counter banne ke baad replace karenge)
  const mockTotalScans = soldItemsList.length * 3 + 12; // Example math for realistic UI
  const dropOffRate = mockTotalScans > 0 ? Math.round(((mockTotalScans - soldItemsList.length) / mockTotalScans) * 100) : 0;


  // 🔒 Lock screen UI
  if (isLocked) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-transparent to-emerald-500/20 blur-3xl rounded-full" />
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 shadow-lg">
                <Lock className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Restricted Area</h1>
              <p className="text-zinc-400 text-sm mt-1">Enter admin passcode</p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-5">
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  maxLength={4}
                  value={pinEntry}
                  onChange={e => setPinEntry(e.target.value)}
                  placeholder="••••"
                  className={`w-full bg-zinc-900 border ${
                    pinError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-emerald-500'
                  } rounded-2xl py-4 pl-12 pr-4 text-center text-2xl font-black tracking-[0.5em] text-white outline-none transition-all`}
                  autoFocus
                />
              </div>
              {pinError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-xs font-bold text-center"
                >
                  Access denied. Try again.
                </motion.p>
              )}
              <button
                type="submit"
                className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl mt-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                Unlock Terminal
              </button>
            </form>
          </div>
        </motion.div>
      </main>
    );
  }

  // Loading skeleton
  if (loading && data.products.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 text-sm font-mono">Loading inventory...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 text-white font-sans overflow-x-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:px-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-400 tracking-tighter">
              Control Panel
            </h1>
            <p className="text-zinc-500 text-sm mt-1 font-mono">Inventory & QR management</p>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_unlocked');
              setIsLocked(true);
            }}
            className="px-5 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-xs font-bold hover:bg-red-500/20 hover:border-red-500/50 transition-all flex items-center gap-2"
          >
            <Lock className="w-4 h-4" /> Lock Vault
          </button>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <StatCard title="Total Tags" value={totalTags} icon={<QrCode className="w-6 h-6" />} gradient="from-emerald-500/20 to-transparent" />
          <StatCard title="Sold" value={soldTags} icon={<CheckCircle2 className="w-6 h-6" />} gradient="from-blue-500/20 to-transparent" />
          <StatCard title="Free" value={freeTags} icon={<PackagePlus className="w-6 h-6" />} gradient="from-orange-500/20 to-transparent" />
        </div>

               {/* ========================================================= */}
        {/* 🏦 PRIORITY SECTION: PAYMENT COUNTER (NEW VIP LOOK) */}
        {/* ========================================================= */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-blue-500/20 to-blue-900/10 border border-blue-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl shadow-blue-900/20 backdrop-blur-md relative overflow-hidden">
            {/* Background glowing effect */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center sm:justify-start gap-3">
                <Banknote className="w-8 h-8 text-blue-400" /> Payment Counter
              </h2>
              <p className="text-zinc-400 text-sm mt-2 font-medium">Approve pending UPI payments and dispatch manual receipts instantly.</p>
            </div>
            
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="relative z-10 w-full sm:w-auto px-8 py-4 bg-blue-500 text-white rounded-2xl font-black text-lg hover:bg-blue-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center gap-3 active:scale-95"
            >
              <Search className="w-6 h-6" /> Verify New Order
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 📦 INVENTORY MANAGEMENT BAR (CLEANED UP) */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <FilterTab label="All" value="all" current={filter} onClick={() => setFilter('all')} />
            <FilterTab label="Free" value="free" current={filter} onClick={() => setFilter('free')} />
            <FilterTab label="Sold" value="active" current={filter} onClick={() => setFilter('active')} />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsFreeTagModalOpen(true)}
              className="px-5 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm font-bold text-orange-400 hover:bg-orange-500/20 transition-all flex items-center gap-2"
            >
              <PackagePlus className="w-4 h-4" /> Create Free Tags
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-500 text-black rounded-xl text-sm font-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </div>

        {/* Search & View Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by tag ID or product name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 bg-white/5 backdrop-blur-sm rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tags Display */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <table className="w-full">
              <thead className="bg-black/40 text-zinc-400 text-xs font-black uppercase tracking-wider">
                <tr>
                  <th className="p-5 text-left">Tag ID</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-left">Linked Product</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTags.map(tag => (
                  <TableRow
                    key={tag.id}
                    tag={tag}
                    onEdit={openEditModal}
                    onUnlink={handleUnlink}
                    onLink={() => setLinkingTag(tag)}
                    onViewQR={() => setSelectedTag(tag)}
                  />
                ))}
                {filteredTags.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-zinc-500">
                      No tags found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTags.map(tag => (
              <GridCard
                key={tag.id}
                tag={tag}
                onEdit={openEditModal}
                onUnlink={handleUnlink}
                onLink={() => setLinkingTag(tag)}
                onViewQR={() => setSelectedTag(tag)}
              />
            ))}
            {filteredTags.length === 0 && (
              <div className="col-span-full text-center py-20 text-zinc-500">
                No tags match your filters.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== MODALS ========== */}
      {/* 🔗 Link Product Modal */}
      <AnimatePresence>
        {linkingTag && (
          <ModalWrapper onClose={() => setLinkingTag(null)}>
            <div className="p-6">
              <h3 className="text-2xl font-black mb-2">Link {linkingTag.id}</h3>
              <p className="text-zinc-400 text-sm mb-6">Select a product to attach to this free tag.</p>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {data.products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleManualLink(p.id)}
                    className="w-full text-left p-4 rounded-2xl bg-black/30 border border-white/10 hover:border-emerald-500 flex justify-between items-center group transition-all"
                  >
                    <span className="font-bold text-white group-hover:text-emerald-400">{p.name}</span>
                    <span className="text-zinc-500">₹{p.price}</span>
                  </button>
                ))}
              </div>
            </div>
          </ModalWrapper>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOrderModalOpen && (
          <ModalWrapper onClose={() => { setIsOrderModalOpen(false); setFoundOrder(null); setSearchCartId(''); }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Banknote className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-2xl font-black">Verify Payment</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-6">Enter Cart ID to approve pending UPI transactions or send manual receipts.</p>

              <form onSubmit={handleSearchOrder} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={searchCartId}
                  onChange={e => setSearchCartId(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="e.g. CART-1234"
                  className="flex-1 bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-white font-mono uppercase outline-none focus:border-blue-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearchingOrder || !searchCartId}
                  className="bg-blue-500 text-white px-6 rounded-2xl font-bold hover:bg-blue-400 disabled:opacity-50 transition-all flex items-center justify-center shadow-lg shadow-blue-500/20"
                >
                  {isSearchingOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find'}
                </button>
              </form>

              {foundOrder && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Amount</p>
                      <p className="text-2xl font-black text-white">₹{foundOrder.total_amount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Status</p>
                      {foundOrder.payment_status === 'awaiting_approval' ? (
                        <span className="text-orange-400 font-bold bg-orange-500/10 px-3 py-1 rounded-full text-xs animate-pulse border border-orange-500/20">Pending</span>
                      ) : (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full text-xs border border-emerald-500/20">Completed</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-400 mb-1"><span className="font-bold text-white">Method:</span> {foundOrder.payment_method}</p>
                    <p className="text-sm text-zinc-400 mb-1"><span className="font-bold text-white">Phone:</span> +91 {foundOrder.customer_phone}</p>
                    <p className="text-sm text-zinc-400"><span className="font-bold text-white">Items Count:</span> {foundOrder.items_count}</p>
                  </div>

                  {foundOrder.payment_status === 'awaiting_approval' && (
                    <button
                      onClick={handleApprovePayment}
                      disabled={isSubmitting}
                      className="w-full bg-emerald-500 text-black font-black py-4 rounded-xl mt-2 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Approve Payment
                    </button>
                  )}

                  {foundOrder.payment_status === 'completed' && foundOrder.payment_method === 'OFFLINE' && (
                     <button
                       onClick={dispatchManualReceipt}
                       className="w-full bg-[#25D366] text-white font-black py-4 rounded-xl mt-2 hover:bg-[#1ebd5a] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
                     >
                       <Send className="w-5 h-5" /> Send WhatsApp Receipt
                     </button>
                  )}
                </motion.div>
              )}
            </div>
          </ModalWrapper>
        )}
      </AnimatePresence>

      {/* ➕ Add Product Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <ModalWrapper onClose={() => setIsAddModalOpen(false)}>
            <div className="p-6">
              <h3 className="text-2xl font-black mb-6">New Product</h3>
              <form onSubmit={handleAddItem} className="space-y-5">
                <ImageUpload
                  imageUrl={newItem.imageUrl}
                  onChange={e => handleImageChange(e, false)}
                  onClear={() => setNewItem({ ...newItem, imageUrl: '' })}
                />
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Product Name"
                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    value={newItem.price}
                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="Price"
                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl mt-2 hover:bg-emerald-400 transition-all flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Product'}
                </button>
              </form>
            </div>
          </ModalWrapper>
        )}
      </AnimatePresence>

      {/* ✏️ Edit Product Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <ModalWrapper onClose={() => setIsEditModalOpen(false)}>
            <div className="p-6">
              <h3 className="text-2xl font-black mb-6">Edit Product</h3>
              <form onSubmit={handleEditItem} className="space-y-5">
                <ImageUpload
                  imageUrl={editItem.imageUrl}
                  onChange={e => handleImageChange(e, true)}
                  onClear={() => setEditItem({ ...editItem, imageUrl: '' })}
                />
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={editItem.name}
                    onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    value={editItem.price}
                    onChange={e => setEditItem({ ...editItem, price: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-500 text-white font-black py-4 rounded-2xl mt-2 hover:bg-blue-400 transition-all flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Product'}
                </button>
              </form>
            </div>
          </ModalWrapper>
        )}
      </AnimatePresence>

      {/* 🏷️ Generate Free Tags Modal */}
      <AnimatePresence>
        {isFreeTagModalOpen && (
          <ModalWrapper onClose={() => setIsFreeTagModalOpen(false)}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                <PackagePlus className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-2xl font-black mb-2">Bulk Print Tags</h3>
              <p className="text-zinc-400 text-sm mb-6">Generate new free QR tags (1–50)</p>
              <form onSubmit={handleGenerateFreeTags} className="space-y-5">
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={freeTagCount}
                    onChange={e => setFreeTagCount(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-center text-2xl font-black text-white outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Generate ${freeTagCount} Tags`}
                </button>
              </form>
            </div>
          </ModalWrapper>
        )}
      </AnimatePresence>

      {/* 📥 QR Download Modal */}
      <AnimatePresence>
        {selectedTag && (
          <ModalWrapper onClose={() => setSelectedTag(null)}>
            <div className="p-6 text-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
                selectedTag.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-orange-500/10 border-orange-500/20'
              }`}>
                <QrCode className={`w-6 h-6 ${selectedTag.status === 'active' ? 'text-emerald-400' : 'text-orange-400'}`} />
              </div>
              <h3 className="text-2xl font-black">QR Asset</h3>
              <p className="text-zinc-400 text-sm mt-1 uppercase tracking-widest font-bold">Tag: {selectedTag.id}</p>
              <div className="bg-white p-6 rounded-2xl inline-block my-6 border-4 border-white/10">
                <QRCodeSVG
                  id={`qr-${selectedTag.id}`}
                  value={`${window.location.origin}/q/${selectedTag.id}`}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => downloadQR(selectedTag.id)}
                  className="w-full bg-white text-black font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"
                >
                  <Download className="w-5 h-5" /> Download Asset
                </button>
                <a
                  href={`/q/${selectedTag.id}`}
                  target="_blank"
                  className="w-full bg-white/5 border border-white/10 text-zinc-300 font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-sm"
                >
                  <ExternalLink className="w-4 h-4" /> Preview Link
                </a>
              </div>
            </div>
          </ModalWrapper>
        )}
      {/* 🚀 FLOATING ANALYTICS BUTTON (ROUTER PUSH METHOD) */}
      {!isLocked && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button 
            onClick={() => router.push('/admin/analytics')}
            className="group flex items-center gap-3 bg-white/10 backdrop-blur-2xl border border-white/20 px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:bg-white/20 hover:border-emerald-500/50 hover:shadow-emerald-500/20 transition-all active:scale-95"
          >
            <div className="bg-emerald-500 p-2 rounded-full text-black">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-white font-black tracking-widest uppercase text-sm">
              Business Stats
            </span>
          </button>
        </div>
      )}

      </AnimatePresence>
    </main>
  );
}


// ========== Reusable Components with proper types ==========
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
}
function StatCard({ title, value, icon, gradient }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 p-6 hover:scale-[1.02] transition-transform"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
      <div className="flex justify-between items-start mb-3">
        <p className="text-zinc-400 text-xs font-black uppercase tracking-wider">{title}</p>
        <div className="text-emerald-400/70">{icon}</div>
      </div>
      <p className="text-5xl font-black text-white tracking-tighter">{value}</p>
    </motion.div>
  );
}

interface FilterTabProps {
  label: string;
  value: FilterType;
  current: FilterType;
  onClick: (value: FilterType) => void;
}
function FilterTab({ label, value, current, onClick }: FilterTabProps) {
  const isActive = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
        isActive
          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
          : 'bg-white/5 text-zinc-400 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

interface TableRowProps {
  tag: any;
  onEdit: (tag: any) => void;
  onUnlink: (tagId: string) => void;
  onLink: () => void;
  onViewQR: () => void;
}
// Is component ko poora update karein
function TableRow({ tag, onEdit, onUnlink, onLink, onViewQR }: TableRowProps) {
  
  // 🔥 FIX 1: Hum status seedha Database se mangwaenge
  // (Ab isActive se decide nahi hoga ki Sold hai ya nahi)
  const isSold = tag.status === 'sold'; // If explicit status is 'sold'
  const isLinked = tag.products !== null && !isSold; // Linked and ready to sell
  const isFree = !tag.products && tag.status !== 'sold'; // Empty tag

  return (
    <tr className="hover:bg-white/5 transition-colors group">
      <td className="p-5 font-mono font-bold text-white">{tag.id}</td>
      <td className="p-5 text-center">
        {/* 🔥 FIX 2: Dynamic Badge based on real status */}
        {isSold && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-red-500/10 text-red-400 border-red-500/20">
               Sold Out
            </span>
        )}
        {isLinked && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse">
               <CheckCircle2 className="w-3 h-3" /> In Stock
            </span>
        )}
        {isFree && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-orange-500/10 text-orange-400 border-orange-500/20">
               <AlertCircle className="w-3 h-3" /> Free Tag
            </span>
        )}
      </td>
      <td className="p-5">
  <div className="flex items-center gap-3">
    {/* 🔥 Yahan && ki jagah ? aayega */}
    {tag.products?.image_url ? (
      <img src={tag.products.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
    ) : (
      <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-600">
        <ShoppingBag className='w-5 h-5'/>
      </div>
    )}
    <div>
      <p className="font-bold text-white">{tag.products?.name || '—'}</p>
      {tag.products && <p className="text-xs text-zinc-500">₹{tag.products.price}</p>}
    </div>
  </div>
</td>

      <td className="p-5 text-right">
        <div className="flex justify-end gap-2">
          {isFree ? (
            <ActionButton onClick={onLink} icon={<Link2 className="w-4 h-4" />} label="Link" color="orange" />
          ) : isSold ? (
             <span className="bg-red-500/10 text-red-400 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest border border-red-500/20">
                Item Gone
             </span>
          ) : (
            <>
              <ActionButton onClick={() => onEdit(tag)} icon={<Edit2 className="w-4 h-4" />} label="Edit" color="blue" />
              <ActionButton onClick={() => onUnlink(tag.id)} icon={<Unlink className="w-4 h-4" />} label="Unlink" color="red" />
            </>
          )}
          <ActionButton onClick={onViewQR} icon={<QrCode className="w-4 h-4" />} label="QR" color="white" />
        </div>
      </td>
    </tr>
  );
}


interface GridCardProps {
  tag: any;
  onEdit: (tag: any) => void;
  onUnlink: (tagId: string) => void;
  onLink: () => void;
  onViewQR: () => void;
}
// Is component ko bhi update karein same logic ke saath
function GridCard({ tag, onEdit, onUnlink, onLink, onViewQR }: GridCardProps) {
  // 🔥 FIX 1 (Grid): Same logic
  const isSold = tag.status === 'sold';
  const isLinked = tag.products !== null && !isSold;
  const isFree = !tag.products && tag.status !== 'sold';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-6 hover:border-emerald-500/50 transition-all shadow-xl"
    >
      <div className="flex justify-between items-start mb-3">
        <span className="font-mono font-bold text-white text-sm">{tag.id}</span>
        {/* 🔥 FIX 2 (Grid): Dynammic Badges */}
        {isSold && (
            <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              SOLD OUT
            </span>
        )}
        {isLinked && (
            <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> IN STOCK
            </span>
        )}
        {isFree && (
            <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1.5">
               <AlertCircle className="w-3.5 h-3.5" /> FREE TAG
            </span>
        )}
      </div>
      {tag.products ? (
        <div className="flex items-center gap-3 mt-4">
          {tag.products.image_url && (
            <img src={tag.products.image_url} alt="" className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
          )}
          <div>
            <p className="font-bold text-white text-lg">{tag.products.name}</p>
            <p className="text-sm text-zinc-400">₹{tag.products.price}</p>
          </div>
        </div>
      ) : (
        <div className="text-zinc-500 text-sm mt-4 italic bg-white/5 p-4 rounded-xl">No product linked</div>
      )}
      <div className="flex justify-between mt-6 pt-4 border-t border-white/5">
        <div className="flex gap-2">
          {isFree ? (
            <ActionButton onClick={onLink} icon={<Link2 className="w-4 h-4" />} label="" color="orange" small />
          ) : isSold ? (
             <span className="text-[10px] font-bold text-red-400 py-1.5">Sold item</span>
          ) : (
            <>
              <ActionButton onClick={() => onEdit(tag)} icon={<Edit2 className="w-4 h-4" />} label="" color="blue" small />
              <ActionButton onClick={() => onUnlink(tag.id)} icon={<Unlink className="w-4 h-4" />} label="" color="red" small />
            </>
          )}
        </div>
        <ActionButton onClick={onViewQR} icon={<QrCode className="w-4 h-4" />} label="" color="white" small />
      </div>
    </motion.div>
  );
}


interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  color?: 'white' | 'orange' | 'blue' | 'red';
  small?: boolean;
}
function ActionButton({ onClick, icon, label, color = 'white', small = false }: ActionButtonProps) {
  const colors: Record<string, string> = {
    white: 'bg-white/10 hover:bg-white/20 text-white',
    orange: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400',
    blue: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400',
    red: 'bg-red-500/10 hover:bg-red-500/20 text-red-400',
  };
  const colorKey = color; // already a valid key
  return (
    <button
      onClick={onClick}
      className={`p-${small ? '2' : '2.5'} rounded-xl transition-all ${colors[colorKey]} ${!label && 'w-9 h-9 flex items-center justify-center'}`}
      title={label}
    >
      {icon}
      {label && <span className="ml-1 text-xs font-bold hidden sm:inline">{label}</span>}
    </button>
  );
}

interface ModalWrapperProps {
  children: React.ReactNode;
  onClose: () => void;
}
function ModalWrapper({ children, onClose }: ModalWrapperProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-lg"
      />
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        className="relative w-full max-w-md bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

interface ImageUploadProps {
  imageUrl: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}
function ImageUpload({ imageUrl, onChange, onClear }: ImageUploadProps) {
  return (
    <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-4 text-center hover:border-emerald-500/50 transition-colors bg-black/20">
      <input type="file" accept="image/*" onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      {imageUrl ? (
        <div className="relative w-full h-32">
          <img src={imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onClear(); }}
            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-xl backdrop-blur-sm transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-zinc-500 py-4">
          <UploadCloud className="w-8 h-8 mb-2 text-zinc-600" />
          <span className="text-sm font-bold text-zinc-400">Tap to upload image</span>
        </div>
      )}
    </div>
  );
}