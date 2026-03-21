'use client';

import { useEffect, useState } from 'react';
import { getStoreData, addNewItem, generateFreeTags, linkTagToProduct, unlinkTag } from '../actions/adminActions';
import { LayoutDashboard, Box, QrCode, PackagePlus, Loader2, Download, X, ExternalLink, Lock, KeyRound, Plus, Image as ImageIcon, Tag, Hash, Link2, Unlink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminDashboard() {
  const [isLocked, setIsLocked] = useState(true);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [data, setData] = useState<any>({ products: [], qrTags: [] });
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [selectedTagForQR, setSelectedTagForQR] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFreeTagModalOpen, setIsFreeTagModalOpen] = useState(false);
  const [linkingTag, setLinkingTag] = useState<any>(null); // Jis tag ko manual link karna hai
  
  // Forms
  const [newItem, setNewItem] = useState({ name: '', price: '', imageUrl: '' });
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
    if (response.success) {
      setData({ products: response.products, qrTags: response.qrTags });
    } else {
      alert("🛑 Error: " + response.message);
    }
    setLoading(false);
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return alert("Naam aur Price zaroori hai!");
    setIsSubmitting(true);
    const res = await addNewItem(newItem.name, Number(newItem.price), newItem.imageUrl);
    if (res.success) {
      setNewItem({ name: '', price: '', imageUrl: '' });
      setIsAddModalOpen(false);
      loadData(); 
    } else alert("Error: " + res.message);
    setIsSubmitting(false);
  };

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

  // ✨ Manual Linking
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

  // ✨ Unlink (Make Free)
  const handleUnlink = async (tagId: string) => {
      if(confirm(`Kya aap sach mein ${tagId} ko free karna chahte hain? Iska link toot jayega.`)){
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
      link.download = `${tagId}.png`;
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
            <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><Lock className="w-8 h-8 text-emerald-400" /></div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">Restricted Area</h1>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              <input type="password" maxLength={4} value={pinEntry} onChange={(e) => setPinEntry(e.target.value)} placeholder="••••" className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-2xl py-4 pl-12 text-center text-2xl font-black tracking-[0.5em] text-white outline-none" autoFocus />
            </div>
            {pinError && <p className="text-red-400 text-xs font-bold text-center animate-pulse">Access Denied.</p>}
            <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-2xl mt-4 hover:bg-zinc-200 transition-colors">Unlock Terminal</button>
          </form>
        </motion.div>
      </main>
    );
  }

  if (loading && data.products.length === 0) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600"><Loader2 className="animate-spin w-10 h-10" /></div>;

  const activeQRs = data.qrTags.filter((t: any) => t.status === 'active').length;
  const freeQRs = data.qrTags.filter((t: any) => t.status === 'free').length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 font-sans">
      <header className="bg-zinc-950/80 backdrop-blur-md p-6 sticky top-0 z-20 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-black text-white flex items-center gap-2"><LayoutDashboard className="w-6 h-6 text-zinc-500" /> Dashboard</h1>
          <button onClick={() => { sessionStorage.removeItem('admin_unlocked'); setIsLocked(true); }} className="text-xs bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full hover:text-red-400">Lock</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Products" value={data.products.length} color="text-blue-400" />
          <StatCard title="Active QRs" value={activeQRs} color="text-emerald-400" />
          <StatCard title="Free QRs" value={freeQRs} color="text-orange-400" />
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-zinc-800/80 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-black text-white">Inventory Status</h2>
            <div className="flex gap-2">
              <button onClick={() => setIsFreeTagModalOpen(true)} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-bold border border-zinc-700"><PackagePlus className="w-4 h-4"/> Free Tags</button>
              <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-emerald-500 text-black px-4 py-2 rounded-xl text-sm font-black"><Plus className="w-4 h-4"/> Add Item</button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-widest font-black">
                <tr>
                  <th className="p-4">Tag ID</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Linked Product</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.qrTags.map((tag: any) => (
                  <tr key={tag.id} className="hover:bg-zinc-800/40">
                    <td className="p-4 font-bold text-white">{tag.id}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${tag.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{tag.status.toUpperCase()}</span>
                    </td>
                    <td className="p-4 text-zinc-300 font-medium">
                      {tag.products?.name || <span className="text-zinc-600 italic text-sm">Empty</span>}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      
                      {/* ✨ EDIT/LINK BUTTON */}
                      {tag.status === 'free' ? (
                          <button onClick={() => setLinkingTag(tag)} className="p-2 bg-zinc-800 text-orange-400 hover:bg-orange-500 hover:text-white rounded-lg transition-colors border border-zinc-700 tooltip" title="Link to Product">
                              <Link2 className="w-4 h-4" />
                          </button>
                      ) : (
                          <button onClick={() => handleUnlink(tag.id)} className="p-2 bg-zinc-800 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-zinc-700" title="Unlink (Make Free)">
                              <Unlink className="w-4 h-4" />
                          </button>
                      )}

                      {/* QR BUTTON */}
                      <button onClick={() => setSelectedTagForQR(tag)} className="p-2 bg-zinc-800 hover:bg-white text-white hover:text-black rounded-lg transition-colors border border-zinc-700">
                        <QrCode className="w-4 h-4" />
                      </button>
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
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setLinkingTag(null)}></div>
                 <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2rem] p-8 relative z-10 shadow-2xl">
                    <h3 className="text-2xl font-black mb-4">Link {linkingTag.id}</h3>
                    <p className="text-zinc-400 text-sm mb-6">Select a product to attach to this free tag.</p>
                    
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {data.products.map((p:any) => (
                            <button 
                                key={p.id} 
                                onClick={() => handleManualLink(p.id)}
                                className="w-full text-left p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500 transition-colors flex justify-between items-center group"
                            >
                                <span className="font-bold text-white group-hover:text-emerald-400">{p.name}</span>
                                <span className="text-zinc-500 text-sm">₹{p.price}</span>
                            </button>
                        ))}
                    </div>
                 </div>
             </div> 
          )}
      </AnimatePresence>

      {/* ADD/FREE/QR Modals remaining exactly same logic, just keeping code clean... */}
      {/* ➕ ADD MODAL */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 relative shadow-2xl">
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 text-zinc-500"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-white mb-6">New Product</h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                <input type="text" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Product Name" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white" />
                <input type="number" required value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="Price ₹" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white" />
                <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-500 text-black font-black p-4 rounded-xl">Save Item</button>
              </form>
            </div>
          </div>
      )}

      {/* 🏷️ FREE TAG MODAL */}
      {isFreeTagModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
             <div className="bg-zinc-900 border border-orange-500/30 w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl text-center">
              <button onClick={() => setIsFreeTagModalOpen(false)} className="absolute top-6 right-6 text-zinc-500"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-white mb-6">Create Blank Tags</h3>
              <form onSubmit={handleGenerateFreeTags} className="space-y-4">
                <input type="number" min="1" max="50" value={freeTagCount} onChange={e => setFreeTagCount(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center text-xl font-bold text-white" />
                <button disabled={isSubmitting} type="submit" className="w-full bg-white text-black font-black p-4 rounded-xl">Generate</button>
              </form>
            </div>
          </div>
      )}

      {/* 📥 QR DOWNLOAD MODAL */}
      {selectedTagForQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-8 relative text-center">
              <button onClick={() => setSelectedTagForQR(null)} className="absolute top-6 right-6 text-zinc-500"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-white mb-2">QR Asset</h3>
              <p className="text-zinc-500 mb-6">{selectedTagForQR.id}</p>
              <div className="bg-white p-4 rounded-3xl inline-block mb-6">
                <QRCodeSVG id={`qr-${selectedTagForQR.id}`} value={`${window.location.origin}/q/${selectedTagForQR.id}`} size={180} level="H" includeMargin={false} />
              </div>
              <button onClick={() => downloadQR(selectedTagForQR.id)} className="w-full bg-white text-black font-black p-4 rounded-xl mb-3 flex justify-center items-center gap-2"><Download className="w-4 h-4"/> Download PNG</button>
              <a href={`/q/${selectedTagForQR.id}`} target="_blank" className="block w-full bg-zinc-800 text-zinc-400 font-bold p-3 rounded-xl">Preview Link</a>
            </div>
          </div>
      )}

    </main>
  );
}

function StatCard({ title, value, color }: any) {
  return (
    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800/80">
      <p className="text-zinc-500 font-bold text-xs uppercase mb-2">{title}</p>
      <p className={`text-5xl font-black ${color}`}>{value}</p>
    </div>
  );
}