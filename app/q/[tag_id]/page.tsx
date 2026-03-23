// app/q/[tag_id]/page.tsx
import { createSupabaseServer } from '../../lib/supabaseServer';
import { AlertTriangle, CheckCircle2, QrCode, ShoppingBag } from 'lucide-react';
import ProductShowcaseClient from './ProductShowcaseClient';

export const dynamic = 'force-dynamic';

export default async function PublicTagPage({ params }: { params: Promise<any> }) {
  const resolvedParams = await params;
  const rawTag = resolvedParams?.tag_id || resolvedParams?.id || Object.values(resolvedParams) || '';
  const tagId = String(rawTag).toUpperCase();

  const supabaseServer = createSupabaseServer();

  const { data: tagData, error } = await supabaseServer
    .from('qr_tags')
    .select('*, products(*)')
    .eq('id', tagId)
    .single();

  if (error || !tagData) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-red-500/30">
        <div className="bg-red-500/10 p-6 rounded-full mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)] animate-pulse">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Tag Not Found</h1>
        <p className="text-zinc-500 max-w-xs font-medium">
          This QR code <strong className="text-white">({tagId || 'Unknown'})</strong> is invalid or has been removed from the database.
        </p>
      </main>
    );
  }

  const isSold = tagData.status === 'sold';
  const product = tagData.products;

  if (tagData.status === 'free' || !product) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-emerald-500/30">
        <div className="bg-emerald-500/10 p-6 rounded-full mb-6 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.2)] animate-pulse">
          <QrCode className="w-12 h-12 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Tag Available</h1>
        <p className="text-zinc-500 max-w-xs font-medium">
          Tag <strong className="text-white">{tagId}</strong> is empty and ready to be linked to a new garment from your Control Panel.
        </p>
      </main>
    );
  }

  return <ProductShowcaseClient product={product} tagId={tagId} isSold={isSold} />;
}