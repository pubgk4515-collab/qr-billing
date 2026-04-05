'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, Loader2, ScanLine } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CustomerScannerPage({ params }: { params: Promise<{ store_slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { store_slug } = resolvedParams;
  const safeStoreSlug = decodeURIComponent(store_slug || '').toLowerCase().trim();

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!safeStoreSlug) return;

    // Initialize Scanner
    scannerRef.current = new Html5Qrcode("premium-scanner-box");

    const startCamera = async () => {
      try {
        await scannerRef.current?.start(
          { facingMode: "environment" }, 
          {
            fps: 15, 
            // 🔥 THE FIX: 'qrbox' hata diya taaki library apna kachra UI na dale
            // Ab ye pure screen se scan karega, par hamara frame user ko guide karega
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
    <main className="min-h-screen bg-black text-white relative font-sans flex flex-col">
      
      {/* 👑 PREMIUM FLOATING HEADER */}
      <header className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-50">
        <button 
          onClick={() => router.back()} 
          className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="bg-black/50 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-black tracking-widest uppercase">Scanner Active</span>
        </div>
      </header>

      {/* 📷 CAMERA VIEWFINDER AREA */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        
        {/* 🔥 THE MAGIC FIX: Tailwind arbitrary variants se video ko full screen force kiya */}
        <div className="absolute inset-0 z-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:absolute [&_video]:top-0 [&_video]:left-0">
          <div id="premium-scanner-box" className="w-full h-full" />
        </div>

        {/* 🎨 UI OVERLAY: Darken the outside of the box */}
        <div className="absolute inset-0 z-10 pointer-events-none border-[80px] sm:border-[150px] border-black/70 backdrop-blur-[3px] transition-all" />

        {/* 🎯 SCANNING BOX GUIDE */}
        <div className="relative z-20 w-[260px] h-[260px] rounded-3xl border border-white/20 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-transparent">
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-3xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-3xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-3xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-3xl" />

          {/* Scanning Animation Line */}
          {isCameraReady && (
            <motion.div 
              animate={{ y:'' }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              className="w-full h-[2px] bg-emerald-500 shadow-[0_0_20px_#10b981] absolute top-0"
            />
          )}

          {!isCameraReady && !scanError && (
             <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          )}
        </div>

      </div>

      {/* 💡 BOTTOM HELPER TEXT */}
      <div className="absolute bottom-12 left-0 w-full flex flex-col items-center justify-center z-50 pointer-events-none">
        {scanError ? (
          <div className="bg-red-500/90 backdrop-blur-md px-6 py-4 rounded-2xl text-center shadow-2xl">
            <p className="font-black text-sm mb-1">Camera Access Denied</p>
            <p className="text-xs text-white/80">Please allow camera permissions in your browser.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
             <ScanLine className="w-8 h-8 text-white/80 animate-pulse" />
             <p className="text-sm font-black tracking-widest uppercase text-white drop-shadow-lg">Point at QR Code</p>
             <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">It will add automatically</p>
          </div>
        )}
      </div>

    </main>
  );
}
