import { createSupabaseServer } from '../../lib/supabaseServer';
import { ShoppingBag, AlertTriangle, CheckCircle2, QrCode, ShieldCheck, Tag } from 'lucide-react';
import AddToCart from '../../components/AddToCart'; 

// 🛑 VERCEL CACHE KILLER: Ensures fresh data always
export const dynamic = 'force-dynamic'; 

export default async function PublicTagPage({ params }: { params: Promise<any> }) {
    const resolvedParams = await params;
    
    // Smart extraction fallback
    const rawTag = resolvedParams?.tag_id || resolvedParams?.id || Object.values(resolvedParams) || '';
    const tagId = String(rawTag).toUpperCase();
    
    const supabaseServer = createSupabaseServer();

    // 1. Securely fetch Tag and attached Product Data
    const { data: tagData, error } = await supabaseServer
        .from('qr_tags')
        .select('*, products(*)')
        .eq('id', tagId)
        .single();

    // 2. 🔴 FALLBACK UI: Invalid or Deleted Tag (Premium Redesign)
    if (error || !tagData) {
        return (
            <main className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-8 text-center font-sans selection:bg-red-500/30">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
                    <div className="relative bg-zinc-900/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/5 shadow-2xl mb-8">
                        <AlertTriangle className="w-14 h-14 text-red-500" strokeWidth={1.5} />
                    </div>
                </div>
                <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Tag Invalid</h1>
                <p className="text-zinc-500 max-w-sm text-lg font-medium leading-relaxed">
                    The QR code <span className="text-zinc-300 px-2 py-1 bg-zinc-800 rounded-md text-sm">{tagId || 'Unknown'}</span> does not exist in our system or has been unlinked.
                </p>
            </main>
        );
    }

    const isSold = tagData.status === 'sold';
    const product = tagData.products;

    // 3. 🟢 FALLBACK UI: Free/Unlinked Tag (Premium Redesign)
    if (tagData.status === 'free' || !product) {
        return (
            <main className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-8 text-center font-sans selection:bg-emerald-500/30">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full"></div>
                    <div className="relative bg-zinc-900/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] mb-8">
                        <QrCode className="w-14 h-14 text-emerald-400" strokeWidth={1.5} />
                    </div>
                </div>
                <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Tag Ready</h1>
                <p className="text-zinc-500 max-w-sm text-lg font-medium leading-relaxed">
                    Tag <span className="text-emerald-400 font-bold">{tagId}</span> is pristine and ready to be assigned from your Control Panel.
                </p>
            </main>
        );
    }

    // 4. ✨ ULTRA-PREMIUM SHOWCASE UI
    return (
        <main className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-36 selection:bg-emerald-500/30 overflow-hidden">
            
            {/* Immersive Hero Section */}
            <div className="relative h-[70vh] w-full bg-zinc-900 rounded-b-[3.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className={`w-full h-full object-cover object-top transition-all duration-1000 ${isSold ? 'opacity-30 grayscale blur-[4px] scale-105' : 'opacity-100 scale-100'}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <ShoppingBag className="w-24 h-24 text-zinc-800" strokeWidth={1} />
                    </div>
                )}

                {/* Multi-layered Premium Gradient for deep contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent"></div>

                {/* Top Bar: Authentic Badge */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                    <div className="bg-black/40 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-xl">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                        <span className="text-zinc-200 text-xs font-bold tracking-widest uppercase">Verified</span>
                    </div>

                    {/* Status Badge */}
                    {isSold ? (
                        <div className="bg-red-500/20 backdrop-blur-2xl text-red-100 px-5 py-2.5 rounded-2xl font-black text-xs tracking-widest uppercase border border-red-500/30 shadow-2xl flex items-center gap-2">
                            Sold Out
                        </div>
                    ) : (
                        <div className="bg-emerald-500/90 backdrop-blur-2xl text-black px-5 py-2.5 rounded-2xl font-black text-xs tracking-widest uppercase border border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-black"></span>
                            </span>
                            In Stock
                        </div>
                    )}
                </div>

                {/* Hero Typography */}
                <div className="absolute bottom-10 left-8 right-8">
                    <p className="text-emerald-400/90 text-sm font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
                        <Tag className="w-4 h-4" strokeWidth={2} /> Tag: {tagId}
                    </p>
                    <h1 className="text-6xl font-black text-white leading-[1.1] mb-4 tracking-tighter drop-shadow-2xl">
                        {product.name}
                    </h1>
                    <div className="flex items-end gap-3">
                        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tighter">
                            ₹{product.price}
                        </h2>
                        <span className="text-zinc-500 font-bold mb-1.5 text-lg">INR</span>
                    </div>
                </div>
            </div>

            {/* Specifications Details Section */}
            <div className="px-6 pt-12 space-y-8">
                <div>
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.25em] mb-5 ml-2">Product DNA</h3>
                    
                    {/* Glassmorphism Specs Card */}
                    <div className="bg-zinc-900/30 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-7 space-y-6 shadow-2xl relative overflow-hidden">
                        {/* Subtle inner glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full"></div>
                        
                        <div className="flex justify-between items-center border-b border-white/5 pb-6 relative z-10">
                            <span className="text-zinc-400 font-medium">Category</span>
                            <span className="text-white font-black capitalize tracking-wide text-lg">{product.category || 'Premium Apparel'}</span>
                        </div>
                        <div className="flex justify-between items-center relative z-10">
                            <span className="text-zinc-400 font-medium">Authenticity</span>
                            <span className="text-emerald-400 font-black flex items-center gap-2 tracking-wide text-lg">
                                <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} /> Original
                            </span>
                        </div>
                    </div>
                </div>

                {/* 🔥 The Interactive Client Button Component */}
                <div className="pt-4">
                    {!isSold && (
                        <AddToCart product={product} tagId={tagId} />
                    )}
                </div>
            </div>
        </main>
    );
}
