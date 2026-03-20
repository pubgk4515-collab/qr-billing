'use client';

import { useEffect, useState } from 'react';
import { getStoreData } from '../actions/adminActions';
import { LayoutDashboard, Box, QrCode, PackagePlus, Loader2, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminDashboard() {
  const [data, setData] = useState<any>({ products: [], qrTags: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<any>(null); // QR Modal ke liye

  useEffect(() => {
    async function loadData() {
      const response = await getStoreData();
      if (response.success) {
        setData({ products: response.products, qrTags: response.qrTags });
      } else {
        alert("🛑 Error: " + response.message);
      }
      setLoading(false);
    }
    loadData();
  }, []);

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
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${tagId}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) {
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
      
      {/* 🚀 Header */}
      <header className="bg-zinc-950/80 backdrop-blur-md p-6 sticky top-0 z-20 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-zinc-500" /> Control Panel
            </h1>
            <p className="text-zinc-500 font-medium mt-1">Manage your 0-Cost Empire</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 mt-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Total Products" value={data.products.length} color="text-blue-400" icon={<Box />} />
          <StatCard title="Active QRs" value={activeQRs} color="text-emerald-400" icon={<QrCode />} />
          <StatCard title="Free QRs" value={freeQRs} color="text-orange-400" icon={<PackagePlus />} />
        </div>

        {/* Inventory Table */}
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800/80 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-zinc-800">
            <h2 className="text-2xl font-black text-white tracking-tight">Inventory Status</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-500 text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-6">Tag ID</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Linked Product</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.qrTags.map((tag: any) => (
                  <tr key={tag.id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="p-6 font-bold text-white text-lg">{tag.id}</td>
                    <td className="p-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${
                        tag.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {tag.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-6 text-zinc-300 font-medium text-lg">
                      {tag.products?.name || <span className="text-zinc-700 italic">Unassigned</span>}
                    </td>
                    <td className="p-6 text-right">
                      <button 
                        onClick={() => setSelectedTag(tag)}
                        className="p-3 bg-zinc-800 hover:bg-white hover:text-black rounded-xl transition-all duration-300 shadow-sm"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 📥 QR MODAL (Symbiote Style) */}
      <AnimatePresence>
        {selectedTag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTag(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 text-center shadow-2xl"
            >
              <button onClick={() => setSelectedTag(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-black text-white tracking-tighter">QR Generator</h3>
                <p className="text-zinc-500 text-sm mt-1">Ready to print for {selectedTag.id}</p>
              </div>

              {/* THE QR CODE */}
              <div className="bg-white p-6 rounded-[2rem] inline-block mb-8 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                <QRCodeSVG 
                  id={`qr-${selectedTag.id}`}
                  value={`${window.location.origin}/q/${selectedTag.id}`} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <button 
                onClick={() => downloadQR(selectedTag.id)}
                className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-xl"
              >
                <Download className="w-5 h-5" /> Download PNG
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function StatCard({ title, value, color, icon }: any) {
  return (
    <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800/80 group">
      <div className="flex justify-between items-center mb-5">
        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">{title}</p>
        <div className="text-zinc-700 group-hover:text-white transition-colors">{icon}</div>
      </div>
      <p className={`text-6xl font-black ${color} tracking-tighter`}>{value}</p>
    </div>
  );
}