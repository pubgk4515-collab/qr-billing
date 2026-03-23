import { createSupabaseServer } from '../../lib/supabaseServer';
import { ShoppingBag, AlertTriangle, CheckCircle2, QrCode } from 'lucide-react';

// 🔥 VERCEL CACHE KILLER: Ye page hamesha fresh load hoga, kabhi cache nahi hoga
export const dynamic = 'force-dynamic'; 

export default async function PublicTagPage({ params }: any) {
    // Ye line dono folder names ko handle kar legi (chahe [id] ho ya [tag_id])
    const rawTag = params?.tag_id || params?.id || '';
    const tagId = rawTag.toUpperCase();
    
    const supabaseServer = createSupabaseServer();

    // 1. Securely fetch Tag and attached Product Data
    const { data: tagData, error } = await supabaseServer
        .from('qr_tags')
        .select('*, products(*)')
        .eq('id', tagId)
        .single();

    // 2. Fallback UI: Invalid or Deleted Tag
    if (error || !tagData) {
        return (
            <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="bg-red-500/10 p-6 rounded-full mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Tag Not Found</h1>
                <p className="text-zinc-500 max-w-xs font-medium">This QR code ({tagId}) is invalid or has been removed from the database.</p>
            </main>
        );
    }

    const isSold = tagData.status === 'sold';
    const product = tagData.products;

    // 3. Fallback UI: Free/Unlinked Tag
    if (tagData.status === 'free' || !product) {
        return (
            <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="bg-emerald-500/10 p-6 rounded-full mb-6 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                    <QrCode className="w-12 h-12 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Tag Available</h1>
                <p className="text-zinc-500 max-w-xs font-medium">Tag {tagId} is empty and ready to be linked to a new garment from the Admin Panel.</p>
            </main>
        );
    }

    // 4. Premium Product Showcase UI (Valid Tag)
    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-32 selection:bg-emerald-500/30">
            {/* Hero Image Section */}
            <div className="relative h-[65vh] w-full bg-zinc-900 rounded-b-[3rem] overflow-hidden shadow-2xl">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className={`w-full h-full object-cover transition-all duration-700 ${isSold ? 'opacity-40 grayscale blur-[2px]' : 'opacity-90'}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <ShoppingBag className="w-24 h-24 text-zinc-800" />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>

                {/* Intelligent Status Badge */}
                <div className="absolute top-6 right-6">
                    {isSold ? (
                        <span className="bg-red-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full font-black text-xs tracking-widest uppercase border border-red-400 shadow-2xl flex items-center gap-2">
                            Sold Out
                        </span>
                    ) : (
                        <span className="bg-emerald-500/90 backdrop-blur-md text-black px-5 py-2.5 rounded-full font-black text-xs tracking-widest uppercase border border-emerald-400 shadow-2xl flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> In Stock
                        </span>
                    )}
                </div>

                {/* Typography & Details Overlay */}
                <div className="absolute bottom-8 left-6 right-6">
                    <p className="text-emerald-400 text-sm font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                        <QrCode className="w-4 h-4" /> Tag: {tagId}
                    </p>
                    <h1 className="text-5xl font-black text-white leading-none mb-4 tracking-tighter">{product.name}</h1>
                    <h2 className="text-4xl font-black text-white tracking-tighter">₹{product.price}</h2>
                </div>
            </div>

            {/* Additional SaaS Details */}
            <div className="px-6 pt-10">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Garment Specifications</h3>
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-[2rem] p-6 space-y-5 shadow-lg">
                    <div className="flex justify-between items-center border-b border-zinc-800/80 pb-5">
                        <span className="text-zinc-400 font-medium">Category</span>
                        <span className="text-white font-black capitalize tracking-wide">{product.category || 'Premium Apparel'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-medium">Authenticity</span>
                        <span className="text-emerald-400 font-black flex items-center gap-1.5 tracking-wide">
                            <CheckCircle2 className="w-5 h-5" /> Verified Original
                        </span>
                    </div>
                </div>
            </div>
        </main>
    );
}
