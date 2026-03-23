// app/q/[tag_id]/ProductShowcaseClient.tsx
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ShoppingBag, QrCode, CheckCircle2, Tag, Shield } from 'lucide-react';
import AddToCart from '../../components/AddToCart';
import { useRef } from 'react';

interface ProductShowcaseProps {
  product: any;
  tagId: string;
  isSold: boolean;
}

export default function ProductShowcaseClient({ product, tagId, isSold }: ProductShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.8], [0.9, 0.4]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Subtle grain texture using a repeating linear gradient (safe and performant) */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_2px,transparent_2px,transparent_8px)]" />

      {/* Hero Section */}
      <div className="relative h-[70vh] md:h-[85vh] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ scale: imageScale, opacity: imageOpacity }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <ShoppingBag className="w-24 h-24 text-zinc-800" />
            </div>
          )}
        </motion.div>

        {/* Overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        {/* Floating Badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="absolute top-6 right-6 z-10"
        >
          <div
            className={`backdrop-blur-2xl px-5 py-2.5 rounded-full font-black text-xs tracking-widest uppercase flex items-center gap-2 shadow-2xl ${
              isSold
                ? 'bg-red-500/80 text-white border border-red-400'
                : 'bg-emerald-500/80 text-black border border-emerald-400'
            }`}
          >
            {isSold ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Sold Out
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                In Stock
              </>
            )}
          </div>
        </motion.div>

        {/* Product Title & Price */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
          className="absolute bottom-8 left-6 right-6 z-10"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-mono text-emerald-400">
              <QrCode className="w-4 h-4" />
              <span>Tag: {tagId}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tighter drop-shadow-2xl">
              {product.name}
            </h1>
            <p className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-xl">
              ₹{product.price}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Details Section */}
      <div className="px-6 pt-12 pb-32 max-w-2xl mx-auto">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="space-y-10"
        >
          {/* Specifications Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Garment Specifications
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-zinc-300 font-medium">Category</span>
                <span className="text-white font-bold capitalize tracking-wide">
                  {product.category || 'Premium Apparel'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-300 font-medium">Authenticity</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Shield className="w-5 h-5" />
                  Verified Original
                </span>
              </div>
            </div>
          </div>

          {/* Add to Cart Button */}
          {!isSold && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AddToCart product={product} tagId={tagId} />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Bottom gradient glow */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none z-0" />
    </div>
  );
}