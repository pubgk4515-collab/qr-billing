'use client';
import { supabase } from '../../lib/supabase';
import AddToCart from '../../components/AddToCart';
import { PackageX, Tag, ShoppingBag } from 'lucide-react';

export default async function QRPage({ params }: { params: Promise<{ tag_id: string }> }) {
  const { tag_id } = await params;

  // 1. Fetch QR Tag
  const { data: tagData, error: tagError } = await supabase
    .from('qr_tags')
    .select('product_id, status')
    .eq('id', tag_id)
    .single();

  // Invalid QR State
  if (tagError || !tagData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-400">
        <PackageX className="w-16 h-16 text-zinc-700 mb-4" />
        <h2 className="text-xl font-bold text-zinc-200">Invalid QR Code</h2>
        <p className="text-center mt-2">This tag does not exist in our system.</p>
      </div>
    );
  }

  // Unavailable State
  if (tagData.status !== 'active' || !tagData.product_id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-400">
        <Tag className="w-16 h-16 text-zinc-700 mb-4" />
        <h2 className="text-xl font-bold text-zinc-200">Item Unavailable</h2>
        <p className="text-center mt-2">This product is currently out of stock or unassigned.</p>
      </div>
    );
  }

  // 2. Fetch Product Data
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', tagData.product_id)
    .single();

  if (productError || !product) {
    return <div className="p-10 text-center text-red-500 font-bold bg-zinc-950 min-h-screen">Product not found.</div>;
  }

  // 3. The Premium Apple/Symbiote UI (Dark Mode)
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 font-sans selection:bg-zinc-800">
      
      {/* Minimal Dark Header */}
      <header className="bg-zinc-950/80 backdrop-blur-md p-5 text-center sticky top-0 z-10 border-b border-zinc-900">
        <h1 className="font-bold text-lg tracking-tight text-white">Rampurhat Collection</h1>
      </header>

      {/* Product Card Container */}
      <div className="max-w-md mx-auto p-4 mt-2">
        <div className="bg-zinc-900 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-zinc-800 overflow-hidden">
          
          {/* Smart Image Area (Dark Placeholder) */}
          <div className="w-full h-[400px] bg-zinc-950 flex items-center justify-center relative overflow-hidden group border-b border-zinc-800">
            {product.image_url ? (
               <img 
                 src={product.image_url} 
                 alt={product.name} 
                 className="w-full h-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                 onError={(e) => { e.currentTarget.style.display = 'none'; }} 
               />
            ) : null}
            
            <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 text-zinc-600">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
              <span className="text-sm font-medium">Image not available</span>
            </div>
          </div>
          
          {/* Product Details Section */}
          <div className="p-6 pt-8">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-2xl font-bold text-white leading-tight">{product.name}</h2>
              <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-bold px-3 py-1.5 rounded-full tracking-wider">
                #{tag_id}
              </span>
            </div>
            
            <p className="text-4xl font-black text-white mb-8 tracking-tighter">
              ₹{product.price}
            </p>
            
            {/* The Animated Client Button */}
            <AddToCart productId={product.id} />
          </div>

        </div>
      </div>
    </main>
  );
}