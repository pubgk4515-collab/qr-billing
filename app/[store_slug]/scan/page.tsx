'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, Loader2, ScanLine } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase'; 

export default function CustomerScannerPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [scanError, setScanError] = useState('');
  const [themeColor, setThemeColor] = useState('#10b981'); 
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!safeStoreSlug) return;

    const fetchStoreTheme = async () => {
      try {
        const { data: store } = await supabase
          .from('stores')
          .select('theme_color')
          .ilike('slug', safeStoreSlug)
          .single();
        if (store?.theme_color) {
          setThemeColor(store.theme_color);
        }
      } catch (err) {
        console.error("Theme fetch error:", err);
      }
    };
    fetchStoreTheme();

    scannerRef.current = new Html5Qrcode("premium-scanner-box");

    const startCamera = async () => {
      try {
        await scannerRef.current?.start(
          { facingMode: "environment" }, 
          // 🔥 THE FIX: Scanner ko sirf specific area me HD focus karne ka command
          { 
            fps: 15, 
            qrbox: { width: 250, height: 250 }, 
            disableFlip: false 
          },
          (decodedText) => {
            if (scannerRef.current?.isScanning) {
              scannerRef.current.stop().then(() => {
                const parts = decodedText.split('/');
                const extractedTagId = parts[parts.length - 1];
                router.push(`/${safeStoreSlug}/${extractedTagId}`);
              });
            }
          },
          (errorMessage) => { /* Ignore background noise */ }
        );
        setIsCameraReady(true);
      } catch (err) {
        console.error("Camera Init Error:", err);
        setScanError("Camera permission denied or device not supported.");
      }
    };

    startCamera();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [safeStoreSlug, router]);

  return (
    <main className="min-h-screen bg-black text-white relative font-sans flex flex-col overflow-hidden">
      
      {/* 👑 PREMIUM HEADER */}
      <header className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-50 pointer-events-auto">
        <button 
          onClick={() => router.back()} 
          className="w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="bg-black/40 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/10 flex items-center gap-2">
          <QrCode className="w-4 h-4" style={{ color: themeColor }} />
          <span className="text-[10px] font-black tracking-widest uppercase text-white">Scanner Active</span>
        </div>
      </header>

      {/* 📷 FULL SCREEN CAMERA FEED */}
      <div className="absolute inset-0 z-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover">
        <div id="premium-scanner-box" className="w-full h-full" />
      </div>

      {/* 🎯 THE PERFECT SQUARE CUTOUT */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none overflow-hidden">
        <div 
          className="relative w-[280px] h-[280px] rounded-[2rem] bg-transparent"
          style={{ boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.7)' }}
        >
          {/* 🎨 DYNAMIC THEME CORNER ACCENTS */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-[2rem]" style={{ borderColor: themeColor }} />
          <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-[2rem]" style={{ borderColor: themeColor }} />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-[2rem]" style={{ borderColor: themeColor }} />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-[2rem]" style={{ borderColor: themeColor }} />

          {/* 🔥 FIX: Laser Line smooth bounce animation */}
          {isCameraReady && (
            <motion.div 
              animate={{ y: [0, 280] }} 
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              className="w-[90%] h-[2px] absolute top-0 left-[5%]"
              style={{ backgroundColor: themeColor, boxShadow: `0 0 15px ${themeColor}` }}
            />
          )}

          {!isCameraReady && !scanError && (
            <div className="absolute inset-0 flex items-center justify-center">
               <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
          )}
        </div>
      </div>

      {/* 💡 BOTTOM HELPER TEXT */}
      <div className="absolute bottom-16 left-0 w-full flex flex-col items-center justify-center z-50 pointer-events-none">
        {scanError ? (
          <div className="bg-red-500/90 backdrop-blur-md px-6 py-4 rounded-2xl text-center shadow-2xl">
            <p className="font-black text-sm mb-1">Camera Access Denied</p>
            <p className="text-xs text-white/80">Please allow camera permissions.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
             <ScanLine className="w-8 h-8 text-white animate-pulse" />
             <p className="text-sm font-black tracking-widest uppercase text-white drop-shadow-xl">Point at QR Code</p>
             <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">It will add automatically</p>
          </div>
        )}
      </div>

    </main>
  );
}
