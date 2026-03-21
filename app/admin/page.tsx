'use client';

import { useEffect, useState } from 'react';
import { getStoreData, addNewItem, generateFreeTags, linkTagToProduct, unlinkTag, updateProduct } from '../actions/adminActions';
import { LayoutDashboard, Box, QrCode, PackagePlus, Loader2, Download, X, ExternalLink, Lock, KeyRound, Plus, Image as ImageIcon, Tag, Hash, Link2, Unlink, Edit2, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminDashboard() {
  const [isLocked, setIsLocked] = useState(true);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [data, setData] = useState<any>({ products: [], qrTags: [] });
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<any>(null);
  
  // Modals & Tracking States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFreeTagModalOpen, setIsFreeTagModalOpen] = useState(false);
  const [linkingTag, setLinkingTag] = useState<any>(null); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Forms States
  const [newItem, setNewItem] = useState({ name: '', price: '', imageUrl: '' });
  const [editItem, setEditItem] = useState({ id: '', name: '', price: '', imageUrl: '' });
  const [freeTagCount, setFreeTagCount] = useState('5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const CORRECT_PIN = '1234'; 

  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('admin_unlocked');
    if (isUnlocked === 'true') {
      setIsLocked(false);
      loadData();
    }
  }, []);

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

  async function loadData() {
    setLoading(true);
    const response = await getStoreData();
    if (response.success) setData({ products: response.products, qrTags: response.qrTags });
    else alert("🛑 Error: " + response.message);
    setLoading(false);
  }

  // 🖼️ IMAGE UPLOAD HANDLER
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
            setEditItem({ ...editItem, imageUrl: reader.result as string });
        } else {
            setNewItem({ ...newItem, imageUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 📦 ADD ITEM
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return alert("Naam aur Price zaroori hai!");
    setIsSubmitting(true);
    const res = await addNewItem(newItem.name, Number(newItem.price), newItem.imageUrl);
    if (res.success) {
      setNewItem({ name: '', price: '', imageUrl: '' });
      setIsAddModalOpen(false);
      loadData(); 
    } else alert("Error adding item: " + res.message);
    setIsSubmitting(false);
  };

  // ✏️ EDIT ITEM
  const openEditModal = (tag: any) => {
      if(tag.products) {
          setEditItem({
              id: tag.products.id,
              name: tag.products.name,
              price: tag.products.price.toString(),
              imageUrl: tag.products.image_url || ''
          });
          setIsEditModalOpen(true);
      }
  }

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await updateProduct(editItem.id, editItem.name, Number(editItem.price), editItem.imageUrl);
    if(res.success){
        setIsEditModalOpen(false);
        loadData();
    } else alert("Error updating: " + res.message);
    setIsSubmitting(false);
  }

  // 🏷️ FREE TAGS
  const handleGenerateFreeTags = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(freeTagCount);
    if (isNaN(count) || count < 1 || count > 50) return alert("1 se 50 ke beech number daalein");
    setIsSubmitting(true);
    const res = await generateFreeTags(count);
    if (res.success) {
      setIsFreeTagModalOpen(false);
      loadData();
    } else alert("Error: " + res.message);
    setIsSubmitting(false);
  };

  // 🔗 MANUAL LINK / UNLINK
  const handleManualLink = async (productId: string) => {
    if(!linkingTag) return;
    setIsSubmitting(true);
    const res = await linkTagToProduct(linkingTag.id, productId);
    if(res.success){
        setLinkingTag(null);
        loadData();
    } else alert("Error linking: " + res.message);
    setIsSubmitting(false);
  }

  const handleUnlink = async (tagId: string) => {
    if(confirm(`Kya aap sach mein ${tagId} ko free karna chahte hain?`)){
        setIsSubmitting(true);
        const res = await unlinkTag(tagId);
        if(res.success) loadData();
        else alert("Error unlinking: " + res.message);
        setIsSubmitting(false);
    }
  }

  const downloadQR = (tagId: string) => {
    const svg = document.getElementById(`qr-${tagId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `QR_${tagId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (isLocked) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white selection:bg-zinc-800">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-900 border border-zinc-800 p-8 md:p-12 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/20 blur-[60px] rounded-full -z-10" />
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <Lock className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">Restricted Area</h1>
            <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Enter Admin Passcode</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              <input 
  type="password" 
  maxLength={4} 
  value={pinEntry} 
  onChange={(e) => setPinEntry(e.target.value)} 
  placeholder="••••" 
  className={`w-full bg-zinc-950 border ${pinError ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-emerald-500'} rounded-2xl py-4 pl-12 pr-4 text-center text-2xl font-black tracking-[0.5em] text-white outline-none transition-all`} 
  autoFocus 
  suppressHydrationWarning 
/>
            </div>
            {pinError && <p className="text-red-400 text-xs font-bold text-center animate-pulse">Access Denied.</p>}
            <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-2xl mt-4 hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]">Unlock Terminal</button>
          </form>
        </motion.div>
      </main>
    );
  }

  if (loading && data.products.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-600">
        <Loader2 className="animate-spin w-10 h-10 mb-4" />
        <p className="font-medium tracking-widest uppercase text-xs">Accessing Mission Control...</p>
      </div>
    );
  }

  const activeQRs = data.qrTags.filter((tag: any) => tag.status === 'active').length;
  const freeQRs = data.qrTags.filter((tag: any) => tag.status === 'free').length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 font-sans selection:bg-zinc-800">
      
      <header className="bg-zinc-950/80 backdrop-blur-md p-6 sticky top-0 z-20 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-zinc-500" /> Control Panel
            </h1>
          </div>
          <button onClick={() => { sessionStorage.removeItem('admin_unlocked'); setIsLocked(true); }} className="text-xs font-bold bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full hover:text-red-400 hover:border-red-900 transition-colors">
            Lock Vault
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 mt-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Total Products" value={data.products.length} color="text-blue-400" icon={<Box />} />
          <StatCard title="Active QRs" value={activeQRs} color="text-emerald-400" icon={<QrCode />} />
          <StatCard title="Free QRs" value={freeQRs} color="text-orange-400" icon={<PackagePlus />} />
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-zinc-800/80 shadow-2xl overflow-hidden">
          <div className="p-6 md:p-8 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl font-black text-white tracking-tight">Inventory Status</h2>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => setIsFreeTagModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors border border-zinc-700 text-sm">
                <PackagePlus className="w-4 h-4" /> Create Free Tags
              </button>

              <button onClick={() => setIsAddModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-2.5 rounded-xl font-black transition-colors shadow-lg shadow-emerald-500/20 text-sm">
                <Plus className="w-5 h-5" /> Add Product
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black">
                <tr>
                  <th className="p-6">Tag ID</th>
                  <th className="p-6 text-center">Status</th>
                  <th className="p-6">Linked Product</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.qrTags.map((tag: any) => (
                  <tr key={tag.id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="p-6 font-bold text-white text-lg tracking-tight">{tag.id}</td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${
                        tag.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      }`}>{tag.status.toUpperCase()}</span>
                    </td>
                    <td className="p-6 flex items-center gap-3 text-zinc-300 font-medium text-lg">
                      {tag.products?.image_url && <img src={tag.products.image_url} alt="img" className="w-10 h-10 object-cover rounded-lg border border-zinc-700" />}
                      {tag.products?.name || <span className="text-zinc-600 italic text-sm">Waiting for product...</span>}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end items-center gap-2">
                          {tag.status === 'free' ? (
                              <button onClick={() => setLinkingTag(tag)} className="p-3 bg-zinc-800 text-orange-400 hover:bg-orange-500 hover:text-white rounded-xl transition-all duration-300 shadow-sm border border-zinc-700" title="Link to Product">
                                  <Link2 className="w-4 h-4" />
                              </button>
                          ) : (
                              <>
                                  <button onClick={() => openEditModal(tag)} className="p-3 bg-zinc-800 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all duration-300 shadow-sm border border-zinc-700" title="Edit Product">
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleUnlink(tag.id)} className="p-3 bg-zinc-800 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 shadow-sm border border-zinc-700" title="Unlink (Make Free)">
                                      <Unlink className="w-4 h-4" />
                                  </button>
                              </>
                          )}

                          <button onClick={() => setSelectedTag(tag)} className="p-3 bg-zinc-800 hover:bg-white hover:text-zinc-950 text-white rounded-xl transition-all duration-300 shadow-sm border border-zinc-700 hover:border-white">
                            <QrCode className="w-4 h-4" />
                          </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 🔗 LINKING MODAL */}
      <AnimatePresence>
          {linkingTag && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLinkingTag(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                 <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 relative z-10 shadow-2xl">
                    <button onClick={() => setLinkingTag(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
                    <h3 className="text-2xl font-black text-white mb-2">Link {linkingTag.id}</h3>
                    <p className="text-zinc-400 text-sm mb-6">Select a product to attach to this free tag.</p>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {data.products.map((p:any) => (
                            <button key={p.id} onClick={() => handleManualLink(p.id)} className="w-full text-left p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500 flex justify-between items-center group transition-colors">
                                <span className="font-bold text-white group-hover:text-emerald-400">{p.name}</span>
                                <span className="text-zinc-500 font-medium">₹{p.price}</span>
                            </button>
                        ))}
                    </div>
                 </motion.div>
             </div> 
          )}
      </AnimatePresence>

      {/* ➕ ADD NEW PRODUCT MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
              
              <div className="mb-6">
                <h3 className="text-3xl font-black text-white tracking-tighter">New Product</h3>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                
                {/* Image Upload Area */}
                <div>
                  <div className={`relative border-2 border-dashed ${newItem.imageUrl ? 'border-emerald-500/50' : 'border-zinc-800'} rounded-2xl p-4 text-center hover:border-emerald-500 transition-colors flex flex-col items-center justify-center overflow-hidden min-h-[120px] bg-zinc-950`}>
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, false)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    {newItem.imageUrl ? (
  <div className="relative w-full h-32 group">
     <img src={newItem.imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
     <button 
        type="button" 
        onClick={(e) => { e.preventDefault(); setNewItem({...newItem, imageUrl: ''}); }} 
        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-xl backdrop-blur-sm transition-all"
     >
        <X className="w-4 h-4"/>
     </button>
  </div>
) : (
                      <div className="flex flex-col items-center text-zinc-500"><UploadCloud className="w-8 h-8 mb-2 text-zinc-600" /><span className="text-sm font-bold text-zinc-400">Tap to upload image</span></div>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  <input type="text" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Product Name" className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none transition-all" />
                </div>

                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">₹</span>
                  <input type="number" required value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="Price" className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none transition-all" />
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-500 text-zinc-950 font-black py-4 rounded-2xl mt-2 hover:bg-emerald-400 transition-colors flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save & Tag'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
              
              <div className="mb-6">
                <h3 className="text-3xl font-black text-white tracking-tighter">Edit Product</h3>
              </div>

              <form onSubmit={handleEditItem} className="space-y-4">
                
                {/* Image Upload Area */}
                <div>
                  <div className={`relative border-2 border-dashed ${editItem.imageUrl ? 'border-blue-500/50' : 'border-zinc-800'} rounded-2xl p-4 text-center hover:border-blue-500 transition-colors flex flex-col items-center justify-center overflow-hidden min-h-[120px] bg-zinc-950`}>
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, true)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    {editItem.imageUrl ? (
                      <div className="relative w-full h-32"><img src={editItem.imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain rounded-lg" /></div>
                    ) : (
                      <div className="flex flex-col items-center text-zinc-500"><UploadCloud className="w-8 h-8 mb-2 text-zinc-600" /><span className="text-sm font-bold text-zinc-400">Tap to update image</span></div>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  <input type="text" required value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none transition-all" />
                </div>

                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">₹</span>
                  <input type="number" required value={editItem.price} onChange={e => setEditItem({...editItem, price: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none transition-all" />
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full bg-blue-500 text-white font-black py-4 rounded-2xl mt-2 hover:bg-blue-400 transition-colors flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Product'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🏷️ GENERATE FREE TAGS MODAL */}
      <AnimatePresence>
        {isFreeTagModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFreeTagModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-zinc-900 border border-orange-500/30 w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl">
              <button onClick={() => setIsFreeTagModalOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
              
              <div className="mb-8">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4 border border-orange-500/20">
                  <PackagePlus className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter">Bulk Print Tags</h3>
              </div>

              <form onSubmit={handleGenerateFreeTags} className="space-y-5">
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  <input type="number" min="1" max="50" required value={freeTagCount} onChange={e => setFreeTagCount(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl py-4 pl-12 pr-4 text-white font-black text-xl outline-none transition-all text-center" />
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-colors shadow-xl flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Generate ${freeTagCount} Tags`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📥 QR DOWNLOAD MODAL */}
      <AnimatePresence>
        {selectedTag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTag(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 text-center shadow-2xl">
              <button onClick={() => setSelectedTag(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
              <div className="mb-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${selectedTag.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                    <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter">QR Asset</h3>
                <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">Tag: {selectedTag.id}</p>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] inline-block mb-8 border-4 border-zinc-800">
                <QRCodeSVG id={`qr-${selectedTag.id}`} value={`${window.location.origin}/q/${selectedTag.id}`} size={180} level="H" includeMargin={false} />
              </div>
              <div className="space-y-3">
                <button onClick={() => downloadQR(selectedTag.id)} className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-xl"><Download className="w-5 h-5" /> Download Asset</button>
                <a href={`/q/${selectedTag.id}`} target="_blank" className="w-full bg-zinc-800 text-zinc-400 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all text-sm"><ExternalLink className="w-4 h-4" /> Preview Link</a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function StatCard({ title, value, color, icon }: any) {
  return (
    <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800/80 group hover:border-zinc-700 transition-all duration-500">
      <div className="flex justify-between items-center mb-5">
        <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em]">{title}</p>
        <div className="text-zinc-800 group-hover:text-zinc-400 transition-colors duration-500">{icon}</div>
      </div>
      <p className={`text-6xl font-black ${color} tracking-tighter`}>{value}</p>
    </div>
  );
}