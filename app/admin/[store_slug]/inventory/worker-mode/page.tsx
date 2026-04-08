'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, Camera, Image as ImageIcon, Plus, 
  Loader2, X, CheckCircle2, ArrowLeft, Package,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function WorkerModePage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  // --- STATE MANAGEMENT ---
  const [storeData, setStoreData] = useState<any>(null);
  const [themeColor, setThemeColor] = useState('#10b981');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form States
  const [tagId, setTagId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  // 🔥 FIX: Removed 'Free Size' prefill, now it's completely empty
  const [itemSize, setItemSize] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // The "Magic" Freeze Toggle
  const [isFrozen, setIsFrozen] = useState(false);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);

  // Hidden Input Refs for Native Camera/Gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!safeStoreSlug) return;
    async function fetchStore() {
      try {
        const { data: store } = await supabase.from('stores').select('*').ilike('slug', safeStoreSlug).single();
        if (store) {
          setStoreData(store);
          setThemeColor(store.theme_color || '#10b981');
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    fetchStore();
  }, [safeStoreSlug]);

  // --- QR SCANNER LOGIC ---
  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    if (isScannerOpen) {
      setTimeout(() => {
        html5QrCode = new Html5Qrcode("worker-reader");
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 }, disableFlip: false },
          (decodedText) => {
            const scannedTag = decodeURIComponent(decodedText.split('/').pop() || '').toUpperCase().trim();
            if (scannedTag) {
              setTagId(scannedTag);
              html5QrCode.stop().then(() => setIsScannerOpen(false));
            }
          },
          () => {}
        ).catch(console.error);
      }, 100);
    }
    return () => { if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(console.error); };
  }, [isScannerOpen]);

  // --- IMAGE SELECTION LOGIC ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    setIsImageMenuOpen(false); 
  };

  const uploadImageToSupabase = async (file: File) => {
    if (!storeData) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${safeStoreSlug}_worker_${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Upload Error:', error);
      return null;
    }
  };

  // --- THE MAIN ADD LOOP ---
  const handleAddItem = async () => {
    if (!tagId) return alert("Please scan a QR Tag first!");
    if (!itemName || !itemPrice) return alert("Please fill Item Name and Price!");
    
    setActionLoading(true);
    
    try {
      // 1. Check if Tag is genuinely FREE
      const { data: tagData, error: tagError } = await supabase
        .from('qr_tags')
        .select('id, status')
        .eq('id', tagId)
        .eq('store_id', storeData.id)
        .single();

      if (tagError || !tagData) {
        alert("Invalid Tag! This tag does not exist in your database.");
        setActionLoading(false);
        return;
      }

      if (tagData.status !== 'free') {
        alert(`STOP! Tag ${tagId} is already used. Please use a fresh tag.`);
        setTagId(''); 
        setActionLoading(false);
        return;
      }

      // 2. Upload Image if exists
      let finalImageUrl = null;
      if (imageFile) {
        finalImageUrl = await uploadImageToSupabase(imageFile);
      } else if (imagePreview && imagePreview.startsWith('http')) {
         finalImageUrl = imagePreview;
      }

      // 3. Insert Product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({ 
          name: itemName, 
          price: Number(itemPrice), 
          // Size ab jo type karenge wahi jayega, warna empty jayega
          size: itemSize,
          store_id: storeData.id, 
          image_url: finalImageUrl 
        })
        .select().single();

      if (productError) throw productError;

      // 4. Bind Tag
      await supabase.from('qr_tags')
        .update({ product_id: newProduct.id, status: 'active' })
        .eq('id', tagId)
        .eq('store_id', storeData.id);

      // SUCCESS! Show green popup temporarily
      setSuccessMessage(`Success! Added ${tagId}`);
      setTimeout(() => setSuccessMessage(''), 2000);

      // 5. THE FREEZE LOGIC (Resetting for next loop)
      setTagId(''); 
      if (!isFrozen) {
        setItemName('');
        setItemPrice('');
        setItemSize(''); // 🔥 FIX: Resetting to empty instead of 'Free Size'
        setImageFile(null);
        setImagePreview(null);
      } else {
        if (finalImageUrl && imageFile) {
           setImagePreview(finalImageUrl);
           setImageFile(null); 
        }
      }

    } catch (err) {
      console.error(err);
      alert("Network Error! Failed to add item.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24 relative selection:bg-white/10">
      
      {/* CSS hack to make the nostalgic camera look slightly better */}
      <style dangerouslySetInnerHTML={{__html: `
        #worker-reader video { object-fit: cover !important; border-radius: 1.5rem; }
      `}} />

      {/* 👑 HEADER */}
      <header className="bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-300" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none text-white">Worker Mode</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold mt-1 text-zinc-500">Bulk Add Terminal</p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: themeColor }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} /> LIVE
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-6 flex flex-col gap-6">

        {/* 1. SCANNED TAG INDICATOR */}
        {tagId ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#111] border border-emerald-500/30 p-4 rounded-[1.5rem] flex items-center justify-between shadow-[0_0_30px_rgba(16,185,129,0.1)]">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                 <CheckCircle2 className="w-6 h-6 text-emerald-500" />
               </div>
               <div>
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Scanned Tag</p>
                 <p className="text-2xl font-black text-emerald-400 tracking-widest">{tagId}</p>
               </div>
             </div>
             <button onClick={() => setTagId('')} className="p-3 bg-white/5 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-colors">
               <X className="w-5 h-5" />
             </button>
          </motion.div>
        ) : (
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="w-full bg-[#111] border-2 border-dashed border-white/20 p-8 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:border-white/40 hover:bg-white/5 active:scale-95 transition-all group"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/5 group-hover:scale-110 transition-transform">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <div>
               <p className="text-lg font-black text-white">Scan QR Tag</p>
               <p className="text-xs text-zinc-500 font-bold mt-1">Tap to open camera</p>
            </div>
          </button>
        )}

        {/* 2. IMAGE UPLOAD SECTION */}
        <div className="relative">
          {imagePreview ? (
            <div className="relative w-full h-48 bg-[#111] rounded-[1.5rem] border border-white/10 overflow-hidden group">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-80" />
              <button onClick={() => { setImagePreview(null); setImageFile(null); }} className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsImageMenuOpen(true)}
              className="w-full bg-[#0A0A0A] border border-white/10 py-5 rounded-[1.5rem] flex items-center justify-center gap-3 text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all shadow-inner"
            >
              <Camera className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-widest">Add Photo</span>
            </button>
          )}

          {/* Hidden Native Inputs */}
          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleImageSelect} />
          <input type="file" accept="image/*" ref={galleryInputRef} className="hidden" onChange={handleImageSelect} />
        </div>

        {/* 3. FORM FIELDS */}
        <div className="flex flex-col gap-4 bg-[#0A0A0A] p-5 rounded-[2rem] border border-white/5 shadow-xl">
          <div>
            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-4 mb-2 block">Item Name</label>
            <input type="text" placeholder="e.g. Black Denim Jacket" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 px-5 text-sm font-bold focus:outline-none focus:border-white/30 text-white placeholder:text-zinc-700" />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-4 mb-2 block">Price</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-black">₹</span>
                <input type="number" placeholder="0" value={itemPrice} onChange={e => setItemPrice(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-9 pr-4 text-sm font-black focus:outline-none focus:border-white/30 text-white placeholder:text-zinc-700" />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-4 mb-2 block">Size</label>
              <input type="text" placeholder="e.g. L, XL, 32" value={itemSize} onChange={e => setItemSize(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold focus:outline-none focus:border-white/30 text-white placeholder:text-zinc-700" />
            </div>
          </div>
        </div>

        {/* 4. THE FREEZE TOGGLE */}
        <div className="bg-[#111] border border-white/10 p-5 rounded-[1.5rem] flex items-center justify-between cursor-pointer" onClick={() => setIsFrozen(!isFrozen)}>
          <div>
            <p className="font-black text-white text-sm">Freeze Details</p>
            <p className="text-[10px] text-zinc-500 font-bold tracking-wide mt-0.5">Keep photo, name & price for next scan</p>
          </div>
          {isFrozen ? <ToggleRight className="w-8 h-8" style={{ color: themeColor }} /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
        </div>

        {/* 5. MAIN ADD BUTTON */}
        <button 
          onClick={handleAddItem} 
          disabled={actionLoading || !tagId}
          className="w-full py-5 rounded-[1.5rem] font-black text-black text-lg shadow-[0_10px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center gap-2 mt-4"
          style={{ backgroundColor: themeColor }}
        >
          {actionLoading ? (
            <Loader2 className="animate-spin w-6 h-6" />
          ) : (
            <span className="flex items-center gap-2"><Package className="w-6 h-6" /> Add to Inventory</span>
          )}
        </button>

      </main>

      {/* --- SUCCESS TOAST OVERLAY --- */}
      <AnimatePresence>
        {successMessage && (
          <motion.div key="success-toast" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 shadow-2xl z-50 whitespace-nowrap">
            <CheckCircle2 className="w-5 h-5" /> {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- NATIVE IMAGE CHOICE MODAL --- */}
      <AnimatePresence>
        {isImageMenuOpen && (
          <motion.div key="image-modal" className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsImageMenuOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="relative w-full sm:max-w-md z-50 bg-[#111] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 border border-white/10">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              <h3 className="text-xl font-black mb-6 px-2 text-white">Upload Photo</h3>
              
              <div className="flex flex-col gap-3">
                <button onClick={() => cameraInputRef.current?.click()} className="w-full p-4 bg-[#1A1A1A] hover:bg-white/5 rounded-2xl flex items-center gap-4 transition-colors">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center"><Camera className="w-5 h-5 text-white" /></div>
                  <div className="text-left"><p className="font-bold text-white text-lg">Take Photo</p><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Use device camera</p></div>
                </button>
                
                <button onClick={() => galleryInputRef.current?.click()} className="w-full p-4 bg-[#1A1A1A] hover:bg-white/5 rounded-2xl flex items-center gap-4 transition-colors">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-white" /></div>
                  <div className="text-left"><p className="font-bold text-white text-lg">Choose from Gallery</p><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Select existing photo</p></div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- QR SCANNER MODAL --- */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div key="scanner-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm aspect-square rounded-[2rem] overflow-hidden border-2 border-dashed border-white/20 relative">
              <div id="worker-reader" className="w-full h-full bg-[#111]"></div>
              <div className="absolute inset-10 border-2 border-white/10 rounded-2xl pointer-events-none animate-pulse"></div>
            </div>
            <p className="mt-8 text-zinc-400 font-mono text-xs tracking-widest uppercase">Align QR Code inside the frame</p>
            <button onClick={() => setIsScannerOpen(false)} className="mt-12 px-8 py-4 bg-white/10 rounded-full text-white font-black tracking-widest uppercase text-xs flex items-center gap-2 active:scale-95 transition-all">
              <X className="w-4 h-4" /> Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
