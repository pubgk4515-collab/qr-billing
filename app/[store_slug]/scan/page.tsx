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
            fps: 20, // Thoda faster FPS for smoother experience
            // 🔥 NO QRBOX: We use our own sharp CSS mask
          },
          (decodedText) => {
            if (scannerRef.current?.isScanning) {
              scannerRef.current.stop().then(() => {
                // QR Code string se TAG ID nikaalo
                const parts = decodedText.split('/');
                const extractedTagId = parts[parts.length - 1];
                
                // Route to Magic Page
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

    // 🧹 CLEANUP: Properly release camera on back navigation
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [safeStoreSlug, router]);

  return (
    <main className="min-h-screen bg-black text-white relative font-sans flex flex-col overflow-hidden">
      
      {/* 👑 PREMIUM FLOATING HEADER */}
      <header className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-50">
        <button 
          onClick={() => router.back()} 
          className="w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="bg-black/40 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/10 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-black tracking-widest uppercase text-white">Scanner Active</span>
        </div>
      </header>

      {/* 📷 CAMERA VIEWFINDER AREA (FULL SCREEN, NO BLUR) */}
      <div className="absolute inset-0 z-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover">
        <div id="premium-scanner-box" className="w-full h-full" />
      </div>

      {/* 🎨 THE MAGIC FIX: PURE CSS MASK OVERLAY (Sharper Cutout) */}
      {/* Humne blur filter poori tarah hata diya hai, ab sirf semi-transparent black background hai */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none bg-black/70"
        style={{
          // Ye CSS mask center mein ek sharp cutout banata hai 260x260px ka
          maskImage: 'radial-gradient(transparent 180px, black 181px)',
          WebkitMaskImage: 'radial-gradient(transparent 180px, black 181px)',
          // Agar round box chahiye toh ye use karein, square ke liye niche wala block
          // maskImage: 'linear-gradient(to right, black, black), linear-gradient(to right, black, black)',
          // WebkitMaskImage: 'linear-gradient(to right, black, black), linear-gradient(to right, black, black)',
          // maskClip: 'content-box, border-box',
          // WebkitMaskClip: 'content-box, border-box',
          // maskComposite: 'exclude',
          // WebkitMaskComposite: 'xor',
          // padding: 'calc(50vh - 130px) calc(50vw - 130px)'
        }}
      />
      
      {/* Alt technique for perfectly square sharp cutout if radial is too round */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none bg-black/70"
        style={{
          maskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
          WebkitMaskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
          maskClip: 'content-box, border-box',
          WebkitMaskClip: 'content-box, border-box',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          // 260x260 box in center calculated based on viewport
          padding: 'calc(50vh - 130px) calc(50vw - 130px)' 
        }}
      />

      {/* 🎯 SCANNING BOX GUIDE (UI Only) */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="relative w-[260px] h-[260px] rounded-3xl flex items-center justify-center bg-transparent">
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-500 rounded-tl-3xl" />
          <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-500 rounded-tr-3xl" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-500 rounded-bl-3xl" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-500 rounded-br-3xl" />

          {/* Scanning Animation Line */}
          {isCameraReady && (
            <motion.div 
              animate={{ y:'' }} // Adjusted to stay inside the sharp box
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className="w-[90%] h-[2px] bg-emerald-500 shadow-[0_0_15px_#10b981] absolute top-0"
            />
          )}

          {!isCameraReady && !scanError && (
             <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          )}
        </div>
      </div>

      {/* 💡 BOTTOM HELPER TEXT */}
      <div className="absolute bottom-16 left-0 w-full flex flex-col items-center justify-center z-50 pointer-events-none">
        {scanError ? (
          <div className="bg-red-500/90 backdrop-blur-md px-6 py-4 rounded-2xl text-center shadow-2xl">
            <p className="font-black text-sm mb-1">Camera Access Denied</p>
            <p className="text-xs text-white/80">Please allow camera permissions in your browser.</p>
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
