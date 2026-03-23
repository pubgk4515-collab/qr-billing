'use client';

import { useState } from 'react';
import { ShoppingBag, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; // 🔥 Imported the router

type AddToCartProps = {
    product: any;
    tagId: string;
};

export default function AddToCart({ product, tagId }: AddToCartProps) {
    const [status, setStatus] = useState<'IDLE' | 'ADDING' | 'ADDED'>('IDLE');
    const router = useRouter(); // 🔥 Initialized the router

    const handleAddToCart = async () => {
        if (status !== 'IDLE') return;

        setStatus('ADDING');

        // FUTURE-PROOF: This is where actual database/localStorage cart logic will go
        // For now, simulating an 800ms network delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        setStatus('ADDED');

        // 🔥 Wait for 1 second so the user sees the success animation, then redirect!
        setTimeout(() => {
            router.push('/cart'); // Change to '/billing' if your cart route is named differently
        }, 1000); 
    };

    return (
        <button
            onClick={handleAddToCart}
            disabled={status !== 'IDLE'}
            className={`w-full font-black text-xl py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 mt-6 ${
                status === 'ADDED'
                    ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 shadow-none'
                    : status === 'ADDING'
                    ? 'bg-emerald-600 text-zinc-900 cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-emerald-500 text-black shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:bg-emerald-400 hover:shadow-[0_0_60px_rgba(16,185,129,0.4)]'
            }`}
        >
            {status === 'IDLE' && (
                <>
                    <ShoppingBag className="w-7 h-7" />
                    <span>Add to Bag • ₹{product.price}</span>
                </>
            )}
            
            {status === 'ADDING' && (
                <>
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span>Adding Item...</span>
                </>
            )}

            {status === 'ADDED' && (
                <>
                    <CheckCircle2 className="w-7 h-7" />
                    <span>Added to Bag!</span>
                </>
            )}
        </button>
    );
}
